
-- Use IF NOT EXISTS approach - only create missing triggers

-- 1. Trigger para conquista "Primeira Aula" 
DROP TRIGGER IF EXISTS trigger_conquista_primeira_aula ON public.aulas;
CREATE TRIGGER trigger_conquista_primeira_aula
AFTER UPDATE ON public.aulas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_conquista_primeira_aula();

-- 2. Popular tópicos por nível
DROP TRIGGER IF EXISTS trigger_popular_topicos_por_nivel ON public.usuarios;
CREATE TRIGGER trigger_popular_topicos_por_nivel
AFTER INSERT OR UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.popular_topicos_por_nivel();

-- 3. Popular tópicos iniciais
DROP TRIGGER IF EXISTS trigger_popular_topicos_iniciais ON public.usuarios;
CREATE TRIGGER trigger_popular_topicos_iniciais
AFTER INSERT ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.popular_topicos_iniciais();

-- 4. Recalcular progresso (already exists, skip)

-- 5. Atualizar timestamp tarefas
DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_tarefas ON public.tarefas;
CREATE TRIGGER trigger_atualizar_timestamp_tarefas
BEFORE UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_timestamp_tarefas();

-- 6. Atualizar ultima_atualizacao topicos
DROP TRIGGER IF EXISTS trigger_atualizar_ultima_atualizacao ON public.topicos_progresso;
CREATE TRIGGER trigger_atualizar_ultima_atualizacao
BEFORE UPDATE ON public.topicos_progresso
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_ultima_atualizacao();

-- 7. Sync tópicos padrão
DROP TRIGGER IF EXISTS trigger_sync_topico_padrao_insert ON public.topicos_padrao;
CREATE TRIGGER trigger_sync_topico_padrao_insert
AFTER INSERT ON public.topicos_padrao
FOR EACH ROW
EXECUTE FUNCTION public.sync_topico_padrao_insert();

DROP TRIGGER IF EXISTS trigger_sync_topico_padrao_update ON public.topicos_padrao;
CREATE TRIGGER trigger_sync_topico_padrao_update
AFTER UPDATE ON public.topicos_padrao
FOR EACH ROW
EXECUTE FUNCTION public.sync_topico_padrao_update();

DROP TRIGGER IF EXISTS trigger_sync_topico_padrao_delete ON public.topicos_padrao;
CREATE TRIGGER trigger_sync_topico_padrao_delete
AFTER DELETE ON public.topicos_padrao
FOR EACH ROW
EXECUTE FUNCTION public.sync_topico_padrao_delete();

-- 8. Validar vínculo
DROP TRIGGER IF EXISTS trigger_validar_vinculo ON public.responsaveis_alunos;
CREATE TRIGGER trigger_validar_vinculo
BEFORE INSERT ON public.responsaveis_alunos
FOR EACH ROW
EXECUTE FUNCTION public.validar_vinculo_responsavel_aluno();

-- 9. Configurar flags cards
DROP TRIGGER IF EXISTS trigger_configurar_flags_cards ON public.usuarios;
CREATE TRIGGER trigger_configurar_flags_cards
BEFORE INSERT OR UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.configurar_flags_cards_aluno();

-- 10. Espelhar notificações
DROP TRIGGER IF EXISTS trigger_espelhar_notificacao ON public.notificacoes;
CREATE TRIGGER trigger_espelhar_notificacao
AFTER INSERT ON public.notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.espelhar_notificacao_para_responsaveis();
