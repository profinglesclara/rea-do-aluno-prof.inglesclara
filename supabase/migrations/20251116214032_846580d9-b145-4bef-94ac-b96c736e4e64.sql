-- Remover a policy de INSERT existente
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;

-- Criar nova policy de INSERT que permite:
-- 1. Inserir quando a tabela está vazia (primeiro usuário)
-- 2. Inserir quando o usuário é Admin
CREATE POLICY "usuarios_insert_policy" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.usuarios)
  OR public.get_user_type(auth.uid()) = 'Admin'::tipo_usuario
);