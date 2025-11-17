import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovaTarefaDialog } from "@/components/tarefas/NovaTarefaDialog";
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const criarTarefaMutation = useMutation({
    mutationFn: async (novaTarefa: {
      aluno_id: string;
      titulo: string;
      descricao?: string;
      tipo: string;
      data_limite?: string;
    }) => {
      // Criar a tarefa
      const { data: tarefa, error: tarefaError } = await supabase
        .from("tarefas")
        .insert(novaTarefa)
        .select()
        .single();

      if (tarefaError) throw tarefaError;

      // Se for obrigatória, criar notificação e enviar email
      if (novaTarefa.tipo === "Obrigatoria") {
        // Buscar dados do aluno
        const { data: aluno, error: alunoError } = await supabase
          .from("usuarios")
          .select("nome_completo, email, responsavel_por")
          .eq("user_id", novaTarefa.aluno_id)
          .single();

        if (alunoError) throw alunoError;

        // Criar notificação para o aluno
        const { error: notifError } = await supabase
          .from("notificacoes")
          .insert({
            usuario_id: novaTarefa.aluno_id,
            tipo: "TAREFA_NOVA",
            titulo: "Nova tarefa obrigatória",
            mensagem: `Você tem uma nova tarefa obrigatória: ${novaTarefa.titulo}`,
          });

        if (notifError) {
          console.error("Erro ao criar notificação:", notifError);
        }

        // Enviar email
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
        {tipo}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Gerenciar Tarefas</h1>
            <p className="text-muted-foreground">
              Crie e gerencie tarefas para os alunos
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
            <CardDescription>
              Lista de todas as tarefas cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !tarefas || tarefas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma tarefa cadastrada ainda.
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
                      <TableHead>Data Limite</TableHead>
                      <TableHead>Criada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tarefas.map((tarefa) => (
                      <TableRow key={tarefa.id}>
                        <TableCell className="font-medium">
                          {tarefa.aluno?.nome_completo || "N/A"}
                        </TableCell>
                        <TableCell>{tarefa.titulo}</TableCell>
                        <TableCell>{getTipoBadge(tarefa.tipo)}</TableCell>
                        <TableCell>{getStatusBadge(tarefa.status)}</TableCell>
                        <TableCell>
                          {tarefa.data_limite
                            ? format(
                                new Date(tarefa.data_limite),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR }
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(tarefa.criada_em),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR }
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
    </div>
  );
}
