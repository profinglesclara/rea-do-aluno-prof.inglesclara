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
  v_progresso jsonb;
  v_total_aulas INTEGER := 0;
  v_total_concluidas INTEGER := 0;
  v_total_agendadas INTEGER := 0;
  v_total_canceladas INTEGER := 0;
  v_total_remarcadas INTEGER := 0;
  v_proxima_aula_data TIMESTAMP;
BEGIN
  SELECT 
    user_id, nome_completo, nome_de_usuario, tipo_usuario, nivel_cefr, modalidade,
    data_inicio_aulas, frequencia_mensal, objetivo_principal, status_aluno,
    historico_progresso
  INTO v_usuario
  FROM public.usuarios
  WHERE user_id = p_aluno;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Buscar progresso calculado em tempo real para o nível CEFR atual
  v_progresso := get_progresso_aluno(p_aluno);

  -- Buscar resumo de aulas com tratamento seguro para quando não há dados
  SELECT 
    COALESCE(total_aulas, 0), 
    COALESCE(total_concluidas, 0), 
    COALESCE(total_agendadas, 0),
    COALESCE(total_canceladas, 0), 
    COALESCE(total_remarcadas, 0), 
    proxima_aula_data
  INTO v_total_aulas, v_total_concluidas, v_total_agendadas, v_total_canceladas, v_total_remarcadas, v_proxima_aula_data
  FROM public.resumo_aulas_por_aluno
  WHERE aluno_id = p_aluno;

  -- Se não encontrou dados, os valores já estão com default 0

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
    'progresso_geral', v_progresso->>'progresso_geral',
    'progresso_por_categoria', v_progresso->'progresso_por_categoria',
    'total_topicos_nivel', v_progresso->>'total_topicos',
    'concluidos_nivel', v_progresso->>'concluidos',
    'em_desenvolvimento_nivel', v_progresso->>'em_desenvolvimento',
    'a_introduzir_nivel', v_progresso->>'a_introduzir',
    'historico_progresso', COALESCE(v_usuario.historico_progresso, '[]'::jsonb),
    'resumo_aulas', jsonb_build_object(
      'total_aulas', v_total_aulas,
      'total_concluidas', v_total_concluidas,
      'total_agendadas', v_total_agendadas,
      'total_canceladas', v_total_canceladas,
      'total_remarcadas', v_total_remarcadas,
      'proxima_aula_data', v_proxima_aula_data
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