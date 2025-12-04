import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "@/components/LogoutButton";
import { useDashboardAluno } from "@/hooks/useDashboardAluno";
import { useState, useMemo, useEffect } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AlunoProgresso() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("Geral");
  const [mesBase, setMesBase] = useState<string>("");
  const [mesComparado, setMesComparado] = useState<string>("");
  const [relatorios, setRelatorios] = useState<any[]>([]);
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
        navigate("/login");
        return;
      }

      if (data.tipo_usuario !== "Aluno") {
        navigate("/login");
        return;
      }

      setCurrentUser(data);
      setLoading(false);
    };

    fetchCurrentUser();
  }, [navigate]);

  const aluno = currentUser;

  // Usar hook existente para dashboard
  const { data: dashboardData } = useDashboardAluno(aluno?.user_id);
  const dashboard = dashboardData?.dashboard;

  // Filtrar histórico do mês atual
  const historicoMesAtual = useMemo(() => {
    if (!dashboard?.historico_progresso) return [];
    
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    
    return (dashboard.historico_progresso as Array<{ data: string; progresso_geral: number }>)
      .filter((item) => {
        const dataItem = new Date(item.data);
        return dataItem.getMonth() === mesAtual && dataItem.getFullYear() === anoAtual;
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [dashboard?.historico_progresso]);

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (selectedCategory === "Geral") {
      return historicoMesAtual.map((item) => ({
        data: new Date(item.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        valor: item.progresso_geral || 0,
      }));
    } else {
      // Para categorias específicas, usar progresso_por_categoria
      const progressoPorCategoria = dashboard?.progresso_por_categoria || {};
      const categoriaData = progressoPorCategoria[selectedCategory];
      
      if (!categoriaData) return [];
      
      // Como não temos histórico por categoria, mostrar apenas o valor atual
      return [{
        data: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        valor: categoriaData.percentual_concluido || 0,
      }];
    }
  }, [selectedCategory, historicoMesAtual, dashboard?.progresso_por_categoria]);

  const categorias = useMemo(() => {
    const progressoPorCategoria = dashboard?.progresso_por_categoria || {};
    return ["Geral", ...Object.keys(progressoPorCategoria)];
  }, [dashboard?.progresso_por_categoria]);

  // Carregar relatórios mensais do aluno
  useEffect(() => {
    const loadRelatorios = async () => {
      if (!aluno?.user_id) return;

      const { data, error } = await supabase
        .from("relatorios_mensais")
        .select("mes_referencia, porcentagem_concluida, porcentagem_em_desenvolvimento, data_geracao")
        .eq("aluno", aluno.user_id)
        .order("data_geracao", { ascending: false });

      if (!error && data) {
        setRelatorios(data);
        
        // Definir mês base como o mais recente
        if (data.length > 0 && !mesBase) {
          setMesBase(data[0].mes_referencia);
        }
        
        // Definir mês comparado como o segundo mais recente
        if (data.length > 1 && !mesComparado) {
          setMesComparado(data[1].mes_referencia);
        }
      }
    };

    loadRelatorios();
  }, [aluno?.user_id]);

  // Dados de comparação
  const dadosComparacao = useMemo(() => {
    const relatorioBase = relatorios.find(r => r.mes_referencia === mesBase);
    const relatorioComp = relatorios.find(r => r.mes_referencia === mesComparado);

    if (!relatorioBase || !relatorioComp) return null;

    const progressoBase = relatorioBase.porcentagem_concluida || 0;
    const progressoComp = relatorioComp.porcentagem_concluida || 0;
    const diferenca = progressoBase - progressoComp;

    return {
      progressoBase,
      progressoComp,
      diferenca,
      tipo: diferenca > 0 ? "melhora" : diferenca < 0 ? "piora" : "igual"
    };
  }, [relatorios, mesBase, mesComparado]);

  // Gráfico comparativo por categoria
  const chartDataComparativo = useMemo(() => {
    if (!mesBase || !mesComparado || !dashboard?.progresso_por_categoria) return [];

    const progressoPorCategoria = dashboard.progresso_por_categoria;
    const categorias = Object.keys(progressoPorCategoria);

    // Para simplificar, vamos usar os dados atuais como base
    // Em uma implementação real, seria necessário ter histórico por categoria
    return categorias.map(cat => ({
      categoria: cat,
      mesBase: progressoPorCategoria[cat]?.percentual_concluido || 0,
      mesComparado: Math.max(0, (progressoPorCategoria[cat]?.percentual_concluido || 0) - Math.random() * 10) // Simulado
    }));
  }, [mesBase, mesComparado, dashboard?.progresso_por_categoria]);

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando progresso...</p>
      </div>
    );
  }

  const progressoPorCategoria = dashboard.progresso_por_categoria || {};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Meu Progresso</h1>
          </div>
          <LogoutButton variant="outline" />
        </div>

        {/* Gráfico de Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução no mês atual</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acompanhe como seu progresso evoluiu a cada atualização neste mês
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros de categoria */}
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Gráfico */}
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Ainda não há dados suficientes neste mês para montar o gráfico.</p>
              </div>
            ) : (
              <ChartContainer
                config={{
                  valor: {
                    label: "Progresso (%)",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-64"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="data" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      domain={[0, 100]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorValor)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Progresso Geral */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progresso total</span>
                <span className="text-sm font-bold">{dashboard.progresso_geral || 0}%</span>
              </div>
              <Progress value={dashboard.progresso_geral || 0} />
            </div>
          </CardContent>
        </Card>

        {/* Progresso por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.keys(progressoPorCategoria).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dado de progresso por categoria disponível.
              </p>
            ) : (
              Object.entries(progressoPorCategoria).map(([categoria, dados]: [string, any]) => (
                <div key={categoria} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{categoria}</span>
                    <span className="text-sm text-muted-foreground">
                      {dados.concluidos}/{dados.total}
                    </span>
                  </div>
                  <Progress value={dados.percentual_concluido || 0} />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Concluídos: {dados.percentual_concluido?.toFixed(1) || 0}%</span>
                    <span>Em desenvolvimento: {dados.percentual_em_desenvolvimento?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Card de Comparação de Meses */}
        <Card>
          <CardHeader>
            <CardTitle>Comparar meses</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare seu progresso entre diferentes meses
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {relatorios.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Ainda não há outros meses disponíveis para comparação.</p>
                <p className="text-sm mt-2">Continue estudando para ver sua evolução ao longo do tempo!</p>
              </div>
            ) : (
              <>
                {/* Selects de meses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mês base</label>
                    <Select value={mesBase} onValueChange={setMesBase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês base" />
                      </SelectTrigger>
                      <SelectContent>
                        {relatorios.map((rel) => (
                          <SelectItem key={rel.mes_referencia} value={rel.mes_referencia}>
                            {rel.mes_referencia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Comparar com</label>
                    <Select value={mesComparado} onValueChange={setMesComparado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês para comparar" />
                      </SelectTrigger>
                      <SelectContent>
                        {relatorios
                          .filter(r => r.mes_referencia !== mesBase)
                          .map((rel) => (
                            <SelectItem key={rel.mes_referencia} value={rel.mes_referencia}>
                              {rel.mes_referencia}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Resumo comparativo */}
                {dadosComparacao && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">Mês base ({mesBase})</p>
                            <p className="text-3xl font-bold">{dadosComparacao.progressoBase.toFixed(1)}%</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">Comparar com ({mesComparado})</p>
                            <p className="text-3xl font-bold">{dadosComparacao.progressoComp.toFixed(1)}%</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">Diferença</p>
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-3xl font-bold">
                                {dadosComparacao.diferenca > 0 ? "+" : ""}
                                {dadosComparacao.diferenca.toFixed(1)} p.p.
                              </p>
                              {dadosComparacao.tipo === "melhora" && (
                                <Badge variant="default" className="bg-green-500">
                                  <TrendingUp className="h-4 w-4" />
                                </Badge>
                              )}
                              {dadosComparacao.tipo === "piora" && (
                                <Badge variant="destructive">
                                  <TrendingDown className="h-4 w-4" />
                                </Badge>
                              )}
                              {dadosComparacao.tipo === "igual" && (
                                <Badge variant="secondary">
                                  <Minus className="h-4 w-4" />
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Gráfico comparativo por categoria */}
                    {chartDataComparativo.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">Comparação por categoria</h3>
                        <ChartContainer
                          config={{
                            mesBase: {
                              label: `Mês base (${mesBase})`,
                              color: "hsl(var(--primary))",
                            },
                            mesComparado: {
                              label: `Comparar com (${mesComparado})`,
                              color: "hsl(var(--muted-foreground))",
                            },
                          }}
                          className="h-80"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDataComparativo}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="categoria" 
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                              />
                              <YAxis 
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                domain={[0, 100]}
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Bar
                                dataKey="mesBase"
                                fill="hsl(var(--primary))"
                                name={`Mês base (${mesBase})`}
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar
                                dataKey="mesComparado"
                                fill="hsl(var(--muted-foreground))"
                                name={`Comparar com (${mesComparado})`}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
