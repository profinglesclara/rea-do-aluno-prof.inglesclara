-- Adicionar política RLS para permitir que alunos criem suas próprias entregas
CREATE POLICY "Aluno pode criar suas entregas"
ON public.entregas_tarefas
FOR INSERT
WITH CHECK (aluno_id = auth.uid());