import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useQuery } from "@tanstack/react-query";

type DashboardRow = {
  aluno_id: string;
  nome_aluno: string;
  nivel_cefr: string | null;
  modalidade: string | null;
  frequencia_mensal: number | null;
  progresso_geral: number | null;
  total_aulas: number;
  total_concluidas: number;
  total_agendadas: number;
  total_canceladas: number;
  total_remarcadas: number;
  proxima_aula_data: string | null;
  atividades_tarefas_pendentes: number;
  total_conquistas: number;
};

export default function ResponsavelAlunoDetalhes() {
  const { aluno_id } = useParams<{ aluno_id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Verificar acesso
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !userData) {
        navigate("/login");
        return;
      }

      // Verificar se é Responsável ou Adulto
      if (userData.tipo_usuario !== "Responsável" && userData.tipo_usuario !== "Adulto") {
        navigate("/");
        return;
      }

      // Verificar se tem permissão para ver este aluno
      if (userData.tipo_usuario === "Adulto") {
        // Adulto só pode ver ele mesmo
        if (aluno_id !== userData.user_id) {
          navigate("/responsavel/dashboard");
          return;
        }
      } else {
        // Responsavel precisa ter este aluno vinculado
        const { data: alunoData } = await supabase
          .from("usuarios")
          .select("responsavel_por")
          .eq("user_id", aluno_id!)
          .eq("tipo_usuario", "Aluno")
          .single();

        if (!alunoData || alunoData.responsavel_por !== userData.user_id) {
          navigate("/responsavel/dashboard");
          return;
        }
      }

      setCurrentUser(userData);
      setLoading(false);
    };

    checkAccess();
  }, [aluno_id, navigate]);

  // Buscar dados do aluno
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["dashboardAlunoResponsavel", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_resumo_alunos")
        .select("*")
        .eq("aluno_id", aluno_id!)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Aluno não encontrado");
      return data as DashboardRow;
    },
  });

  // Buscar progresso por categoria
  const { data: progressoData } = useQuery({
    queryKey: ["progressoCategorias", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("progresso_por_categoria")
        .eq("user_id", aluno_id!)
        .single();

      if (error) throw error;
      return data?.progresso_por_categoria as Record<string, any> | null;
    },
  });

  if (loading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Aluno não encontrado.</p>
      </div>
    );
  }

  const categorias = progressoData ? Object.entries(progressoData) : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/responsavel/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{dashboard.nome_aluno}</h1>
              <p className="text-muted-foreground">Detalhes do aluno</p>
            </div>
          </div>
          {currentUser && <NotificationBell userId={currentUser.user_id} />}
        </div>

        {/* Informações básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Nível CEFR</p>
                <Badge variant="secondary" className="mt-1">
                  {dashboard.nivel_cefr || "Não definido"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modalidade</p>
                <Badge variant="outline" className="mt-1">
                  {dashboard.modalidade || "Não definido"}
                </Badge>
              </div>
              {dashboard.frequencia_mensal && (
                <div>
                  <p className="text-sm text-muted-foreground">Frequência Mensal</p>
                  <p className="font-medium">{dashboard.frequencia_mensal}x por mês</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progresso */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Progresso geral</span>
                <span className="text-2xl font-bold text-primary">
                  {dashboard.progresso_geral?.toFixed(0) || 0}%
                </span>
              </div>
              <Progress value={dashboard.progresso_geral || 0} className="h-3" />
            </div>

            {categorias.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Progresso por Categoria</h4>
                <div className="space-y-3">
                  {categorias.map(([categoria, dados]: [string, any]) => (
                    <div key={categoria}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{categoria}</span>
                        <span className="text-sm text-muted-foreground">
                          {dados?.percentual_concluido?.toFixed(0) || 0}%
                        </span>
                      </div>
                      <Progress
                        value={dados?.percentual_concluido || 0}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo de aulas */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de aulas</p>
                <p className="text-2xl font-bold">{dashboard.total_aulas || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Realizadas</p>
                <p className="text-2xl font-bold text-green-600">{dashboard.total_concluidas || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold text-blue-600">{dashboard.total_agendadas || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Faltou</p>
                <p className="text-2xl font-bold text-red-600">{dashboard.total_canceladas || 0}</p>
              </div>
            </div>

            {dashboard.proxima_aula_data && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Próxima aula</p>
                <p className="font-medium">
                  {new Date(dashboard.proxima_aula_data).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarefas e Conquistas */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tarefas pendentes</span>
                  <span className="text-2xl font-bold">
                    {dashboard.atividades_tarefas_pendentes || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Conquistas desbloqueadas</span>
                  <span className="text-2xl font-bold">
                    {dashboard.total_conquistas || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
