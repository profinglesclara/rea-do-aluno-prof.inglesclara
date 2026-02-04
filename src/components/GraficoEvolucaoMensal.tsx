import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { criarDataBrasilia, paraBrasilia, formatarDataBR, getMesAnoAtualBrasilia } from "@/lib/utils";

interface HistoricoItem {
  data: string;
  progresso_geral: number;
}

interface CategoriaProgresso {
  total: number;
  concluidos: number;
  em_desenvolvimento: number;
  a_introduzir: number;
  percentual_concluido: number;
  percentual_em_desenvolvimento: number;
}

interface GraficoEvolucaoMensalProps {
  /** Histórico de progresso do aluno (array de {data, progresso_geral}) */
  historicoProgresso: HistoricoItem[];
  /** Progresso por categoria atual */
  progressoPorCategoria: Record<string, CategoriaProgresso>;
  /** Mês de referência no formato "MM/YYYY" - se não informado, usa o mês atual */
  mesReferencia?: string;
  /** Porcentagem concluída do relatório (usado como fallback quando não há histórico) */
  porcentagemConcluida?: number;
  /** Título do card */
  titulo?: string;
  /** Subtítulo do card */
  subtitulo?: string;
  /** Lista de categorias para os filtros */
  categorias?: readonly string[] | string[];
}

// Função auxiliar para obter as semanas de um mês (mes é 1-indexed: janeiro = 1)
const getSemanasDoMes = (mes: number, ano: number) => {
  const semanas: { inicio: Date; fim: Date; label: string }[] = [];
  
  // Usar criarDataBrasilia para criar datas no fuso horário correto
  const primeiroDia = criarDataBrasilia(ano, mes, 1);
  const ultimoDia = criarDataBrasilia(ano, mes + 1, 0); // Dia 0 do próximo mês = último dia do mês atual
  
  // Corrigir último dia se o mês for dezembro
  if (mes === 12) {
    ultimoDia.setFullYear(ano);
    ultimoDia.setMonth(11); // Dezembro (0-indexed)
    ultimoDia.setDate(31);
  }
  
  let inicioSemana = new Date(primeiroDia);
  
  while (inicioSemana <= ultimoDia) {
    // Calcular fim da semana (sábado = dia 6)
    const diasAteFimSemana = 6 - inicioSemana.getDay();
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + diasAteFimSemana);
    
    // Se o fim da semana ultrapassar o último dia do mês, usar o último dia
    if (fimSemana > ultimoDia) {
      fimSemana.setTime(ultimoDia.getTime());
    }
    
    // Formatar as datas usando o mês correto (mes é 1-indexed)
    const diaInicio = String(inicioSemana.getDate()).padStart(2, '0');
    const mesStr = String(mes).padStart(2, '0');
    const diaFim = String(fimSemana.getDate()).padStart(2, '0');
    
    semanas.push({
      inicio: new Date(inicioSemana),
      fim: new Date(fimSemana),
      label: `${diaInicio}/${mesStr} - ${diaFim}/${mesStr}`
    });
    
    // Próxima semana começa no dia seguinte ao fim
    inicioSemana = new Date(fimSemana);
    inicioSemana.setDate(fimSemana.getDate() + 1);
  }
  
  return semanas;
};

export function GraficoEvolucaoMensal({
  historicoProgresso,
  progressoPorCategoria,
  mesReferencia,
  porcentagemConcluida = 0,
  titulo = "Evolução no mês atual",
  subtitulo = "Acompanhe como o progresso evoluiu a cada atualização neste mês",
  categorias: categoriasProps,
}: GraficoEvolucaoMensalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Geral");

  // Determinar mês e ano a partir de mesReferencia ou usar mês atual
  const { mesNum, anoNum } = useMemo(() => {
    if (mesReferencia) {
      const [mes, ano] = mesReferencia.split("/");
      return { mesNum: parseInt(mes), anoNum: parseInt(ano) };
    }
    const { mes, ano } = getMesAnoAtualBrasilia();
    return { mesNum: mes, anoNum: ano };
  }, [mesReferencia]);

  // Filtrar histórico do mês selecionado
  const historicoMes = useMemo(() => {
    if (!historicoProgresso || !Array.isArray(historicoProgresso)) return [];
    
    return historicoProgresso
      .filter((item) => {
        const dataItem = paraBrasilia(item.data);
        return (dataItem.getMonth() + 1) === mesNum && dataItem.getFullYear() === anoNum;
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [historicoProgresso, mesNum, anoNum]);

  // Lista de categorias disponíveis
  const categorias = useMemo(() => {
    if (categoriasProps) return ["Geral", ...categoriasProps];
    return ["Geral", ...Object.keys(progressoPorCategoria || {})];
  }, [categoriasProps, progressoPorCategoria]);

  // Preparar dados para o gráfico - agrupando por semanas do mês
  const chartData = useMemo(() => {
    const semanas = getSemanasDoMes(mesNum, anoNum);
    
    if (selectedCategory === "Geral") {
      // Verificar se há dados no histórico para este mês
      if (historicoMes.length > 0) {
        // Agrupar dados do histórico por semana
        return semanas.map((semana) => {
          const registrosNaSemana = historicoMes.filter((item) => {
            const dataItem = new Date(item.data);
            return dataItem >= semana.inicio && dataItem <= semana.fim;
          });
          
          // Pegar o último valor da semana (mais recente)
          const ultimoRegistro = registrosNaSemana[registrosNaSemana.length - 1];
          const valor = ultimoRegistro ? ultimoRegistro.progresso_geral : 0;
          
          return {
            data: semana.label,
            valor: valor || 0,
          };
        });
      } else {
        // Se não há histórico, usar os dados do relatório/progresso atual
        return semanas.map((semana) => ({
          data: semana.label,
          valor: porcentagemConcluida,
        }));
      }
    } else {
      // Para categorias específicas, usar o progresso por categoria
      const categoriaData = progressoPorCategoria?.[selectedCategory];
      
      if (!categoriaData) return [];
      
      // Mostrar o valor da categoria em todas as semanas
      return semanas.map((semana) => ({
        data: semana.label,
        valor: categoriaData.percentual_concluido || 0,
      }));
    }
  }, [selectedCategory, historicoMes, progressoPorCategoria, mesNum, anoNum, porcentagemConcluida]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{titulo}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
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
                  <linearGradient id="colorValorEvolucao" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorValorEvolucao)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
