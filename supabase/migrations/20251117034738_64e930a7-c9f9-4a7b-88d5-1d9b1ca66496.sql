-- Permitir leitura pública de alunos para facilitar seleção na interface admin
-- Esta policy permite que qualquer pessoa autenticada veja a lista de alunos
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;

CREATE POLICY "usuarios_select_policy" 
ON public.usuarios 
FOR SELECT 
USING (
  CASE
    WHEN tipo_usuario = 'Aluno' THEN true  -- Alunos sempre visíveis para seleção
    WHEN get_user_type(auth.uid()) = 'Admin'::tipo_usuario THEN true
    WHEN user_id = auth.uid() THEN true
    WHEN is_responsavel_of(auth.uid(), user_id) THEN true
    ELSE false
  END
);