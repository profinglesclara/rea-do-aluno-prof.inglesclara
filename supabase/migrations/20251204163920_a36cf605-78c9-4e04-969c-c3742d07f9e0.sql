-- Drop existing select policy
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;

-- Create new select policy that allows login lookup
CREATE POLICY "usuarios_select_policy" 
ON public.usuarios 
FOR SELECT
USING (
  CASE
    -- Allow unauthenticated users to lookup by username/email for login
    WHEN auth.uid() IS NULL THEN true
    -- Alunos are visible to all authenticated users
    WHEN tipo_usuario = 'Aluno'::tipo_usuario THEN true
    -- Admin can see everyone
    WHEN get_user_type(auth.uid()) = 'Admin'::tipo_usuario THEN true
    -- User can see themselves
    WHEN user_id = auth.uid() THEN true
    -- Responsável can see their linked students
    WHEN is_responsavel_of(auth.uid(), user_id) THEN true
    ELSE false
  END
);