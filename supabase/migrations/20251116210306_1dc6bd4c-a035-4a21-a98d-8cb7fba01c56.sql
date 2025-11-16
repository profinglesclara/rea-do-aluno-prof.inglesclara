-- Função para gerar relatórios mensais automaticamente
CREATE OR REPLACE FUNCTION public.gerar_relatorios_mensais()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Processar cada aluno ativo
  FOR v_aluno_record IN 
    SELECT user_id 
    FROM public.usuarios 
    WHERE tipo_usuario IN ('Aluno', 'Adulto') 
      AND status_aluno = 'Ativo'
  LOOP
    -- Calcular estatísticas dos tópicos
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico),
      COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico),
      COUNT(*) FILTER (WHERE status = 'A Introduzir'::status_topico)
    INTO v_total_topicos, v_concluidos, v_em_desenvolvimento, v_a_introduzir
    FROM public.topicos_progresso
    WHERE aluno = v_aluno_record.user_id;
    
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
    
    -- Gerar conteúdo completo
    v_conteudo_gerado := FORMAT(
      'Progresso geral: %s%% concluído, %s%% em desenvolvimento, %s tópicos a introduzir. %s',
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
$$;

-- Adicionar constraint única para evitar duplicatas (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'relatorios_mensais_aluno_mes_key'
  ) THEN
    ALTER TABLE public.relatorios_mensais 
    ADD CONSTRAINT relatorios_mensais_aluno_mes_key 
    UNIQUE (aluno, mes_referencia);
  END IF;
END $$;