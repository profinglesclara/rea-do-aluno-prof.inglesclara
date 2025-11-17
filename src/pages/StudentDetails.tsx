import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ChevronDown } from "lucide-react";

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
  
  const [aulas, setAulas] = useState<any[]>([]);
  const [aulasLoading, setAulasLoading] = useState(false);
  const [aulasError, setAulasError] = useState<string | null>(null);

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

  useEffect(() => {
    const loadAulas = async () => {
      if (!aluno_id) return;
      
      setAulasLoading(true);
      setAulasError(null);

      const { data, error } = await supabase
        .from("aulas")
        .select("aula_id, data_aula, status, conteudo, observacoes")
        .eq("aluno", aluno_id)
        .order("data_aula", { ascending: false })
        .limit(10);

      if (error) {
        console.error(error);
        setAulasError("Não foi possível carregar as aulas.");
      } else {
        setAulas(data || []);
      }

      setAulasLoading(false);
    };

    loadAulas();
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

        {/* Card de Último Relatório Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Último Relatório Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.ultimo_mes_referencia ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Mês de referência</p>
                  <p className="font-medium">{dashboard.ultimo_mes_referencia}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data de geração</p>
                  <p className="font-medium">
                    {formatDate(dashboard.ultimo_relatorio_data ?? null)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Percentual concluído</p>
                  <p className="text-xl font-bold text-green-600">
                    {dashboard.ultimo_relatorio_concluida
                      ? `${dashboard.ultimo_relatorio_concluida}%`
                      : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Percentual em desenvolvimento
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {dashboard.ultimo_relatorio_em_desenvolvimento
                      ? `${dashboard.ultimo_relatorio_em_desenvolvimento}%`
                      : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Ainda não há relatório mensal gerado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Resumo de Atividades e Conquistas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                {dashboard.total_conquistas ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Total desbloqueadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividades Sugeridas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                {dashboard.atividades_sugeridas_pendentes ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                {dashboard.atividades_tarefas_pendentes ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Disponíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Card de Aulas do Aluno */}
        <Card>
          <CardHeader>
            <CardTitle>Aulas do Aluno</CardTitle>
          </CardHeader>
          <CardContent>
            {aulasLoading ? (
              <p className="text-muted-foreground">Carregando aulas…</p>
            ) : aulasError ? (
              <p className="text-destructive">{aulasError}</p>
            ) : aulas.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma aula registrada.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data e Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo/Conteúdo</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aulas.map((aula) => (
                      <TableRow key={aula.aula_id}>
                        <TableCell>{formatDateTime(aula.data_aula)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            aula.status === "Realizada" ? "default" : 
                            aula.status === "Agendada" ? "secondary" : 
                            "outline"
                          }>
                            {aula.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{aula.conteudo || "—"}</TableCell>
                        <TableCell className="max-w-xs truncate">{aula.observacoes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Debug (collapsible) */}
        <Card>
          <Collapsible>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                <CardTitle>JSON bruto (debug)</CardTitle>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-expanded:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                  {JSON.stringify(dashboard, null, 2)}
                </pre>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
};

export default StudentDetails;
