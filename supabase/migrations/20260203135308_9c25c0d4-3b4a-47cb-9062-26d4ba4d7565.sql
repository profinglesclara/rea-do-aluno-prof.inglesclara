-- =====================================================
-- Security Fix Migration
-- Fixes: 
--   1. gerar_relatorios_mensais - Revoke public RPC access
--   2. is_responsavel_of - Update to use responsaveis_alunos table
--   3. tarefas storage - Make bucket private with proper RLS
-- =====================================================

-- =====================================================
-- FIX 1: Revoke public access to gerar_relatorios_mensais
-- The edge function uses service_role key, so we revoke from anon/authenticated
-- =====================================================

REVOKE EXECUTE ON FUNCTION public.gerar_relatorios_mensais() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_relatorios_mensais() TO service_role;

COMMENT ON FUNCTION public.gerar_relatorios_mensais IS 'Monthly report generation - restricted to service_role only. Use edge function with service_role key to call.';

-- =====================================================
-- FIX 2: Fix is_responsavel_of to use responsaveis_alunos table
-- The function was using deprecated usuarios.responsavel_por column
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_responsavel_of(_user_id uuid, _aluno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responsaveis_alunos 
    WHERE responsavel_id = _user_id AND aluno_id = _aluno_id
  );
$$;

COMMENT ON FUNCTION public.is_responsavel_of IS 'Fixed to use responsaveis_alunos junction table instead of deprecated usuarios.responsavel_por column';

-- =====================================================
-- FIX 3: Make tarefas storage bucket private with proper RLS
-- =====================================================

-- Update bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'tarefas';

-- Drop old permissive policies
DROP POLICY IF EXISTS "PDFs de tarefas são visualizáveis" ON storage.objects;
DROP POLICY IF EXISTS "Alunos podem fazer upload de tarefas" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar PDFs de tarefas" ON storage.objects;

-- Admin can upload task statements to enunciados/ folder
CREATE POLICY "Admin pode fazer upload de enunciados"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tarefas' AND
  (storage.foldername(name))[1] = 'enunciados' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Student can upload to their own folder only (student_id/task_id/file format)
CREATE POLICY "Aluno pode fazer upload de suas entregas"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tarefas' AND
  auth.uid() IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin can read all files
CREATE POLICY "Admin pode ler todos os arquivos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tarefas' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Student can read their own submissions and task statements
CREATE POLICY "Aluno pode ler suas entregas e enunciados"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tarefas' AND
  auth.uid() IS NOT NULL AND
  (
    -- Can read own folder (their submissions)
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Can read task statements (in enunciados/ folder)
    (storage.foldername(name))[1] = 'enunciados'
  )
);

-- Guardian can read their students' submissions and task statements
CREATE POLICY "Responsavel pode ler entregas de seus alunos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tarefas' AND
  auth.uid() IS NOT NULL AND
  (
    -- Can read students' folders if they are responsible for them
    EXISTS (
      SELECT 1 FROM public.responsaveis_alunos ra
      WHERE ra.responsavel_id = auth.uid()
      AND ra.aluno_id::text = (storage.foldername(name))[1]
    ) OR
    -- Can read task statements
    (storage.foldername(name))[1] = 'enunciados'
  )
);

-- Admin can delete files
CREATE POLICY "Admin pode deletar arquivos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'tarefas' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Admin can update files (e.g., replace task statements)
CREATE POLICY "Admin pode atualizar arquivos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'tarefas' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);