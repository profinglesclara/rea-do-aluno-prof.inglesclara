import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Target, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useDashboardAluno } from "@/hooks/useDashboardAluno";
import type { AlunoData } from "@/hooks/useDashboardAluno";

const StudentDetails = () => {
  const { aluno_id } = useParams<{ aluno_id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useDashboardAluno(aluno_id);
  const aluno: AlunoData | null = useMemo(
    () => (data?.dashboard ?? null),
    [data]
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const prepareProgressByCategoryData = () => {
    if (!aluno || !aluno.progresso_por_categoria) return [];
    return Object.entries(aluno.progresso_por_categoria).map(
      ([key, value]: [string, any]) => ({
        categoria: key,
        concluido: value.percentual_concluido || 0,
        em_desenvolvimento: value.percentual_em_desenvolvimento || 0,
      })
    );
  };

  const prepareHistoricoData = () => {
    if (!aluno || !aluno.historico_progresso) return [];
    return aluno.historico_progresso.map((item) => ({
      data: new Date(item.data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      progresso: item.progresso_geral,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Ocorreu um erro ao carregar os dados do aluno.
          </p>
          <Button onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Aluno não encontrado.</p>
          <Button onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <Button
          variant="outline"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold">Detalhes do Aluno</h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xl text-muted-foreground">
              {aluno.nome_completo} ({aluno.nivel_cefr} – {aluno.modalidade})
            </p>
            <Badge
              variant={aluno.status_aluno === "Ativo" ? "default" : "secondary"}
            >
              {aluno.status_aluno}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Bloco 1 - Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome completo:</span>
                <span className="font-medium">{aluno.nome_completo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome de usuário:</span>
                <span className="font-medium">{aluno.nome_de_usuario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nível CEFR:</span>
                <span className="font-medium">{aluno.nivel_cefr || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modalidade:</span>
                <span className="font-medium">{aluno.modalidade || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequência mensal:</span>
                <span className="font-medium">
                  {aluno.frequencia_mensal
                    ? `${aluno.frequencia_mensal} aulas/mês`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Início das aulas:</span>
                <span className="font-medium">
                  {formatDate(aluno.data_inicio_aulas)}
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-2">
                <span className="text-muted-foreground">Objetivo principal:</span>
                <span className="font-medium">
                  {aluno.objetivo_principal || "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Bloco 3 - Resumo de Aulas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumo de Aulas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de aulas:</span>
                <span className="font-medium">
                  {aluno.resumo_aulas.total_aulas}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Realizadas:</span>
                <span className="font-medium text-green-600">
                  {aluno.resumo_aulas.total_concluidas}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agendadas:</span>
                <span className="font-medium text-blue-600">
                  {aluno.resumo_aulas.total_agendadas}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canceladas:</span>
                <span className="font-medium text-red-600">
                  {aluno.resumo_aulas.total_canceladas}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remarcadas:</span>
                <span className="font-medium text-orange-600">
                  {aluno.resumo_aulas.total_remarcadas}
                </span>
              </div>
              <div className="flex flex-col gap-1 border-t pt-2 mt-2">
                <span className="text-muted-foreground">Próxima aula:</span>
                <span className="font-medium">
                  {formatDateTime(aluno.resumo_aulas.proxima_aula_data)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bloco 2 - Progresso */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progresso do Aluno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Progresso Geral</p>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">
                  {aluno.progresso_geral?.toFixed(1) || 0}%
                </div>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${aluno.progresso_geral || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {prepareProgressByCategoryData().length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Progresso por Categoria
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareProgressByCategoryData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="concluido"
                      fill="hsl(var(--primary))"
                      name="Concluído"
                    />
                    <Bar
                      dataKey="em_desenvolvimento"
                      fill="hsl(var(--secondary))"
                      name="Em Desenvolvimento"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {prepareHistoricoData().length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Histórico de Progresso
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={prepareHistoricoData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="progresso"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
