import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "@/components/LogoutButton";
import { ArrowLeft, Plus, Pencil, Trophy, Star, Target, Award, Zap, Heart, Search } from "lucide-react";

const iconOptions = ["Star", "Trophy", "Target", "Award", "Zap", "Heart"];
const iconMap: Record<string, any> = { Star, Trophy, Target, Award, Zap, Heart };

type ConquistaMestre = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  slug: string;
  ordem_exibicao: number;
  ativa: boolean;
  tipo: "GERAL" | "NIVEL";
  nivel_cefr: string | null;
  automacao: boolean;
};

type FormData = {
  nome: string;
  descricao: string;
  icone: string;
  slug: string;
  ordem_exibicao: number;
  tipo: "GERAL" | "NIVEL";
  nivel_cefr: string | null;
  automacao: boolean;
  ativa: boolean;
};

const emptyForm: FormData = {
  nome: "",
  descricao: "",
  icone: "Trophy",
  slug: "",
  ordem_exibicao: 0,
  tipo: "GERAL",
  nivel_cefr: null,
  automacao: false,
  ativa: true,
};

export default function AdminConquistas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [nivelFilter, setNivelFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const { data: conquistas = [], isLoading } = useQuery({
    queryKey: ["adminConquistasMestre"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conquistas_mestre")
        .select("*")
        .order("ordem_exibicao");
      if (error) throw error;
      return data as ConquistaMestre[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData & { id?: string }) => {
      const payload: any = {
        nome: data.nome,
        descricao: data.descricao,
        icone: data.icone,
        slug: data.slug,
        ordem_exibicao: data.ordem_exibicao,
        tipo: data.tipo,
        nivel_cefr: data.tipo === "NIVEL" ? data.nivel_cefr : null,
        automacao: data.automacao,
        ativa: data.ativa,
      };

      if (data.id) {
        const { error } = await supabase
          .from("conquistas_mestre")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("conquistas_mestre")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminConquistasMestre"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Conquista atualizada!" : "Conquista criada!" });
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Erro ao salvar", description: String(error), variant: "destructive" });
    },
  });

  const toggleAtivaMutation = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase
        .from("conquistas_mestre")
        .update({ ativa })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminConquistasMestre"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: ConquistaMestre) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      descricao: c.descricao,
      icone: c.icone,
      slug: c.slug,
      ordem_exibicao: c.ordem_exibicao,
      tipo: c.tipo,
      nivel_cefr: c.nivel_cefr,
      automacao: c.automacao,
      ativa: c.ativa,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.descricao || !form.slug) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (form.tipo === "NIVEL" && !form.nivel_cefr) {
      toast({ title: "Selecione o nível CEFR para conquistas do tipo NÍVEL", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  const filtered = conquistas.filter((c) => {
    if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (tipoFilter !== "all" && c.tipo !== tipoFilter) return false;
    if (nivelFilter !== "all" && c.nivel_cefr !== nivelFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Gerenciar Conquistas</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Conquista
            </Button>
            <LogoutButton variant="outline" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar conquista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="GERAL">Geral</SelectItem>
                  <SelectItem value="NIVEL">Nível</SelectItem>
                </SelectContent>
              </Select>
              <Select value={nivelFilter} onValueChange={setNivelFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="A1">A1</SelectItem>
                  <SelectItem value="A2">A2</SelectItem>
                  <SelectItem value="B1">B1</SelectItem>
                  <SelectItem value="B2">B2</SelectItem>
                  <SelectItem value="C1">C1</SelectItem>
                  <SelectItem value="C2">C2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conquista</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead className="text-center">Nível</TableHead>
                      <TableHead className="text-center">Automação</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Ordem</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Nenhuma conquista encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((c) => {
                        const Icon = iconMap[c.icone] || Trophy;
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-yellow-500" />
                                <div>
                                  <p className="font-medium">{c.nome}</p>
                                  <p className="text-xs text-muted-foreground">{c.descricao}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={c.tipo === "GERAL" ? "default" : "secondary"}>
                                {c.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {c.nivel_cefr || "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {c.automacao ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">Auto</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Manual</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={c.ativa}
                                onCheckedChange={(checked) =>
                                  toggleAtivaMutation.mutate({ id: c.id, ativa: checked })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">{c.ordem_exibicao}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Conquista" : "Nova Conquista"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="ex: primeira_aula" />
                </div>
                <div className="space-y-2">
                  <Label>Ordem de Exibição</Label>
                  <Input type="number" value={form.ordem_exibicao} onChange={(e) => setForm({ ...form, ordem_exibicao: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select value={form.icone} onValueChange={(v) => setForm({ ...form, icone: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => {
                        const I = iconMap[icon];
                        return (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              <I className="h-4 w-4" /> {icon}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v: "GERAL" | "NIVEL") => setForm({ ...form, tipo: v, nivel_cefr: v === "GERAL" ? null : form.nivel_cefr })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GERAL">Geral</SelectItem>
                      <SelectItem value="NIVEL">Nível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.tipo === "NIVEL" && (
                <div className="space-y-2">
                  <Label>Nível CEFR *</Label>
                  <Select value={form.nivel_cefr || ""} onValueChange={(v) => setForm({ ...form, nivel_cefr: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A1", "A2", "B1", "B2", "C1", "C2"].map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.automacao} onCheckedChange={(v) => setForm({ ...form, automacao: v })} />
                  <Label>Automação (disparada pelo sistema)</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativa} onCheckedChange={(v) => setForm({ ...form, ativa: v })} />
                <Label>Ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
