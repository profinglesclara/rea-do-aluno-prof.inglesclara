-- 1. Criar tabela de categorias
CREATE TABLE public.categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  ordem integer NOT NULL DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  criada_em timestamp with time zone DEFAULT now()
);

-- 2. Inserir categorias existentes
INSERT INTO public.categorias (nome, ordem) VALUES
  ('Phonetics', 1),
  ('Grammar', 2),
  ('Vocabulary', 3),
  ('Communication', 4),
  ('Expressions', 5),
  ('Pronunciation', 6),
  ('Listening', 7),
  ('Reading', 8),
  ('Writing', 9),
  ('Speaking', 10);

-- 3. Enable RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Todos podem ver categorias ativas" 
ON public.categorias 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin pode inserir categorias" 
ON public.categorias 
FOR INSERT 
WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode atualizar categorias" 
ON public.categorias 
FOR UPDATE 
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode deletar categorias" 
ON public.categorias 
FOR DELETE 
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- 5. Alterar topicos_padrao para usar text em vez de enum
ALTER TABLE public.topicos_padrao 
ALTER COLUMN categoria TYPE text;

-- 6. Alterar topicos_progresso para usar text em vez de enum
ALTER TABLE public.topicos_progresso 
ALTER COLUMN categoria TYPE text;

-- 7. Atualizar função get_progresso_aluno para usar categorias dinâmicas
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
  v_cat record;
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
  
  -- Para cada categoria DINÂMICA do banco de dados
  FOR v_cat IN SELECT nome FROM public.categorias WHERE ativa = true ORDER BY ordem
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

-- 8. Atualizar trigger recalcular_progresso_aluno para usar categorias dinâmicas
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
  v_cat record;
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

  -- Inicializar progresso por categoria com categorias DINÂMICAS
  v_progresso_por_categoria := '{}'::jsonb;
  
  -- Para cada categoria dinâmica, calcular o progresso
  FOR v_cat IN SELECT nome FROM public.categorias WHERE ativa = true ORDER BY ordem
  LOOP
    SELECT 
      COUNT(*) as total_categoria,
      COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico) as concluidos_categoria,
      COUNT(*) FILTER (WHERE status = 'Em Desenvolvimento'::status_topico) as em_dev_categoria
    INTO v_categoria_record
    FROM public.topicos_progresso
    WHERE aluno = v_aluno_id
      AND nivel_cefr = v_nivel_cefr
      AND categoria = v_cat.nome;
    
    -- Adicionar categoria mesmo se não tiver tópicos (mostra 0%)
    v_progresso_por_categoria := v_progresso_por_categoria || 
      jsonb_build_object(
        v_cat.nome,
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