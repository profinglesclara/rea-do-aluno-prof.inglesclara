-- Adicionar política RLS para DELETE na tabela aulas
-- Permite apenas Admin excluir aulas
CREATE POLICY "aulas_delete_policy" 
ON public.aulas 
FOR DELETE 
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);