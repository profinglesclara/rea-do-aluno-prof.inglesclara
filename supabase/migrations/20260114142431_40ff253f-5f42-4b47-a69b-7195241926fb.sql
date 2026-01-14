-- ================================================
-- CORREÇÕES DE PROGRESSO POR NÍVEL CEFR
-- ================================================

-- 1. Atualizar função recalcular_progresso_aluno para filtrar pelo nível CEFR atual do aluno
CREATE OR REPLACE FUNCTION public.recalcular_progresso_aluno()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aluno_id uuid;
  v_nivel_cefr nivel_cefr;
  v_total integer;
  v_concluidos integer;
  v_em_desenvolvimento integer;
  v_a_introduzir integer;
  v_progresso_geral numeric;
  v_progresso_por_categoria jsonb;
  v_categoria_record record;
  v_categorias_fixas text[] := ARRAY['Phonetics', 'Grammar', 'Vocabulary', 'Communication', 'Expressions', 'Pronunciation', 'Listening'];
  v_cat text;
BEGIN
  -- Determinar o aluno_id do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_aluno_id := OLD.aluno;
  ELSE
    v_aluno_id := NEW.aluno;
  END IF;

  -- Buscar o nível CEFR atual do aluno
  SELECT nivel_cefr INTO v_nivel_cefr
  FROM public.usuarios
  WHERE user_id = v_aluno_id;

  -- Se não tiver nível definido, não calcular
  IF v_nivel_cefr IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calcular totais gerais APENAS para o nível CEFR atual
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico),
    COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico),
    COUNT(*) FILTER (WHERE status = 'A Introduzir'::status_topico)
  INTO v_total, v_concluidos, v_em_desenvolvimento, v_a_introduzir
  FROM public.topicos_progresso
  WHERE aluno = v_aluno_id
    AND nivel_cefr = v_nivel_cefr;

  -- Calcular progresso geral (percentual)
  IF v_total > 0 THEN
    v_progresso_geral := ROUND((v_concluidos::numeric / v_total::numeric) * 100, 2);
  ELSE
    v_progresso_geral := 0;
  END IF;

  -- Inicializar progresso por categoria com as 7 categorias fixas
  v_progresso_por_categoria := '{}'::jsonb;
  
  -- Para cada categoria fixa, calcular o progresso
  FOREACH v_cat IN ARRAY v_categorias_fixas
  LOOP
    SELECT 
      COUNT(*) as total_categoria,
      COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico) as concluidos_categoria,
      COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico) as em_dev_categoria
    INTO v_categoria_record
    FROM public.topicos_progresso
    WHERE aluno = v_aluno_id
      AND nivel_cefr = v_nivel_cefr
      AND categoria::text = v_cat;
    
    -- Adicionar categoria mesmo se não tiver tópicos (mostra 0%)
    v_progresso_por_categoria := v_progresso_por_categoria || 
      jsonb_build_object(
        v_cat,
        jsonb_build_object(
          'total', COALESCE(v_categoria_record.total_categoria, 0),
          'concluidos', COALESCE(v_categoria_record.concluidos_categoria, 0),
          'em_desenvolvimento', COALESCE(v_categoria_record.em_dev_categoria, 0),
          'percentual_concluido', CASE 
            WHEN COALESCE(v_categoria_record.total_categoria, 0) > 0 
            THEN ROUND((v_categoria_record.concluidos_categoria::numeric / v_categoria_record.total_categoria::numeric) * 100, 2)
            ELSE 0
          END,
          'percentual_em_desenvolvimento', CASE 
            WHEN COALESCE(v_categoria_record.total_categoria, 0) > 0 
            THEN ROUND((v_categoria_record.em_dev_categoria::numeric / v_categoria_record.total_categoria::numeric) * 100, 2)
            ELSE 0
          END
        )
      );
  END LOOP;

  -- Atualizar tabela usuarios
  UPDATE public.usuarios
  SET 
    progresso_geral = v_progresso_geral,
    progresso_por_categoria = v_progresso_por_categoria,
    historico_progresso = historico_progresso || jsonb_build_array(
      jsonb_build_object(
        'data', NOW(),
        'progresso_geral', v_progresso_geral,
        'nivel_cefr', v_nivel_cefr
      )
    )
  WHERE user_id = v_aluno_id;

  RETURN NEW;
END;
$function$;

-- 2. Atualizar função gerar_relatorios_mensais para filtrar pelo nível CEFR atual
CREATE OR REPLACE FUNCTION public.gerar_relatorios_mensais()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aluno_record RECORD;
  v_mes_referencia TEXT;
  v_total_topicos INTEGER;
  v_concluidos INTEGER;
  v_em_desenvolvimento INTEGER;
  v_a_introduzir INTEGER;
  v_porcentagem_concluida NUMERIC;
  v_porcentagem_em_desenvolvimento NUMERIC;
  v_comentario_automatico TEXT;
  v_conteudo_gerado TEXT;
BEGIN
  -- Determinar o mês de referência (mês anterior)
  v_mes_referencia := TO_CHAR(NOW() - INTERVAL '1 month', 'MM/YYYY');
  
  -- Processar cada aluno ativo COM nível CEFR definido
  FOR v_aluno_record IN 
    SELECT user_id, nivel_cefr, nome_completo 
    FROM public.usuarios 
    WHERE tipo_usuario IN ('Aluno', 'Adulto') 
      AND status_aluno = 'Ativo'
      AND nivel_cefr IS NOT NULL
  LOOP
    -- Calcular estatísticas dos tópicos APENAS do nível CEFR atual
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico),
      COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico),
      COUNT(*) FILTER (WHERE status = 'A Introduzir'::status_topico)
    INTO v_total_topicos, v_concluidos, v_em_desenvolvimento, v_a_introduzir
    FROM public.topicos_progresso
    WHERE aluno = v_aluno_record.user_id
      AND nivel_cefr = v_aluno_record.nivel_cefr;
    
    -- Calcular porcentagens
    IF v_total_topicos > 0 THEN
      v_porcentagem_concluida := ROUND((v_concluidos::NUMERIC / v_total_topicos::NUMERIC) * 100, 2);
      v_porcentagem_em_desenvolvimento := ROUND((v_em_desenvolvimento::NUMERIC / v_total_topicos::NUMERIC) * 100, 2);
    ELSE
      v_porcentagem_concluida := 0;
      v_porcentagem_em_desenvolvimento := 0;
    END IF;
    
    -- Gerar comentário automático baseado na porcentagem concluída
    IF v_porcentagem_concluida < 40 THEN
      v_comentario_automatico := 'O aluno está em fase inicial de consolidação dos conteúdos deste nível. Grande parte dos tópicos ainda está em desenvolvimento ou a introduzir.';
    ELSIF v_porcentagem_concluida >= 40 AND v_porcentagem_concluida < 70 THEN
      v_comentario_automatico := 'O aluno apresenta progresso consistente, com vários tópicos em desenvolvimento e uma base em construção.';
    ELSE
      v_comentario_automatico := 'O aluno demonstra bom domínio dos conteúdos trabalhados neste nível, com a maioria dos tópicos concluídos.';
    END IF;
    
    -- Gerar conteúdo completo com informação do nível
    v_conteudo_gerado := FORMAT(
      'Nível %s - Progresso geral: %s%% concluído, %s%% em desenvolvimento, %s tópicos a introduzir. %s',
      v_aluno_record.nivel_cefr,
      v_porcentagem_concluida,
      v_porcentagem_em_desenvolvimento,
      v_a_introduzir,
      v_comentario_automatico
    );
    
    -- Inserir ou atualizar relatório
    INSERT INTO public.relatorios_mensais (
      aluno,
      mes_referencia,
      data_geracao,
      porcentagem_concluida,
      porcentagem_em_desenvolvimento,
      conteudo_gerado,
      comentario_automatico
    ) VALUES (
      v_aluno_record.user_id,
      v_mes_referencia,
      NOW(),
      v_porcentagem_concluida,
      v_porcentagem_em_desenvolvimento,
      v_conteudo_gerado,
      v_comentario_automatico
    )
    ON CONFLICT (aluno, mes_referencia) 
    DO UPDATE SET
      data_geracao = NOW(),
      porcentagem_concluida = EXCLUDED.porcentagem_concluida,
      porcentagem_em_desenvolvimento = EXCLUDED.porcentagem_em_desenvolvimento,
      conteudo_gerado = EXCLUDED.conteudo_gerado,
      comentario_automatico = EXCLUDED.comentario_automatico;
      
  END LOOP;
  
END;
$function$;

-- 3. Criar função get_progresso_aluno para calcular progresso em tempo real filtrado por nível
CREATE OR REPLACE FUNCTION public.get_progresso_aluno(p_aluno uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_nivel_cefr nivel_cefr;
  v_total integer;
  v_concluidos integer;
  v_em_desenvolvimento integer;
  v_a_introduzir integer;
  v_progresso_geral numeric;
  v_progresso_por_categoria jsonb;
  v_categoria_record record;
  v_categorias_fixas text[] := ARRAY['Phonetics', 'Grammar', 'Vocabulary', 'Communication', 'Expressions', 'Pronunciation', 'Listening'];
  v_cat text;
BEGIN
  -- Buscar o nível CEFR atual do aluno
  SELECT nivel_cefr INTO v_nivel_cefr
  FROM public.usuarios
  WHERE user_id = p_aluno;

  IF v_nivel_cefr IS NULL THEN
    RETURN jsonb_build_object(
      'nivel_cefr', NULL,
      'progresso_geral', 0,
      'total_topicos', 0,
      'concluidos', 0,
      'em_desenvolvimento', 0,
      'a_introduzir', 0,
      'progresso_por_categoria', '{}'::jsonb,
      'erro', 'Nível CEFR não definido'
    );
  END IF;

  -- Calcular totais gerais APENAS para o nível CEFR atual
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico),
    COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico),
    COUNT(*) FILTER (WHERE status = 'A Introduzir'::status_topico)
  INTO v_total, v_concluidos, v_em_desenvolvimento, v_a_introduzir
  FROM public.topicos_progresso
  WHERE aluno = p_aluno
    AND nivel_cefr = v_nivel_cefr;

  -- Calcular progresso geral
  IF v_total > 0 THEN
    v_progresso_geral := ROUND((v_concluidos::numeric / v_total::numeric) * 100, 2);
  ELSE
    v_progresso_geral := 0;
  END IF;

  -- Inicializar progresso por categoria
  v_progresso_por_categoria := '{}'::jsonb;
  
  -- Para cada categoria fixa
  FOREACH v_cat IN ARRAY v_categorias_fixas
  LOOP
    SELECT 
      COUNT(*) as total_categoria,
      COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico) as concluidos_categoria,
      COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico) as em_dev_categoria,
      COUNT(*) FILTER (WHERE status = 'A Introduzir'::status_topico) as a_introduzir_categoria
    INTO v_categoria_record
    FROM public.topicos_progresso
    WHERE aluno = p_aluno
      AND nivel_cefr = v_nivel_cefr
      AND categoria::text = v_cat;
    
    v_progresso_por_categoria := v_progresso_por_categoria || 
      jsonb_build_object(
        v_cat,
        jsonb_build_object(
          'total', COALESCE(v_categoria_record.total_categoria, 0),
          'concluidos', COALESCE(v_categoria_record.concluidos_categoria, 0),
          'em_desenvolvimento', COALESCE(v_categoria_record.em_dev_categoria, 0),
          'a_introduzir', COALESCE(v_categoria_record.a_introduzir_categoria, 0),
          'percentual_concluido', CASE 
            WHEN COALESCE(v_categoria_record.total_categoria, 0) > 0 
            THEN ROUND((v_categoria_record.concluidos_categoria::numeric / v_categoria_record.total_categoria::numeric) * 100, 2)
            ELSE 0
          END,
          'percentual_em_desenvolvimento', CASE 
            WHEN COALESCE(v_categoria_record.total_categoria, 0) > 0 
            THEN ROUND((v_categoria_record.em_dev_categoria::numeric / v_categoria_record.total_categoria::numeric) * 100, 2)
            ELSE 0
          END
        )
      );
  END LOOP;

  -- Construir resultado
  v_result := jsonb_build_object(
    'nivel_cefr', v_nivel_cefr,
    'progresso_geral', v_progresso_geral,
    'total_topicos', v_total,
    'concluidos', v_concluidos,
    'em_desenvolvimento', v_em_desenvolvimento,
    'a_introduzir', v_a_introduzir,
    'progresso_por_categoria', v_progresso_por_categoria
  );

  RETURN v_result;
END;
$function$;

-- 4. Atualizar get_dashboard_aluno para usar a nova lógica de progresso
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
    'progresso_geral', v_progresso->>'progresso_geral',
    'progresso_por_categoria', v_progresso->'progresso_por_categoria',
    'total_topicos_nivel', v_progresso->>'total_topicos',
    'concluidos_nivel', v_progresso->>'concluidos',
    'em_desenvolvimento_nivel', v_progresso->>'em_desenvolvimento',
    'a_introduzir_nivel', v_progresso->>'a_introduzir',
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