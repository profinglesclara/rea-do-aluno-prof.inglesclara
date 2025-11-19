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

type AlunoVinculado = {
  user_id: string;
  nome_completo: string;
  nivel_cefr: string | null;
  modalidade: string | null;
  progresso_geral: number | null;
  tipo_usuario: string;
};

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

export default function ResponsavelDashboard() {
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

      // Verificar se é Responsável ou Adulto
      if (data.tipo_usuario !== "Responsável" && data.tipo_usuario !== "Adulto") {
        // Redirecionar para painel correto
        if (data.tipo_usuario === "Admin") {
          navigate("/admin");
        } else if (data.tipo_usuario === "Aluno") {
          navigate("/aluno/dashboard");
        }
        return;
      }

      setCurrentUser(data);
      setLoading(false);
    };

    fetchCurrentUser();
  }, [navigate]);

  // Buscar alunos vinculados
  const { data: alunosVinculados, isLoading: alunosLoading } = useQuery({
    queryKey: ["alunosVinculados", currentUser?.user_id],
    enabled: !!currentUser,
    queryFn: async () => {
      if (currentUser.tipo_usuario === "Adulto") {
        // Para Adulto, retorna ele mesmo como único aluno
        const alunos: AlunoVinculado[] = [{
          user_id: currentUser.user_id,
          nome_completo: currentUser.nome_completo,
          nivel_cefr: currentUser.nivel_cefr,
          modalidade: currentUser.modalidade,
          progresso_geral: currentUser.progresso_geral,
          tipo_usuario: currentUser.tipo_usuario,
        }];
        return alunos;
      } else {
        // Para Responsavel, busca alunos onde responsavel_por = user_id do responsavel
        const { data, error } = await supabase
          .from("usuarios")
          .select("user_id, nome_completo, nivel_cefr, modalidade, progresso_geral, tipo_usuario")
          .eq("tipo_usuario", "Aluno")
          .eq("responsavel_por", currentUser.user_id);

        if (error) throw error;
        return data as AlunoVinculado[];
      }
    },
  });

  // Buscar dados detalhados de cada aluno via dashboard_resumo_alunos
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboardAlunos", alunosVinculados?.map(a => a.user_id)],
    enabled: !!alunosVinculados && alunosVinculados.length > 0,
    queryFn: async () => {
      const ids = alunosVinculados!.map(a => a.user_id);
      const { data, error } = await supabase
        .from("dashboard_resumo_alunos")
        .select("*")
        .in("aluno_id", ids);

      if (error) throw error;
      return data as DashboardData[];
    },
  });

  if (loading || alunosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const titulo = currentUser.tipo_usuario === "Adulto" 
    ? "Meu Progresso" 
    : "Meus Alunos";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{titulo}</h1>
              <p className="text-muted-foreground">
                {currentUser.tipo_usuario === "Adulto" 
                  ? "Acompanhe seu progresso e atividades" 
                  : "Acompanhe o progresso dos seus alunos"}
              </p>
            </div>
          </div>
          <NotificationBell userId={currentUser.user_id} />
        </div>

        {/* Lista de alunos vinculados */}
        {!alunosVinculados || alunosVinculados.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Nenhum aluno vinculado encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {alunosVinculados.map((aluno) => {
              const dashboard = dashboardData?.find(d => d.aluno_id === aluno.user_id);
              
              return (
                <Card key={aluno.user_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{aluno.nome_completo}</CardTitle>
                          <div className="flex gap-2 mt-1">
                            {aluno.nivel_cefr && (
                              <Badge variant="secondary">{aluno.nivel_cefr}</Badge>
                            )}
                            {aluno.modalidade && (
                              <Badge variant="outline">{aluno.modalidade}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progresso geral */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progresso geral</span>
                        <span className="text-sm text-muted-foreground">
                          {aluno.progresso_geral?.toFixed(0) || 0}%
                        </span>
                      </div>
                      <Progress value={aluno.progresso_geral || 0} className="h-2" />
                    </div>

                    {/* Resumo de aulas */}
                    {dashboard && (
                      <div className="text-sm space-y-1">
                        <p className="font-medium">Aulas no mês:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span>✓ {dashboard.total_concluidas || 0} realizadas</span>
                          <span>📅 {dashboard.total_agendadas || 0} agendadas</span>
                          <span>❌ {dashboard.total_canceladas || 0} faltou</span>
                          <span>📊 {dashboard.total_aulas || 0} total</span>
                        </div>
                      </div>
                    )}

                    {/* Botão Ver detalhes */}
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/responsavel/aluno/${aluno.user_id}`)}
                    >
                      Ver detalhes
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
