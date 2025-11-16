-- Adicionar campo frequencia_mensal se não existir
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS frequencia_mensal integer;

-- Remover política de UPDATE existente
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;

-- Criar nova política de UPDATE mais restritiva
CREATE POLICY "usuarios_update_policy" 
ON public.usuarios 
FOR UPDATE 
USING (
  CASE
    WHEN (get_user_type(auth.uid()) = 'Admin'::tipo_usuario) THEN true
    WHEN (user_id = auth.uid()) THEN true
    ELSE false
  END
)
WITH CHECK (
  CASE
    -- Admin pode editar tudo
    WHEN (get_user_type(auth.uid()) = 'Admin'::tipo_usuario) THEN true
    -- Usuários não-Admin só podem editar email e foto_perfil
    WHEN (user_id = auth.uid()) THEN (
      -- Garantir que apenas email e foto_perfil podem ser alterados
      nome_completo = (SELECT nome_completo FROM usuarios WHERE user_id = auth.uid()) AND
      nome_de_usuario = (SELECT nome_de_usuario FROM usuarios WHERE user_id = auth.uid()) AND
      senha = (SELECT senha FROM usuarios WHERE user_id = auth.uid()) AND
      NOT (nivel_cefr IS DISTINCT FROM (SELECT nivel_cefr FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (modalidade IS DISTINCT FROM (SELECT modalidade FROM usuarios WHERE user_id = auth.uid())) AND
      tipo_usuario = (SELECT tipo_usuario FROM usuarios WHERE user_id = auth.uid()) AND
      NOT (responsavel_por IS DISTINCT FROM (SELECT responsavel_por FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (objetivo_principal IS DISTINCT FROM (SELECT objetivo_principal FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (frequencia_mensal IS DISTINCT FROM (SELECT frequencia_mensal FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (data_inicio_aulas IS DISTINCT FROM (SELECT data_inicio_aulas FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (status_aluno IS DISTINCT FROM (SELECT status_aluno FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (preferencia_contato IS DISTINCT FROM (SELECT preferencia_contato FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (telefone_responsavel IS DISTINCT FROM (SELECT telefone_responsavel FROM usuarios WHERE user_id = auth.uid())) AND
      NOT (observacoes_internas IS DISTINCT FROM (SELECT observacoes_internas FROM usuarios WHERE user_id = auth.uid()))
    )
    ELSE false
  END
);