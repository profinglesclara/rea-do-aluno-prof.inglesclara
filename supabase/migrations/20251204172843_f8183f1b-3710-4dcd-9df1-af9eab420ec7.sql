-- Remover todas as políticas RLS da tabela usuarios
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;

-- Criar política simples que permite tudo para todos
CREATE POLICY "allow_all_select" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.usuarios FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete" ON public.usuarios FOR DELETE USING (true);