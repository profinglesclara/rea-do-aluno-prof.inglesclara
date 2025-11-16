-- Criar trigger para atualizar o campo ultima_atualizacao automaticamente
CREATE TRIGGER trigger_topicos_ultima_atualizacao
BEFORE UPDATE ON public.topicos_progresso
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_ultima_atualizacao();

-- Criar trigger para recalcular progresso do aluno automaticamente
CREATE TRIGGER trigger_recalcular_progresso_aluno
AFTER INSERT OR UPDATE OR DELETE ON public.topicos_progresso
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_progresso_aluno();