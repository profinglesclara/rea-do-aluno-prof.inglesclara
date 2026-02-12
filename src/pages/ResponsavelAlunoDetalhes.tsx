import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, BookOpen, Award, FileText, Eye, Download } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { LogoutButton } from "@/components/LogoutButton";
import { useQuery } from "@tanstack/react-query";
import { CalendarioAulas } from "@/components/CalendarioAulas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { agora, paraBrasilia } from "@/lib/utils";
import { syncTopicosAluno } from "@/hooks/useAutoSyncTopicos";
import { useCategoriasAtivasNomes } from "@/hooks/useCategoriasAtivas";

export default function ResponsavelAlunoDetalhes() {
  const { aluno_id } = useParams<{ aluno_id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(agora());

  // Verificar acesso
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !userData) {
        navigate("/login");
        return;
      }

      // Verificar se é Responsável ou Adulto
      if (userData.tipo_usuario !== "Responsável" && userData.tipo_usuario !== "Adulto") {
        navigate("/");
        return;
      }

      // Verificar se tem permissão para ver este aluno
      if (userData.tipo_usuario === "Adulto") {
        // Adulto só pode ver ele mesmo
        if (aluno_id !== userData.user_id) {
          navigate("/responsavel/dashboard");
          return;
        }
      } else {
        // Responsavel precisa ter este aluno vinculado via tabela responsaveis_alunos
        const { data: vinculoData, error: vinculoError } = await supabase
          .from("responsaveis_alunos")
          .select("aluno_id")
          .eq("responsavel_id", userData.user_id)
          .eq("aluno_id", aluno_id!)
          .maybeSingle();

        if (vinculoError || !vinculoData) {
          navigate("/responsavel/dashboard");
          return;
        }
      }

      setCurrentUser(userData);
      setLoading(false);
    };

    checkAccess();
  }, [aluno_id, navigate]);

  // Buscar dados do aluno da VIEW
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["dashboardAlunoResponsavel", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_resumo_alunos")
        .select("*")
        .eq("aluno_id", aluno_id!)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Aluno não encontrado");
      return data;
    },
  });

  // Buscar categorias ativas
  const { lista: categoriasAtivasList } = useCategoriasAtivasNomes();

  // Buscar progresso por categoria usando RPC (com auto-sync)
  const { data: progressoData } = useQuery({
    queryKey: ["progressoCategorias", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      // AUTO-SYNC: Sincronizar tópicos antes de buscar progresso
      await syncTopicosAluno(aluno_id!);
      
      const { data, error } = await supabase.rpc("get_progresso_aluno", {
        p_aluno: aluno_id!,
      });

      if (error) throw error;
      return (data as any)?.progresso_por_categoria as Record<string, any> | null;
    },
  });

  // Buscar aulas do aluno
  const { data: aulas } = useQuery({
    queryKey: ["aulasAluno", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("aluno", aluno_id!)
        .order("data_aula", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar tarefas do aluno
  const { data: tarefas } = useQuery({
    queryKey: ["tarefasAluno", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select(`
          *,
          entregas:entregas_tarefas(url_pdf, data_envio)
        `)
        .eq("aluno_id", aluno_id!)
        .order("criada_em", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar conquistas do aluno
  const { data: conquistas } = useQuery({
    queryKey: ["conquistasAluno", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      const { data: conquistasData, error } = await supabase
        .from("conquistas_alunos")
        .select(`
          *,
          conquista:conquistas_mestre(nome, descricao, icone)
        `)
        .eq("aluno_id", aluno_id!);

      if (error) throw error;

      // Buscar todas as conquistas mestre
      const { data: todasConquistas } = await supabase
        .from("conquistas_mestre")
        .select("*")
        .eq("ativa", true)
        .order("ordem_exibicao");

      const conquistasDesbloqueadas = conquistasData?.map(c => c.conquista_id) || [];

      return {
        desbloqueadas: conquistasData || [],
        todas: todasConquistas || [],
        bloqueadas: todasConquistas?.filter(c => !conquistasDesbloqueadas.includes(c.id)) || []
      };
    },
  });

  // Buscar relatórios do aluno
  const { data: relatorios } = useQuery({
    queryKey: ["relatoriosAluno", aluno_id],
    enabled: !!aluno_id && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relatorios_mensais")
        .select("relatorio_id, mes_referencia, data_geracao, arquivo_pdf, porcentagem_concluida, porcentagem_em_desenvolvimento")
        .eq("aluno", aluno_id!)
        .order("data_geracao", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const formatMesReferencia = (mes: string) => {
    try {
      const [year, month] = mes.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, "MMMM/yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    } catch {
      return mes;
    }
  };

  const formatDataEmissao = (data: string | null) => {
    if (!data) return "—";
    try {
      return format(paraBrasilia(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const handleVisualizarRelatorio = (arquivoPdf: string | null) => {
    if (!arquivoPdf) return;
    window.open(arquivoPdf, "_blank");
  };

  const handleDownloadRelatorio = (arquivoPdf: string | null, mes: string) => {
    if (!arquivoPdf) return;
    const link = document.createElement("a");
    link.href = arquivoPdf;
    link.download = `Relatorio_${dashboard?.nome_aluno?.replace(/\s+/g, "_") || "aluno"}_${mes}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Aluno não encontrado</p>
      </div>
    );
  }

  const progressoPorCategoria = progressoData || {};
  const tarefasPendentes = tarefas?.filter(t => t.status === "Pendente") || [];
  const tarefasEntregues = tarefas?.filter(t => t.status === "Entregue") || [];
  const tarefasCorrigidas = tarefas?.filter(t => t.status === "Corrigida") || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/responsavel/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{dashboard.nome_aluno}</h1>
              <div className="flex gap-2 mt-1">
                {dashboard.nivel_cefr && (
                  <Badge variant="secondary">{dashboard.nivel_cefr}</Badge>
                )}
                {dashboard.modalidade && (
                  <Badge variant="outline">{dashboard.modalidade}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={currentUser?.user_id || ""} />
            <LogoutButton variant="outline" />
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Progresso Geral */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progresso geral</span>
                  <span className="font-medium">{dashboard.progresso_geral || 0}%</span>
                </div>
                <Progress value={dashboard.progresso_geral || 0} className="h-3" />
              </div>

              {/* Progresso por categoria */}
              {Object.keys(progressoPorCategoria).length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium">Progresso por Categoria:</p>
                  {Object.entries(progressoPorCategoria).map(([categoria, dados]: [string, any]) => (
                    <div key={categoria}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{categoria}</span>
                        <span className="font-medium">{dados?.percentual_concluido || 0}%</span>
                      </div>
                      <Progress value={dados?.percentual_concluido || 0} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo de Aulas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumo de Aulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{dashboard.total_aulas}</p>
                </div>
                <div>
                  <p className="text-sm text-green-600">Realizadas</p>
                  <p className="text-2xl font-bold text-green-600">{dashboard.total_concluidas}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-600">Agendadas</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboard.total_agendadas}</p>
                </div>
                <div>
                  <p className="text-sm text-red-600">Faltou</p>
                  <p className="text-2xl font-bold text-red-600">{dashboard.total_canceladas}</p>
                </div>
              </div>
              {dashboard.proxima_aula_data && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Próxima aula:</p>
                  <p className="font-medium">
                    {format(new Date(dashboard.proxima_aula_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendário de Aulas */}
        <Card>
          <CardHeader>
            <CardTitle>Calendário de Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            {aulas && aulas.length > 0 ? (
              <CalendarioAulas 
                aulas={aulas}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma aula agendada</p>
            )}
          </CardContent>
        </Card>

        {/* Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold">{tarefasPendentes.length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold">{tarefasEntregues.length}</p>
                <p className="text-sm text-muted-foreground">Entregues</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold">{tarefasCorrigidas.length}</p>
                <p className="text-sm text-muted-foreground">Corrigidas</p>
              </div>
            </div>

            {tarefas && tarefas.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Últimas tarefas:</p>
                {tarefas.slice(0, 5).map((tarefa: any) => (
                  <div key={tarefa.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{tarefa.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {tarefa.tipo === "Obrigatoria" ? "Obrigatória" : "Sugerida"}
                        {tarefa.data_limite && ` • Prazo: ${format(new Date(tarefa.data_limite), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <Badge variant={
                      tarefa.status === "Corrigida" ? "default" :
                      tarefa.status === "Entregue" ? "secondary" :
                      "outline"
                    }>
                      {tarefa.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conquistas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold">{conquistas?.desbloqueadas.length || 0}</p>
                <p className="text-sm text-muted-foreground">Desbloqueadas</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold">{conquistas?.bloqueadas.length || 0}</p>
                <p className="text-sm text-muted-foreground">Bloqueadas</p>
              </div>
            </div>

            {conquistas && conquistas.todas.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {conquistas.todas.map((conquista: any) => {
                  const isDesbloqueada = conquistas.desbloqueadas.some(
                    (d: any) => d.conquista_id === conquista.id
                  );
                  
                  return (
                    <div
                      key={conquista.id}
                      className={`p-4 border rounded-lg text-center ${
                        !isDesbloqueada ? "opacity-40 grayscale" : ""
                      }`}
                    >
                      <div className="text-4xl mb-2">{conquista.icone}</div>
                      <p className="text-sm font-medium">{conquista.nome}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relatórios Mensais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios Mensais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!relatorios || relatorios.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground">Nenhum relatório disponível ainda.</p>
                <p className="text-sm text-muted-foreground">
                  Os relatórios aparecerão aqui assim que forem gerados pelo professor.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {relatorios.map((r) => (
                  <div key={r.relatorio_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{formatMesReferencia(r.mes_referencia)}</p>
                      <p className="text-sm text-muted-foreground">
                        Emitido em: {formatDataEmissao(r.data_geracao)}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {r.porcentagem_concluida ?? 0}% concluído
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!r.arquivo_pdf}
                        onClick={() => handleVisualizarRelatorio(r.arquivo_pdf)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!r.arquivo_pdf}
                        onClick={() => handleDownloadRelatorio(r.arquivo_pdf, r.mes_referencia)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
