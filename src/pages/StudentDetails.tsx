import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

type DashboardRow = {
  aluno_id: string;
  nome_aluno: string;
  total_aulas: number;
  total_concluidas: number;
  total_agendadas: number;
  total_canceladas: number;
  total_remarcadas: number;
  proxima_aula_data: string | null;
} & Record<string, any>;

const StudentDetails = () => {
  const { aluno_id } = useParams<{ aluno_id: string }>();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<DashboardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!aluno_id) {
        setError("ID do aluno não informado.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("dashboard_resumo_alunos")
        .select("*")
        .eq("aluno_id", aluno_id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setError("Erro ao buscar dados do aluno.");
      } else if (!data) {
        setError("Aluno não encontrado.");
      } else {
        setDashboard(data as DashboardRow);
      }

      setLoading(false);
    };

    load();
  }, [aluno_id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            {error ?? "Aluno não encontrado."}
          </p>
          <Button onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const formatDateTime = (d: string | null) =>
    d ? new Date(d).toLocaleString("pt-BR") : "—";

  const formatDate = (dateString: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {/* Cabeçalho com nome do aluno */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Detalhes do Aluno</h1>
          <Badge variant="default" className="text-base px-4 py-1">
            {dashboard.nome_aluno}
          </Badge>
        </div>

        {/* Card de Resumo de Aulas */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de aulas</p>
                <p className="text-2xl font-bold">{dashboard.total_aulas}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Realizadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboard.total_concluidas}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboard.total_agendadas}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboard.total_canceladas}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Remarcadas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboard.total_remarcadas}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Próxima aula</p>
                <p className="text-lg font-medium">
                  {formatDateTime(dashboard.proxima_aula_data ?? null)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Informações Básicas do Aluno */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas do Aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nome completo</p>
                <p className="font-medium">{dashboard.nome_aluno}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nome de usuário</p>
                <p className="font-medium">{dashboard.nome_de_usuario ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nível CEFR</p>
                <p className="font-medium">{dashboard.nivel_cefr ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Modalidade</p>
                <p className="font-medium">{dashboard.modalidade ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status do aluno</p>
                <div>
                  <Badge
                    variant={
                      dashboard.status_aluno === "Ativo" ? "default" : "secondary"
                    }
                  >
                    {dashboard.status_aluno ?? "—"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Frequência mensal</p>
                <p className="font-medium">
                  {dashboard.frequencia_mensal
                    ? `${dashboard.frequencia_mensal} aulas/mês`
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Início das aulas</p>
                <p className="font-medium">
                  {formatDate(dashboard.data_inicio_aulas ?? null)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Debug */}
        <Card>
          <CardHeader>
            <CardTitle>JSON bruto (debug)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
              {JSON.stringify(dashboard, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDetails;
