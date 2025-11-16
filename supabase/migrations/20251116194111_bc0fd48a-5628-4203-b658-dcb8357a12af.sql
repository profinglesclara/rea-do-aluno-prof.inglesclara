
-- ============================================
-- ENUMS (Tipos de Seleção)
-- ============================================

CREATE TYPE tipo_usuario AS ENUM ('Aluno', 'Responsável', 'Adulto', 'Admin');
CREATE TYPE nivel_cefr AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE modalidade AS ENUM ('Online', 'Presencial', 'Híbrido');
CREATE TYPE categoria_topico AS ENUM ('Grammar', 'Vocabulary', 'Communication', 'Pronunciation', 'Listening', 'Reading', 'Writing', 'Speaking');
CREATE TYPE status_topico AS ENUM ('A Introduzir', 'Em Desenvolvimento', 'Concluído');
CREATE TYPE tipo_conquista AS ENUM ('Progresso', 'Presença', 'Atividades', 'Nível CEFR', 'Extra');
CREATE TYPE status_conquista AS ENUM ('Desbloqueada', 'Oculta');
CREATE TYPE status_sugestao AS ENUM ('Sugerida', 'Em andamento', 'Concluída');
CREATE TYPE status_aula AS ENUM ('Agendada', 'Realizada', 'Cancelada', 'Remarcada');
CREATE TYPE status_atividade AS ENUM ('Disponível', 'Concluída');

-- ============================================
-- 1. TABELA USUÁRIOS
-- ============================================

CREATE TABLE public.usuarios (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  tipo_usuario tipo_usuario NOT NULL,
  nivel_cefr nivel_cefr,
  modalidade modalidade,
  email TEXT UNIQUE NOT NULL,
  foto_perfil TEXT,
  nome_de_usuario TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  email_confirmado BOOLEAN DEFAULT false,
  responsavel_por UUID REFERENCES public.usuarios(user_id) ON DELETE SET NULL,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progresso_geral NUMERIC(5,2) DEFAULT 0 CHECK (progresso_geral >= 0 AND progresso_geral <= 100),
  grafico_progresso JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios dados"
  ON public.usuarios
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON public.usuarios
  FOR UPDATE
  USING (true);

CREATE POLICY "Permitir inserção de novos usuários"
  ON public.usuarios
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 2. TABELA TÓPICOS DE PROGRESSO (CEFR)
-- ============================================

CREATE TABLE public.topicos_progresso (
  topico_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel_cefr nivel_cefr NOT NULL,
  categoria categoria_topico NOT NULL,
  descricao_topico TEXT NOT NULL,
  status status_topico NOT NULL DEFAULT 'A Introduzir',
  aluno UUID REFERENCES public.usuarios(user_id) ON DELETE CASCADE NOT NULL,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.topicos_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios tópicos"
  ON public.topicos_progresso
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem inserir tópicos"
  ON public.topicos_progresso
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar seus tópicos"
  ON public.topicos_progresso
  FOR UPDATE
  USING (true);

-- ============================================
-- 3. TABELA CONQUISTAS
-- ============================================

CREATE TABLE public.conquistas (
  conquista_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno UUID REFERENCES public.usuarios(user_id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo tipo_conquista NOT NULL,
  data_conquista TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status status_conquista NOT NULL DEFAULT 'Oculta'
);

ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias conquistas"
  ON public.conquistas
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de conquistas"
  ON public.conquistas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de conquistas"
  ON public.conquistas
  FOR UPDATE
  USING (true);

-- ============================================
-- 4. TABELA ATIVIDADES SUGERIDAS
-- ============================================

CREATE TABLE public.atividades_sugeridas (
  sugestao_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno UUID REFERENCES public.usuarios(user_id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria categoria_topico NOT NULL,
  link_recurso TEXT,
  status status_sugestao NOT NULL DEFAULT 'Sugerida'
);

ALTER TABLE public.atividades_sugeridas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas atividades sugeridas"
  ON public.atividades_sugeridas
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de atividades sugeridas"
  ON public.atividades_sugeridas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de atividades sugeridas"
  ON public.atividades_sugeridas
  FOR UPDATE
  USING (true);

-- ============================================
-- 5. TABELA RELATÓRIOS MENSAIS
-- ============================================

CREATE TABLE public.relatorios_mensais (
  relatorio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno UUID REFERENCES public.usuarios(user_id) ON DELETE CASCADE NOT NULL,
  mes_referencia TEXT NOT NULL,
  data_geracao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  conteudo_gerado TEXT,
  arquivo_pdf TEXT,
  porcentagem_concluida NUMERIC(5,2) DEFAULT 0 CHECK (porcentagem_concluida >= 0 AND porcentagem_concluida <= 100),
  porcentagem_em_desenvolvimento NUMERIC(5,2) DEFAULT 0 CHECK (porcentagem_em_desenvolvimento >= 0 AND porcentagem_em_desenvolvimento <= 100),
  comentario_automatico TEXT
);

ALTER TABLE public.relatorios_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus relatórios"
  ON public.relatorios_mensais
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de relatórios"
  ON public.relatorios_mensais
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de relatórios"
  ON public.relatorios_mensais
  FOR UPDATE
  USING (true);

-- ============================================
-- 6. TABELA AULAS
-- ============================================

CREATE TABLE public.aulas (
  aula_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno UUID REFERENCES public.usuarios(user_id) ON DELETE CASCADE NOT NULL,
  data_aula TIMESTAMP WITH TIME ZONE NOT NULL,
  status status_aula NOT NULL DEFAULT 'Agendada',
  conteudo TEXT,
  observacoes TEXT
);

ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas aulas"
  ON public.aulas
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de aulas"
  ON public.aulas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de aulas"
  ON public.aulas
  FOR UPDATE
  USING (true);

-- ============================================
-- 7. TABELA ATIVIDADES E TAREFAS
-- ============================================

CREATE TABLE public.atividades_tarefas (
  atividade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno UUID REFERENCES public.usuarios(user_id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  link TEXT,
  status status_atividade NOT NULL DEFAULT 'Disponível'
);

ALTER TABLE public.atividades_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas atividades"
  ON public.atividades_tarefas
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de atividades"
  ON public.atividades_tarefas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de atividades"
  ON public.atividades_tarefas
  FOR UPDATE
  USING (true);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_topicos_aluno ON public.topicos_progresso(aluno);
CREATE INDEX idx_conquistas_aluno ON public.conquistas(aluno);
CREATE INDEX idx_atividades_sugeridas_aluno ON public.atividades_sugeridas(aluno);
CREATE INDEX idx_relatorios_aluno ON public.relatorios_mensais(aluno);
CREATE INDEX idx_aulas_aluno ON public.aulas(aluno);
CREATE INDEX idx_atividades_tarefas_aluno ON public.atividades_tarefas(aluno);
