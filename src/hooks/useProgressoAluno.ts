import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// 7 categorias fixas do currículo CEFR
export const CATEGORIAS_FIXAS = [
  "Phonetics",
  "Grammar", 
  "Vocabulary",
  "Communication",
  "Expressions",
  "Pronunciation",
  "Listening"
] as const;

export type CategoriaFixa = typeof CATEGORIAS_FIXAS[number];

export type CategoriaProgresso = {
  total: number;
  concluidos: number;
  em_desenvolvimento: number;
  a_introduzir: number;
  percentual_concluido: number;
  percentual_em_desenvolvimento: number;
};

export type ProgressoAluno = {
  nivel_cefr: string | null;
  progresso_geral: number;
  total_topicos: number;
  concluidos: number;
  em_desenvolvimento: number;
  a_introduzir: number;
  progresso_por_categoria: Record<CategoriaFixa, CategoriaProgresso>;
  erro?: string;
};

/**
 * Hook para buscar progresso do aluno filtrado pelo nível CEFR atual
 * Usa a função get_progresso_aluno do banco que calcula em tempo real
 */
export function useProgressoAluno(alunoId?: string) {
  return useQuery<ProgressoAluno>({
    queryKey: ["progressoAluno", alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_progresso_aluno", {
        p_aluno: alunoId,
      });
      
      if (error) throw error;
      
      if (!data) {
        return getEmptyProgresso();
      }
      
      // Garantir que todas as 7 categorias estão presentes
      const progressoPorCategoria = ensureAllCategories(
        (data as any).progresso_por_categoria || {}
      );
      
      return {
        nivel_cefr: (data as any).nivel_cefr,
        progresso_geral: Number((data as any).progresso_geral) || 0,
        total_topicos: Number((data as any).total_topicos) || 0,
        concluidos: Number((data as any).concluidos) || 0,
        em_desenvolvimento: Number((data as any).em_desenvolvimento) || 0,
        a_introduzir: Number((data as any).a_introduzir) || 0,
        progresso_por_categoria: progressoPorCategoria,
        erro: (data as any).erro,
      };
    },
    staleTime: 30_000, // 30 segundos
  });
}

/**
 * Garante que todas as 7 categorias fixas estão no objeto
 * Preenche com zeros se faltar alguma
 */
function ensureAllCategories(
  categorias: Record<string, any>
): Record<CategoriaFixa, CategoriaProgresso> {
  const result = {} as Record<CategoriaFixa, CategoriaProgresso>;
  
  for (const cat of CATEGORIAS_FIXAS) {
    const existing = categorias[cat];
    result[cat] = {
      total: Number(existing?.total) || 0,
      concluidos: Number(existing?.concluidos) || 0,
      em_desenvolvimento: Number(existing?.em_desenvolvimento) || 0,
      a_introduzir: Number(existing?.a_introduzir) || 0,
      percentual_concluido: Number(existing?.percentual_concluido) || 0,
      percentual_em_desenvolvimento: Number(existing?.percentual_em_desenvolvimento) || 0,
    };
  }
  
  return result;
}

/**
 * Retorna um objeto de progresso vazio
 */
function getEmptyProgresso(): ProgressoAluno {
  const emptyCategorias = {} as Record<CategoriaFixa, CategoriaProgresso>;
  
  for (const cat of CATEGORIAS_FIXAS) {
    emptyCategorias[cat] = {
      total: 0,
      concluidos: 0,
      em_desenvolvimento: 0,
      a_introduzir: 0,
      percentual_concluido: 0,
      percentual_em_desenvolvimento: 0,
    };
  }
  
  return {
    nivel_cefr: null,
    progresso_geral: 0,
    total_topicos: 0,
    concluidos: 0,
    em_desenvolvimento: 0,
    a_introduzir: 0,
    progresso_por_categoria: emptyCategorias,
    erro: "Dados não disponíveis",
  };
}

/**
 * Verifica se uma categoria tem tópicos configurados
 */
export function categoriaTemTopicos(categoria: CategoriaProgresso): boolean {
  return categoria.total > 0;
}

/**
 * Formata o label de uma categoria para exibição
 * Pode retornar "Sem tópicos" se não houver tópicos
 */
export function formatCategoriaLabel(
  categoria: CategoriaProgresso,
  showNoTopicsLabel = true
): string {
  if (!categoriaTemTopicos(categoria) && showNoTopicsLabel) {
    return "Sem tópicos";
  }
  return `${categoria.concluidos}/${categoria.total}`;
}
