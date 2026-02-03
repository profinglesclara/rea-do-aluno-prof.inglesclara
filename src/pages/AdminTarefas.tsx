import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Loader2, CheckCircle, FileCheck, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "@/components/LogoutButton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovaTarefaDialog } from "@/components/tarefas/NovaTarefaDialog";
import { MarcarEntregueDialog } from "@/components/tarefas/MarcarEntregueDialog";
import { MarcarCorrigidaDialog } from "@/components/tarefas/MarcarCorrigidaDialog";
import { VerEntregaDialog } from "@/components/tarefas/VerEntregaDialog";
import type { Tables } from "@/integrations/supabase/types";

type Tarefa = Tables<"tarefas">;

interface TarefaComAluno extends Tarefa {
  aluno: {
    nome_completo: string;
    email: string;
  } | null;
}

export default function AdminTarefas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entregueDialogOpen, setEntregueDialogOpen] = useState(false);
  const [corrigidaDialogOpen, setCorrigidaDialogOpen] = useState(false);
  const [verEntregaDialogOpen, setVerEntregaDialogOpen] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<TarefaComAluno | null>(null);
  const [entregaSelecionada, setEntregaSelecionada] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filtros
  const [filterAluno, setFilterAluno] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todas");
  const [filterMes, setFilterMes] = useState<string>("todos");
  const [filterAno, setFilterAno] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [showAguardandoCorrecao, setShowAguardandoCorrecao] = useState(false);

  // Buscar alunos para filtro
  const { data: alunos } = useQuery({
    queryKey: ["alunos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo")
        .eq("tipo_usuario", "Aluno")
        .order("nome_completo", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: tarefas, isLoading } = useQuery({
    queryKey: ["tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select(`
          *,
          aluno:usuarios!tarefas_aluno_id_fkey(nome_completo, email)
        `)
        .order("criada_em", { ascending: false });

      if (error) throw error;
      return data as TarefaComAluno[];
    },
  });

  // Buscar entregas
  const { data: entregas } = useQuery({
    queryKey: ["entregas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas_tarefas")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  const getEntregaPorTarefa = (tarefaId: string) => {
    return entregas?.find((e) => e.tarefa_id === tarefaId);
  };

  // Filtrar tarefas
  const tarefasFiltradas = tarefas?.filter((tarefa) => {
    // Filtro de aluno
    if (filterAluno !== "todos" && tarefa.aluno_id !== filterAluno) return false;
    
    // Filtro de tipo
    if (filterTipo !== "todas" && tarefa.tipo !== filterTipo) return false;
    
    // Filtro de status
    if (filterStatus !== "todos" && tarefa.status !== filterStatus) return false;
    
    // Filtro de mês/ano
    if ((filterMes && filterMes !== "todos") || filterAno) {
      const dataRef = tarefa.data_limite || tarefa.criada_em;
      const data = new Date(dataRef);
      if (filterMes && filterMes !== "todos" && (data.getMonth() + 1).toString() !== filterMes) return false;
      if (filterAno && data.getFullYear().toString() !== filterAno) return false;
    }
    
    // Filtro "aguardando correção" - tarefas com status "Entregue"
    if (showAguardandoCorrecao) {
      if (tarefa.status !== "Entregue") {
        return false;
      }
    }
    
    return true;
  }) || [];

  const criarTarefaMutation = useMutation({
    mutationFn: async (novaTarefa: {
      aluno_id: string;
      titulo: string;
      descricao?: string;
      tipo: string;
      data_limite?: string;
      arquivo_enunciado?: File;
    }) => {
      let url_enunciado: string | undefined = undefined;

      // Upload do PDF de enunciado se existir
      if (novaTarefa.arquivo_enunciado) {
        const file = novaTarefa.arquivo_enunciado;
        // Sanitizar nome do arquivo: remover acentos, espaços e caracteres especiais
        const sanitizedFileName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-zA-Z0-9._-]/g, '_'); // Substitui caracteres especiais por _
        const fileName = `enunciados/${novaTarefa.aluno_id}/${Date.now()}_${sanitizedFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("tarefas")
          .upload(fileName, file, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Use signed URL for private bucket access (1 year expiration for task statements)
        const { data: signedData, error: signedError } = await supabase.storage
          .from("tarefas")
          .createSignedUrl(fileName, 31536000); // 1 year expiration

        if (signedError) throw signedError;
        url_enunciado = signedData.signedUrl;
      }

      // Criar a tarefa (sem o arquivo_enunciado, que já foi processado)
      const { arquivo_enunciado, ...tarefaData } = novaTarefa;
      
      const { data: tarefa, error: tarefaError } = await supabase
        .from("tarefas")
        .insert({
          ...tarefaData,
          url_enunciado,
        })
        .select()
        .single();

      if (tarefaError) throw tarefaError;

      // Buscar dados do aluno
      const { data: aluno, error: alunoError } = await supabase
        .from("usuarios")
        .select("nome_completo, email, responsavel_por")
        .eq("user_id", novaTarefa.aluno_id)
        .single();

      if (alunoError) throw alunoError;

      // Criar notificação para o aluno (para todas as tarefas)
      const tipoLabel = novaTarefa.tipo === "Obrigatoria" ? "obrigatória" : "sugerida";
      const { error: notifError } = await supabase
        .from("notificacoes")
        .insert({
          usuario_id: novaTarefa.aluno_id,
          tipo: "TAREFA_NOVA",
          titulo: `Nova tarefa ${tipoLabel}`,
          mensagem: `Você tem uma nova tarefa ${tipoLabel}: ${novaTarefa.titulo}`,
        });

      if (notifError) {
        console.error("Erro ao criar notificação:", notifError);
      }

      // Enviar email para tarefas obrigatórias
      if (novaTarefa.tipo === "Obrigatoria") {
        try {
          const emailHtml = `
            <h1>Nova Tarefa Obrigatória</h1>
            <p>Olá ${aluno.nome_completo},</p>
            <p>Você tem uma nova tarefa obrigatória disponível no Portal do Aluno:</p>
            <h2>${novaTarefa.titulo}</h2>
            ${novaTarefa.descricao ? `<p>${novaTarefa.descricao}</p>` : ""}
            ${novaTarefa.data_limite ? `<p><strong>Data limite:</strong> ${format(new Date(novaTarefa.data_limite), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>` : ""}
            <p>Acesse o portal para ver mais detalhes e entregar sua tarefa.</p>
          `;

          const { error: emailError } = await supabase.functions.invoke(
            "enviar-email-notificacao",
            {
              body: {
                to: aluno.email,
                subject: "Nova Tarefa Obrigatória - Portal do Aluno",
                html: emailHtml,
              },
            }
          );

          if (emailError) {
            console.error("Erro ao enviar email:", emailError);
          }
        } catch (error) {
          console.error("Erro ao enviar email:", error);
        }
      }

      return tarefa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      setDialogOpen(false);
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao criar tarefa:", error);
      toast({
        title: "Erro ao criar tarefa",
        description: error.message || "Ocorreu um erro ao criar a tarefa.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      Pendente: "outline",
      Entregue: "secondary",
      Corrigida: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    return (
      <Badge variant={tipo === "Obrigatoria" ? "destructive" : "secondary"}>
        {tipo === "Obrigatoria" ? "Obrigatória" : "Sugerida"}
      </Badge>
    );
  };

  const marcarEntregue = (tarefa: TarefaComAluno) => {
    setTarefaSelecionada(tarefa);
    setEntregueDialogOpen(true);
  };

  const marcarCorrigida = (tarefa: TarefaComAluno) => {
    setTarefaSelecionada(tarefa);
    setCorrigidaDialogOpen(true);
  };

  const verEntrega = (tarefa: TarefaComAluno) => {
    const entrega = getEntregaPorTarefa(tarefa.id);
    if (entrega) {
      setTarefaSelecionada(tarefa);
      setEntregaSelecionada(entrega);
      setVerEntregaDialogOpen(true);
    }
  };

  const marcarEntregueAction = useMutation({
    mutationFn: async (data: { tarefaId: string; alunoId: string; urlPdf: string }) => {
      // Criar entrega
      const { error: entregaError } = await supabase
        .from("entregas_tarefas")
        .insert({
          tarefa_id: data.tarefaId,
          aluno_id: data.alunoId,
          url_pdf: data.urlPdf,
        });

      if (entregaError) throw entregaError;

      // Atualizar status da tarefa
      const { error: tarefaError } = await supabase
        .from("tarefas")
        .update({ status: "Entregue" })
        .eq("id", data.tarefaId);

      if (tarefaError) throw tarefaError;

      // Buscar dados do aluno para notificação
      const { data: aluno, error: alunoError } = await supabase
        .from("usuarios")
        .select("nome_completo, email")
        .eq("user_id", data.alunoId)
        .single();

      if (alunoError) throw alunoError;

      // Criar notificação
      const { error: notifError } = await supabase
        .from("notificacoes")
        .insert({
          usuario_id: data.alunoId,
          tipo: "TAREFA_ENTREGUE",
          titulo: "Tarefa entregue",
          mensagem: `Sua entrega da tarefa foi registrada no sistema.`,
        });

      if (notifError) {
        console.error("Erro ao criar notificação:", notifError);
      }

      // Enviar email
      try {
        const emailHtml = `
          <h1>Tarefa Entregue</h1>
          <p>Olá ${aluno.nome_completo},</p>
          <p>Sua entrega foi registrada no Portal do Aluno.</p>
          <p>Em breve o professor fará a correção e você será notificado.</p>
        `;

        const { error: emailError } = await supabase.functions.invoke(
          "enviar-email-notificacao",
          {
            body: {
              to: aluno.email,
              subject: "Tarefa Entregue - Portal do Aluno",
              html: emailHtml,
            },
          }
        );

        if (emailError) {
          console.error("Erro ao enviar email:", emailError);
        }
      } catch (error) {
        console.error("Erro ao enviar email:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      setEntregueDialogOpen(false);
      setTarefaSelecionada(null);
      toast({
        title: "Tarefa marcada como entregue",
        description: "A entrega foi registrada e o aluno foi notificado.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao marcar tarefa como entregue:", error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao marcar a tarefa como entregue.",
        variant: "destructive",
      });
    },
  });

  const marcarCorrigidaAction = useMutation({
    mutationFn: async (data: { tarefaId: string; alunoId: string; feedbackProfessor: string; urlPdfCorrigido?: string }) => {
      // Atualizar status da tarefa e salvar feedback
      const { error: tarefaError } = await supabase
        .from("tarefas")
        .update({ 
          status: "Corrigida",
          feedback_professor: data.feedbackProfessor,
        })
        .eq("id", data.tarefaId);

      if (tarefaError) throw tarefaError;

      // Se houver URL do PDF corrigido, atualizar ou criar entrega
      if (data.urlPdfCorrigido) {
        const { data: entregaExistente } = await supabase
          .from("entregas_tarefas")
          .select("id")
          .eq("tarefa_id", data.tarefaId)
          .single();

        if (entregaExistente) {
          // Atualizar entrega existente
          const { error: updateError } = await supabase
            .from("entregas_tarefas")
            .update({ url_pdf: data.urlPdfCorrigido })
            .eq("id", entregaExistente.id);

          if (updateError) throw updateError;
        } else {
          // Criar nova entrega
          const { error: insertError } = await supabase
            .from("entregas_tarefas")
            .insert({
              tarefa_id: data.tarefaId,
              aluno_id: data.alunoId,
              url_pdf: data.urlPdfCorrigido,
            });

          if (insertError) throw insertError;
        }
      }

      // Buscar dados do aluno para notificação
      const { data: aluno, error: alunoError } = await supabase
        .from("usuarios")
        .select("nome_completo, email")
        .eq("user_id", data.alunoId)
        .single();

      if (alunoError) throw alunoError;

      // Criar notificação
      const { error: notifError } = await supabase
        .from("notificacoes")
        .insert({
          usuario_id: data.alunoId,
          tipo: "TAREFA_CORRIGIDA",
          titulo: "Tarefa corrigida",
          mensagem: `Sua tarefa foi corrigida e está disponível para consulta.`,
        });

      if (notifError) {
        console.error("Erro ao criar notificação:", notifError);
      }

      // Enviar email
      try {
        const emailHtml = `
          <h1>Tarefa Corrigida</h1>
          <p>Olá ${aluno.nome_completo},</p>
          <p>Sua tarefa foi corrigida pelo professor e está disponível para consulta no Portal do Aluno.</p>
          <p><strong>Feedback do professor:</strong></p>
          <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0; color: #555;">${data.feedbackProfessor}</blockquote>
          ${data.urlPdfCorrigido ? `<p>Você pode acessar a correção através do link disponibilizado no portal.</p>` : ""}
        `;

        const { error: emailError } = await supabase.functions.invoke(
          "enviar-email-notificacao",
          {
            body: {
              to: aluno.email,
              subject: "Tarefa Corrigida - Portal do Aluno",
              html: emailHtml,
            },
          }
        );

        if (emailError) {
          console.error("Erro ao enviar email:", emailError);
        }
      } catch (error) {
        console.error("Erro ao enviar email:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      setCorrigidaDialogOpen(false);
      setTarefaSelecionada(null);
      toast({
        title: "Tarefa marcada como corrigida",
        description: "A correção foi registrada e o aluno foi notificado.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao marcar tarefa como corrigida:", error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao marcar a tarefa como corrigida.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gerenciar Tarefas</h1>
              <p className="text-muted-foreground">
                Crie e gerencie tarefas para seus alunos
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova tarefa
            </Button>
            <LogoutButton variant="destructive" />
          </div>
        </div>
        
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Aluno</Label>
                <Select value={filterAluno} onValueChange={setFilterAluno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os alunos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os alunos</SelectItem>
                    {alunos?.map((aluno) => (
                      <SelectItem key={aluno.user_id} value={aluno.user_id}>
                        {aluno.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="Obrigatoria">Obrigatórias</SelectItem>
                    <SelectItem value="Sugerida">Sugeridas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={filterMes} onValueChange={setFilterMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={filterAno}
                  onChange={(e) => setFilterAno(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pendente">Pendentes</SelectItem>
                    <SelectItem value="Entregue">Entregues</SelectItem>
                    <SelectItem value="Corrigida">Corrigidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="aguardando"
                checked={showAguardandoCorrecao}
                onChange={(e) => setShowAguardandoCorrecao(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="aguardando" className="cursor-pointer">
                Mostrar apenas aguardando correção
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Lista de tarefas */}
        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
            <CardDescription>
              {tarefasFiltradas.length} tarefa(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : tarefasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma tarefa encontrada com os filtros selecionados
              </div>
            ) : (
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Entrega</TableHead>
                        <TableHead>Data Limite</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tarefasFiltradas.map((tarefa) => {
                        const entrega = getEntregaPorTarefa(tarefa.id);
                        const temEntrega = !!entrega;
                        const aguardandoCorrecao = tarefa.tipo === "Obrigatoria" && temEntrega && tarefa.status !== "Corrigida";
                        
                        return (
                          <TableRow 
                            key={tarefa.id}
                            className={aguardandoCorrecao ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                          >
                            <TableCell className="font-medium">
                              {tarefa.aluno?.nome_completo || "N/A"}
                            </TableCell>
                            <TableCell>{tarefa.titulo}</TableCell>
                            <TableCell>{getTipoBadge(tarefa.tipo)}</TableCell>
                            <TableCell>{getStatusBadge(tarefa.status)}</TableCell>
                            <TableCell>
                              {temEntrega ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => verEntrega(tarefa)}
                                  className="text-primary hover:text-primary"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Visualizar
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">Sem entrega</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {tarefa.data_limite
                                ? format(new Date(tarefa.data_limite), "dd/MM/yyyy", { locale: ptBR })
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(tarefa.criada_em), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {tarefa.status === "Pendente" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => marcarEntregue(tarefa)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Marcar Entregue
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => marcarCorrigida(tarefa)}
                                    >
                                      <FileCheck className="h-4 w-4 mr-1" />
                                      Marcar Corrigida
                                    </Button>
                                  </>
                                )}
                                {tarefa.status === "Entregue" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => marcarCorrigida(tarefa)}
                                  >
                                    <FileCheck className="h-4 w-4 mr-1" />
                                    Marcar Corrigida
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NovaTarefaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => criarTarefaMutation.mutate(data)}
        isSubmitting={criarTarefaMutation.isPending}
      />

      {tarefaSelecionada && (
        <>
          <MarcarEntregueDialog
            open={entregueDialogOpen}
            onOpenChange={setEntregueDialogOpen}
            tarefa={tarefaSelecionada}
            onSubmit={(urlPdf) =>
              marcarEntregueAction.mutate({
                tarefaId: tarefaSelecionada.id,
                alunoId: tarefaSelecionada.aluno_id,
                urlPdf,
              })
            }
            isSubmitting={marcarEntregueAction.isPending}
          />

          <MarcarCorrigidaDialog
            open={corrigidaDialogOpen}
            onOpenChange={setCorrigidaDialogOpen}
            tarefa={tarefaSelecionada}
            onSubmit={(feedbackProfessor, urlPdfCorrigido) =>
              marcarCorrigidaAction.mutate({
                tarefaId: tarefaSelecionada.id,
                alunoId: tarefaSelecionada.aluno_id,
                feedbackProfessor,
                urlPdfCorrigido,
              })
            }
            isSubmitting={marcarCorrigidaAction.isPending}
          />

          <VerEntregaDialog
            open={verEntregaDialogOpen}
            onOpenChange={setVerEntregaDialogOpen}
            tarefa={tarefaSelecionada}
            entrega={entregaSelecionada}
          />
        </>
      )}
    </div>
  );
}
