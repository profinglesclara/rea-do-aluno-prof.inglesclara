import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, TrendingUp, BookOpen, Award } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useEffect, useState } from "react";

export default function AdultoDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        console.error("Erro ao buscar usuário:", error);
        navigate("/login");
        return;
      }

      // Verificar se é Adulto
      if (data.tipo_usuario !== "Adulto") {
        // Redirecionar para painel correto
        if (data.tipo_usuario === "Admin") {
          navigate("/admin");
        } else if (data.tipo_usuario === "Aluno") {
          navigate("/aluno/dashboard");
        } else if (data.tipo_usuario === "Responsável") {
          navigate("/responsavel/dashboard");
        }
        return;
      }

      setCurrentUser(data);
      setLoading(false);
    };

    fetchCurrentUser();
  }, [navigate]);

  // Buscar dados do próprio aluno adulto
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboardAlunoAdulto", currentUser?.user_id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_resumo_alunos")
        .select("*")
        .eq("aluno_id", currentUser.user_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Meu Portal</h1>
              <p className="text-muted-foreground">{currentUser?.nome_completo}</p>
            </div>
          </div>
          <NotificationBell userId={currentUser?.user_id || ""} />
        </div>

        {/* Cards principais */}
        {!dashboardData ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Perfil de aluno adulto não encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Calendário de Aulas */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Calendário de Aulas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {dashboardData.total_agendadas || 0} aulas agendadas
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/adulto/calendario")}
                  className="w-full"
                >
                  Ver calendário
                </Button>
              </CardContent>
            </Card>

            {/* Progressos */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>Meu Progresso</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {dashboardData.progresso_geral || 0}% concluído
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/adulto/progresso")}
                  className="w-full"
                >
                  Ver progresso
                </Button>
              </CardContent>
            </Card>

            {/* Tarefas */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle>Minhas Tarefas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {dashboardData.atividades_tarefas_pendentes || 0} tarefas pendentes
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/adulto/tarefas")}
                  className="w-full"
                >
                  Ver tarefas
                </Button>
              </CardContent>
            </Card>

            {/* Conquistas */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Award className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle>Minhas Conquistas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {dashboardData.total_conquistas || 0} conquistas desbloqueadas
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/adulto/conquistas")}
                  className="w-full"
                >
                  Ver conquistas
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
