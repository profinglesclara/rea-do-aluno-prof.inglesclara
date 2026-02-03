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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, FolderTree, Plus, Pencil, Trash2, Save, X, GripVertical } from "lucide-react";

type Categoria = {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  criada_em: string | null;
};

interface GerenciarCategoriasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriasUpdated?: () => void;
}

export function GerenciarCategoriasDialog({
  open,
  onOpenChange,
  onCategoriasUpdated,
}: GerenciarCategoriasDialogProps) {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para edição/criação
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoriaNome, setNewCategoriaNome] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Categoria | null>(null);

  // Buscar categorias
  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as categorias.",
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

  // Adicionar nova categoria
  const handleAddCategoria = async () => {
    if (!newCategoriaNome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome da categoria não pode estar vazio.",
      });
      return;
    }

    // Verificar se já existe
    if (categorias.some(c => c.nome.toLowerCase() === newCategoriaNome.trim().toLowerCase())) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Já existe uma categoria com este nome.",
      });
      return;
    }

    setSaving(true);
    try {
      const maxOrdem = categorias.reduce((max, c) => Math.max(max, c.ordem), 0);

      const { error } = await supabase
        .from("categorias")
        .insert({
          nome: newCategoriaNome.trim(),
          ordem: maxOrdem + 1,
          ativa: true,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria adicionada com sucesso.",
      });

      setIsAddingNew(false);
      setNewCategoriaNome("");
      fetchCategorias();
      onCategoriasUpdated?.();
    } catch (error) {
      console.error("Erro ao adicionar categoria:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar a categoria.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editingCategoria || !editingCategoria.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome da categoria não pode estar vazio.",
      });
      return;
    }

    // Verificar se já existe outra com mesmo nome
    if (categorias.some(c => 
      c.id !== editingCategoria.id && 
      c.nome.toLowerCase() === editingCategoria.nome.trim().toLowerCase()
    )) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Já existe uma categoria com este nome.",
      });
      return;
    }

    setSaving(true);
    try {
      const nomeOriginal = categorias.find(c => c.id === editingCategoria.id)?.nome;
      const novoNome = editingCategoria.nome.trim();

      // Atualizar categoria
      const { error } = await supabase
        .from("categorias")
        .update({ nome: novoNome })
        .eq("id", editingCategoria.id);

      if (error) throw error;

      // Se o nome mudou, atualizar também nos tópicos padrão e progresso
      if (nomeOriginal && nomeOriginal !== novoNome) {
        // Atualizar topicos_padrao
        const { error: erroPadrao } = await supabase
          .from("topicos_padrao")
          .update({ categoria: novoNome })
          .eq("categoria", nomeOriginal);

        if (erroPadrao) {
          console.error("Erro ao atualizar topicos_padrao:", erroPadrao);
        }

        // Atualizar topicos_progresso
        const { error: erroProgresso } = await supabase
          .from("topicos_progresso")
          .update({ categoria: novoNome })
          .eq("categoria", nomeOriginal);

        if (erroProgresso) {
          console.error("Erro ao atualizar topicos_progresso:", erroProgresso);
        }
      }

      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso.",
      });

      setEditingCategoria(null);
      fetchCategorias();
      onCategoriasUpdated?.();
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a categoria.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle ativa/inativa
  const handleToggleAtiva = async (categoria: Categoria) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("categorias")
        .update({ ativa: !categoria.ativa })
        .eq("id", categoria.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Categoria ${!categoria.ativa ? 'ativada' : 'desativada'} com sucesso.`,
      });

      fetchCategorias();
      onCategoriasUpdated?.();
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a categoria.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Excluir categoria
  const handleDeleteCategoria = async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    try {
      // Verificar se há tópicos usando esta categoria
      const { count: countPadrao } = await supabase
        .from("topicos_padrao")
        .select("*", { count: 'exact', head: true })
        .eq("categoria", deleteConfirm.nome);

      const { count: countProgresso } = await supabase
        .from("topicos_progresso")
        .select("*", { count: 'exact', head: true })
        .eq("categoria", deleteConfirm.nome);

      if ((countPadrao || 0) > 0 || (countProgresso || 0) > 0) {
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: `Esta categoria possui ${(countPadrao || 0) + (countProgresso || 0)} tópicos associados. Remova os tópicos primeiro ou desative a categoria.`,
        });
        setDeleteConfirm(null);
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("categorias")
        .delete()
        .eq("id", deleteConfirm.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria removida com sucesso.",
      });

      setDeleteConfirm(null);
      fetchCategorias();
      onCategoriasUpdated?.();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a categoria.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Mover categoria (reordenar)
  const handleMoveCategoria = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categorias.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newCategorias = [...categorias];
    const temp = newCategorias[index];
    newCategorias[index] = newCategorias[newIndex];
    newCategorias[newIndex] = temp;

    // Atualizar ordens
    setSaving(true);
    try {
      const updates = newCategorias.map((cat, i) => ({
        id: cat.id,
        ordem: i + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("categorias")
          .update({ ordem: update.ordem })
          .eq("id", update.id);

        if (error) throw error;
      }

      setCategorias(newCategorias.map((cat, i) => ({ ...cat, ordem: i + 1 })));
      onCategoriasUpdated?.();
    } catch (error) {
      console.error("Erro ao reordenar categorias:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível reordenar as categorias.",
      });
      fetchCategorias();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Gerenciar Categorias
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Adicione, edite, reordene ou remova as categorias de tópicos. As categorias são usadas para organizar o currículo.
            </p>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="space-y-2 pb-4">
                {categorias.map((categoria, index) => {
                  const isEditing = editingCategoria?.id === categoria.id;

                  return (
                    <div
                      key={categoria.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isEditing ? 'border-primary bg-primary/5' : 'border-border'
                      } ${!categoria.ativa ? 'opacity-60 bg-muted/30' : ''}`}
                    >
                      {/* Grip para indicar drag (visual apenas) */}
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveCategoria(index, 'up')}
                          disabled={index === 0 || saving}
                        >
                          <span className="text-xs">▲</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveCategoria(index, 'down')}
                          disabled={index === categorias.length - 1 || saving}
                        >
                          <span className="text-xs">▼</span>
                        </Button>
                      </div>

                      {isEditing ? (
                        <>
                          <Input
                            value={editingCategoria.nome}
                            onChange={(e) =>
                              setEditingCategoria({
                                ...editingCategoria,
                                nome: e.target.value,
                              })
                            }
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingCategoria(null);
                            }}
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
                            onClick={() => setEditingCategoria(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className={`text-sm flex-1 font-medium ${!categoria.ativa ? 'line-through text-muted-foreground' : ''}`}>
                            {categoria.nome}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`switch-${categoria.id}`} className="text-xs text-muted-foreground">
                              {categoria.ativa ? 'Ativa' : 'Inativa'}
                            </Label>
                            <Switch
                              id={`switch-${categoria.id}`}
                              checked={categoria.ativa}
                              onCheckedChange={() => handleToggleAtiva(categoria)}
                              disabled={saving}
                            />
                          </div>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingCategoria({ ...categoria })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(categoria)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Formulário de nova categoria */}
                {isAddingNew ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome da nova categoria..."
                      value={newCategoriaNome}
                      onChange={(e) => setNewCategoriaNome(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategoria();
                        if (e.key === 'Escape') {
                          setIsAddingNew(false);
                          setNewCategoriaNome("");
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleAddCategoria}
                      disabled={saving || !newCategoriaNome.trim()}
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
                        setIsAddingNew(false);
                        setNewCategoriaNome("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => setIsAddingNew(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Nova Categoria
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <p className="text-xs text-muted-foreground flex-1">
              Categorias desativadas não aparecem nos relatórios e progresso.
            </p>
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
              Tem certeza que deseja excluir a categoria{" "}
              <strong>"{deleteConfirm?.nome}"</strong>?
              <br />
              <br />
              <span className="text-amber-600">
                ⚠️ Só é possível excluir categorias que não possuem tópicos associados.
                Para categorias com tópicos, considere desativá-la.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategoria}
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
