-- Adicionar campos de progresso se não existirem
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS progresso_por_categoria jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS historico_progresso jsonb DEFAULT '[]'::jsonb;

-- Função para converter status em valor numérico
CREATE OR REPLACE FUNCTION public.status_to_numeric(status status_topico)
RETURNS numeric AS $$
BEGIN
  RETURN CASE status
    WHEN 'A Introduzir'::status_topico THEN 0
    WHEN 'Em Desenvolvimento'::status_topico THEN 0.5
    WHEN 'Concluído'::status_topico THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para recalcular progresso do aluno
CREATE OR REPLACE FUNCTION public.recalcular_progresso_aluno()
RETURNS TRIGGER AS $$
DECLARE
  v_aluno_id uuid;
  v_total integer;
  v_concluidos integer;
  v_em_desenvolvimento integer;
  v_a_introduzir integer;
  v_progresso_geral numeric;
  v_progresso_por_categoria jsonb;
  v_categoria_record record;
BEGIN
  -- Determinar o aluno_id do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_aluno_id := OLD.aluno;
  ELSE
    v_aluno_id := NEW.aluno;
  END IF;

  -- Calcular totais gerais
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico),
    COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico),
    COUNT(*) FILTER (WHERE status = 'A Introduzir'::status_topico)
  INTO v_total, v_concluidos, v_em_desenvolvimento, v_a_introduzir
  FROM public.topicos_progresso
  WHERE aluno = v_aluno_id;

  -- Calcular progresso geral (percentual)
  IF v_total > 0 THEN
    v_progresso_geral := ROUND((v_concluidos::numeric / v_total::numeric) * 100, 2);
  ELSE
    v_progresso_geral := 0;
  END IF;

  -- Calcular progresso por categoria
  v_progresso_por_categoria := '{}'::jsonb;
  
  FOR v_categoria_record IN 
    SELECT 
      categoria,
      COUNT(*) as total_categoria,
      COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico) as concluidos_categoria,
      COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico) as em_dev_categoria
    FROM public.topicos_progresso
    WHERE aluno = v_aluno_id
    GROUP BY categoria
  LOOP
    v_progresso_por_categoria := v_progresso_por_categoria || 
      jsonb_build_object(
        v_categoria_record.categoria::text,
        jsonb_build_object(
          'total', v_categoria_record.total_categoria,
          'concluidos', v_categoria_record.concluidos_categoria,
          'em_desenvolvimento', v_categoria_record.em_dev_categoria,
          'percentual_concluido', ROUND((v_categoria_record.concluidos_categoria::numeric / v_categoria_record.total_categoria::numeric) * 100, 2),
          'percentual_em_desenvolvimento', ROUND((v_categoria_record.em_dev_categoria::numeric / v_categoria_record.total_categoria::numeric) * 100, 2)
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
        'progresso_geral', v_progresso_geral
      )
    )
  WHERE user_id = v_aluno_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para recalcular progresso quando topicos_progresso é modificado
DROP TRIGGER IF EXISTS trigger_recalcular_progresso ON public.topicos_progresso;
CREATE TRIGGER trigger_recalcular_progresso
AFTER INSERT OR UPDATE OR DELETE ON public.topicos_progresso
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_progresso_aluno();

-- Função para atualizar ultima_atualizacao automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_ultima_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultima_atualizacao := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar ultima_atualizacao quando status muda
DROP TRIGGER IF EXISTS trigger_atualizar_ultima_atualizacao ON public.topicos_progresso;
CREATE TRIGGER trigger_atualizar_ultima_atualizacao
BEFORE UPDATE ON public.topicos_progresso
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.atualizar_ultima_atualizacao();