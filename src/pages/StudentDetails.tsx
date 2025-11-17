import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Target, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useDashboardAluno } from "@/hooks/useDashboardAluno";

type AlunoData = {
  aluno_id: string;
  nome_completo: string;
  nome_de_usuario: string;
  tipo_usuario: string;
  nivel_cefr: string | null;
  modalidade: string | null;
  data_inicio_aulas: string | null;
  frequencia_mensal: number | null;
  objetivo_principal: string | null;
  status_aluno: string | null;
  progresso_geral: number | null;
  progresso_por_categoria: Record<string, any>;
  historico_progresso: Array<{ data: string; progresso_geral: number }>;
  resumo_aulas: {
    total_aulas: number;
    total_concluidas: number;
    total_agendadas: number;
    total_canceladas: number;
    total_remarcadas: number;
    proxima_aula_data: string | null;
  };
  ultimo_relatorio: {
    mes_referencia: string;
    data_geracao: string;
    porcentagem_concluida: number;
    porcentagem_em_desenvolvimento: number;
    comentario_automatico: string;
  } | null;
  resumo_atividades: {
    total_conquistas: number;
    atividades_sugeridas_pendentes: number;
    atividades_tarefas_pendentes: number;
  };
};

type DashboardResponse = {
  dashboard: AlunoData;
};

const StudentDetails = () => {
  const { aluno_id } = useParams<{ aluno_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch student dashboard data
  const { data, isLoading, error } = useDashboardAluno(aluno_id);
  const aluno = useMemo(() => data?.dashboard ?? null, [data]);

  /* ------------------------ Formatadores ------------------------ */

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ------------------------ Preparadores de dados ------------------------ */

  const prepareProgressByCategoryData = () => {
    if (!aluno || !aluno.progresso_por_categoria) return [];

    return Object.entries(aluno.progresso_por_categoria).map(([key, value]) => ({
      categoria: key,
      concluido: value.percentual_concluido || 0,
      em_desenvolvimento: value.percentual_em_desenvolvimento || 0,
    }));
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

  /* ------------------------ Loading e erros ------------------------ */

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
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

  /* ------------------------ Página principal ------------------------ */

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <Button variant="outline" onClick={() => navigate("/admin")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold">Detalhes do Aluno</h1>

          <div className="mt-2 flex items-center gap-3">
            <p className="text-xl text-muted-foreground">
              {aluno.nome_completo} ({aluno.nivel_cefr} – {aluno.modalidade})
            </p>

            <Badge variant={aluno.status_aluno === "Ativo" ? "default" : "secondary"}>{aluno.status_aluno}</Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* BLOCO 1 — INFORMAÇÕES BÁSICAS */}
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
                <span className="font-medium">{aluno.nivel_cefr || "-"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Modalidade:</span>
                <span className="font-medium">{aluno.modalidade || "-"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequência mensal:</span>
                <span className="font-medium">
                  {aluno.frequencia_mensal ? `${aluno.frequencia_mensal} aulas/mês` : "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Início das aulas:</span>
                <span className="font-medium">{formatDate(aluno.data_inicio_aulas)}</span>
              </div>

              <div className="flex flex-col gap-1 pt-2">
                <span className="text-muted-foreground">Objetivo principal:</span>
                <span className="font-medium">{aluno.objetivo_principal || "-"}</span>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 2 — RESUMO DE AULAS */}
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
                <span className="font-medium">{aluno.resumo_aulas.total_aulas}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Realizadas:</span>
                <span className="font-medium text-green-600">{aluno.resumo_aulas.total_concluidas}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Agendadas:</span>
                <span className="font-medium text-blue-600">{aluno.resumo_aulas.total_agendadas}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Canceladas:</span>
                <span className="font-medium text-red-600">{aluno.resumo_aulas.total_canceladas}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Remarcadas:</span>
                <span className="font-medium text-orange-600">{aluno.resumo_aulas.total_remarcadas}</span>
              </div>

              <div className="flex flex-col gap-1 border-t pt-2 mt-2">
                <span className="text-muted-foreground">Próxima aula:</span>
                <span className="font-medium">{formatDateTime(aluno.resumo_aulas.proxima_aula_data)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BLOCO 3 — PROGRESSO */}
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
                <div className="text-4xl font-bold text-primary">{aluno.progresso_geral?.toFixed(1) || 0}%</div>

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
                <p className="text-sm text-muted-foreground mb-4">Progresso por Categoria</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareProgressByCategoryData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" />
                    <YAxis />
                    <Tooltip />

                    <Bar dataKey="concluido" fill="hsl(var(--primary))" name="Concluído" />
                    <Bar dataKey="em_desenvolvimento" fill="hsl(var(--secondary))" name="Em Desenvolvimento" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {prepareHistoricoData().length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">Histórico de Progresso</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={prepareHistoricoData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="progresso" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BLOCO 4 — ÚLTIMO RELATÓRIO */}
        {aluno.ultimo_relatorio ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Último Relatório Mensal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mês de referência:</span>
                <Badge variant="outline">{aluno.ultimo_relatorio.mes_referencia}</Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de geração:</span>
                <span className="font-medium">{formatDateTime(aluno.ultimo_relatorio.data_geracao)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Conteúdo concluído:</span>
                <span className="font-medium text-green-600">
                  {aluno.ultimo_relatorio.porcentagem_concluida.toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Em desenvolvimento:</span>
                <span className="font-medium text-blue-600">
                  {aluno.ultimo_relatorio.porcentagem_em_desenvolvimento.toFixed(1)}%
                </span>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-2">Comentário da professora:</p>
                <p className="text-sm italic bg-muted p-4 rounded-md">
                  "{aluno.ultimo_relatorio.comentario_automatico}"
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Último Relatório Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ainda não há relatório mensal gerado.</p>
            </CardContent>
          </Card>
        )}

        {/* BLOCO 5 — ATIVIDADES E CONQUISTAS */}
        <div className="grid gap-6 md:grid-cols-3 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{aluno.resumo_atividades.total_conquistas}</div>
              <p className="text-sm text-muted-foreground mt-2">Conquistas desbloqueadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atividades Sugeridas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">
                {aluno.resumo_atividades.atividades_sugeridas_pendentes}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">
                {aluno.resumo_atividades.atividades_tarefas_pendentes}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Disponíveis</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
