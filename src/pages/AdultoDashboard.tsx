import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useEffect, useState } from "react";

type DashboardData = {
  aluno_id: string;
  nome_aluno: string;
  nivel_cefr: string | null;
  modalidade: string | null;
  progresso_geral: number | null;
  total_aulas: number;
  total_concluidas: number;
  total_agendadas: number;
  total_canceladas: number;
};

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
        .single();

      if (error) throw error;
      return data as DashboardData;
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
      <div className="max-w-7xl mx-auto">
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
            <h1 className="text-3xl font-bold">Meu Progresso</h1>
          </div>
          <NotificationBell userId={currentUser?.user_id || ""} />
        </div>

        {/* Dados do aluno adulto */}
        {!dashboardData ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Carregando seus dados...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentUser?.nome_completo}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      {dashboardData.nivel_cefr && (
                        <Badge variant="outline">{dashboardData.nivel_cefr}</Badge>
                      )}
                      {dashboardData.modalidade && (
                        <Badge variant="outline">{dashboardData.modalidade}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={() => navigate(`/responsavel/aluno/${currentUser?.user_id}`)}>
                  Ver detalhes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progresso Geral */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progresso Geral</span>
                  <span className="text-sm text-muted-foreground">
                    {dashboardData.progresso_geral || 0}%
                  </span>
                </div>
                <Progress value={dashboardData.progresso_geral || 0} />
              </div>

              {/* Resumo de aulas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{dashboardData.total_aulas || 0}</div>
                  <div className="text-xs text-muted-foreground">Total de aulas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData.total_concluidas || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Realizadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData.total_agendadas || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Agendadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {dashboardData.total_canceladas || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Faltou</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
