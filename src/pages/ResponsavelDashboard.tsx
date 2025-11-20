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
  aluno_id: string;
  nome_aluno: string;
  nivel_cefr: string | null;
  modalidade: string | null;
  progresso_geral: number | null;
  total_aulas: number;
  total_concluidas: number;
  total_agendadas: number;
  total_canceladas: number;
  total_remarcadas: number;
  atividades_tarefas_pendentes: number;
  total_conquistas: number;
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
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar usuário:", error);
        navigate("/login");
        return;
      }

      if (!data) {
        console.error("Usuário não encontrado");
        navigate("/login");
        return;
      }

      // Verificar se é Responsável
      if (data.tipo_usuario !== "Responsável") {
        if (data.tipo_usuario === "Admin") {
          navigate("/admin/dashboard");
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

  // Buscar alunos vinculados ao responsável
  const { data: alunosVinculados, isLoading: loadingAlunos } = useQuery({
    queryKey: ["alunosVinculados", currentUser?.user_id],
    enabled: !!currentUser,
    queryFn: async () => {
      // Buscar IDs dos alunos vinculados via tabela responsaveis_alunos
      const { data: vinculos } = await supabase
        .from("responsaveis_alunos")
        .select("aluno_id")
        .eq("responsavel_id", currentUser.user_id);

      if (!vinculos || vinculos.length === 0) return [];

      // Buscar dados completos da VIEW
      const { data, error } = await supabase
        .from("dashboard_resumo_alunos")
        .select("*")
        .in("aluno_id", vinculos.map(v => v.aluno_id));

      if (error) throw error;
      return data as AlunoVinculado[];
    },
  });

  if (loading || loadingAlunos) {
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
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum aluno vinculado encontrado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {alunosVinculados.map((aluno) => (
              <Card key={aluno.aluno_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{aluno.nome_aluno}</CardTitle>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {aluno.nivel_cefr && (
                          <Badge variant="secondary">{aluno.nivel_cefr}</Badge>
                        )}
                        {aluno.modalidade && (
                          <Badge variant="outline">{aluno.modalidade}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progresso Geral */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progresso geral</span>
                      <span className="font-medium">{aluno.progresso_geral || 0}%</span>
                    </div>
                    <Progress value={aluno.progresso_geral || 0} className="h-2" />
                  </div>

                  {/* Resumo de Aulas */}
                  <div className="text-sm space-y-1 pt-2 border-t">
                    <p className="text-muted-foreground font-medium mb-2">Aulas:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-medium">{aluno.total_aulas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Realizadas:</span>
                        <span className="font-medium text-green-600">{aluno.total_concluidas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Agendadas:</span>
                        <span className="font-medium text-blue-600">{aluno.total_agendadas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Faltou:</span>
                        <span className="font-medium text-red-600">{aluno.total_canceladas}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo de Tarefas e Conquistas */}
                  <div className="text-sm space-y-1 pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tarefas pendentes:</span>
                      <span className="font-medium">{aluno.atividades_tarefas_pendentes || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conquistas:</span>
                      <span className="font-medium">{aluno.total_conquistas || 0}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(`/responsavel/aluno/${aluno.aluno_id}`)}
                    className="w-full"
                  >
                    Ver detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
