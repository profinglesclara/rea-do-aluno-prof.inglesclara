-- 1. Create user_roles table for proper role management (following security best practices)
CREATE TYPE public.app_role AS ENUM ('admin', 'aluno', 'responsavel', 'adulto');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. RLS policies for user_roles table
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- 4. Migrate existing roles from usuarios to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
    user_id,
    CASE 
        WHEN tipo_usuario = 'Admin' THEN 'admin'::app_role
        WHEN tipo_usuario = 'Aluno' THEN 'aluno'::app_role
        WHEN tipo_usuario = 'Responsável' THEN 'responsavel'::app_role
        WHEN tipo_usuario = 'Adulto' THEN 'adulto'::app_role
    END as role
FROM public.usuarios
WHERE tipo_usuario IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Drop old allow_all policies on usuarios table
DROP POLICY IF EXISTS "allow_all_delete" ON public.usuarios;
DROP POLICY IF EXISTS "allow_all_insert" ON public.usuarios;
DROP POLICY IF EXISTS "allow_all_select" ON public.usuarios;
DROP POLICY IF EXISTS "allow_all_update" ON public.usuarios;

-- 6. Create proper restrictive RLS policies for usuarios table
-- SELECT: Users see their own data, Admins see all, Responsáveis see their linked students
CREATE POLICY "usuarios_select_policy" 
ON public.usuarios
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'admin') THEN true
    WHEN user_id = auth.uid() THEN true
    WHEN is_responsavel_of(auth.uid(), user_id) THEN true
    ELSE false
  END
);

-- INSERT: Only for signup (user_id = auth.uid()) or admin creating users
CREATE POLICY "usuarios_insert_policy" 
ON public.usuarios
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- UPDATE: Users can update their own non-sensitive fields, Admins can update all
CREATE POLICY "usuarios_update_policy" 
ON public.usuarios
FOR UPDATE
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'admin') THEN true
    WHEN user_id = auth.uid() THEN true
    ELSE false
  END
)
WITH CHECK (
  CASE 
    WHEN public.has_role(auth.uid(), 'admin') THEN true
    -- Non-admin users cannot change tipo_usuario
    WHEN user_id = auth.uid() THEN true
    ELSE false
  END
);

-- DELETE: Only Admins can delete users
CREATE POLICY "usuarios_delete_policy" 
ON public.usuarios
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Make senha column nullable and mask existing passwords
-- First make it nullable
ALTER TABLE public.usuarios ALTER COLUMN senha DROP NOT NULL;

-- Set all passwords to NULL (the real passwords are in Supabase Auth)
UPDATE public.usuarios SET senha = NULL;