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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate("/admin")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detalhes do Aluno</span>
              <Badge>{dashboard.nome_aluno}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-muted-foreground">Total de aulas: </span>
              <span className="font-medium">{dashboard.total_aulas}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Realizadas: </span>
              <span className="font-medium text-green-600">
                {dashboard.total_concluidas}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Agendadas: </span>
              <span className="font-medium text-blue-600">
                {dashboard.total_agendadas}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Canceladas: </span>
              <span className="font-medium text-red-600">
                {dashboard.total_canceladas}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Remarcadas: </span>
              <span className="font-medium text-orange-600">
                {dashboard.total_remarcadas}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Próxima aula: </span>
              <span className="font-medium">
                {formatDateTime(dashboard.proxima_aula_data ?? null)}
              </span>
            </p>
          </CardContent>
        </Card>

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
