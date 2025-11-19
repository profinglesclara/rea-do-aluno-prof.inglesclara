import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AlunoTarefas() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filterTipo, setFilterTipo] = useState<"Todas" | "Obrigatoria" | "Sugerida">("Todas");
  const [filterStatus, setFilterStatus] = useState<"Todos" | "Pendente" | "Entregue" | "Corrigida">("Todos");

  // Buscar usuário logado
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        navigate("/login");
        return;
      }

      if (data.tipo_usuario !== "Aluno") {
        navigate("/login");
        return;
      }

      setCurrentUser(data);
      setLoading(false);
    };

    fetchCurrentUser();
  }, [navigate]);

  const aluno = currentUser;

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

  // Buscar entregas para verificar se há correção
  const { data: entregas } = useQuery({
    queryKey: ["entregasAluno", aluno?.user_id],
    enabled: !!aluno?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas_tarefas")
        .select("*")
        .eq("aluno_id", aluno!.user_id);
      
      if (error) throw error;
      return data;
    },
  });

  // Filtrar tarefas
  const tarefasFiltradas = tarefas?.filter((t) => {
    if (filterTipo !== "Todas" && t.tipo !== filterTipo) return false;
    if (filterStatus !== "Todos" && t.status !== filterStatus) return false;
    return true;
  }) || [];

  const tarefasObrigatorias = tarefasFiltradas.filter((t) => t.tipo === "Obrigatoria");
  const tarefasSugeridas = tarefasFiltradas.filter((t) => t.tipo === "Sugerida");
  
  const getEntregaPorTarefa = (tarefaId: string) => {
    return entregas?.find((e) => e.tarefa_id === tarefaId);
  };

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

  const renderTarefa = (tarefa: any) => {
    const entrega = getEntregaPorTarefa(tarefa.id);
    const temCorrecao = entrega && entrega.url_pdf && tarefa.status === "Corrigida";
    
    return (
      <div
        key={tarefa.id}
        className={`border rounded-lg p-4 ${
          isAtrasada(tarefa.data_limite, tarefa.status) ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{tarefa.titulo}</h3>
          <div className="flex items-center gap-2">
            <Badge variant={tarefa.tipo === "Obrigatoria" ? "default" : "secondary"}>
              {tarefa.tipo === "Obrigatoria" ? "Obrigatória" : "Sugerida"}
            </Badge>
            {getStatusBadge(tarefa.status)}
          </div>
        </div>
        {tarefa.descricao && (
          <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
        )}
        <div className="flex items-center justify-between">
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
          <div className="flex gap-2">
            {temCorrecao && (
              <Button
                size="sm"
                variant="default"
                onClick={() => window.open(entrega.url_pdf, "_blank")}
              >
                Ver correção
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate(`/aluno/tarefas/${tarefa.id}`)}
            >
              Ver detalhes
            </Button>
          </div>
        </div>
      </div>
    );
  };

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
        
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterTipo === "Todas" ? "default" : "outline"}
                    onClick={() => setFilterTipo("Todas")}
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant={filterTipo === "Obrigatoria" ? "default" : "outline"}
                    onClick={() => setFilterTipo("Obrigatoria")}
                  >
                    Obrigatórias
                  </Button>
                  <Button
                    size="sm"
                    variant={filterTipo === "Sugerida" ? "default" : "outline"}
                    onClick={() => setFilterTipo("Sugerida")}
                  >
                    Sugeridas
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterStatus === "Todos" ? "default" : "outline"}
                    onClick={() => setFilterStatus("Todos")}
                  >
                    Todos
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === "Pendente" ? "default" : "outline"}
                    onClick={() => setFilterStatus("Pendente")}
                  >
                    Pendentes
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === "Entregue" ? "default" : "outline"}
                    onClick={() => setFilterStatus("Entregue")}
                  >
                    Entregues
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === "Corrigida" ? "default" : "outline"}
                    onClick={() => setFilterStatus("Corrigida")}
                  >
                    Corrigidas
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
