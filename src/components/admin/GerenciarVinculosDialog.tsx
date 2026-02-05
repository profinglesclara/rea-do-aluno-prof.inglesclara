import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, UserPlus, X, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GerenciarVinculosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsavelId: string;
  responsavelNome: string;
  onVinculosAlterados?: () => void;
}

type Aluno = {
  user_id: string;
  nome_completo: string;
  nome_de_usuario: string;
  nivel_cefr: string | null;
  status_aluno: string | null;
};

export function GerenciarVinculosDialog({
  open,
  onOpenChange,
  responsavelId,
  responsavelNome,
  onVinculosAlterados,
}: GerenciarVinculosDialogProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [vinculados, setVinculados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, responsavelId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar todos os alunos
      const { data: alunosData, error: alunosError } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo, nome_de_usuario, nivel_cefr, status_aluno")
        .eq("tipo_usuario", "Aluno")
        .order("nome_completo");

      if (alunosError) throw alunosError;
      setAlunos(alunosData || []);

      // Buscar vínculos existentes
      const { data: vinculosData, error: vinculosError } = await supabase
        .from("responsaveis_alunos")
        .select("aluno_id")
        .eq("responsavel_id", responsavelId);

      if (vinculosError) throw vinculosError;
      setVinculados(vinculosData?.map((v) => v.aluno_id) || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const toggleVinculo = (alunoId: string) => {
    setVinculados((prev) =>
      prev.includes(alunoId)
        ? prev.filter((id) => id !== alunoId)
        : [...prev, alunoId]
    );
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      // Buscar vínculos atuais
      const { data: vinculosAtuais } = await supabase
        .from("responsaveis_alunos")
        .select("aluno_id")
        .eq("responsavel_id", responsavelId);

      const idsAtuais = vinculosAtuais?.map((v) => v.aluno_id) || [];
      
      // Identificar adições e remoções
      const idsAdicionar = vinculados.filter((id) => !idsAtuais.includes(id));
      const idsRemover = idsAtuais.filter((id) => !vinculados.includes(id));

      // Adicionar novos vínculos
      if (idsAdicionar.length > 0) {
        const { error: insertError } = await supabase
          .from("responsaveis_alunos")
          .insert(
            idsAdicionar.map((aluno_id) => ({
              responsavel_id: responsavelId,
              aluno_id,
            }))
          );

        if (insertError) throw insertError;
      }

      // Remover vínculos
      if (idsRemover.length > 0) {
        const { error: deleteError } = await supabase
          .from("responsaveis_alunos")
          .delete()
          .eq("responsavel_id", responsavelId)
          .in("aluno_id", idsRemover);

        if (deleteError) throw deleteError;
      }

      toast.success("Vínculos atualizados com sucesso!");
      onVinculosAlterados?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar vínculos:", error);
      toast.error("Erro ao salvar vínculos: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredAlunos = alunos.filter(
    (aluno) =>
      aluno.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.nome_de_usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const alunosVinculados = filteredAlunos.filter((a) =>
    vinculados.includes(a.user_id)
  );
  const alunosNaoVinculados = filteredAlunos.filter(
    (a) => !vinculados.includes(a.user_id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gerenciar Vínculos - {responsavelNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Alunos vinculados */}
            {alunosVinculados.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  Alunos Vinculados ({alunosVinculados.length})
                </h4>
                <ScrollArea className="h-[150px] border rounded-md p-2">
                  <div className="space-y-2">
                    {alunosVinculados.map((aluno) => (
                      <div
                        key={aluno.user_id}
                        className="flex items-center justify-between p-2 rounded-md bg-primary/10"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => toggleVinculo(aluno.user_id)}
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {aluno.nome_completo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{aluno.nome_de_usuario}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {aluno.nivel_cefr && (
                            <Badge variant="secondary" className="text-xs">
                              {aluno.nivel_cefr}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleVinculo(aluno.user_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Alunos não vinculados */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Alunos Disponíveis ({alunosNaoVinculados.length})
              </h4>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {alunosNaoVinculados.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    {searchTerm
                      ? "Nenhum aluno encontrado"
                      : "Todos os alunos já estão vinculados"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {alunosNaoVinculados.map((aluno) => (
                      <div
                        key={aluno.user_id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleVinculo(aluno.user_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => toggleVinculo(aluno.user_id)}
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {aluno.nome_completo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{aluno.nome_de_usuario}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {aluno.nivel_cefr && (
                            <Badge variant="outline" className="text-xs">
                              {aluno.nivel_cefr}
                            </Badge>
                          )}
                          {aluno.status_aluno && (
                            <Badge
                              variant={
                                aluno.status_aluno === "Ativo"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {aluno.status_aluno}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSalvar} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Vínculos"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
