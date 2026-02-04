/**
 * Gerador de PDF programático para relatórios mensais
 * Constrói o PDF diretamente com jsPDF, capturando apenas gráficos como imagem
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type RelatorioPDFData = {
  // Informações gerais
  nomeAluno: string;
  nivelCefr: string | null;
  mesReferencia: string;
  dataGeracao: string;
  
  // Progresso
  porcentagemConcluida: number;
  porcentagemEmDesenvolvimento: number;
  
  // Progresso atual (tempo real)
  progressoAtual?: {
    progressoGeral: number;
    emDesenvolvimento: number;
    totalTopicos: number;
  };
  
  // Aulas do mês
  aulasMes?: {
    total: number;
    realizadas: number;
    faltas: number;
    remarcadas: number;
  };
  
  // Comentário
  comentario: string | null;
  
  // Progresso por categoria (para listagem)
  progressoPorCategoria?: Record<string, {
    total: number;
    concluidos: number;
    percentual_concluido: number;
    percentual_em_desenvolvimento: number;
  }>;
};

// Cores do sistema
const COLORS = {
  primary: [59, 130, 246] as [number, number, number], // blue-500
  success: [34, 197, 94] as [number, number, number],  // green-500
  warning: [245, 158, 11] as [number, number, number], // amber-500
  danger: [239, 68, 68] as [number, number, number],   // red-500
  muted: [107, 114, 128] as [number, number, number],  // gray-500
  text: [17, 24, 39] as [number, number, number],      // gray-900
  textLight: [75, 85, 99] as [number, number, number], // gray-600
  border: [229, 231, 235] as [number, number, number], // gray-200
  background: [249, 250, 251] as [number, number, number], // gray-50
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Captura um elemento do DOM como imagem base64
 */
async function captureElementAsImage(element: HTMLElement): Promise<string | null> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    return canvas.toDataURL("image/png", 1.0);
  } catch (error) {
    console.error("Erro ao capturar elemento:", error);
    return null;
  }
}

/**
 * Desenha um card/seção com título
 */
function drawSection(
  pdf: jsPDF,
  title: string,
  y: number,
  width: number,
  height: number,
  margin: number
): number {
  // Background do card
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.border);
  pdf.roundedRect(margin, y, width - 2 * margin, height, 4, 4, "FD");
  
  // Título
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.text);
  pdf.text(title, margin + 10, y + 15);
  
  return y + 25; // Retorna Y após o título
}

/**
 * Desenha uma linha de informação (label: valor)
 */
function drawInfoLine(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number = 100
): number {
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...COLORS.textLight);
  pdf.text(label, x, y);
  
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.text);
  pdf.text(value, x + labelWidth, y);
  
  return y + 14;
}

/**
 * Desenha uma badge/pill
 */
function drawBadge(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  color: [number, number, number] = COLORS.primary
): { width: number; height: number } {
  const textWidth = pdf.getStringUnitWidth(text) * 9 / pdf.internal.scaleFactor;
  const paddingX = 8;
  const paddingY = 4;
  const height = 16;
  const width = textWidth + paddingX * 2;
  
  // Background da badge
  pdf.setFillColor(...color);
  pdf.roundedRect(x, y - 10, width, height, 3, 3, "F");
  
  // Texto
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.white);
  pdf.text(text, x + paddingX, y);
  
  return { width, height };
}

/**
 * Desenha uma barra de progresso
 */
function drawProgressBar(
  pdf: jsPDF,
  value: number,
  x: number,
  y: number,
  width: number,
  height: number = 8,
  color: [number, number, number] = COLORS.success
): void {
  // Background
  pdf.setFillColor(...COLORS.border);
  pdf.roundedRect(x, y, width, height, 2, 2, "F");
  
  // Barra de progresso
  const progressWidth = Math.max(0, Math.min(100, value)) / 100 * width;
  if (progressWidth > 0) {
    pdf.setFillColor(...color);
    pdf.roundedRect(x, y, progressWidth, height, 2, 2, "F");
  }
}

/**
 * Gera o PDF do relatório mensal
 */
export async function generateRelatorioPDF(
  data: RelatorioPDFData,
  chartElement?: HTMLElement | null
): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;
  
  let currentY = margin;
  
  // ========== CABEÇALHO ==========
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.text);
  pdf.text("Relatório Mensal de Progresso", margin, 38);
  
  currentY = 60;
  
  // ========== SEÇÃO: INFORMAÇÕES DO ALUNO ==========
  const infoHeight = 100;
  const infoY = drawSection(pdf, "Informações do Aluno", currentY, pageWidth, infoHeight, margin);
  
  let lineY = infoY + 5;
  lineY = drawInfoLine(pdf, "Nome:", data.nomeAluno, margin + 10, lineY);
  
  lineY = drawInfoLine(pdf, "Nível CEFR:", data.nivelCefr || "—", margin + 10, lineY);
  
  lineY = drawInfoLine(pdf, "Mês de Referência:", data.mesReferencia, margin + 10, lineY);
  lineY = drawInfoLine(pdf, "Data de Geração:", data.dataGeracao, margin + 10, lineY);
  
  currentY += infoHeight + 15;
  
  // ========== SEÇÃO: PROGRESSO ATUAL (se disponível) ==========
  if (data.progressoAtual) {
    const atualHeight = 85;
    const atualY = drawSection(pdf, "Progresso Atual (Tempo Real)", currentY, pageWidth, atualHeight, margin);
    
    lineY = atualY + 5;
    
    // Progresso geral atual
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("Progresso Geral:", margin + 10, lineY);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.success);
    pdf.text(`${data.progressoAtual.progressoGeral.toFixed(1)}%`, margin + 100, lineY);
    drawProgressBar(pdf, data.progressoAtual.progressoGeral, margin + 150, lineY - 6, contentWidth - 160, 8, COLORS.success);
    lineY += 20;
    
    // Em desenvolvimento atual
    const emDevPercent = data.progressoAtual.totalTopicos > 0 
      ? (data.progressoAtual.emDesenvolvimento / data.progressoAtual.totalTopicos) * 100 
      : 0;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("Em Desenvolvimento:", margin + 10, lineY);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.warning);
    pdf.text(`${emDevPercent.toFixed(1)}%`, margin + 130, lineY);
    drawProgressBar(pdf, emDevPercent, margin + 180, lineY - 6, contentWidth - 190, 8, COLORS.warning);
    
    currentY += atualHeight + 15;
  }
  
  // ========== SEÇÃO: AULAS DO MÊS (se disponível) ==========
  if (data.aulasMes && data.aulasMes.total > 0) {
    const aulasHeight = 80;
    const aulasY = drawSection(pdf, "Resumo de Aulas do Mês Atual", currentY, pageWidth, aulasHeight, margin);
    
    lineY = aulasY + 5;
    
    // Grid de 2 colunas
    const col1X = margin + 10;
    const col2X = margin + contentWidth / 2;
    
    lineY = drawInfoLine(pdf, "Total de Aulas:", data.aulasMes.total.toString(), col1X, lineY, 90);
    drawInfoLine(pdf, "Realizadas:", data.aulasMes.realizadas.toString(), col2X, lineY - 14, 80);
    
    if (data.aulasMes.faltas > 0 || data.aulasMes.remarcadas > 0) {
      if (data.aulasMes.faltas > 0) {
        lineY = drawInfoLine(pdf, "Faltas:", data.aulasMes.faltas.toString(), col1X, lineY, 90);
      }
      if (data.aulasMes.remarcadas > 0) {
        drawInfoLine(pdf, "Remarcadas:", data.aulasMes.remarcadas.toString(), col2X, lineY - 14, 80);
      }
    }
    
    currentY += aulasHeight + 15;
  }
  
  // ========== SEÇÃO: GRÁFICO DE EVOLUÇÃO (se disponível) ==========
  if (chartElement) {
    // Verificar se precisa de nova página
    if (currentY + 200 > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }
    
    const chartImage = await captureElementAsImage(chartElement);
    
    if (chartImage) {
      const chartSectionY = drawSection(pdf, "Evolução no Mês Atual", currentY, pageWidth, 220, margin);
      
      // Adicionar imagem do gráfico
      const imgWidth = contentWidth - 20;
      const imgHeight = 180;
      pdf.addImage(chartImage, "PNG", margin + 10, chartSectionY + 5, imgWidth, imgHeight);
      
      currentY += 235;
    }
  }
  
  // ========== SEÇÃO: COMENTÁRIO ==========
  // Verificar se precisa de nova página
  if (currentY + 100 > pageHeight - margin) {
    pdf.addPage();
    currentY = margin;
  }
  
  const comentario = data.comentario || "Nenhum comentário disponível para este relatório.";
  
  // Calcular altura necessária para o comentário
  pdf.setFontSize(10);
  const splitText = pdf.splitTextToSize(comentario, contentWidth - 30);
  const comentarioHeight = Math.max(70, splitText.length * 14 + 40);
  
  const comentarioY = drawSection(pdf, "Comentário da Professora", currentY, pageWidth, comentarioHeight, margin);
  
  // Background do texto
  pdf.setFillColor(...COLORS.background);
  pdf.roundedRect(margin + 10, comentarioY + 5, contentWidth - 20, comentarioHeight - 45, 3, 3, "F");
  
  // Texto do comentário
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...COLORS.text);
  pdf.text(splitText, margin + 15, comentarioY + 18);
  
  currentY += comentarioHeight + 15;
  
  // ========== SEÇÃO: PROGRESSO POR CATEGORIA ==========
  if (data.progressoPorCategoria && Object.keys(data.progressoPorCategoria).length > 0) {
    // Verificar se precisa de nova página
    if (currentY + 150 > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }
    
    const categorias = Object.entries(data.progressoPorCategoria);
    const categoriaHeight = 30 + categorias.length * 22;
    
    const catY = drawSection(pdf, "Progresso por Categoria", currentY, pageWidth, categoriaHeight, margin);
    
    lineY = catY + 5;
    
    categorias.forEach(([nome, cat]) => {
      // Nome da categoria
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...COLORS.text);
      pdf.text(nome, margin + 15, lineY);
      
      // Percentuais
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...COLORS.success);
      pdf.text(`${cat.percentual_concluido.toFixed(1)}% concluído`, margin + 150, lineY);
      
      pdf.setTextColor(...COLORS.warning);
      pdf.text(`${cat.percentual_em_desenvolvimento.toFixed(1)}% em dev.`, margin + 280, lineY);
      
      // Mini barra de progresso
      drawProgressBar(pdf, cat.percentual_concluido, margin + 400, lineY - 4, 100, 6, COLORS.success);
      
      lineY += 22;
    });
  }
  
  // ========== RODAPÉ ==========
  const footerY = pageHeight - 30;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...COLORS.muted);
  pdf.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    margin,
    footerY
  );
  pdf.text(
    "Este relatório foi gerado automaticamente.",
    pageWidth - margin - 150,
    footerY
  );
  
  return pdf;
}

/**
 * Baixa o PDF diretamente
 */
export async function downloadRelatorioPDF(
  data: RelatorioPDFData,
  chartElement?: HTMLElement | null
): Promise<void> {
  const pdf = await generateRelatorioPDF(data, chartElement);
  const fileName = `relatorio_${data.nomeAluno.replace(/\s+/g, "_")}_${data.mesReferencia.replace(/\//g, "-")}.pdf`;
  pdf.save(fileName);
}

/**
 * Retorna o PDF como base64 para envio por email
 */
export async function getRelatorioPDFBase64(
  data: RelatorioPDFData,
  chartElement?: HTMLElement | null
): Promise<string> {
  const pdf = await generateRelatorioPDF(data, chartElement);
  return pdf.output("datauristring");
}
