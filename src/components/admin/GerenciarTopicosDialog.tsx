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
import { ChevronDown, Loader2, BookOpen, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Database } from "@/integrations/supabase/types";

type StatusTopico = Database["public"]["Enums"]["status_topico"];
type NivelCefr = Database["public"]["Enums"]["nivel_cefr"];

// 7 categorias fixas - sempre exibidas nesta ordem
const FIXED_CATEGORIES = [
  { key: "Phonetics", name: "Phonetics", sortOrder: 1 },
  { key: "Grammar", name: "Grammar", sortOrder: 2 },
  { key: "Vocabulary", name: "Vocabulary", sortOrder: 3 },
  { key: "Communication", name: "Communication", sortOrder: 4 },
  { key: "Expressions", name: "Expressions", sortOrder: 5 },
  { key: "Pronunciation", name: "Pronunciation", sortOrder: 6 },
  { key: "Listening", name: "Listening", sortOrder: 7 },
] as const;

type Topico = {
  topico_id: string;
  descricao_topico: string;
  categoria: string;
  nivel_cefr: NivelCefr;
  status: StatusTopico;
};

type TopicoPadrao = {
  modelo_id: string;
  descricao_topico: string;
  categoria: string;
  nivel_cefr: NivelCefr;
  ordem: number | null;
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(FIXED_CATEGORIES.map(c => c.key))
  );

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
        .eq("aluno", alunoId);

      if (error) throw error;

      setTopicos((data as Topico[]) || []);
      setChanges({});
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
  const topicosPorCategoria = FIXED_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = topicos.filter(t => t.categoria === cat.key);
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
      // Primeiro, remover tópicos antigos do aluno
      const { error: deleteError } = await supabase
        .from("topicos_progresso")
        .delete()
        .eq("aluno", alunoId);

      if (deleteError) throw deleteError;

      // Buscar tópicos padrão do nível CEFR do aluno
      const { data: topicosPadrao, error: fetchError } = await supabase
        .from("topicos_padrao")
        .select("*")
        .eq("nivel_cefr", nivelCefr as NivelCefr)
        .order("ordem", { ascending: true });

      if (fetchError) throw fetchError;

      if (!topicosPadrao || topicosPadrao.length === 0) {
        toast({
          variant: "destructive",
          title: "Sem tópicos padrão",
          description: `Não há tópicos padrão cadastrados para o nível ${nivelCefr}.`,
        });
        setLoading(false);
        setPopulando(false);
        // Atualizar lista (agora vazia)
        fetchTopicos();
        return;
      }

      // Inserir tópicos para o aluno
      const novosTopicos = topicosPadrao.map((tp) => ({
        aluno: alunoId,
        nivel_cefr: tp.nivel_cefr,
        categoria: tp.categoria,
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

  // Atualizar tópicos quando nível CEFR muda (re-popular com novos tópicos)
  const handleRefreshTopicos = async () => {
    if (!nivelCefr) {
      toast({
        variant: "destructive",
        title: "Nível CEFR não definido",
        description: "Defina o nível CEFR do aluno antes de atualizar os tópicos.",
      });
      return;
    }

    // Confirmação antes de substituir
    const confirmMsg = topicos.length > 0 
      ? `Isso irá substituir os ${topicos.length} tópicos atuais pelos tópicos do nível ${nivelCefr}. Deseja continuar?`
      : `Deseja atribuir os tópicos do nível ${nivelCefr}?`;
    
    if (!window.confirm(confirmMsg)) return;

    await handlePopularTopicos();
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

  const totalTopicos = topicos.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Gerenciar Tópicos de Progresso
          </DialogTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Aluno: <strong>{alunoNome}</strong></span>
              {nivelCefr && (
                <Badge variant="outline">{nivelCefr}</Badge>
              )}
            </div>
            {nivelCefr && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshTopicos}
                disabled={populando}
              >
                {populando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {topicos.length > 0 ? "Atualizar para " + nivelCefr : "Atribuir " + nivelCefr}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            {totalTopicos > 0 && (
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
            )}

            {/* Lista de tópicos por categoria - SEMPRE mostra as 7 categorias */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {FIXED_CATEGORIES.map(({ key, name }) => {
                  const topicosCategoria = topicosPorCategoria[key] || [];
                  const hasTopics = topicosCategoria.length > 0;
                  
                  return (
                    <Collapsible
                      key={key}
                      open={expandedCategories.has(key)}
                      onOpenChange={() => toggleCategory(key)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{name}</span>
                          <Badge 
                            variant={hasTopics ? "secondary" : "outline"} 
                            className={`text-xs ${!hasTopics ? 'text-muted-foreground' : ''}`}
                          >
                            {topicosCategoria.length} {topicosCategoria.length === 1 ? 'tópico' : 'tópicos'}
                          </Badge>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedCategories.has(key) ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 mt-2 pl-2">
                          {hasTopics ? (
                            topicosCategoria.map((topico) => {
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
                            })
                          ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                              Sem tópicos para este nível nesta categoria
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Mensagem quando não há tópicos */}
            {totalTopicos === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3 border-t">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground text-center text-sm">
                  Este aluno ainda não possui tópicos atribuídos.
                </p>
                {nivelCefr ? (
                  <Button onClick={handlePopularTopicos} disabled={populando} size="sm">
                    {populando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Atribuindo...
                      </>
                    ) : (
                      <>Atribuir tópicos do nível {nivelCefr}</>
                    )}
                  </Button>
                ) : (
                  <p className="text-sm text-destructive">
                    Defina o nível CEFR do aluno para atribuir os tópicos.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {totalTopicos > 0 && (
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
