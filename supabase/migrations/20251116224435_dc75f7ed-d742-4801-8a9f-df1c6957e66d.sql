-- Criar função para popular tópicos iniciais de progresso
CREATE OR REPLACE FUNCTION public.popular_topicos_iniciais()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário criado é um Aluno
  IF NEW.tipo_usuario != 'Aluno'::tipo_usuario THEN
    RETURN NEW;
  END IF;

  -- Inserir tópicos de progresso baseados nos tópicos padrão do nível CEFR do aluno
  INSERT INTO public.topicos_progresso (
    aluno,
    nivel_cefr,
    categoria,
    descricao_topico,
    ultima_atualizacao
  )
  SELECT
    NEW.user_id,
    tp.nivel_cefr,
    tp.categoria,
    tp.descricao_topico,
    NOW()
  FROM public.topicos_padrao tp
  WHERE tp.nivel_cefr = NEW.nivel_cefr
  ORDER BY tp.ordem;

  RETURN NEW;
END;
$$;

-- Criar trigger para chamar a função após inserção na tabela usuarios
CREATE TRIGGER trg_popular_topicos_iniciais
  AFTER INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.popular_topicos_iniciais();