-- Função para popular tópicos de progresso automaticamente quando o nível CEFR é atribuído ou alterado
CREATE OR REPLACE FUNCTION public.popular_topicos_por_nivel()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o nível CEFR foi definido ou alterado
  IF (TG_OP = 'UPDATE' AND OLD.nivel_cefr IS DISTINCT FROM NEW.nivel_cefr AND NEW.nivel_cefr IS NOT NULL)
     OR (TG_OP = 'INSERT' AND NEW.nivel_cefr IS NOT NULL) THEN
    
    -- Inserir tópicos do nível atual que ainda não existem para o aluno
    INSERT INTO public.topicos_progresso (aluno, categoria, descricao_topico, nivel_cefr, status)
    SELECT 
      NEW.user_id,
      tp.categoria,
      tp.descricao_topico,
      tp.nivel_cefr,
      'A Introduzir'::status_topico
    FROM public.topicos_padrao tp
    WHERE tp.nivel_cefr = NEW.nivel_cefr
    AND NOT EXISTS (
      SELECT 1 FROM public.topicos_progresso tprog
      WHERE tprog.aluno = NEW.user_id
      AND tprog.descricao_topico = tp.descricao_topico
      AND tprog.nivel_cefr = tp.nivel_cefr
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para popular tópicos automaticamente
DROP TRIGGER IF EXISTS trigger_popular_topicos_nivel ON public.usuarios;
CREATE TRIGGER trigger_popular_topicos_nivel
AFTER INSERT OR UPDATE OF nivel_cefr ON public.usuarios
FOR EACH ROW
WHEN (NEW.tipo_usuario = 'Aluno')
EXECUTE FUNCTION public.popular_topicos_por_nivel();

-- Popular tópicos para alunos existentes que têm nível CEFR mas sem tópicos
INSERT INTO public.topicos_progresso (aluno, categoria, descricao_topico, nivel_cefr, status)
SELECT 
  u.user_id,
  tp.categoria,
  tp.descricao_topico,
  tp.nivel_cefr,
  'A Introduzir'::status_topico
FROM public.usuarios u
CROSS JOIN public.topicos_padrao tp
WHERE u.tipo_usuario = 'Aluno'
AND u.nivel_cefr IS NOT NULL
AND tp.nivel_cefr = u.nivel_cefr
AND NOT EXISTS (
  SELECT 1 FROM public.topicos_progresso tprog
  WHERE tprog.aluno = u.user_id
  AND tprog.descricao_topico = tp.descricao_topico
  AND tprog.nivel_cefr = tp.nivel_cefr
);