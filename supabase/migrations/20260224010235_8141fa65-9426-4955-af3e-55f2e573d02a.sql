
-- 1. Criar conquistas NIVEL para cada nível CEFR (se não existirem)
INSERT INTO public.conquistas_mestre (slug, nome, descricao, icone, tipo, nivel_cefr, automacao, ativa, ordem_exibicao)
VALUES
  ('mestre_a1', 'Mestre A1', 'Completou 100% dos tópicos do nível A1', '🏅', 'NIVEL', 'A1', true, true, 20),
  ('mestre_a2', 'Mestre A2', 'Completou 100% dos tópicos do nível A2', '🏅', 'NIVEL', 'A2', true, true, 21),
  ('mestre_b1', 'Mestre B1', 'Completou 100% dos tópicos do nível B1', '🏅', 'NIVEL', 'B1', true, true, 22),
  ('mestre_b2', 'Mestre B2', 'Completou 100% dos tópicos do nível B2', '🏅', 'NIVEL', 'B2', true, true, 23),
  ('mestre_c1', 'Mestre C1', 'Completou 100% dos tópicos do nível C1', '🏅', 'NIVEL', 'C1', true, true, 24),
  ('mestre_c2', 'Mestre C2', 'Completou 100% dos tópicos do nível C2', '🏅', 'NIVEL', 'C2', true, true, 25)
ON CONFLICT (slug) DO NOTHING;

-- 2. Criar função para verificar conquistas de nível
CREATE OR REPLACE FUNCTION public.verificar_conquistas_nivel(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conquista RECORD;
  v_already_has boolean;
  v_total integer;
  v_concluidos integer;
BEGIN
  -- Iterar sobre conquistas de nível automáticas ativas
  FOR v_conquista IN
    SELECT id, slug, nome, nivel_cefr
    FROM public.conquistas_mestre
    WHERE ativa = true AND automacao = true AND tipo = 'NIVEL'
      AND slug LIKE 'mestre_%'
  LOOP
    -- Verificar se já tem
    SELECT EXISTS(
      SELECT 1 FROM public.conquistas_alunos
      WHERE aluno_id = p_aluno_id AND conquista_id = v_conquista.id
    ) INTO v_already_has;
    
    IF v_already_has THEN
      CONTINUE;
    END IF;
    
    -- Contar tópicos do nível correspondente
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'Concluído'::status_topico)
    INTO v_total, v_concluidos
    FROM public.topicos_progresso
    WHERE aluno = p_aluno_id
      AND nivel_cefr = v_conquista.nivel_cefr;
    
    -- Se tem tópicos E todos estão concluídos → desbloquear
    IF v_total > 0 AND v_concluidos = v_total THEN
      INSERT INTO public.conquistas_alunos (aluno_id, conquista_id, origem)
      VALUES (p_aluno_id, v_conquista.id, 'automatico');
      
      INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem)
      VALUES (
        p_aluno_id,
        'CONQUISTA_DESBLOQUEADA',
        'Nova conquista desbloqueada!',
        'Parabéns! Você desbloqueou a conquista "' || v_conquista.nome || '"! 🏅'
      );
    END IF;
  END LOOP;
END;
$$;

-- 3. Criar trigger function que chama a verificação de nível
CREATE OR REPLACE FUNCTION public.trigger_verificar_conquistas_nivel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aluno_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_aluno_id := OLD.aluno;
  ELSE
    v_aluno_id := NEW.aluno;
  END IF;
  
  -- Só verificar quando status muda para Concluído
  IF TG_OP = 'UPDATE' AND NEW.status = 'Concluído' AND OLD.status != 'Concluído' THEN
    PERFORM verificar_conquistas_nivel(v_aluno_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Criar trigger na tabela topicos_progresso
DROP TRIGGER IF EXISTS trigger_conquistas_nivel ON public.topicos_progresso;
CREATE TRIGGER trigger_conquistas_nivel
  AFTER UPDATE ON public.topicos_progresso
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_verificar_conquistas_nivel();
