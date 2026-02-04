import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Download, Mail } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import jsPDF from "jspdf";
import { toast } from "@/hooks/use-toast";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { criarDataBrasilia, formatarDataBR, formatarDataHoraBR, TIMEZONE_BRASILIA } from "@/lib/utils";

type ProgressoCategoria = {
  total: number;
  concluidos: number;
  em_desenvolvimento: number;
  a_introduzir: number;
  percentual_concluido: number;
  percentual_em_desenvolvimento: number;
};

type Relatorio = {
  relatorio_id: string;
  mes_referencia: string;
  data_geracao: string;
  porcentagem_concluida: number;
  porcentagem_em_desenvolvimento: number;
  comentario_automatico: string;
  conteudo_gerado: string;
  aluno: string;
  nome_aluno: string;
  nivel_cefr: string | null;
  // Progresso por categoria salvo no relatório
  progresso_por_categoria?: Record<string, ProgressoCategoria>;
  // Progresso em tempo real
  progresso_atual?: number;
  em_desenvolvimento_atual?: number;
};

type Aluno = {
  user_id: string;
  nome_completo: string;
};

const AdminRelatorios = () => {
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAluno, setSelectedAluno] = useState<string>("todos");
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAno, setSelectedAno] = useState<string>("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRelatorio, setSelectedRelatorio] = useState<Relatorio | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [progressoAtual, setProgressoAtual] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Geral");
  const [mesComparadoRelatorio, setMesComparadoRelatorio] = useState<string>("");
  const [relatoriosDoAluno, setRelatoriosDoAluno] = useState<Relatorio[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  useEffect(() => {
    loadAlunos();
    loadRelatorios();
  }, []);

  const loadAlunos = async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("user_id, nome_completo")
      .in("tipo_usuario", ["Aluno", "Adulto"])
      .order("nome_completo");

    if (error) {
      console.error("Erro ao carregar alunos:", error);
    } else {
      setAlunos(data || []);
    }
  };

  const loadRelatorios = async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("relatorios_mensais")
      .select(`
        relatorio_id,
        mes_referencia,
        data_geracao,
        porcentagem_concluida,
        porcentagem_em_desenvolvimento,
        comentario_automatico,
        conteudo_gerado,
        aluno,
        progresso_por_categoria,
        usuarios!relatorios_mensais_aluno_fkey(nome_completo, nivel_cefr)
      `)
      .order("data_geracao", { ascending: false });

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error("Erro ao carregar relatórios:", queryError);
      setError("Não foi possível carregar os relatórios.");
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((r: any) => ({
      relatorio_id: r.relatorio_id,
      mes_referencia: r.mes_referencia,
      data_geracao: r.data_geracao,
      porcentagem_concluida: r.porcentagem_concluida,
      porcentagem_em_desenvolvimento: r.porcentagem_em_desenvolvimento,
      comentario_automatico: r.comentario_automatico,
      conteudo_gerado: r.conteudo_gerado,
      aluno: r.aluno,
      nome_aluno: r.usuarios?.nome_completo || "—",
      nivel_cefr: r.usuarios?.nivel_cefr || null,
      progresso_por_categoria: r.progresso_por_categoria || {},
    }));

    // Buscar progresso em tempo real para cada aluno único
    const alunosUnicos = [...new Set(mapped.map(r => r.aluno))];
    const progressoMap: Record<string, { concluido: number; em_desenvolvimento: number }> = {};

    await Promise.all(
      alunosUnicos.map(async (alunoId) => {
        const { data: progresso } = await supabase.rpc("get_progresso_aluno", {
          p_aluno: alunoId,
        });
        if (progresso && typeof progresso === 'object' && !Array.isArray(progresso)) {
          const progressoObj = progresso as Record<string, any>;
          const progressoPorCategoria = progressoObj.progresso_por_categoria || {};
          let totalEmDev = 0;
          let countCategorias = 0;
          
          Object.values(progressoPorCategoria).forEach((cat: any) => {
            if (cat.percentual_em_desenvolvimento !== undefined) {
              totalEmDev += cat.percentual_em_desenvolvimento;
              countCategorias++;
            }
          });

          progressoMap[alunoId] = {
            concluido: progressoObj.progresso_geral || 0,
            em_desenvolvimento: countCategorias > 0 ? totalEmDev / countCategorias : 0,
          };
        }
      })
    );

    // Atualizar relatórios com progresso em tempo real
    const relatoriosComProgresso = mapped.map(r => ({
      ...r,
      progresso_atual: progressoMap[r.aluno]?.concluido ?? r.porcentagem_concluida,
      em_desenvolvimento_atual: progressoMap[r.aluno]?.em_desenvolvimento ?? r.porcentagem_em_desenvolvimento,
    }));

    setRelatorios(relatoriosComProgresso);
    setLoading(false);
  };

  const handleFilter = () => {
    loadRelatoriosFiltered();
  };

  const loadRelatoriosFiltered = async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("relatorios_mensais")
      .select(`
        relatorio_id,
        mes_referencia,
        data_geracao,
        porcentagem_concluida,
        porcentagem_em_desenvolvimento,
        comentario_automatico,
        conteudo_gerado,
        aluno,
        progresso_por_categoria,
        usuarios!relatorios_mensais_aluno_fkey(nome_completo, nivel_cefr)
      `)
      .order("data_geracao", { ascending: false });

    if (selectedAluno !== "todos") {
      query = query.eq("aluno", selectedAluno);
    }

    if (selectedMes && selectedAno) {
      const mesRef = `${selectedMes}/${selectedAno}`;
      query = query.eq("mes_referencia", mesRef);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error("Erro ao carregar relatórios:", queryError);
      setError("Não foi possível carregar os relatórios.");
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((r: any) => ({
      relatorio_id: r.relatorio_id,
      mes_referencia: r.mes_referencia,
      data_geracao: r.data_geracao,
      porcentagem_concluida: r.porcentagem_concluida,
      porcentagem_em_desenvolvimento: r.porcentagem_em_desenvolvimento,
      comentario_automatico: r.comentario_automatico,
      conteudo_gerado: r.conteudo_gerado,
      aluno: r.aluno,
      nome_aluno: r.usuarios?.nome_completo || "—",
      nivel_cefr: r.usuarios?.nivel_cefr || null,
      progresso_por_categoria: r.progresso_por_categoria || {},
    }));

    // Buscar progresso em tempo real para cada aluno único
    const alunosUnicos = [...new Set(mapped.map(r => r.aluno))];
    const progressoMap: Record<string, { concluido: number; em_desenvolvimento: number }> = {};

    await Promise.all(
      alunosUnicos.map(async (alunoId) => {
        const { data: progresso } = await supabase.rpc("get_progresso_aluno", {
          p_aluno: alunoId,
        });
        if (progresso && typeof progresso === 'object' && !Array.isArray(progresso)) {
          const progressoObj = progresso as Record<string, any>;
          const progressoPorCategoria = progressoObj.progresso_por_categoria || {};
          let totalEmDev = 0;
          let countCategorias = 0;
          
          Object.values(progressoPorCategoria).forEach((cat: any) => {
            if (cat.percentual_em_desenvolvimento !== undefined) {
              totalEmDev += cat.percentual_em_desenvolvimento;
              countCategorias++;
            }
          });

          progressoMap[alunoId] = {
            concluido: progressoObj.progresso_geral || 0,
            em_desenvolvimento: countCategorias > 0 ? totalEmDev / countCategorias : 0,
          };
        }
      })
    );

    // Atualizar relatórios com progresso em tempo real
    const relatoriosComProgresso = mapped.map(r => ({
      ...r,
      progresso_atual: progressoMap[r.aluno]?.concluido ?? r.porcentagem_concluida,
      em_desenvolvimento_atual: progressoMap[r.aluno]?.em_desenvolvimento ?? r.porcentagem_em_desenvolvimento,
    }));

    setRelatorios(relatoriosComProgresso);
    setLoading(false);
  };

  const handleClearFilters = () => {
    setSelectedAluno("todos");
    setSelectedMes("");
    setSelectedAno("");
    loadRelatorios();
  };

  const handleVerDetalhes = async (relatorio: Relatorio) => {
    setSelectedRelatorio(relatorio);
    setSelectedCategory("Geral");
    setDetailsOpen(true);
    setProgressoAtual(null);
    
    // Buscar progresso em tempo real do aluno (filtrado pelo nível CEFR atual)
    const { data: progressoData, error: progressoError } = await supabase.rpc("get_progresso_aluno", {
      p_aluno: relatorio.aluno,
    });
    
    if (progressoError) {
      console.error("Erro ao buscar progresso atual:", progressoError);
    } else {
      setProgressoAtual(progressoData);
    }
    
    // Buscar dados do dashboard do aluno para os gráficos
    const { data, error } = await supabase.rpc("get_dashboard_aluno", {
      p_aluno: relatorio.aluno,
    });
    
    if (error) {
      console.error("Erro ao buscar dashboard do aluno:", error);
      setDashboardData(null);
    } else {
      setDashboardData(data);
    }

    // Buscar todos os relatórios deste aluno para comparação
    const { data: relatoriosData, error: relatoriosError } = await supabase
      .from("relatorios_mensais")
      .select(`
        relatorio_id,
        mes_referencia,
        data_geracao,
        porcentagem_concluida,
        porcentagem_em_desenvolvimento,
        comentario_automatico,
        conteudo_gerado,
        aluno,
        progresso_por_categoria,
        usuarios!relatorios_mensais_aluno_fkey(nome_completo, nivel_cefr)
      `)
      .eq("aluno", relatorio.aluno)
      .order("data_geracao", { ascending: false });

    if (!relatoriosError && relatoriosData) {
      const mapped = relatoriosData.map((r: any) => ({
        relatorio_id: r.relatorio_id,
        mes_referencia: r.mes_referencia,
        data_geracao: r.data_geracao,
        porcentagem_concluida: r.porcentagem_concluida,
        porcentagem_em_desenvolvimento: r.porcentagem_em_desenvolvimento,
        comentario_automatico: r.comentario_automatico,
        conteudo_gerado: r.conteudo_gerado,
        aluno: r.aluno,
        nome_aluno: r.usuarios?.nome_completo || "—",
        nivel_cefr: r.usuarios?.nivel_cefr || null,
        progresso_por_categoria: r.progresso_por_categoria || {},
      }));
      setRelatoriosDoAluno(mapped);

      // Definir mês comparado como o anterior ao atual
      const outrosRelatorios = mapped.filter(r => r.mes_referencia !== relatorio.mes_referencia);
      if (outrosRelatorios.length > 0) {
        setMesComparadoRelatorio(outrosRelatorios[0].mes_referencia);
      } else {
        setMesComparadoRelatorio("");
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedRelatorio) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let yPos = margin;

    // Função auxiliar para adicionar texto com quebra de linha
    const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      lines.forEach((line: string) => {
        if (yPos > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
    };

    // Cabeçalho
    addText("RELATÓRIO MENSAL", 16, true);
    yPos += 3;
    addText(`Aluno: ${selectedRelatorio.nome_aluno}`, 12, true);
    addText(`Nível CEFR: ${selectedRelatorio.nivel_cefr || "—"}`, 11);
    addText(`Mês de Referência: ${selectedRelatorio.mes_referencia}`, 11);
    addText(`Data de Geração: ${formatDateWithTime(selectedRelatorio.data_geracao)}`, 11);
    yPos += 5;

    // Resumo de progresso
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    addText("RESUMO DE PROGRESSO", 13, true);
    yPos += 2;
    addText(`Progresso Concluído: ${selectedRelatorio.porcentagem_concluida ?? 0}%`, 11);
    addText(`Em Desenvolvimento: ${selectedRelatorio.porcentagem_em_desenvolvimento ?? 0}%`, 11);
    yPos += 5;

    // Progresso por categoria (se disponível)
    if (dashboardData?.progresso_por_categoria) {
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      addText("PROGRESSO POR CATEGORIA", 13, true);
      yPos += 2;

      const categorias = Object.keys(dashboardData.progresso_por_categoria);
      categorias.forEach((cat) => {
        const dados = dashboardData.progresso_por_categoria[cat];
        addText(
          `${cat}: ${dados.percentual_concluido?.toFixed(1) || 0}% concluído, ${dados.percentual_em_desenvolvimento?.toFixed(1) || 0}% em desenvolvimento`,
          10
        );
      });
      yPos += 3;
    }

    // Comentário automático
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    addText("COMENTÁRIO DA PROFESSORA", 13, true);
    yPos += 2;
    addText(
      selectedRelatorio.comentario_automatico || "Nenhum comentário disponível.",
      10
    );

    // Salvar PDF
    const fileName = `relatorio_${selectedRelatorio.nome_aluno.replace(/\s+/g, "_")}_${selectedRelatorio.mes_referencia.replace(/\//g, "-")}.pdf`;
    doc.save(fileName);

    toast({
      title: "PDF gerado com sucesso",
      description: "O arquivo foi baixado para o seu computador.",
    });
  };

  const handleSendEmail = async () => {
    if (!selectedRelatorio) return;

    setSendingEmail(true);
    
    try {
      // Montar conteúdo HTML do e-mail
      let categoriasHTML = "";
      if (dashboardData?.progresso_por_categoria) {
        const categorias = Object.keys(dashboardData.progresso_por_categoria);
        categoriasHTML = categorias.map((cat) => {
          const dados = dashboardData.progresso_por_categoria[cat];
          return `<li><strong>${cat}:</strong> ${dados.percentual_concluido?.toFixed(1) || 0}% concluído, ${dados.percentual_em_desenvolvimento?.toFixed(1) || 0}% em desenvolvimento</li>`;
        }).join("");
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Relatório Mensal - ${selectedRelatorio.mes_referencia}
          </h1>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #555; font-size: 18px; margin-top: 0;">Informações do Aluno</h2>
            <p><strong>Nome:</strong> ${selectedRelatorio.nome_aluno}</p>
            <p><strong>Nível CEFR:</strong> ${selectedRelatorio.nivel_cefr || "—"}</p>
            <p><strong>Mês de Referência:</strong> ${selectedRelatorio.mes_referencia}</p>
          </div>

          <div style="margin: 20px 0;">
            <h2 style="color: #555; font-size: 18px;">Resumo de Progresso</h2>
            <p><strong>Progresso Concluído:</strong> ${selectedRelatorio.porcentagem_concluida ?? 0}%</p>
            <p><strong>Em Desenvolvimento:</strong> ${selectedRelatorio.porcentagem_em_desenvolvimento ?? 0}%</p>
          </div>

          ${categoriasHTML ? `
            <div style="margin: 20px 0;">
              <h2 style="color: #555; font-size: 18px;">Progresso por Categoria</h2>
              <ul style="line-height: 1.8;">
                ${categoriasHTML}
              </ul>
            </div>
          ` : ""}

          <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #555; font-size: 18px; margin-top: 0;">Comentário da Professora</h2>
            <p style="white-space: pre-wrap;">${selectedRelatorio.comentario_automatico || "Nenhum comentário disponível."}</p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke("enviar-email-notificacao", {
        body: {
          to: "responsavel@teste.com", // Email de teste - idealmente buscar do perfil do responsável
          subject: `Relatório mensal de ${selectedRelatorio.nome_aluno} – ${selectedRelatorio.mes_referencia}`,
          html: htmlContent,
        },
      });

      if (error) throw error;

      toast({
        title: "E-mail enviado com sucesso",
        description: "O relatório foi enviado para o responsável.",
      });
      
      setShowEmailConfirm(false);
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar e-mail",
        description: "Não foi possível enviar o relatório. Tente novamente.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateWithTime = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const meses = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const anos = ["2024", "2025", "2026"];

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

  // Filtrar histórico do mês do relatório
  const historicoMesDoRelatorio = useMemo(() => {
    if (!dashboardData?.historico_progresso || !selectedRelatorio) return [];
    
    // Extrair mês e ano do mes_referencia (formato: "MM/YYYY")
    const [mesRef, anoRef] = selectedRelatorio.mes_referencia.split("/");
    const mesNum = parseInt(mesRef); // 1-indexed para comparação
    const anoNum = parseInt(anoRef);
    
    return (dashboardData.historico_progresso as Array<{ data: string; progresso_geral: number }>)
      .filter((item) => {
        const dataItem = criarDataBrasilia(
          new Date(item.data).getFullYear(),
          new Date(item.data).getMonth() + 1,
          new Date(item.data).getDate()
        );
        return (dataItem.getMonth() + 1) === mesNum && dataItem.getFullYear() === anoNum;
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [dashboardData?.historico_progresso, selectedRelatorio]);

  // Preparar dados para o gráfico - agrupando por semanas do mês
  const chartData = useMemo(() => {
    if (!selectedRelatorio) return [];
    
    const [mesRef, anoRef] = selectedRelatorio.mes_referencia.split("/");
    const mesNum = parseInt(mesRef); // 1-indexed (janeiro = 1)
    const anoNum = parseInt(anoRef);
    const semanas = getSemanasDoMes(mesNum, anoNum);
    
    if (selectedCategory === "Geral") {
      // Agrupar dados do histórico por semana
      return semanas.map((semana) => {
        const registrosNaSemana = historicoMesDoRelatorio.filter((item) => {
          const dataItem = new Date(item.data);
          return dataItem >= semana.inicio && dataItem <= semana.fim;
        });
        
        // Pegar o último valor da semana (mais recente) ou calcular média
        const ultimoRegistro = registrosNaSemana[registrosNaSemana.length - 1];
        const valor = ultimoRegistro ? ultimoRegistro.progresso_geral : 0;
        
        return {
          data: semana.label,
          valor: valor || 0,
        };
      });
    } else {
      // Para categorias específicas, usar o progresso por categoria do relatório
      const progressoCategoria = selectedRelatorio.progresso_por_categoria?.[selectedCategory];
      
      if (!progressoCategoria) {
        // Fallback para dados atuais se não houver dados salvos no relatório
        const progressoPorCategoriaAtual = dashboardData?.progresso_por_categoria || {};
        const categoriaData = progressoPorCategoriaAtual[selectedCategory];
        
        if (!categoriaData) return [];
        
        // Mostrar o valor atual em todas as semanas como referência
        return semanas.map((semana) => ({
          data: semana.label,
          valor: categoriaData.percentual_concluido || 0,
        }));
      }
      
      // Mostrar o progresso por categoria do relatório
      return semanas.map((semana, index) => ({
        data: semana.label,
        valor: progressoCategoria.percentual_concluido || 0,
      }));
    }
  }, [selectedCategory, historicoMesDoRelatorio, dashboardData?.progresso_por_categoria, selectedRelatorio]);

  const categorias = useMemo(() => {
    const progressoPorCategoria = dashboardData?.progresso_por_categoria || {};
    return ["Geral", ...Object.keys(progressoPorCategoria)];
  }, [dashboardData?.progresso_por_categoria]);

  // Dados de comparação para o relatório
  const dadosComparacaoRelatorio = useMemo(() => {
    if (!selectedRelatorio || !mesComparadoRelatorio) return null;

    const relatorioComp = relatoriosDoAluno.find(r => r.mes_referencia === mesComparadoRelatorio);
    if (!relatorioComp) return null;

    const progressoBase = selectedRelatorio.porcentagem_concluida || 0;
    const progressoComp = relatorioComp.porcentagem_concluida || 0;
    const diferenca = progressoBase - progressoComp;

    return {
      progressoBase,
      progressoComp,
      diferenca,
      tipo: diferenca > 0 ? "melhora" : diferenca < 0 ? "piora" : "igual"
    };
  }, [selectedRelatorio, mesComparadoRelatorio, relatoriosDoAluno]);

  // Gráfico comparativo por categoria no relatório - usando dados reais dos relatórios
  const chartDataComparativoRelatorio = useMemo(() => {
    if (!selectedRelatorio || !mesComparadoRelatorio) return [];

    const relatorioComp = relatoriosDoAluno.find(r => r.mes_referencia === mesComparadoRelatorio);
    if (!relatorioComp) return [];

    // Usar progresso por categoria do relatório base
    const progressoBase = selectedRelatorio.progresso_por_categoria || {};
    const progressoComp = relatorioComp.progresso_por_categoria || {};
    
    // Pegar todas as categorias (união das duas)
    const todasCategorias = new Set([
      ...Object.keys(progressoBase),
      ...Object.keys(progressoComp)
    ]);

    // Se não há dados em nenhum dos relatórios, mostrar mensagem
    if (todasCategorias.size === 0) {
      return [];
    }

    return Array.from(todasCategorias).map(cat => ({
      categoria: cat,
      mesBase: progressoBase[cat]?.percentual_concluido || 0,
      mesComparado: progressoComp[cat]?.percentual_concluido || 0
    }));
  }, [selectedRelatorio, mesComparadoRelatorio, relatoriosDoAluno]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Relatórios Mensais</h1>
          </div>
          <LogoutButton variant="destructive" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Aluno</label>
                <Select value={selectedAluno} onValueChange={setSelectedAluno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os alunos</SelectItem>
                    {alunos.map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <Select value={selectedMes} onValueChange={setSelectedMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Ano</label>
                <Select value={selectedAno} onValueChange={setSelectedAno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano} value={ano}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleFilter}>Filtrar</Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Relatórios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando relatórios…</p>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : relatorios.length === 0 ? (
              <p className="text-muted-foreground">Nenhum relatório encontrado.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Aluno</TableHead>
                      <TableHead>Nível CEFR</TableHead>
                      <TableHead>Mês de Referência</TableHead>
                      <TableHead>Data de Geração</TableHead>
                      <TableHead>% Concluída (Atual)</TableHead>
                      <TableHead>% Em Desenvolvimento (Atual)</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorios.map((rel) => (
                      <TableRow key={rel.relatorio_id}>
                        <TableCell className="font-medium">{rel.nome_aluno}</TableCell>
                        <TableCell>
                          {rel.nivel_cefr ? (
                            <Badge variant="outline">{rel.nivel_cefr}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{rel.mes_referencia}</TableCell>
                        <TableCell>{formatDate(rel.data_geracao)}</TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {(rel.progresso_atual ?? rel.porcentagem_concluida ?? 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-amber-600">
                            {(rel.em_desenvolvimento_atual ?? rel.porcentagem_em_desenvolvimento ?? 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerDetalhes(rel)}
                          >
                            Ver detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRelatorio && `Relatório Mensal - ${selectedRelatorio.nome_aluno} (${selectedRelatorio.mes_referencia})`}
            </DialogTitle>
          </DialogHeader>
          {selectedRelatorio && (
            <div className="space-y-6">
              {/* Bloco 1 - Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nome do Aluno</p>
                    <p className="text-base">{selectedRelatorio.nome_aluno}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nível CEFR</p>
                    <p className="text-base">
                      {selectedRelatorio.nivel_cefr ? (
                        <Badge variant="outline">{selectedRelatorio.nivel_cefr}</Badge>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mês de Referência</p>
                    <p className="text-base">{selectedRelatorio.mes_referencia}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Geração</p>
                    <p className="text-base">{formatDateWithTime(selectedRelatorio.data_geracao)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Bloco 2 - Progresso Atual em Tempo Real */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Progresso Atual (Tempo Real)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Dados atualizados com base no nível CEFR atual do aluno
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {progressoAtual ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-muted-foreground">Nível atual:</span>
                        <Badge variant="default">{progressoAtual.nivel_cefr || "—"}</Badge>
                        <span className="text-sm text-muted-foreground ml-4">
                          {progressoAtual.concluidos}/{progressoAtual.total_topicos} tópicos concluídos
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium">% Concluída</p>
                          <p className="text-sm font-medium text-primary">{(progressoAtual.progresso_geral ?? 0).toFixed(1)}%</p>
                        </div>
                        <Progress value={progressoAtual.progresso_geral ?? 0} className="h-3" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium">% Em Desenvolvimento</p>
                          <p className="text-sm font-medium">
                            {progressoAtual.total_topicos > 0 
                              ? ((progressoAtual.em_desenvolvimento / progressoAtual.total_topicos) * 100).toFixed(1)
                              : 0}%
                          </p>
                        </div>
                        <Progress 
                          value={progressoAtual.total_topicos > 0 
                            ? (progressoAtual.em_desenvolvimento / progressoAtual.total_topicos) * 100
                            : 0} 
                          className="h-3"
                        />
                      </div>
                      
                      {/* Comparação com o relatório */}
                      {progressoAtual.progresso_geral !== selectedRelatorio.porcentagem_concluida && (
                        <div className="mt-4 p-3 rounded-lg bg-background border">
                          <p className="text-sm font-medium mb-1">Comparação com o relatório:</p>
                          {(() => {
                            const diff = (progressoAtual.progresso_geral ?? 0) - (selectedRelatorio.porcentagem_concluida ?? 0);
                            if (diff > 0) {
                              return (
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                  <TrendingUp className="h-4 w-4" />
                                  +{diff.toFixed(1)}% desde o relatório
                                </p>
                              );
                            } else if (diff < 0) {
                              return (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                  <TrendingDown className="h-4 w-4" />
                                  {diff.toFixed(1)}% desde o relatório
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando progresso atual...</p>
                  )}
                </CardContent>
              </Card>

              {/* Bloco 3 - Gráfico de Evolução Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evolução no mês do relatório</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Acompanhe como o progresso evoluiu a cada atualização neste mês
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
                            <linearGradient id="colorValorRelatorio" x1="0" y1="0" x2="0" y2="1">
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
                            fill="url(#colorValorRelatorio)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Bloco 4 - Comentário Automático */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comentário Automático</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedRelatorio.comentario_automatico || "Nenhum comentário automático gerado para este relatório."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bloco 5 - Comparar com outro mês */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comparar com outro mês</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Compare o progresso deste mês com outros períodos
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {relatoriosDoAluno.length < 2 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Ainda não há outros meses para comparação deste aluno.</p>
                    </div>
                  ) : (
                    <>
                      {/* Select de mês para comparar */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Comparar {selectedRelatorio.mes_referencia} com
                        </label>
                        <Select value={mesComparadoRelatorio} onValueChange={setMesComparadoRelatorio}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o mês para comparar" />
                          </SelectTrigger>
                          <SelectContent>
                            {relatoriosDoAluno
                              .filter(r => r.mes_referencia !== selectedRelatorio.mes_referencia)
                              .map((rel) => (
                                <SelectItem key={rel.mes_referencia} value={rel.mes_referencia}>
                                  {rel.mes_referencia}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Resumo comparativo */}
                      {dadosComparacaoRelatorio && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground mb-1">
                                    Mês base ({selectedRelatorio.mes_referencia})
                                  </p>
                                  <p className="text-3xl font-bold">
                                    {dadosComparacaoRelatorio.progressoBase.toFixed(1)}%
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground mb-1">
                                    Comparar com ({mesComparadoRelatorio})
                                  </p>
                                  <p className="text-3xl font-bold">
                                    {dadosComparacaoRelatorio.progressoComp.toFixed(1)}%
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground mb-1">Diferença</p>
                                  <div className="flex items-center justify-center gap-2">
                                    <p className="text-3xl font-bold">
                                      {dadosComparacaoRelatorio.diferenca > 0 ? "+" : ""}
                                      {dadosComparacaoRelatorio.diferenca.toFixed(1)} p.p.
                                    </p>
                                    {dadosComparacaoRelatorio.tipo === "melhora" && (
                                      <Badge variant="default" className="bg-green-500">
                                        <TrendingUp className="h-4 w-4" />
                                      </Badge>
                                    )}
                                    {dadosComparacaoRelatorio.tipo === "piora" && (
                                      <Badge variant="destructive">
                                        <TrendingDown className="h-4 w-4" />
                                      </Badge>
                                    )}
                                    {dadosComparacaoRelatorio.tipo === "igual" && (
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
                          {chartDataComparativoRelatorio.length > 0 && (
                            <div className="mt-6">
                              <h3 className="text-base font-semibold mb-4">Comparação por categoria</h3>
                              <ChartContainer
                                config={{
                                  mesBase: {
                                    label: `Mês base (${selectedRelatorio.mes_referencia})`,
                                    color: "hsl(var(--primary))",
                                  },
                                  mesComparado: {
                                    label: `Comparar com (${mesComparadoRelatorio})`,
                                    color: "hsl(var(--muted-foreground))",
                                  },
                                }}
                                className="h-80"
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartDataComparativoRelatorio}>
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
                                      name={`Mês base (${selectedRelatorio.mes_referencia})`}
                                      radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                      dataKey="mesComparado"
                                      fill="hsl(var(--muted-foreground))"
                                      name={`Comparar com (${mesComparadoRelatorio})`}
                                      radius={[4, 4, 0, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                            </div>
                          )}
                          {chartDataComparativoRelatorio.length === 0 && (
                            <p className="text-sm text-muted-foreground mt-4 text-center">
                              Os relatórios selecionados não possuem dados de progresso por categoria salvos.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Botões de ação */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
                <Button
                  onClick={() => setShowEmailConfirm(true)}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Enviar por e-mail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de envio de e-mail */}
      <Dialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar relatório por e-mail</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Enviar este relatório mensal por e-mail para o responsável do aluno?
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowEmailConfirm(false)}
              disabled={sendingEmail}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail}
            >
              {sendingEmail ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRelatorios;
