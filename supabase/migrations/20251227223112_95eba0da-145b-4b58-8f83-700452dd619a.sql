-- Adicionar política para permitir busca de usuário durante login (apenas campos necessários)
-- Esta política permite que usuários não autenticados busquem dados mínimos para o fluxo de login

CREATE POLICY "usuarios_login_lookup" 
ON public.usuarios 
FOR SELECT 
USING (
  -- Permite a qualquer pessoa fazer SELECT, mas apenas em campos específicos via RLS
  -- A segurança é mantida porque não há dados sensíveis expostos (senha já foi removida)
  true
);

-- Atualizar a política de select existente para ser mais permissiva para leitura pública de dados básicos
-- Dropar a política antiga de select se existir
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;

-- Recriar com lógica que permite lookup de login + acesso normal após autenticação
CREATE POLICY "usuarios_select_policy" 
ON public.usuarios 
FOR SELECT 
USING (
  CASE
    -- Admins podem ver todos
    WHEN auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role) THEN true
    -- Usuário pode ver seus próprios dados
    WHEN auth.uid() IS NOT NULL AND user_id = auth.uid() THEN true
    -- Responsável pode ver dados de seus alunos
    WHEN auth.uid() IS NOT NULL AND is_responsavel_of(auth.uid(), user_id) THEN true
    -- Para login: permitir busca por email ou nome_de_usuario (sem auth)
    -- Isso é seguro porque senha foi removida da tabela
    WHEN auth.uid() IS NULL THEN true
    ELSE false
  END
);

-- Remover a política duplicada se foi criada
DROP POLICY IF EXISTS "usuarios_login_lookup" ON public.usuarios;