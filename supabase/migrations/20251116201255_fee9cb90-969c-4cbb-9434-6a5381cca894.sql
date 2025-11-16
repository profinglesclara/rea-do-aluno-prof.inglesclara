-- 1. Adicionar novos campos à tabela usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS data_inicio_aulas DATE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS status_aluno TEXT CHECK (status_aluno IN ('Ativo', 'Pausado', 'Encerrado'));
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS telefone_responsavel TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS objetivo_principal TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS preferencia_contato TEXT CHECK (preferencia_contato IN ('WhatsApp', 'E-mail', 'Ambos'));

-- 2. Garantir que responsavel_por referencia usuarios.user_id
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_responsavel_por_fkey;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_responsavel_por_fkey 
  FOREIGN KEY (responsavel_por) REFERENCES public.usuarios(user_id) ON DELETE SET NULL;

-- 3. Garantir foreign keys nas outras tabelas (se não existirem)
ALTER TABLE public.atividades_sugeridas DROP CONSTRAINT IF EXISTS atividades_sugeridas_aluno_fkey;
ALTER TABLE public.atividades_sugeridas ADD CONSTRAINT atividades_sugeridas_aluno_fkey 
  FOREIGN KEY (aluno) REFERENCES public.usuarios(user_id) ON DELETE CASCADE;

ALTER TABLE public.atividades_tarefas DROP CONSTRAINT IF EXISTS atividades_tarefas_aluno_fkey;
ALTER TABLE public.atividades_tarefas ADD CONSTRAINT atividades_tarefas_aluno_fkey 
  FOREIGN KEY (aluno) REFERENCES public.usuarios(user_id) ON DELETE CASCADE;

ALTER TABLE public.aulas DROP CONSTRAINT IF EXISTS aulas_aluno_fkey;
ALTER TABLE public.aulas ADD CONSTRAINT aulas_aluno_fkey 
  FOREIGN KEY (aluno) REFERENCES public.usuarios(user_id) ON DELETE CASCADE;

ALTER TABLE public.conquistas DROP CONSTRAINT IF EXISTS conquistas_aluno_fkey;
ALTER TABLE public.conquistas ADD CONSTRAINT conquistas_aluno_fkey 
  FOREIGN KEY (aluno) REFERENCES public.usuarios(user_id) ON DELETE CASCADE;

ALTER TABLE public.topicos_progresso DROP CONSTRAINT IF EXISTS topicos_progresso_aluno_fkey;
ALTER TABLE public.topicos_progresso ADD CONSTRAINT topicos_progresso_aluno_fkey 
  FOREIGN KEY (aluno) REFERENCES public.usuarios(user_id) ON DELETE CASCADE;

ALTER TABLE public.relatorios_mensais DROP CONSTRAINT IF EXISTS relatorios_mensais_aluno_fkey;
ALTER TABLE public.relatorios_mensais ADD CONSTRAINT relatorios_mensais_aluno_fkey 
  FOREIGN KEY (aluno) REFERENCES public.usuarios(user_id) ON DELETE CASCADE;

-- 4. Criar função security definer para verificar tipo de usuário
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
RETURNS tipo_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tipo_usuario FROM public.usuarios WHERE user_id = _user_id;
$$;

-- 5. Criar função para verificar se usuário é responsável de um aluno
CREATE OR REPLACE FUNCTION public.is_responsavel_of(_user_id uuid, _aluno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE user_id = _aluno_id AND responsavel_por = _user_id
  );
$$;

-- 6. Remover políticas antigas da tabela usuarios
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir inserção de novos usuários" ON public.usuarios;

-- 7. Criar novas políticas RLS para usuarios
-- SELECT: Admin vê tudo, Aluno/Adulto vê só próprio, Responsável vê próprio + alunos vinculados
CREATE POLICY "usuarios_select_policy" ON public.usuarios
FOR SELECT
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN user_id = auth.uid() THEN true
    WHEN public.is_responsavel_of(auth.uid(), user_id) THEN true
    ELSE false
  END
);

-- UPDATE: Admin atualiza tudo, outros só email e foto_perfil
CREATE POLICY "usuarios_update_policy" ON public.usuarios
FOR UPDATE
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN user_id = auth.uid() THEN true
    ELSE false
  END
)
WITH CHECK (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN user_id = auth.uid() THEN 
      -- Usuários não-admin só podem atualizar email e foto_perfil
      (email IS NOT DISTINCT FROM (SELECT email FROM usuarios WHERE user_id = auth.uid()) OR email <> (SELECT email FROM usuarios WHERE user_id = auth.uid()))
      AND (foto_perfil IS NOT DISTINCT FROM (SELECT foto_perfil FROM usuarios WHERE user_id = auth.uid()) OR foto_perfil <> (SELECT foto_perfil FROM usuarios WHERE user_id = auth.uid()))
      AND nome_de_usuario = (SELECT nome_de_usuario FROM usuarios WHERE user_id = auth.uid())
      AND senha = (SELECT senha FROM usuarios WHERE user_id = auth.uid())
      AND nivel_cefr IS NOT DISTINCT FROM (SELECT nivel_cefr FROM usuarios WHERE user_id = auth.uid())
      AND modalidade IS NOT DISTINCT FROM (SELECT modalidade FROM usuarios WHERE user_id = auth.uid())
      AND tipo_usuario = (SELECT tipo_usuario FROM usuarios WHERE user_id = auth.uid())
      AND responsavel_por IS NOT DISTINCT FROM (SELECT responsavel_por FROM usuarios WHERE user_id = auth.uid())
    ELSE false
  END
);

-- INSERT: Apenas Admin pode criar usuários
CREATE POLICY "usuarios_insert_policy" ON public.usuarios
FOR INSERT
WITH CHECK (public.get_user_type(auth.uid()) = 'Admin');

-- 8. Atualizar políticas das tabelas relacionadas
-- topicos_progresso
DROP POLICY IF EXISTS "Usuários podem ver seus próprios tópicos" ON public.topicos_progresso;
DROP POLICY IF EXISTS "Usuários podem atualizar seus tópicos" ON public.topicos_progresso;
DROP POLICY IF EXISTS "Usuários podem inserir tópicos" ON public.topicos_progresso;

CREATE POLICY "topicos_select_policy" ON public.topicos_progresso
FOR SELECT
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN aluno = auth.uid() THEN true
    WHEN public.is_responsavel_of(auth.uid(), aluno) THEN true
    ELSE false
  END
);

CREATE POLICY "topicos_update_policy" ON public.topicos_progresso
FOR UPDATE
USING (public.get_user_type(auth.uid()) = 'Admin');

CREATE POLICY "topicos_insert_policy" ON public.topicos_progresso
FOR INSERT
WITH CHECK (public.get_user_type(auth.uid()) = 'Admin');

-- conquistas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias conquistas" ON public.conquistas;
DROP POLICY IF EXISTS "Permitir atualização de conquistas" ON public.conquistas;
DROP POLICY IF EXISTS "Permitir inserção de conquistas" ON public.conquistas;

CREATE POLICY "conquistas_select_policy" ON public.conquistas
FOR SELECT
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN aluno = auth.uid() THEN true
    WHEN public.is_responsavel_of(auth.uid(), aluno) THEN true
    ELSE false
  END
);

CREATE POLICY "conquistas_update_policy" ON public.conquistas
FOR UPDATE
USING (public.get_user_type(auth.uid()) = 'Admin');

CREATE POLICY "conquistas_insert_policy" ON public.conquistas
FOR INSERT
WITH CHECK (public.get_user_type(auth.uid()) = 'Admin');

-- atividades_sugeridas
DROP POLICY IF EXISTS "Usuários podem ver suas atividades sugeridas" ON public.atividades_sugeridas;
DROP POLICY IF EXISTS "Permitir atualização de atividades sugeridas" ON public.atividades_sugeridas;
DROP POLICY IF EXISTS "Permitir inserção de atividades sugeridas" ON public.atividades_sugeridas;

CREATE POLICY "atividades_sugeridas_select_policy" ON public.atividades_sugeridas
FOR SELECT
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN aluno = auth.uid() THEN true
    WHEN public.is_responsavel_of(auth.uid(), aluno) THEN true
    ELSE false
  END
);

CREATE POLICY "atividades_sugeridas_update_policy" ON public.atividades_sugeridas
FOR UPDATE
USING (public.get_user_type(auth.uid()) = 'Admin');

CREATE POLICY "atividades_sugeridas_insert_policy" ON public.atividades_sugeridas
FOR INSERT
WITH CHECK (public.get_user_type(auth.uid()) = 'Admin');

-- atividades_tarefas
DROP POLICY IF EXISTS "Usuários podem ver suas atividades" ON public.atividades_tarefas;
DROP POLICY IF EXISTS "Permitir atualização de atividades" ON public.atividades_tarefas;
DROP POLICY IF EXISTS "Permitir inserção de atividades" ON public.atividades_tarefas;

CREATE POLICY "atividades_tarefas_select_policy" ON public.atividades_tarefas
FOR SELECT
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN aluno = auth.uid() THEN true
    WHEN public.is_responsavel_of(auth.uid(), aluno) THEN true
    ELSE false
  END
);

CREATE POLICY "atividades_tarefas_update_policy" ON public.atividades_tarefas
FOR UPDATE
USING (public.get_user_type(auth.uid()) = 'Admin');

CREATE POLICY "atividades_tarefas_insert_policy" ON public.atividades_tarefas
FOR INSERT
WITH CHECK (public.get_user_type(auth.uid()) = 'Admin');

-- aulas
DROP POLICY IF EXISTS "Usuários podem ver suas aulas" ON public.aulas;
DROP POLICY IF EXISTS "Permitir atualização de aulas" ON public.aulas;
DROP POLICY IF EXISTS "Permitir inserção de aulas" ON public.aulas;

CREATE POLICY "aulas_select_policy" ON public.aulas
FOR SELECT
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN aluno = auth.uid() THEN true
    WHEN public.is_responsavel_of(auth.uid(), aluno) THEN true
    ELSE false
  END
);

CREATE POLICY "aulas_update_policy" ON public.aulas
FOR UPDATE
USING (public.get_user_type(auth.uid()) = 'Admin');

CREATE POLICY "aulas_insert_policy" ON public.aulas
FOR INSERT
WITH CHECK (public.get_user_type(auth.uid()) = 'Admin');

-- relatorios_mensais
DROP POLICY IF EXISTS "Usuários podem ver seus relatórios" ON public.relatorios_mensais;
DROP POLICY IF EXISTS "Permitir atualização de relatórios" ON public.relatorios_mensais;
DROP POLICY IF EXISTS "Permitir inserção de relatórios" ON public.relatorios_mensais;

CREATE POLICY "relatorios_select_policy" ON public.relatorios_mensais
FOR SELECT
USING (
  CASE 
    WHEN public.get_user_type(auth.uid()) = 'Admin' THEN true
    WHEN aluno = auth.uid() THEN true
    WHEN public.is_responsavel_of(auth.uid(), aluno) THEN true
    ELSE false
  END
);

CREATE POLICY "relatorios_update_policy" ON public.relatorios_mensais
FOR UPDATE
USING (public.get_user_type(auth.uid()) = 'Admin');

CREATE POLICY "relatorios_insert_policy" ON public.relatorios_mensais
FOR INSERT
WITH CHECK (public.get_user_type(auth.uid()) = 'Admin');