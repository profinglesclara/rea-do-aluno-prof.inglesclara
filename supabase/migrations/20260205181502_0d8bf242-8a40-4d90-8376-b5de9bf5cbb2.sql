
-- =================================================================
-- SINCRONIZAÇÃO AUTOMÁTICA: topicos_padrao → topicos_progresso
-- =================================================================
-- Regras:
-- 1. INSERT em topicos_padrao → criar entrada para todos alunos do nível
-- 2. UPDATE em topicos_padrao → atualizar descrição/categoria em progresso
-- 3. DELETE em topicos_padrao → remover de topicos_progresso
-- =================================================================

-- Função para sincronizar INSERT de tópico padrão
CREATE OR REPLACE FUNCTION public.sync_topico_padrao_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar entrada de progresso para TODOS os alunos com o mesmo nível CEFR
  INSERT INTO public.topicos_progresso (aluno, categoria, descricao_topico, nivel_cefr, status, ultima_atualizacao)
  SELECT 
    u.user_id,
    NEW.categoria,
    NEW.descricao_topico,
    NEW.nivel_cefr,
    'A Introduzir'::status_topico,
    NOW()
  FROM public.usuarios u
  WHERE u.nivel_cefr = NEW.nivel_cefr
    AND u.tipo_usuario IN ('Aluno', 'Adulto')
    -- Evitar duplicatas
    AND NOT EXISTS (
      SELECT 1 FROM public.topicos_progresso tp
      WHERE tp.aluno = u.user_id
        AND tp.nivel_cefr = NEW.nivel_cefr
        AND tp.categoria = NEW.categoria
        AND tp.descricao_topico = NEW.descricao_topico
    );

  RETURN NEW;
END;
$$;

-- Função para sincronizar UPDATE de tópico padrão (rename)
CREATE OR REPLACE FUNCTION public.sync_topico_padrao_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar descrição e/ou categoria em todos os progressos correspondentes
  -- Mantém o status atual do aluno (não reseta progresso)
  UPDATE public.topicos_progresso
  SET 
    descricao_topico = NEW.descricao_topico,
    categoria = NEW.categoria,
    ultima_atualizacao = NOW()
  WHERE nivel_cefr = OLD.nivel_cefr
    AND categoria = OLD.categoria
    AND descricao_topico = OLD.descricao_topico;

  RETURN NEW;
END;
$$;

-- Função para sincronizar DELETE de tópico padrão
CREATE OR REPLACE FUNCTION public.sync_topico_padrao_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remover de todos os progressos dos alunos (limpa órfãos)
  DELETE FROM public.topicos_progresso
  WHERE nivel_cefr = OLD.nivel_cefr
    AND categoria = OLD.categoria
    AND descricao_topico = OLD.descricao_topico;

  RETURN OLD;
END;
$$;

-- =================================================================
-- CRIAR TRIGGERS
-- =================================================================

-- Remover triggers antigos se existirem
DROP TRIGGER IF EXISTS trigger_sync_topico_padrao_insert ON public.topicos_padrao;
DROP TRIGGER IF EXISTS trigger_sync_topico_padrao_update ON public.topicos_padrao;
DROP TRIGGER IF EXISTS trigger_sync_topico_padrao_delete ON public.topicos_padrao;

-- Trigger para INSERT
CREATE TRIGGER trigger_sync_topico_padrao_insert
  AFTER INSERT ON public.topicos_padrao
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_topico_padrao_insert();

-- Trigger para UPDATE (apenas quando descrição ou categoria mudam)
CREATE TRIGGER trigger_sync_topico_padrao_update
  AFTER UPDATE OF descricao_topico, categoria ON public.topicos_padrao
  FOR EACH ROW
  WHEN (OLD.descricao_topico IS DISTINCT FROM NEW.descricao_topico 
     OR OLD.categoria IS DISTINCT FROM NEW.categoria)
  EXECUTE FUNCTION public.sync_topico_padrao_update();

-- Trigger para DELETE
CREATE TRIGGER trigger_sync_topico_padrao_delete
  AFTER DELETE ON public.topicos_padrao
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_topico_padrao_delete();
