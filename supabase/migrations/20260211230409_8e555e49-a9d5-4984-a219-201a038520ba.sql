
-- 1. Add RELATORIO_DISPONIVEL to tipo_notificacao enum
ALTER TYPE public.tipo_notificacao ADD VALUE IF NOT EXISTS 'RELATORIO_DISPONIVEL';

-- 2. Add notification email preference to usuarios
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS notif_email_ativo boolean NOT NULL DEFAULT true;

-- 3. Add RLS policies for responsáveis on notificacoes
-- Responsável can see their own notifications
CREATE POLICY "Responsável pode ver suas notificações"
  ON public.notificacoes
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Responsável can update (mark as read) their own notifications
CREATE POLICY "Responsável pode atualizar suas notificações"
  ON public.notificacoes
  FOR UPDATE
  USING (usuario_id = auth.uid());

-- 4. Create trigger function to mirror student notifications to their responsáveis
CREATE OR REPLACE FUNCTION public.espelhar_notificacao_para_responsaveis()
RETURNS TRIGGER AS $$
DECLARE
  v_responsavel RECORD;
  v_aluno_nome text;
  v_is_aluno boolean;
BEGIN
  -- Check if the notification target is an Aluno
  SELECT EXISTS(
    SELECT 1 FROM public.usuarios
    WHERE user_id = NEW.usuario_id AND tipo_usuario = 'Aluno'
  ) INTO v_is_aluno;

  IF NOT v_is_aluno THEN
    RETURN NEW;
  END IF;

  -- Get student name
  SELECT nome_completo INTO v_aluno_nome
  FROM public.usuarios
  WHERE user_id = NEW.usuario_id;

  -- Mirror to all linked responsáveis
  FOR v_responsavel IN
    SELECT responsavel_id FROM public.responsaveis_alunos
    WHERE aluno_id = NEW.usuario_id
  LOOP
    INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem)
    VALUES (
      v_responsavel.responsavel_id,
      NEW.tipo,
      NEW.titulo,
      '[' || COALESCE(v_aluno_nome, 'Aluno') || '] ' || NEW.mensagem
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger
DROP TRIGGER IF EXISTS trigger_espelhar_notificacao ON public.notificacoes;
CREATE TRIGGER trigger_espelhar_notificacao
  AFTER INSERT ON public.notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.espelhar_notificacao_para_responsaveis();
