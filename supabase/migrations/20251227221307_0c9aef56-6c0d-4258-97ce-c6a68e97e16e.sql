-- Habilitar realtime para a tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- Adicionar política RLS para alunos verem suas próprias notificações
CREATE POLICY "Aluno pode ver suas notificações" 
ON public.notificacoes 
FOR SELECT 
USING (usuario_id = auth.uid());

-- Adicionar política RLS para alunos atualizarem suas notificações (marcar como lida)
CREATE POLICY "Aluno pode atualizar suas notificações" 
ON public.notificacoes 
FOR UPDATE 
USING (usuario_id = auth.uid());