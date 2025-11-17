-- Migration: Sistema de Tarefas e Notificações para Portal do Aluno

-- Criar enum para tipos de notificação
CREATE TYPE tipo_notificacao AS ENUM (
  'TAREFA_NOVA',
  'TAREFA_ENTREGUE', 
  'TAREFA_CORRIGIDA',
  'AULA_ATUALIZADA',
  'CONQUISTA_DESBLOQUEADA'
);

-- Tabela de tarefas
CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.usuarios(user_id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('Obrigatoria', 'Sugerida')),
  data_limite timestamptz,
  status text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Entregue', 'Corrigida')),
  criada_em timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);

-- Tabela de entregas de tarefas (apenas metadados por enquanto)
CREATE TABLE public.entregas_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.usuarios(user_id) ON DELETE CASCADE,
  url_pdf text NOT NULL,
  data_envio timestamptz NOT NULL DEFAULT now()
);

-- Tabela de notificações
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(user_id) ON DELETE CASCADE,
  tipo tipo_notificacao NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  criada_em timestamptz NOT NULL DEFAULT now()
);

-- Trigger para atualizar atualizada_em em tarefas
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_tarefas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.atualizada_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_timestamp_tarefas
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_timestamp_tarefas();

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tarefas
CREATE POLICY "Admin pode ver todas as tarefas"
  ON public.tarefas FOR SELECT
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode criar tarefas"
  ON public.tarefas FOR INSERT
  WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode atualizar tarefas"
  ON public.tarefas FOR UPDATE
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode deletar tarefas"
  ON public.tarefas FOR DELETE
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- RLS Policies para entregas_tarefas
CREATE POLICY "Admin pode ver todas as entregas"
  ON public.entregas_tarefas FOR SELECT
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode criar entregas"
  ON public.entregas_tarefas FOR INSERT
  WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode atualizar entregas"
  ON public.entregas_tarefas FOR UPDATE
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode deletar entregas"
  ON public.entregas_tarefas FOR DELETE
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- RLS Policies para notificacoes
CREATE POLICY "Admin pode ver todas as notificações"
  ON public.notificacoes FOR SELECT
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode criar notificações"
  ON public.notificacoes FOR INSERT
  WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode atualizar notificações"
  ON public.notificacoes FOR UPDATE
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode deletar notificações"
  ON public.notificacoes FOR DELETE
  USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- Criar índices para melhor performance
CREATE INDEX idx_tarefas_aluno_id ON public.tarefas(aluno_id);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
CREATE INDEX idx_entregas_tarefa_id ON public.entregas_tarefas(tarefa_id);
CREATE INDEX idx_notificacoes_usuario_id ON public.notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(lida);