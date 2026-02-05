import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS_FIXAS, CategoriaProgresso } from "./useProgressoAluno";
import { syncTopicosAluno } from "./useAutoSyncTopicos";

export type AlunoData = {
  aluno_id: string;
  nome_completo: string;
  nome_de_usuario: string;
  tipo_usuario: string;
  nivel_cefr: string | null;
  modalidade: string | null;
  data_inicio_aulas: string | null;
  frequencia_mensal: number | null;
  objetivo_principal: string | null;
  status_aluno: string | null;
  progresso_geral: number | null;
  progresso_por_categoria: Record<string, CategoriaProgresso>;
  // Novos campos de progresso filtrado por nível
  total_topicos_nivel: number | null;
  concluidos_nivel: number | null;
  em_desenvolvimento_nivel: number | null;
  a_introduzir_nivel: number | null;
  historico_progresso: Array<{ data: string; progresso_geral: number; nivel_cefr?: string }>;
  resumo_aulas: {
    total_aulas: number;
    total_concluidas: number;
    total_agendadas: number;
    total_canceladas: number;
    total_remarcadas: number;
    proxima_aula_data: string | null;
  };
  ultimo_relatorio: {
    mes_referencia: string;
    data_geracao: string;
    porcentagem_concluida: number;
    porcentagem_em_desenvolvimento: number;
    comentario_automatico: string;
  } | null;
  resumo_atividades: {
    total_conquistas: number;
    atividades_sugeridas_pendentes: number;
    atividades_tarefas_pendentes: number;
  };
};

export type DashboardResponse = {
  dashboard: AlunoData | null;
} | null;

/**
 * Garante que todas as 7 categorias fixas estão no objeto de progresso
 */
function ensureAllCategories(
  categorias: Record<string, any> | null | undefined
): Record<string, CategoriaProgresso> {
  const result: Record<string, CategoriaProgresso> = {};
  
  for (const cat of CATEGORIAS_FIXAS) {
    const existing = categorias?.[cat];
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

export function useDashboardAluno(alunoId?: string) {
  return useQuery<DashboardResponse>({
    queryKey: ["dashboardAluno", alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      // AUTO-SYNC: Sincronizar tópicos antes de buscar dashboard
      // Isso garante que os dados estão sempre atualizados com a fonte da verdade
      if (alunoId) {
        await syncTopicosAluno(alunoId);
      }
      
      const { data, error } = await supabase.rpc("get_dashboard_aluno", {
        p_aluno: alunoId,
      });
      if (error) throw error;
      if (!data) return { dashboard: null };
      
      // Processar dados - NÃO garantir categorias fixas, usar apenas as que vêm do backend
      // O backend já filtra por categorias ativas
      const rawData = data as any;
      const processedData: AlunoData = {
        ...rawData,
        progresso_geral: Number(rawData.progresso_geral) || 0,
        total_topicos_nivel: Number(rawData.total_topicos_nivel) || 0,
        concluidos_nivel: Number(rawData.concluidos_nivel) || 0,
        em_desenvolvimento_nivel: Number(rawData.em_desenvolvimento_nivel) || 0,
        a_introduzir_nivel: Number(rawData.a_introduzir_nivel) || 0,
        progresso_por_categoria: rawData.progresso_por_categoria || {},
      };
      
      return { dashboard: processedData };
    },
    staleTime: 60_000,
  });
}
