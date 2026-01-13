import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Database } from "@/integrations/supabase/types";

type StatusTopico = Database["public"]["Enums"]["status_topico"];
type NivelCefr = Database["public"]["Enums"]["nivel_cefr"];
type CategoriaTopico = Database["public"]["Enums"]["categoria_topico"];

type Topico = {
  topico_id: string;
  descricao_topico: string;
  categoria: CategoriaTopico;
  nivel_cefr: NivelCefr;
  status: StatusTopico;
};

type TopicoPadrao = {
  modelo_id: string;
  descricao_topico: string;
  categoria: string;
  nivel_cefr: NivelCefr;
};

interface GerenciarTopicosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
  alunoNome: string;
  nivelCefr: string | null;
  onSuccess?: () => void;
}

export function GerenciarTopicosDialog({
  open,
  onOpenChange,
  alunoId,
  alunoNome,
  nivelCefr,
  onSuccess,
}: GerenciarTopicosDialogProps) {
  const { toast } = useToast();
  const [topicos, setTopicos] = useState<Topico[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, StatusTopico>>({});
  const [populando, setPopulando] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const statusOptions: StatusTopico[] = ["A Introduzir", "Em Desenvolvimento", "Concluído"];

  const getStatusBadgeClass = (status: StatusTopico) => {
    switch (status) {
      case "Concluído":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "Em Desenvolvimento":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "A Introduzir":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800";
    }
  };

  // Buscar tópicos do aluno
  const fetchTopicos = async () => {
    if (!alunoId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("topicos_progresso")
        .select("*")
        .eq("aluno", alunoId)
        .order("categoria", { ascending: true });

      if (error) throw error;

      setTopicos((data as Topico[]) || []);
      setChanges({});
      
      // Expandir todas as categorias por padrão
      const categories = new Set((data || []).map(t => t.categoria));
      setExpandedCategories(categories);
    } catch (error) {
      console.error("Erro ao buscar tópicos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os tópicos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTopicos();
    }
  }, [open, alunoId]);

  // Agrupar tópicos por categoria
  const topicosPorCategoria = topicos.reduce((acc, topico) => {
    if (!acc[topico.categoria]) {
      acc[topico.categoria] = [];
    }
    acc[topico.categoria].push(topico);
    return acc;
  }, {} as Record<string, Topico[]>);

  // Atualizar status de um tópico localmente
  const handleStatusChange = (topicoId: string, novoStatus: StatusTopico) => {
    setChanges(prev => ({ ...prev, [topicoId]: novoStatus }));
  };

  // Obter status atual (com alterações pendentes)
  const getTopicoStatus = (topico: Topico): StatusTopico => {
    return changes[topico.topico_id] || topico.status;
  };

  // Salvar alterações no banco
  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Não há alterações para salvar.",
      });
      return;
    }

    setSaving(true);
    try {
      // Atualizar cada tópico alterado
      for (const [topicoId, novoStatus] of Object.entries(changes)) {
        const { error } = await supabase
          .from("topicos_progresso")
          .update({ 
            status: novoStatus,
            ultima_atualizacao: new Date().toISOString()
          })
          .eq("topico_id", topicoId);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: `${Object.keys(changes).length} tópico(s) atualizado(s).`,
      });

      setChanges({});
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar tópicos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Popular tópicos para o aluno a partir do topicos_padrao
  const handlePopularTopicos = async () => {
    if (!nivelCefr) {
      toast({
        variant: "destructive",
        title: "Nível CEFR não definido",
        description: "Defina o nível CEFR do aluno antes de atribuir os tópicos.",
      });
      return;
    }

    setPopulando(true);
    try {
      // Buscar tópicos padrão do nível CEFR do aluno
      const { data: topicosPadrao, error: fetchError } = await supabase
        .from("topicos_padrao")
        .select("*")
        .eq("nivel_cefr", nivelCefr as NivelCefr);

      if (fetchError) throw fetchError;

      if (!topicosPadrao || topicosPadrao.length === 0) {
        toast({
          variant: "destructive",
          title: "Sem tópicos padrão",
          description: `Não há tópicos padrão cadastrados para o nível ${nivelCefr}.`,
        });
        return;
      }

      // Inserir tópicos para o aluno
      const novosTopicos = topicosPadrao.map((tp) => ({
        aluno: alunoId,
        nivel_cefr: tp.nivel_cefr,
        categoria: tp.categoria as CategoriaTopico,
        descricao_topico: tp.descricao_topico,
        status: "A Introduzir" as StatusTopico,
      }));

      const { error: insertError } = await supabase
        .from("topicos_progresso")
        .insert(novosTopicos);

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: `${novosTopicos.length} tópicos atribuídos ao aluno.`,
      });

      fetchTopicos();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao popular tópicos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atribuir os tópicos.",
      });
    } finally {
      setPopulando(false);
    }
  };

  const toggleCategory = (categoria: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoria)) {
        newSet.delete(categoria);
      } else {
        newSet.add(categoria);
      }
      return newSet;
    });
  };

  const hasChanges = Object.keys(changes).length > 0;

  // Contar estatísticas
  const stats = topicos.reduce((acc, t) => {
    const status = getTopicoStatus(t);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Gerenciar Tópicos de Progresso
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Aluno: <strong>{alunoNome}</strong></span>
            {nivelCefr && (
              <Badge variant="outline">{nivelCefr}</Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : topicos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Este aluno ainda não possui tópicos de progresso atribuídos.
            </p>
            <Button onClick={handlePopularTopicos} disabled={populando || !nivelCefr}>
              {populando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atribuindo...
                </>
              ) : (
                <>Atribuir tópicos do nível {nivelCefr || "?"}</>
              )}
            </Button>
            {!nivelCefr && (
              <p className="text-sm text-destructive">
                Defina o nível CEFR do aluno para atribuir os tópicos.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="flex gap-4 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadgeClass("Concluído")}>
                  {stats["Concluído"] || 0}
                </Badge>
                <span className="text-sm text-muted-foreground">Concluídos</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadgeClass("Em Desenvolvimento")}>
                  {stats["Em Desenvolvimento"] || 0}
                </Badge>
                <span className="text-sm text-muted-foreground">Em desenvolvimento</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadgeClass("A Introduzir")}>
                  {stats["A Introduzir"] || 0}
                </Badge>
                <span className="text-sm text-muted-foreground">A introduzir</span>
              </div>
            </div>

            {/* Lista de tópicos por categoria */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {Object.entries(topicosPorCategoria).map(([categoria, topicosCategoria]) => (
                  <Collapsible
                    key={categoria}
                    open={expandedCategories.has(categoria)}
                    onOpenChange={() => toggleCategory(categoria)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{categoria}</span>
                        <Badge variant="secondary" className="text-xs">
                          {topicosCategoria.length} tópicos
                        </Badge>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedCategories.has(categoria) ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 mt-2 pl-2">
                        {topicosCategoria.map((topico) => {
                          const currentStatus = getTopicoStatus(topico);
                          const isChanged = changes[topico.topico_id] !== undefined;
                          
                          return (
                            <div
                              key={topico.topico_id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${isChanged ? 'border-primary bg-primary/5' : 'border-border'}`}
                            >
                              <span className="text-sm flex-1 mr-4">
                                {topico.descricao_topico}
                              </span>
                              <Select
                                value={currentStatus}
                                onValueChange={(value) => handleStatusChange(topico.topico_id, value as StatusTopico)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue>
                                    <Badge className={getStatusBadgeClass(currentStatus)}>
                                      {currentStatus}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      <Badge className={getStatusBadgeClass(status)}>
                                        {status}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {topicos.length > 0 && (
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>Salvar Alterações {hasChanges && `(${Object.keys(changes).length})`}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
