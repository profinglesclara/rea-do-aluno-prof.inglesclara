import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardAluno } from "@/hooks/useDashboardAluno";
import { useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function AlunoProgresso() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("Geral");

  // Buscar o primeiro aluno teste
  const { data: aluno } = useQuery({
    queryKey: ["alunoTeste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("tipo_usuario", "Aluno")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Meu Progresso</h1>
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
      </div>
    </div>
  );
}
