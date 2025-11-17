import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  progresso_por_categoria: Record<string, any>;
  historico_progresso: Array<{ data: string; progresso_geral: number }>;
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

export function useDashboardAluno(alunoId?: string) {
  return useQuery<DashboardResponse>({
    queryKey: ["dashboardAluno", alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_aluno", {
        p_aluno: alunoId,
      });
      if (error) throw error;
      if (!data) return { dashboard: null };
      return { dashboard: data as AlunoData };
    },
    staleTime: 60_000,
  });
}
