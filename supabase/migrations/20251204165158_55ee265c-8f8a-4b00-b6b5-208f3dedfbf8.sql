-- Drop existing restrictive insert policy
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;

-- Create new insert policy that allows:
-- 1. Authenticated users to insert their own profile (user_id = auth.uid())
-- 2. Admins to insert any user
-- 3. First user creation when table is empty
CREATE POLICY "usuarios_insert_policy" 
ON public.usuarios 
FOR INSERT
WITH CHECK (
  -- Allow if user is inserting their own record
  user_id = auth.uid()
  -- OR if current user is Admin
  OR get_user_type(auth.uid()) = 'Admin'::tipo_usuario
  -- OR if no users exist yet (bootstrap)
  OR NOT EXISTS (SELECT 1 FROM public.usuarios)
);