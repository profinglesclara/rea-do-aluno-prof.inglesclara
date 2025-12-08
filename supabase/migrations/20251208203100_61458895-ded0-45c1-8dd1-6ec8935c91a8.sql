-- Primeiro remover a view que depende das tabelas
DROP VIEW IF EXISTS public.dashboard_resumo_alunos CASCADE;

-- Agora remover as tabelas obsoletas
DROP TABLE IF EXISTS public.atividades_tarefas CASCADE;
DROP TABLE IF EXISTS public.atividades_sugeridas CASCADE;

-- Recriar a view dashboard_resumo_alunos contando tudo da tabela tarefas
CREATE VIEW public.dashboard_resumo_alunos AS
SELECT
  u.user_id AS aluno_id,
  u.nome_completo AS nome_aluno,
  u.nome_de_usuario,
  u.nivel_cefr,
  u.modalidade,
  u.data_inicio_aulas,
  u.frequencia_mensal,
  u.progresso_geral,
  u.status_aluno,
  COALESCE(aulas_resumo.total_aulas, 0) AS total_aulas,
  COALESCE(aulas_resumo.total_concluidas, 0) AS total_concluidas,
  COALESCE(aulas_resumo.total_agendadas, 0) AS total_agendadas,
  COALESCE(aulas_resumo.total_canceladas, 0) AS total_canceladas,
  COALESCE(aulas_resumo.total_remarcadas, 0) AS total_remarcadas,
  aulas_resumo.proxima_aula_data,
  rel.ultimo_mes_referencia,
  rel.ultimo_relatorio_data,
  rel.ultimo_relatorio_concluida,
  rel.ultimo_relatorio_em_desenvolvimento,
  COALESCE(conquistas_count.total_conquistas, 0) AS total_conquistas,
  COALESCE(tarefas_sugeridas.tarefas_sugeridas_pendentes, 0) AS atividades_sugeridas_pendentes,
  COALESCE(tarefas_obrigatorias.tarefas_obrigatorias_pendentes, 0) AS atividades_tarefas_pendentes
FROM public.usuarios u
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_aulas,
    COUNT(*) FILTER (WHERE status = 'Realizada') AS total_concluidas,
    COUNT(*) FILTER (WHERE status = 'Agendada') AS total_agendadas,
    COUNT(*) FILTER (WHERE status = 'Cancelada') AS total_canceladas,
    COUNT(*) FILTER (WHERE status = 'Remarcada') AS total_remarcadas,
    MIN(data_aula) FILTER (WHERE status = 'Agendada' AND data_aula > NOW()) AS proxima_aula_data
  FROM public.aulas
  WHERE aluno = u.user_id
) aulas_resumo ON true
LEFT JOIN LATERAL (
  SELECT
    mes_referencia AS ultimo_mes_referencia,
    data_geracao AS ultimo_relatorio_data,
    porcentagem_concluida AS ultimo_relatorio_concluida,
    porcentagem_em_desenvolvimento AS ultimo_relatorio_em_desenvolvimento
  FROM public.relatorios_mensais
  WHERE aluno = u.user_id
  ORDER BY data_geracao DESC
  LIMIT 1
) rel ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_conquistas
  FROM public.conquistas_alunos
  WHERE aluno_id = u.user_id
) conquistas_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS tarefas_sugeridas_pendentes
  FROM public.tarefas
  WHERE aluno_id = u.user_id AND tipo = 'Sugerida' AND status = 'Pendente'
) tarefas_sugeridas ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS tarefas_obrigatorias_pendentes
  FROM public.tarefas
  WHERE aluno_id = u.user_id AND tipo = 'Obrigatoria' AND status = 'Pendente'
) tarefas_obrigatorias ON true
WHERE u.tipo_usuario IN ('Aluno', 'Adulto');

-- Atualizar função get_dashboard_aluno para contar da tabela tarefas
CREATE OR REPLACE FUNCTION public.get_dashboard_aluno(p_aluno uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_usuario RECORD;
  v_resumo_aulas RECORD;
  v_ultimo_relatorio RECORD;
  v_total_conquistas INTEGER;
  v_tarefas_sugeridas_pendentes INTEGER;
  v_tarefas_obrigatorias_pendentes INTEGER;
BEGIN
  SELECT 
    user_id, nome_completo, nome_de_usuario, tipo_usuario, nivel_cefr, modalidade,
    data_inicio_aulas, frequencia_mensal, objetivo_principal, status_aluno,
    progresso_geral, progresso_por_categoria, historico_progresso
  INTO v_usuario
  FROM public.usuarios
  WHERE user_id = p_aluno;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT 
    COALESCE(total_aulas, 0), COALESCE(total_concluidas, 0), COALESCE(total_agendadas, 0),
    COALESCE(total_canceladas, 0), COALESCE(total_remarcadas, 0), proxima_aula_data
  INTO v_resumo_aulas
  FROM public.resumo_aulas_por_aluno
  WHERE aluno_id = p_aluno;

  IF NOT FOUND THEN
    v_resumo_aulas := ROW(0, 0, 0, 0, 0, NULL);
  END IF;

  SELECT mes_referencia, data_geracao, porcentagem_concluida, porcentagem_em_desenvolvimento, comentario_automatico
  INTO v_ultimo_relatorio
  FROM public.relatorios_mensais
  WHERE aluno = p_aluno
  ORDER BY data_geracao DESC
  LIMIT 1;

  SELECT COUNT(*) INTO v_total_conquistas FROM public.conquistas_alunos WHERE aluno_id = p_aluno;
  SELECT COUNT(*) INTO v_tarefas_sugeridas_pendentes FROM public.tarefas WHERE aluno_id = p_aluno AND tipo = 'Sugerida' AND status = 'Pendente';
  SELECT COUNT(*) INTO v_tarefas_obrigatorias_pendentes FROM public.tarefas WHERE aluno_id = p_aluno AND tipo = 'Obrigatoria' AND status = 'Pendente';

  v_result := jsonb_build_object(
    'aluno_id', v_usuario.user_id,
    'nome_completo', v_usuario.nome_completo,
    'nome_de_usuario', v_usuario.nome_de_usuario,
    'tipo_usuario', v_usuario.tipo_usuario,
    'nivel_cefr', v_usuario.nivel_cefr,
    'modalidade', v_usuario.modalidade,
    'data_inicio_aulas', v_usuario.data_inicio_aulas,
    'frequencia_mensal', v_usuario.frequencia_mensal,
    'objetivo_principal', v_usuario.objetivo_principal,
    'status_aluno', v_usuario.status_aluno,
    'progresso_geral', v_usuario.progresso_geral,
    'progresso_por_categoria', COALESCE(v_usuario.progresso_por_categoria, '{}'::jsonb),
    'historico_progresso', COALESCE(v_usuario.historico_progresso, '[]'::jsonb),
    'resumo_aulas', jsonb_build_object(
      'total_aulas', v_resumo_aulas.total_aulas,
      'total_concluidas', v_resumo_aulas.total_concluidas,
      'total_agendadas', v_resumo_aulas.total_agendadas,
      'total_canceladas', v_resumo_aulas.total_canceladas,
      'total_remarcadas', v_resumo_aulas.total_remarcadas,
      'proxima_aula_data', v_resumo_aulas.proxima_aula_data
    ),
    'ultimo_relatorio', CASE 
      WHEN v_ultimo_relatorio IS NOT NULL THEN
        jsonb_build_object(
          'mes_referencia', v_ultimo_relatorio.mes_referencia,
          'data_geracao', v_ultimo_relatorio.data_geracao,
          'porcentagem_concluida', v_ultimo_relatorio.porcentagem_concluida,
          'porcentagem_em_desenvolvimento', v_ultimo_relatorio.porcentagem_em_desenvolvimento,
          'comentario_automatico', v_ultimo_relatorio.comentario_automatico
        )
      ELSE NULL
    END,
    'resumo_atividades', jsonb_build_object(
      'total_conquistas', v_total_conquistas,
      'atividades_sugeridas_pendentes', v_tarefas_sugeridas_pendentes,
      'atividades_tarefas_pendentes', v_tarefas_obrigatorias_pendentes
    )
  );

  RETURN v_result;
END;
$function$;