import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditarPerfilAlunoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
  dadosAtuais: {
    nome_aluno: string | null;
    nome_de_usuario: string | null;
    nivel_cefr: string | null;
    modalidade: string | null;
    data_inicio_aulas: string | null;
    status_aluno: string | null;
  };
  onSuccess: () => void;
}

const NIVEIS_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
const MODALIDADES = ["Online", "Presencial", "Híbrido"];
const STATUS_ALUNO = ["Ativo", "Pausado", "Encerrado"];

export function EditarPerfilAlunoDialog({
  open,
  onOpenChange,
  alunoId,
  dadosAtuais,
  onSuccess,
}: EditarPerfilAlunoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nomeDeUsuario, setNomeDeUsuario] = useState("");
  const [nivelCefr, setNivelCefr] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [dataInicioAulas, setDataInicioAulas] = useState<Date | undefined>(undefined);
  const [statusAluno, setStatusAluno] = useState("");

  useEffect(() => {
    if (open && dadosAtuais) {
      setNomeCompleto(dadosAtuais.nome_aluno || "");
      setNomeDeUsuario(dadosAtuais.nome_de_usuario || "");
      setNivelCefr(dadosAtuais.nivel_cefr || "");
      setModalidade(dadosAtuais.modalidade || "");
      setStatusAluno(dadosAtuais.status_aluno || "");
      setDataInicioAulas(
        dadosAtuais.data_inicio_aulas
          ? new Date(dadosAtuais.data_inicio_aulas)
          : undefined
      );
    }
  }, [open, dadosAtuais]);

  const handleSave = async () => {
    if (!nomeCompleto.trim()) {
      toast.error("O nome completo é obrigatório.");
      return;
    }
    if (!nomeDeUsuario.trim()) {
      toast.error("O nome de usuário é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const updateData: Record<string, any> = {
        nome_completo: nomeCompleto.trim(),
        nome_de_usuario: nomeDeUsuario.trim(),
        status_aluno: statusAluno || null,
        data_inicio_aulas: dataInicioAulas
          ? format(dataInicioAulas, "yyyy-MM-dd")
          : null,
      };

      // Only set nivel_cefr if it's a valid enum value
      if (nivelCefr && NIVEIS_CEFR.includes(nivelCefr)) {
        updateData.nivel_cefr = nivelCefr as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
      } else {
        updateData.nivel_cefr = null;
      }

      // Only set modalidade if it's a valid enum value
      if (modalidade && MODALIDADES.includes(modalidade)) {
        updateData.modalidade = modalidade as "Online" | "Presencial" | "Híbrido";
      } else {
        updateData.modalidade = null;
      }

      const { error } = await supabase
        .from("usuarios")
        .update(updateData)
        .eq("user_id", alunoId);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar perfil: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil do Aluno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomeCompleto">Nome completo *</Label>
            <Input
              id="nomeCompleto"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Nome completo do aluno"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeDeUsuario">Nome de usuário *</Label>
            <Input
              id="nomeDeUsuario"
              value={nomeDeUsuario}
              onChange={(e) => setNomeDeUsuario(e.target.value)}
              placeholder="Nome de usuário"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nivelCefr">Nível CEFR</Label>
            <Select value={nivelCefr} onValueChange={setNivelCefr}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS_CEFR.map((nivel) => (
                  <SelectItem key={nivel} value={nivel}>
                    {nivel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modalidade">Modalidade</Label>
            <Select value={modalidade} onValueChange={setModalidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                {MODALIDADES.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de início das aulas</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataInicioAulas && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicioAulas
                    ? format(dataInicioAulas, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataInicioAulas}
                  onSelect={setDataInicioAulas}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statusAluno">Status do aluno</Label>
            <Select value={statusAluno} onValueChange={setStatusAluno}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ALUNO.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
