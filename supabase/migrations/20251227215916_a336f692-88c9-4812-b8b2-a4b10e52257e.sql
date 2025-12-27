-- Criar bucket avatars para fotos de perfil
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Política: usuário pode fazer upload da própria foto
CREATE POLICY "Usuário pode fazer upload de sua foto" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: usuário pode atualizar sua foto
CREATE POLICY "Usuário pode atualizar sua foto" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: usuário pode deletar sua foto
CREATE POLICY "Usuário pode deletar sua foto" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: todos podem ver fotos (bucket público)
CREATE POLICY "Fotos de perfil são públicas" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');