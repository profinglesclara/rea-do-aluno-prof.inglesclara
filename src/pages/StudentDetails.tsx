import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronDown, Trophy, Star, Target, Award, Zap, Heart, Pencil, BookOpen } from "lucide-react";
import { GerenciarConquistasDialog } from "@/components/conquistas/GerenciarConquistasDialog";
import { EditarPerfilAlunoDialog } from "@/components/admin/EditarPerfilAlunoDialog";
import { GerenciarTopicosDialog } from "@/components/admin/GerenciarTopicosDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [relatoriosLoading, setRelatoriosLoading] = useState(false);
  const [relatoriosError, setRelatoriosError] = useState<string | null>(null);

  const [conquistasDialogOpen, setConquistasDialogOpen] = useState(false);
  const [editarPerfilOpen, setEditarPerfilOpen] = useState(false);
  const [topicosDialogOpen, setTopicosDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Buscar conquistas do aluno
  const { data: conquistasData } = useQuery({
    queryKey: ["conquistasAlunoDetalhes", aluno_id],
    enabled: !!aluno_id,
    queryFn: async () => {
      const [mestreResult, alunoResult] = await Promise.all([
        supabase.from("conquistas_mestre").select("*").eq("ativa", true),
        supabase.from("conquistas_alunos").select("*").eq("aluno_id", aluno_id!),
      ]);

      if (mestreResult.error) throw mestreResult.error;
      if (alunoResult.error) throw alunoResult.error;

      return {
        total: mestreResult.data?.length || 0,
        desbloqueadas: alunoResult.data?.length || 0,
        conquistas: alunoResult.data || [],
      };
    },
  });

  // Buscar tópicos de progresso do aluno
  const { data: topicosData, refetch: refetchTopicos } = useQuery({
    queryKey: ["topicosAlunoDetalhes", aluno_id],
    enabled: !!aluno_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topicos_progresso")
        .select("*")
        .eq("aluno", aluno_id!);

      if (error) throw error;

      const topicos = data || [];
      const total = topicos.length;
      const concluidos = topicos.filter(t => t.status === "Concluído").length;
      const emDesenvolvimento = topicos.filter(t => t.status === "Em Desenvolvimento").length;
      const aIntroduzir = topicos.filter(t => t.status === "A Introduzir").length;
      const percentualConcluido = total > 0 ? Math.round((concluidos / total) * 100) : 0;

      return {
        total,
        concluidos,
        emDesenvolvimento,
        aIntroduzir,
        percentualConcluido,
      };
    },
  });

  const iconMap: Record<string, any> = {
    Star,
    Trophy,
    Target,
    Award,
    Zap,
    Heart,
  };

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

  useEffect(() => {
    const loadRelatorios = async () => {
      if (!aluno_id) return;
      
      setRelatoriosLoading(true);
      setRelatoriosError(null);

      const { data, error } = await supabase
        .from("relatorios_mensais")
        .select("mes_referencia, data_geracao, porcentagem_concluida, porcentagem_em_desenvolvimento")
        .eq("aluno", aluno_id)
        .order("data_geracao", { ascending: false })
        .limit(3);

      if (error) {
        console.error(error);
        setRelatoriosError("Não foi possível carregar os relatórios.");
      } else {
        setRelatorios(data || []);
      }

      setRelatoriosLoading(false);
    };

    loadRelatorios();
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

  // Mapeia o status do banco para o texto exibido na UI
  const getStatusDisplay = (status: string): string => {
    if (status === "Cancelada") return "Faltou";
    return status;
  };

  // Retorna classes de cor personalizadas para cada status
  const getStatusColorClasses = (status: string): string => {
    switch (status) {
      case "Realizada":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "Agendada":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "Cancelada":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "Remarcada":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Detalhes do Aluno</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setEditarPerfilOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Perfil
            </Button>
            <Badge variant="default" className="text-base px-4 py-1">
              {dashboard.nome_aluno}
            </Badge>
          </div>
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
                <p className="text-sm text-muted-foreground">Faltou</p>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold text-primary">
                    {conquistasData?.desbloqueadas ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    de {conquistasData?.total ?? 0} desbloqueadas
                  </p>
                </div>
                
                {/* Ícones de conquistas recentes */}
                {conquistasData && conquistasData.conquistas.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {conquistasData.conquistas.slice(0, 5).map((conquista: any) => {
                      const Icon = iconMap[conquista.conquistas_mestre?.icone] || Trophy;
                      return (
                        <Icon
                          key={conquista.id}
                          className="h-6 w-6 text-yellow-500"
                        />
                      );
                    })}
                    {conquistasData.conquistas.length > 5 && (
                      <span className="text-sm text-muted-foreground">
                        +{conquistasData.conquistas.length - 5}
                      </span>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setConquistasDialogOpen(true)}
                >
                  Gerenciar conquistas
                </Button>
              </div>
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

        {/* Card de Progresso por Tópicos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Progresso por Tópicos
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTopicosDialogOpen(true)}
            >
              Gerenciar Tópicos
            </Button>
          </CardHeader>
          <CardContent>
            {topicosData && topicosData.total > 0 ? (
              <div className="space-y-4">
                {/* Barra de progresso geral */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso geral</span>
                    <span className="font-medium">{topicosData.percentualConcluido}%</span>
                  </div>
                  <Progress value={topicosData.percentualConcluido} className="h-3" />
                </div>

                {/* Resumo por status */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600">{topicosData.concluidos}</p>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-2xl font-bold text-yellow-600">{topicosData.emDesenvolvimento}</p>
                    <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20">
                    <p className="text-2xl font-bold text-gray-600">{topicosData.aIntroduzir}</p>
                    <p className="text-xs text-muted-foreground">A introduzir</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum tópico de progresso atribuído.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTopicosDialogOpen(true)}
                >
                  Atribuir tópicos do nível {dashboard.nivel_cefr || "CEFR"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Relatórios Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {relatoriosLoading ? (
              <p className="text-muted-foreground">Carregando relatórios…</p>
            ) : relatoriosError ? (
              <p className="text-destructive">{relatoriosError}</p>
            ) : relatorios.length === 0 ? (
              <p className="text-muted-foreground">
                Ainda não há relatórios mensais gerados para este aluno.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês de referência</TableHead>
                        <TableHead>Data de geração</TableHead>
                        <TableHead className="text-right">% Concluída</TableHead>
                        <TableHead className="text-right">% Em desenvolvimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatorios.map((rel, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="secondary">{rel.mes_referencia}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(rel.data_geracao)}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {rel.porcentagem_concluida ?? 0}%
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            {rel.porcentagem_em_desenvolvimento ?? 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/admin/relatorios")}
                  >
                    Ver todos os relatórios
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                          <Badge className={getStatusColorClasses(aula.status)}>
                            {getStatusDisplay(aula.status)}
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

      {/* Dialog de gerenciamento de conquistas */}
      <GerenciarConquistasDialog
        open={conquistasDialogOpen}
        onOpenChange={setConquistasDialogOpen}
        alunoId={aluno_id!}
        alunoNome={dashboard.nome_aluno || "Aluno"}
      />

      {/* Dialog de edição de perfil */}
      <EditarPerfilAlunoDialog
        open={editarPerfilOpen}
        onOpenChange={setEditarPerfilOpen}
        alunoId={aluno_id!}
        dadosAtuais={{
          nome_aluno: dashboard.nome_aluno,
          nome_de_usuario: dashboard.nome_de_usuario,
          nivel_cefr: dashboard.nivel_cefr,
          modalidade: dashboard.modalidade,
          data_inicio_aulas: dashboard.data_inicio_aulas,
          status_aluno: dashboard.status_aluno,
        }}
        onSuccess={() => {
          // Recarregar dados do dashboard
          queryClient.invalidateQueries({ queryKey: ["conquistasAlunoDetalhes", aluno_id] });
          window.location.reload();
        }}
      />

      {/* Dialog de gerenciamento de tópicos */}
      <GerenciarTopicosDialog
        open={topicosDialogOpen}
        onOpenChange={setTopicosDialogOpen}
        alunoId={aluno_id!}
        alunoNome={dashboard.nome_aluno || "Aluno"}
        nivelCefr={dashboard.nivel_cefr}
        onSuccess={() => {
          refetchTopicos();
          queryClient.invalidateQueries({ queryKey: ["topicosAlunoDetalhes", aluno_id] });
        }}
      />
    </div>
  );
};

export default StudentDetails;
