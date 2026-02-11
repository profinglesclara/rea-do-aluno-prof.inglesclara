
-- 1. Create enum for achievement type
DO $$ BEGIN
  CREATE TYPE public.tipo_conquista_mestre AS ENUM ('GERAL', 'NIVEL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns to conquistas_mestre
ALTER TABLE public.conquistas_mestre
  ADD COLUMN IF NOT EXISTS tipo public.tipo_conquista_mestre NOT NULL DEFAULT 'GERAL',
  ADD COLUMN IF NOT EXISTS nivel_cefr public.nivel_cefr NULL,
  ADD COLUMN IF NOT EXISTS automacao boolean NOT NULL DEFAULT false;

-- 3. Create trigger function for "Primeira Aula" automation
CREATE OR REPLACE FUNCTION public.trigger_conquista_primeira_aula()
RETURNS TRIGGER AS $$
DECLARE
  v_conquista_id uuid;
  v_conquista_nome text;
  v_already_has boolean;
  v_aluno_email text;
  v_aluno_nome text;
BEGIN
  -- Only fire when status changes to 'Realizada'
  IF NEW.status = 'Realizada' AND (OLD.status IS NULL OR OLD.status <> 'Realizada') THEN
    -- Find the PRIMEIRA_AULA achievement by slug
    SELECT id, nome INTO v_conquista_id, v_conquista_nome
    FROM public.conquistas_mestre
    WHERE slug = 'primeira_aula' AND ativa = true AND automacao = true
    LIMIT 1;

    IF v_conquista_id IS NOT NULL THEN
      -- Check if student already has it
      SELECT EXISTS(
        SELECT 1 FROM public.conquistas_alunos
        WHERE aluno_id = NEW.aluno AND conquista_id = v_conquista_id
      ) INTO v_already_has;

      IF NOT v_already_has THEN
        -- Insert the achievement
        INSERT INTO public.conquistas_alunos (aluno_id, conquista_id, origem)
        VALUES (NEW.aluno, v_conquista_id, 'automatico');

        -- Create notification
        INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem)
        VALUES (
          NEW.aluno,
          'CONQUISTA_DESBLOQUEADA',
          'Nova conquista desbloqueada!',
          'Parabéns! Você desbloqueou a conquista "' || v_conquista_nome || '"'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger on aulas table
DROP TRIGGER IF EXISTS trigger_primeira_aula ON public.aulas;
CREATE TRIGGER trigger_primeira_aula
  AFTER UPDATE ON public.aulas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_conquista_primeira_aula();

-- 5. Seed the "Primeira Aula" achievement if it doesn't exist
INSERT INTO public.conquistas_mestre (nome, descricao, icone, slug, ordem_exibicao, ativa, tipo, automacao)
SELECT 'Primeira Aula', 'Completou sua primeira aula!', 'Star', 'primeira_aula', 0, true, 'GERAL', true
WHERE NOT EXISTS (SELECT 1 FROM public.conquistas_mestre WHERE slug = 'primeira_aula');
