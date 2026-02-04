-- Fix #1: Remove unauthenticated access from usuarios_select_policy
-- The current policy allows access when auth.uid() IS NULL, exposing PII

DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;

CREATE POLICY "usuarios_select_policy" 
ON public.usuarios 
FOR SELECT 
USING (
  CASE
    WHEN ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role)) THEN true
    WHEN ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) THEN true
    WHEN ((auth.uid() IS NOT NULL) AND is_responsavel_of(auth.uid(), user_id)) THEN true
    ELSE false
  END
);

-- Fix #2: Add RLS policies to dashboard_resumo_alunos view
-- First enable RLS on the view, then create appropriate policies

ALTER VIEW public.dashboard_resumo_alunos SET (security_invoker = on);

-- Enable RLS on the view
-- Note: For views with security_invoker=on, RLS policies of the underlying tables apply
-- The view queries usuarios table which now has proper RLS, so access is properly restricted