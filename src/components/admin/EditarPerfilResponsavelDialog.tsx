import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditarPerfilResponsavelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsavelId: string;
  dadosAtuais: {
    nome_completo: string;
    nome_de_usuario: string;
    email: string;
    telefone_responsavel: string | null;
    status_aluno: string | null;
    notas_internas: string | null;
  };
  onSuccess: () => void;
}

const STATUS_OPTIONS = ["Ativo", "Em pausa", "Cancelado", "Inativo"];

export function EditarPerfilResponsavelDialog({
  open,
  onOpenChange,
  responsavelId,
  dadosAtuais,
  onSuccess,
}: EditarPerfilResponsavelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nomeDeUsuario, setNomeDeUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [status, setStatus] = useState("");
  const [notasInternas, setNotasInternas] = useState("");

  useEffect(() => {
    if (open && dadosAtuais) {
      setNomeCompleto(dadosAtuais.nome_completo || "");
      setNomeDeUsuario(dadosAtuais.nome_de_usuario || "");
      setEmail(dadosAtuais.email || "");
      setTelefone(dadosAtuais.telefone_responsavel || "");
      setStatus(dadosAtuais.status_aluno || "");
      setNotasInternas(dadosAtuais.notas_internas || "");
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
      const { error } = await supabase
        .from("usuarios")
        .update({
          nome_completo: nomeCompleto.trim(),
          nome_de_usuario: nomeDeUsuario.trim(),
          email: email.trim(),
          telefone_responsavel: telefone.trim() || null,
          status_aluno: status || null,
          notas_internas: notasInternas.trim() || null,
        })
        .eq("user_id", responsavelId);

      if (error) throw error;

      toast.success("Perfil do responsável atualizado com sucesso!");
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
          <DialogTitle>Editar Perfil do Responsável</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomeCompleto">Nome completo *</Label>
            <Input
              id="nomeCompleto"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Nome completo"
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Telefone de contato"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notasInternas">Notas internas</Label>
            <Textarea
              id="notasInternas"
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              placeholder="Observações internas sobre este responsável"
              rows={3}
            />
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
