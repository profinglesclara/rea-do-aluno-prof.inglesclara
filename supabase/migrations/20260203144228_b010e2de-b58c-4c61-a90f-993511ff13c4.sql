-- Adicionar coluna para armazenar progresso por categoria nos relatórios mensais
ALTER TABLE public.relatorios_mensais 
ADD COLUMN IF NOT EXISTS progresso_por_categoria jsonb DEFAULT '{}'::jsonb;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.relatorios_mensais.progresso_por_categoria IS 'Snapshot do progresso por categoria no momento da geração do relatório';

-- Atualizar a função gerar_relatorios_mensais para incluir progresso por categoria
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
  v_progresso_por_categoria JSONB;
  v_cat RECORD;
  v_categoria_record RECORD;
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
    
    -- Calcular porcentagens gerais
    IF v_total_topicos > 0 THEN
      v_porcentagem_concluida := ROUND((v_concluidos::NUMERIC / v_total_topicos::NUMERIC) * 100, 2);
      v_porcentagem_em_desenvolvimento := ROUND((v_em_desenvolvimento::NUMERIC / v_total_topicos::NUMERIC) * 100, 2);
    ELSE
      v_porcentagem_concluida := 0;
      v_porcentagem_em_desenvolvimento := 0;
    END IF;
    
    -- Calcular progresso por categoria (usando categorias dinâmicas do banco)
    v_progresso_por_categoria := '{}'::jsonb;
    
    FOR v_cat IN SELECT nome FROM public.categorias WHERE ativa = true ORDER BY ordem
    LOOP
      SELECT 
        COUNT(*) as total_categoria,
        COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico) as concluidos_categoria,
        COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico) as em_dev_categoria,
        COUNT(*) FILTER (WHERE status = 'A Introduzir'::status_topico) as a_introduzir_categoria
      INTO v_categoria_record
      FROM public.topicos_progresso
      WHERE aluno = v_aluno_record.user_id
        AND nivel_cefr = v_aluno_record.nivel_cefr
        AND categoria = v_cat.nome;
      
      v_progresso_por_categoria := v_progresso_por_categoria || 
        jsonb_build_object(
          v_cat.nome,
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
    
    -- Inserir ou atualizar relatório (agora com progresso por categoria)
    INSERT INTO public.relatorios_mensais (
      aluno,
      mes_referencia,
      data_geracao,
      porcentagem_concluida,
      porcentagem_em_desenvolvimento,
      conteudo_gerado,
      comentario_automatico,
      progresso_por_categoria
    ) VALUES (
      v_aluno_record.user_id,
      v_mes_referencia,
      NOW(),
      v_porcentagem_concluida,
      v_porcentagem_em_desenvolvimento,
      v_conteudo_gerado,
      v_comentario_automatico,
      v_progresso_por_categoria
    )
    ON CONFLICT (aluno, mes_referencia) 
    DO UPDATE SET
      data_geracao = NOW(),
      porcentagem_concluida = EXCLUDED.porcentagem_concluida,
      porcentagem_em_desenvolvimento = EXCLUDED.porcentagem_em_desenvolvimento,
      conteudo_gerado = EXCLUDED.conteudo_gerado,
      comentario_automatico = EXCLUDED.comentario_automatico,
      progresso_por_categoria = EXCLUDED.progresso_por_categoria;
      
  END LOOP;
  
END;
$function$;