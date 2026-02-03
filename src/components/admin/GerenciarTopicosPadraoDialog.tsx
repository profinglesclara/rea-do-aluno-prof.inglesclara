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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Loader2, BookOpen, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type NivelCefr = Database["public"]["Enums"]["nivel_cefr"];

const NIVEIS_CEFR: NivelCefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Categoria = {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
};

type TopicoPadrao = {
  modelo_id: string;
  descricao_topico: string;
  categoria: string;
  nivel_cefr: NivelCefr;
  ordem: number | null;
};

interface GerenciarTopicosPadraoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GerenciarTopicosPadraoDialog({
  open,
  onOpenChange,
}: GerenciarTopicosPadraoDialogProps) {
  const { toast } = useToast();
  const [topicos, setTopicos] = useState<TopicoPadrao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNivel, setSelectedNivel] = useState<NivelCefr>("A1");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Estado para edição/criação
  const [editingTopico, setEditingTopico] = useState<TopicoPadrao | null>(null);
  const [newTopicoCategoria, setNewTopicoCategoria] = useState<string | null>(null);
  const [newTopicoText, setNewTopicoText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<TopicoPadrao | null>(null);

  // Buscar categorias do banco
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("ativa", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
      // Expandir todas as categorias por padrão
      setExpandedCategories(new Set(data?.map(c => c.nome) || []));
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    }
  };

  // Buscar tópicos padrão do nível selecionado
  const fetchTopicos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("topicos_padrao")
        .select("*")
        .eq("nivel_cefr", selectedNivel)
        .order("categoria", { ascending: true })
        .order("ordem", { ascending: true });

      if (error) throw error;
      setTopicos(data || []);
    } catch (error) {
      console.error("Erro ao buscar tópicos padrão:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os tópicos padrão.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategorias();
    }
  }, [open]);

  useEffect(() => {
    if (open && categorias.length > 0) {
      fetchTopicos();
    }
  }, [open, selectedNivel, categorias]);

  // Agrupar tópicos por categoria
  const topicosPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat.nome] = topicos.filter(t => t.categoria === cat.nome);
    return acc;
  }, {} as Record<string, TopicoPadrao[]>);

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

  // Adicionar novo tópico
  const handleAddTopico = async () => {
    if (!newTopicoCategoria || !newTopicoText.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha a descrição do tópico.",
      });
      return;
    }

    setSaving(true);
    try {
      // Calcular próxima ordem
      const topicosCategoria = topicos.filter(t => t.categoria === newTopicoCategoria);
      const maxOrdem = topicosCategoria.reduce((max, t) => Math.max(max, t.ordem || 0), 0);

      const { error } = await supabase
        .from("topicos_padrao")
        .insert({
          nivel_cefr: selectedNivel,
          categoria: newTopicoCategoria,
          descricao_topico: newTopicoText.trim(),
          ordem: maxOrdem + 1,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico adicionado com sucesso.",
      });

      setNewTopicoCategoria(null);
      setNewTopicoText("");
      fetchTopicos();
    } catch (error) {
      console.error("Erro ao adicionar tópico:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o tópico.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Salvar edição de tópico
  const handleSaveEdit = async () => {
    if (!editingTopico || !editingTopico.descricao_topico.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A descrição não pode estar vazia.",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("topicos_padrao")
        .update({ descricao_topico: editingTopico.descricao_topico.trim() })
        .eq("modelo_id", editingTopico.modelo_id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico atualizado com sucesso.",
      });

      setEditingTopico(null);
      fetchTopicos();
    } catch (error) {
      console.error("Erro ao atualizar tópico:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o tópico.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Excluir tópico
  const handleDeleteTopico = async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("topicos_padrao")
        .delete()
        .eq("modelo_id", deleteConfirm.modelo_id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico removido com sucesso.",
      });

      setDeleteConfirm(null);
      fetchTopicos();
    } catch (error) {
      console.error("Erro ao excluir tópico:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o tópico.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Gerenciar Tópicos Padrão do Currículo
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Adicione, edite ou remova os tópicos que serão atribuídos automaticamente aos alunos por nível CEFR.
            </p>
          </DialogHeader>

          {/* Seletor de Nível CEFR */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <Label>Nível CEFR:</Label>
            <div className="flex gap-2">
              {NIVEIS_CEFR.map((nivel) => (
                <Button
                  key={nivel}
                  variant={selectedNivel === nivel ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedNivel(nivel)}
                >
                  {nivel}
                </Button>
              ))}
            </div>
            <Badge variant="secondary" className="ml-auto">
              {topicos.length} tópicos
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="space-y-4 pb-4">
                {categorias.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma categoria encontrada. Adicione categorias primeiro.
                  </div>
                ) : (
                  categorias.map((categoria) => {
                    const topicosCategoria = topicosPorCategoria[categoria.nome] || [];
                    const isAddingToThis = newTopicoCategoria === categoria.nome;

                    return (
                      <Collapsible
                        key={categoria.id}
                        open={expandedCategories.has(categoria.nome)}
                        onOpenChange={() => toggleCategory(categoria.nome)}
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{categoria.nome}</span>
                            <Badge variant="secondary" className="text-xs">
                              {topicosCategoria.length}
                            </Badge>
                          </div>
                          <ChevronDown 
                            className={`h-4 w-4 transition-transform duration-200 ${
                              expandedCategories.has(categoria.nome) ? 'rotate-180' : ''
                            }`} 
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 mt-2 pl-2">
                            {/* Lista de tópicos existentes */}
                          {topicosCategoria.map((topico) => {
                            const isEditing = editingTopico?.modelo_id === topico.modelo_id;

                            return (
                              <div
                                key={topico.modelo_id}
                                className={`flex items-center gap-2 p-3 rounded-lg border ${
                                  isEditing ? 'border-primary bg-primary/5' : 'border-border'
                                }`}
                              >
                                {isEditing ? (
                                  <>
                                    <Input
                                      value={editingTopico.descricao_topico}
                                      onChange={(e) =>
                                        setEditingTopico({
                                          ...editingTopico,
                                          descricao_topico: e.target.value,
                                        })
                                      }
                                      className="flex-1"
                                      autoFocus
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={handleSaveEdit}
                                      disabled={saving}
                                    >
                                      {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Save className="h-4 w-4 text-green-600" />
                                      )}
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingTopico(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm flex-1">
                                      {topico.descricao_topico}
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingTopico({ ...topico })}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setDeleteConfirm(topico)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })}

                            {/* Formulário de adicionar novo tópico */}
                            {isAddingToThis ? (
                              <div className="flex items-center gap-2 p-3 rounded-lg border border-primary bg-primary/5">
                                <Input
                                  placeholder="Descrição do novo tópico..."
                                  value={newTopicoText}
                                  onChange={(e) => setNewTopicoText(e.target.value)}
                                  className="flex-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTopico();
                                    if (e.key === 'Escape') {
                                      setNewTopicoCategoria(null);
                                      setNewTopicoText("");
                                    }
                                  }}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleAddTopico}
                                  disabled={saving || !newTopicoText.trim()}
                                >
                                  {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setNewTopicoCategoria(null);
                                    setNewTopicoText("");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-dashed"
                                onClick={() => setNewTopicoCategoria(categoria.nome)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar tópico em {categoria.nome}
                              </Button>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tópico{" "}
              <strong>"{deleteConfirm?.descricao_topico}"</strong>?
              <br />
              <br />
              <span className="text-amber-600">
                ⚠️ Esta ação não afetará alunos que já possuem este tópico atribuído, 
                apenas novos alunos não receberão mais este tópico automaticamente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTopico}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
