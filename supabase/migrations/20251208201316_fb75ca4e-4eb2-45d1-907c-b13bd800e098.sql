-- Políticas para tabela tarefas: aluno pode ver e atualizar APENAS suas próprias tarefas
CREATE POLICY "Aluno pode ver suas tarefas"
ON public.tarefas
FOR SELECT
USING (aluno_id = auth.uid());

CREATE POLICY "Aluno pode atualizar suas tarefas"
ON public.tarefas
FOR UPDATE
USING (aluno_id = auth.uid());

-- Política para entregas_tarefas: aluno pode APENAS visualizar suas entregas
CREATE POLICY "Aluno pode ver suas entregas"
ON public.entregas_tarefas
FOR SELECT
USING (aluno_id = auth.uid());