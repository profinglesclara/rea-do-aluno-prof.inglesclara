/**
 * Utilitários para geração de PDF robusta
 * Resolve problemas de html2canvas com SVGs, ícones e estilos
 */

/**
 * Aguarda todas as fontes carregarem
 */
export async function waitForFonts(): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
}

/**
 * Converte um elemento SVG para uma imagem data URI
 */
export function svgToDataUri(svg: SVGElement): string {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Substitui todos os SVGs do documento clonado por imagens
 * Isso resolve o problema de ícones Lucide não renderizando corretamente
 */
export function convertSvgsToImages(container: HTMLElement): void {
  const svgs = container.querySelectorAll('svg');
  
  svgs.forEach((svg) => {
    try {
      // Obter estilos computados do SVG
      const computedStyle = window.getComputedStyle(svg);
      const width = svg.getAttribute('width') || computedStyle.width || '24';
      const height = svg.getAttribute('height') || computedStyle.height || '24';
      
      // Clonar o SVG para não modificar o original
      const svgClone = svg.cloneNode(true) as SVGElement;
      
      // Garantir que o SVG tenha dimensões explícitas
      svgClone.setAttribute('width', width.toString().replace('px', ''));
      svgClone.setAttribute('height', height.toString().replace('px', ''));
      
      // Resolver currentColor para cor fixa
      const color = computedStyle.color || '#000000';
      resolveCurrentColor(svgClone, color);
      
      // Converter para data URI
      const dataUri = svgToDataUri(svgClone);
      
      // Criar imagem substituta
      const img = document.createElement('img');
      img.src = dataUri;
      img.style.width = width.toString().includes('px') ? width.toString() : `${width}px`;
      img.style.height = height.toString().includes('px') ? height.toString() : `${height}px`;
      img.style.display = 'inline-block';
      img.style.verticalAlign = 'middle';
      
      // Copiar classes e estilos relevantes
      if (svg.classList.length > 0) {
        img.className = svg.className.toString();
      }
      
      // Substituir SVG por imagem
      svg.parentNode?.replaceChild(img, svg);
    } catch (e) {
      console.warn('Falha ao converter SVG:', e);
    }
  });
}

/**
 * Resolve 'currentColor' para uma cor fixa em todos os elementos do SVG
 */
function resolveCurrentColor(svg: SVGElement, color: string): void {
  // Resolver no elemento raiz
  const stroke = svg.getAttribute('stroke');
  if (stroke === 'currentColor') {
    svg.setAttribute('stroke', color);
  }
  
  const fill = svg.getAttribute('fill');
  if (fill === 'currentColor') {
    svg.setAttribute('fill', color);
  }
  
  // Resolver em todos os filhos
  const children = svg.querySelectorAll('*');
  children.forEach((child) => {
    const childStroke = child.getAttribute('stroke');
    if (childStroke === 'currentColor') {
      child.setAttribute('stroke', color);
    }
    
    const childFill = child.getAttribute('fill');
    if (childFill === 'currentColor') {
      child.setAttribute('fill', color);
    }
  });
}

/**
 * Aplica estilos inline críticos para elementos problemáticos
 * Resolve problemas de flexbox, gap, badges, etc.
 */
export function inlineCriticalStyles(container: HTMLElement): void {
  // Processar badges (elementos com classes de badge)
  const badges = container.querySelectorAll('[class*="badge"], [class*="Badge"]');
  badges.forEach((badge) => {
    const el = badge as HTMLElement;
    const computed = window.getComputedStyle(el);
    
    el.style.display = computed.display;
    el.style.alignItems = computed.alignItems;
    el.style.justifyContent = computed.justifyContent;
    el.style.padding = computed.padding;
    el.style.borderRadius = computed.borderRadius;
    el.style.backgroundColor = computed.backgroundColor;
    el.style.color = computed.color;
    el.style.fontSize = computed.fontSize;
    el.style.fontWeight = computed.fontWeight;
    el.style.lineHeight = computed.lineHeight;
    el.style.gap = computed.gap;
  });
  
  // Processar elementos flex
  const flexElements = container.querySelectorAll('[class*="flex"], [class*="inline-flex"]');
  flexElements.forEach((flex) => {
    const el = flex as HTMLElement;
    const computed = window.getComputedStyle(el);
    
    if (computed.display.includes('flex')) {
      el.style.display = computed.display;
      el.style.flexDirection = computed.flexDirection;
      el.style.alignItems = computed.alignItems;
      el.style.justifyContent = computed.justifyContent;
      el.style.gap = computed.gap;
      el.style.flexWrap = computed.flexWrap;
    }
  });
  
  // Processar cards
  const cards = container.querySelectorAll('[class*="card"], [class*="Card"]');
  cards.forEach((card) => {
    const el = card as HTMLElement;
    const computed = window.getComputedStyle(el);
    
    el.style.backgroundColor = computed.backgroundColor;
    el.style.borderRadius = computed.borderRadius;
    el.style.border = computed.border;
    el.style.padding = computed.padding;
    el.style.boxShadow = computed.boxShadow;
  });
  
  // Garantir fundo branco em elementos sem fundo
  const allElements = container.querySelectorAll('*');
  allElements.forEach((element) => {
    const el = element as HTMLElement;
    const computed = window.getComputedStyle(el);
    
    // Se o fundo é transparente e é um container visível, forçar branco
    if (computed.backgroundColor === 'rgba(0, 0, 0, 0)' && 
        (el.tagName === 'DIV' || el.tagName === 'SECTION' || el.tagName === 'ARTICLE')) {
      // Não forçar - deixar transparente para herdar do pai
    }
  });
}

/**
 * Converte gráficos Recharts (SVG) para imagens antes da captura
 */
export function convertChartsToImages(container: HTMLElement): void {
  // Recharts usa classes específicas
  const chartContainers = container.querySelectorAll('.recharts-wrapper');
  
  chartContainers.forEach((chartContainer) => {
    const svg = chartContainer.querySelector('svg.recharts-surface');
    if (!svg) return;
    
    try {
      const svgElement = svg as SVGElement;
      const bbox = svgElement.getBoundingClientRect();
      
      // Clonar e preparar SVG
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute('width', bbox.width.toString());
      svgClone.setAttribute('height', bbox.height.toString());
      
      // Inline todos os estilos do gráfico
      inlineChartStyles(svgClone);
      
      // Converter para data URI
      const dataUri = svgToDataUri(svgClone);
      
      // Criar imagem
      const img = document.createElement('img');
      img.src = dataUri;
      img.style.width = `${bbox.width}px`;
      img.style.height = `${bbox.height}px`;
      img.style.display = 'block';
      
      // Substituir o container do gráfico
      const wrapper = chartContainer as HTMLElement;
      wrapper.innerHTML = '';
      wrapper.appendChild(img);
    } catch (e) {
      console.warn('Falha ao converter gráfico:', e);
    }
  });
}

/**
 * Aplica estilos inline em elementos do gráfico
 */
function inlineChartStyles(svg: SVGElement): void {
  const elements = svg.querySelectorAll('*');
  
  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const element = el as SVGElement;
    
    // Copiar atributos de estilo relevantes para SVG
    const fill = computed.fill;
    const stroke = computed.stroke;
    const strokeWidth = computed.strokeWidth;
    const opacity = computed.opacity;
    
    if (fill && fill !== 'none') {
      element.style.fill = fill;
    }
    if (stroke && stroke !== 'none') {
      element.style.stroke = stroke;
    }
    if (strokeWidth) {
      element.style.strokeWidth = strokeWidth;
    }
    if (opacity && opacity !== '1') {
      element.style.opacity = opacity;
    }
  });
}

/**
 * Prepara o elemento clonado para captura do html2canvas
 * Executa todas as transformações necessárias
 */
export async function prepareForCapture(clonedElement: HTMLElement): Promise<void> {
  // 1. Converter gráficos primeiro (são mais complexos)
  convertChartsToImages(clonedElement);
  
  // 2. Converter SVGs/ícones para imagens
  convertSvgsToImages(clonedElement);
  
  // 3. Aplicar estilos inline críticos
  inlineCriticalStyles(clonedElement);
  
  // 4. Forçar fundo branco no container principal
  clonedElement.style.backgroundColor = '#ffffff';
  
  // 5. Pequeno delay para garantir que tudo renderizou
  await new Promise(resolve => setTimeout(resolve, 100));
}
