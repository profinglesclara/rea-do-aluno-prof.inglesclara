-- Função para retornar dashboard completo do aluno
CREATE OR REPLACE FUNCTION public.get_dashboard_aluno(p_aluno uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_usuario RECORD;
  v_resumo_aulas RECORD;
  v_ultimo_relatorio RECORD;
  v_total_conquistas INTEGER;
  v_atividades_sugeridas_pendentes INTEGER;
  v_atividades_tarefas_pendentes INTEGER;
BEGIN
  -- Buscar dados básicos do aluno
  SELECT 
    user_id,
    nome_completo,
    nome_de_usuario,
    tipo_usuario,
    nivel_cefr,
    modalidade,
    data_inicio_aulas,
    frequencia_mensal,
    objetivo_principal,
    status_aluno,
    progresso_geral,
    progresso_por_categoria,
    historico_progresso
  INTO v_usuario
  FROM public.usuarios
  WHERE user_id = p_aluno;

  -- Se não encontrar o aluno, retornar NULL
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Buscar resumo de aulas da VIEW
  SELECT 
    COALESCE(total_aulas, 0) as total_aulas,
    COALESCE(total_concluidas, 0) as total_concluidas,
    COALESCE(total_agendadas, 0) as total_agendadas,
    COALESCE(total_canceladas, 0) as total_canceladas,
    COALESCE(total_remarcadas, 0) as total_remarcadas,
    proxima_aula_data
  INTO v_resumo_aulas
  FROM public.resumo_aulas_por_aluno
  WHERE aluno_id = p_aluno;

  -- Se não encontrar na VIEW, inicializar com zeros
  IF NOT FOUND THEN
    v_resumo_aulas := ROW(0, 0, 0, 0, 0, NULL);
  END IF;

  -- Buscar último relatório mensal
  SELECT 
    mes_referencia,
    data_geracao,
    porcentagem_concluida,
    porcentagem_em_desenvolvimento,
    comentario_automatico
  INTO v_ultimo_relatorio
  FROM public.relatorios_mensais
  WHERE aluno = p_aluno
  ORDER BY data_geracao DESC
  LIMIT 1;

  -- Contar conquistas
  SELECT COUNT(*)
  INTO v_total_conquistas
  FROM public.conquistas
  WHERE aluno = p_aluno;

  -- Contar atividades sugeridas pendentes
  SELECT COUNT(*)
  INTO v_atividades_sugeridas_pendentes
  FROM public.atividades_sugeridas
  WHERE aluno = p_aluno AND status = 'Pendente'::status_sugestao;

  -- Contar atividades tarefas pendentes
  SELECT COUNT(*)
  INTO v_atividades_tarefas_pendentes
  FROM public.atividades_tarefas
  WHERE aluno = p_aluno AND status = 'Pendente'::status_atividade;

  -- Montar o JSON final
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
      'atividades_sugeridas_pendentes', v_atividades_sugeridas_pendentes,
      'atividades_tarefas_pendentes', v_atividades_tarefas_pendentes
    )
  );

  RETURN v_result;
END;
$function$;