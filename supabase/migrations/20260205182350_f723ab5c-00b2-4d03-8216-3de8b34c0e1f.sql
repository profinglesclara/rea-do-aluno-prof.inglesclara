-- =================================================================
-- FUNÇÃO: sync_topicos_aluno
-- Sincroniza automaticamente os tópicos do aluno com topicos_padrao
-- Sem duplicar, preservando status existentes
-- =================================================================

CREATE OR REPLACE FUNCTION public.sync_topicos_aluno(p_aluno uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nivel_cefr nivel_cefr;
  v_inserted integer := 0;
  v_deleted integer := 0;
  v_updated integer := 0;
BEGIN
  -- Buscar nível CEFR atual do aluno
  SELECT nivel_cefr INTO v_nivel_cefr
  FROM public.usuarios
  WHERE user_id = p_aluno;

  IF v_nivel_cefr IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nível CEFR não definido para este aluno',
      'inserted', 0,
      'deleted', 0,
      'updated', 0
    );
  END IF;

  -- 1. INSERIR novos tópicos que existem no padrão mas não no progresso do aluno
  -- (apenas para o nível atual, categorias ativas)
  WITH inserted_topics AS (
    INSERT INTO public.topicos_progresso (aluno, categoria, descricao_topico, nivel_cefr, status, ultima_atualizacao)
    SELECT 
      p_aluno,
      tp.categoria,
      tp.descricao_topico,
      tp.nivel_cefr,
      'A Introduzir'::status_topico,
      NOW()
    FROM public.topicos_padrao tp
    INNER JOIN public.categorias c ON c.nome = tp.categoria AND c.ativa = true
    WHERE tp.nivel_cefr = v_nivel_cefr
      AND NOT EXISTS (
        SELECT 1 FROM public.topicos_progresso tpg
        WHERE tpg.aluno = p_aluno
          AND tpg.nivel_cefr = tp.nivel_cefr
          AND tpg.categoria = tp.categoria
          AND tpg.descricao_topico = tp.descricao_topico
      )
    RETURNING topico_id
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted_topics;

  -- 2. REMOVER tópicos órfãos (que estão no progresso mas não existem mais no padrão 
  -- ou cuja categoria está desativada) - apenas para o nível atual
  WITH deleted_topics AS (
    DELETE FROM public.topicos_progresso tpg
    WHERE tpg.aluno = p_aluno
      AND tpg.nivel_cefr = v_nivel_cefr
      AND (
        -- Tópico não existe mais no padrão
        NOT EXISTS (
          SELECT 1 FROM public.topicos_padrao tp
          WHERE tp.nivel_cefr = tpg.nivel_cefr
            AND tp.categoria = tpg.categoria
            AND tp.descricao_topico = tpg.descricao_topico
        )
        OR
        -- Categoria desativada
        NOT EXISTS (
          SELECT 1 FROM public.categorias c
          WHERE c.nome = tpg.categoria AND c.ativa = true
        )
      )
    RETURNING topico_id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted_topics;

  RETURN jsonb_build_object(
    'success', true,
    'nivel_cefr', v_nivel_cefr,
    'inserted', v_inserted,
    'deleted', v_deleted,
    'updated', v_updated
  );
END;
$$;

-- Garantir que a função pode ser chamada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.sync_topicos_aluno(uuid) TO authenticated;