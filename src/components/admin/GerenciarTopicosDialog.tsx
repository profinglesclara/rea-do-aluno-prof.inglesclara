import { useState, useEffect, useCallback } from "react";
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
import type { Database } from "@/integrations/supabase/types";

type StatusTopico = Database["public"]["Enums"]["status_topico"];
type NivelCefr = Database["public"]["Enums"]["nivel_cefr"];

type Categoria = {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
};

type Topico = {
  topico_id: string;
  descricao_topico: string;
  categoria: string;
  nivel_cefr: NivelCefr;
  status: StatusTopico;
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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [topicos, setTopicos] = useState<Topico[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [changes, setChanges] = useState<Record<string, StatusTopico>>({});
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

  // Buscar categorias ATIVAS do banco
  const fetchCategorias = useCallback(async () => {
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("ativa", true)
      .order("ordem", { ascending: true });

    if (error) {
      console.error("Erro ao buscar categorias:", error);
      return [];
    }
    return (data as Categoria[]) || [];
  }, []);

  // Sincronizar tópicos do aluno com backend (RPC)
  const syncTopicos = useCallback(async () => {
    if (!alunoId || !nivelCefr) return;
    
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc("sync_topicos_aluno", {
        p_aluno: alunoId,
      });

      if (error) throw error;

      const result = data as { success: boolean; inserted?: number; deleted?: number; error?: string };
      
      if (!result.success) {
        console.warn("Sync não sucedido:", result.error);
        return;
      }

      // Mostrar toast apenas se houve mudanças
      if ((result.inserted || 0) > 0 || (result.deleted || 0) > 0) {
        toast({
          title: "Tópicos sincronizados",
          description: `${result.inserted || 0} adicionados, ${result.deleted || 0} removidos.`,
        });
      }
    } catch (error) {
      console.error("Erro ao sincronizar tópicos:", error);
    } finally {
      setSyncing(false);
    }
  }, [alunoId, nivelCefr, toast]);

  // Buscar tópicos do aluno
  const fetchTopicos = useCallback(async () => {
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
  }, [alunoId, toast]);

  // Auto-sync e carregamento ao abrir modal
  useEffect(() => {
    if (open && alunoId) {
      const initializeModal = async () => {
        setLoading(true);
        
        // 1. Buscar categorias ativas
        const cats = await fetchCategorias();
        setCategorias(cats);
        setExpandedCategories(new Set(cats.map(c => c.nome)));
        
        // 2. Auto-sync (garante que progresso está alinhado)
        await syncTopicos();
        
        // 3. Buscar tópicos atualizados
        await fetchTopicos();
      };
      
      initializeModal();
    }
  }, [open, alunoId, fetchCategorias, syncTopicos, fetchTopicos]);

  // Agrupar tópicos por categoria (apenas categorias ativas do banco)
  const topicosPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat.nome] = topicos.filter(t => t.categoria === cat.nome);
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

  // Forçar re-sync manual (botão opcional)
  const handleForceSync = async () => {
    if (!nivelCefr) {
      toast({
        variant: "destructive",
        title: "Nível CEFR não definido",
        description: "Defina o nível CEFR do aluno antes de sincronizar os tópicos.",
      });
      return;
    }

    setLoading(true);
    await syncTopicos();
    await fetchTopicos();
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
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
                onClick={handleForceSync}
                disabled={loading || syncing}
                title="Forçar sincronização com tópicos padrão"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sincronizar
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

            {/* Lista de tópicos por categoria - apenas categorias ATIVAS */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="space-y-4 pb-4">
                {categorias.map((cat) => {
                  const topicosCategoria = topicosPorCategoria[cat.nome] || [];
                  const hasTopics = topicosCategoria.length > 0;
                  
                  return (
                    <Collapsible
                      key={cat.id}
                      open={expandedCategories.has(cat.nome)}
                      onOpenChange={() => toggleCategory(cat.nome)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cat.nome}</span>
                          <Badge 
                            variant={hasTopics ? "secondary" : "outline"} 
                            className={`text-xs ${!hasTopics ? 'text-muted-foreground' : ''}`}
                          >
                            {topicosCategoria.length} {topicosCategoria.length === 1 ? 'tópico' : 'tópicos'}
                          </Badge>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedCategories.has(cat.nome) ? 'rotate-180' : ''}`} />
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

                {categorias.length === 0 && !loading && (
                  <div className="p-6 text-center text-muted-foreground">
                    Nenhuma categoria ativa encontrada.
                  </div>
                )}
              </div>
            </div>

            {/* Mensagem quando não há tópicos */}
            {totalTopicos === 0 && !loading && categorias.length > 0 && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3 border-t">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground text-center text-sm">
                  {nivelCefr 
                    ? `Não há tópicos padrão cadastrados para o nível ${nivelCefr}.`
                    : "Defina o nível CEFR do aluno para carregar os tópicos."}
                </p>
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
