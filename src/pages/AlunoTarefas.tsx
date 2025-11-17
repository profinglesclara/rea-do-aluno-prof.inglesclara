import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AlunoTarefas() {
  const navigate = useNavigate();

  // Buscar o primeiro aluno teste
  const { data: aluno } = useQuery({
    queryKey: ["alunoTeste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("tipo_usuario", "Aluno")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar tarefas do aluno
  const { data: tarefas } = useQuery({
    queryKey: ["tarefasAluno", aluno?.user_id],
    enabled: !!aluno?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .eq("aluno_id", aluno!.user_id)
        .order("criada_em", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const tarefasObrigatorias = tarefas?.filter((t) => t.tipo === "Obrigatoria") || [];
  const tarefasSugeridas = tarefas?.filter((t) => t.tipo === "Sugerida") || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Pendente: "secondary",
      Entregue: "default",
      Corrigida: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const isAtrasada = (dataLimite: string | null, status: string) => {
    if (!dataLimite || status !== "Pendente") return false;
    return isPast(parseISO(dataLimite));
  };

  const renderTarefa = (tarefa: any) => (
    <div
      key={tarefa.id}
      className={`border rounded-lg p-4 ${
        isAtrasada(tarefa.data_limite, tarefa.status) ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{tarefa.titulo}</h3>
        {getStatusBadge(tarefa.status)}
      </div>
      {tarefa.descricao && (
        <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
      )}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>
          {tarefa.data_limite
            ? `Data limite: ${format(parseISO(tarefa.data_limite), "dd/MM/yyyy", { locale: ptBR })}`
            : "Sem data limite"}
        </span>
        {isAtrasada(tarefa.data_limite, tarefa.status) && (
          <span className="text-red-600 font-medium">ATRASADA</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
        </div>

        {/* Tarefas Obrigatórias */}
        <Card>
          <CardHeader>
            <CardTitle>Tarefas Obrigatórias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tarefasObrigatorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa obrigatória no momento.
              </p>
            ) : (
              tarefasObrigatorias.map(renderTarefa)
            )}
          </CardContent>
        </Card>

        {/* Tarefas Sugeridas */}
        <Card>
          <CardHeader>
            <CardTitle>Tarefas Sugeridas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tarefasSugeridas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa sugerida no momento.
              </p>
            ) : (
              tarefasSugeridas.map(renderTarefa)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
