-- Criar bucket para armazenar PDFs de tarefas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tarefas',
  'tarefas',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
);

-- Políticas de acesso ao bucket tarefas
-- Permitir upload para usuários autenticados (alunos)
CREATE POLICY "Alunos podem fazer upload de tarefas"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'tarefas' AND
  auth.uid() IS NOT NULL
);

-- Permitir leitura pública dos PDFs
CREATE POLICY "PDFs de tarefas são visualizáveis"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tarefas');

-- Permitir que admins excluam arquivos
CREATE POLICY "Admins podem deletar PDFs de tarefas"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'tarefas' AND
  (SELECT get_user_type(auth.uid()) = 'Admin')
);