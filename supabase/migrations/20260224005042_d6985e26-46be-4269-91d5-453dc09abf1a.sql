
-- Ativar automação nas conquistas que estavam com false
UPDATE public.conquistas_mestre SET automacao = true WHERE slug IN ('assiduidade', 'persistente');

-- ============================================
-- FUNÇÃO: Verificar conquistas automáticas gerais
-- Chamada após recalcular progresso e em outros eventos
-- ============================================
CREATE OR REPLACE FUNCTION public.verificar_conquistas_automaticas(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conquista RECORD;
  v_already_has boolean;
  v_condition_met boolean;
  v_total_aulas_consecutivas integer;
  v_total_tarefas_entregues integer;
  v_progresso_geral numeric;
  v_primeira_aula_data timestamp;
  v_meses_desde_primeira_aula numeric;
BEGIN
  -- Pre-calcular métricas do aluno
  
  -- 1. Aulas consecutivas realizadas (mais recentes)
  WITH aulas_ordenadas AS (
    SELECT status, data_aula,
      ROW_NUMBER() OVER (ORDER BY data_aula DESC) as rn
    FROM public.aulas
    WHERE aluno = p_aluno_id
    ORDER BY data_aula DESC
  ),
  streak AS (
    SELECT COUNT(*) as consecutivas
    FROM aulas_ordenadas
    WHERE rn <= (
      SELECT COALESCE(MIN(rn) - 1, (SELECT COUNT(*) FROM aulas_ordenadas WHERE status = 'Realizada'))
      FROM aulas_ordenadas
      WHERE status != 'Realizada'
    )
    AND status = 'Realizada'
  )
  SELECT consecutivas INTO v_total_aulas_consecutivas FROM streak;
  
  -- 2. Total de tarefas entregues
  SELECT COUNT(*) INTO v_total_tarefas_entregues
  FROM public.tarefas
  WHERE aluno_id = p_aluno_id AND status IN ('Entregue', 'Corrigida');
  
  -- 3. Progresso geral
  SELECT COALESCE(progresso_geral, 0) INTO v_progresso_geral
  FROM public.usuarios
  WHERE user_id = p_aluno_id;
  
  -- 4. Data da primeira aula realizada
  SELECT MIN(data_aula) INTO v_primeira_aula_data
  FROM public.aulas
  WHERE aluno = p_aluno_id AND status = 'Realizada';
  
  IF v_primeira_aula_data IS NOT NULL THEN
    v_meses_desde_primeira_aula := EXTRACT(EPOCH FROM (NOW() - v_primeira_aula_data)) / (30.44 * 24 * 3600);
  ELSE
    v_meses_desde_primeira_aula := 0;
  END IF;

  -- Iterar sobre conquistas automáticas gerais ativas
  FOR v_conquista IN
    SELECT id, slug, nome
    FROM public.conquistas_mestre
    WHERE ativa = true AND automacao = true AND tipo = 'GERAL'
  LOOP
    -- Verificar se já tem
    SELECT EXISTS(
      SELECT 1 FROM public.conquistas_alunos
      WHERE aluno_id = p_aluno_id AND conquista_id = v_conquista.id
    ) INTO v_already_has;
    
    IF v_already_has THEN
      CONTINUE;
    END IF;
    
    -- Verificar condição por slug
    v_condition_met := false;
    
    CASE v_conquista.slug
      WHEN 'assiduidade' THEN
        v_condition_met := v_total_aulas_consecutivas >= 5;
      WHEN 'dedicado' THEN
        v_condition_met := v_total_tarefas_entregues >= 10;
      WHEN 'progresso_rapido' THEN
        v_condition_met := v_progresso_geral >= 50;
      WHEN 'persistente' THEN
        v_condition_met := v_meses_desde_primeira_aula >= 3;
      ELSE
        v_condition_met := false;
    END CASE;
    
    IF v_condition_met THEN
      -- Desbloquear conquista
      INSERT INTO public.conquistas_alunos (aluno_id, conquista_id, origem)
      VALUES (p_aluno_id, v_conquista.id, 'automatico');
      
      -- Criar notificação
      INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem)
      VALUES (
        p_aluno_id,
        'CONQUISTA_DESBLOQUEADA',
        'Nova conquista desbloqueada!',
        'Parabéns! Você desbloqueou a conquista "' || v_conquista.nome || '"'
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- TRIGGER 1: Após recalcular progresso (topicos_progresso)
-- Cobre: progresso_rapido
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_verificar_conquistas_progresso()
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
  
  PERFORM verificar_conquistas_automaticas(v_aluno_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_verificar_conquistas_progresso ON public.topicos_progresso;
CREATE TRIGGER trigger_verificar_conquistas_progresso
AFTER INSERT OR UPDATE ON public.topicos_progresso
FOR EACH ROW
EXECUTE FUNCTION public.trigger_verificar_conquistas_progresso();

-- ============================================
-- TRIGGER 2: Após atualizar status de aula
-- Cobre: assiduidade, persistente
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_verificar_conquistas_aula()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'Realizada' AND (OLD.status IS NULL OR OLD.status != 'Realizada') THEN
    PERFORM verificar_conquistas_automaticas(NEW.aluno);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_verificar_conquistas_aula ON public.aulas;
CREATE TRIGGER trigger_verificar_conquistas_aula
AFTER UPDATE ON public.aulas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_verificar_conquistas_aula();

-- ============================================
-- TRIGGER 3: Após tarefa mudar status para Entregue/Corrigida
-- Cobre: dedicado
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_verificar_conquistas_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('Entregue', 'Corrigida') AND (OLD.status IS NULL OR OLD.status NOT IN ('Entregue', 'Corrigida')) THEN
    PERFORM verificar_conquistas_automaticas(NEW.aluno_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_verificar_conquistas_tarefa ON public.tarefas;
CREATE TRIGGER trigger_verificar_conquistas_tarefa
AFTER UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_verificar_conquistas_tarefa();
