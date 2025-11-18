-- Criar tabela mestre de conquistas (lista de todas as conquistas possíveis)
CREATE TABLE public.conquistas_mestre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL,
  ordem_exibicao INTEGER NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de conquistas desbloqueadas por aluno
CREATE TABLE public.conquistas_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.usuarios(user_id) ON DELETE CASCADE,
  conquista_id UUID NOT NULL REFERENCES public.conquistas_mestre(id) ON DELETE CASCADE,
  data_desbloqueio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  origem TEXT NOT NULL DEFAULT 'manual',
  observacao TEXT,
  UNIQUE(aluno_id, conquista_id)
);

-- Habilitar RLS
ALTER TABLE public.conquistas_mestre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conquistas_alunos ENABLE ROW LEVEL SECURITY;

-- RLS para conquistas_mestre: todos podem ver, só admin pode modificar
CREATE POLICY "Todos podem ver conquistas mestre"
ON public.conquistas_mestre
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin pode inserir conquistas mestre"
ON public.conquistas_mestre
FOR INSERT
WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode atualizar conquistas mestre"
ON public.conquistas_mestre
FOR UPDATE
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode deletar conquistas mestre"
ON public.conquistas_mestre
FOR DELETE
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- RLS para conquistas_alunos: aluno vê suas próprias, admin vê todas
CREATE POLICY "Usuário pode ver suas conquistas"
ON public.conquistas_alunos
FOR SELECT
USING (
  CASE
    WHEN get_user_type(auth.uid()) = 'Admin'::tipo_usuario THEN true
    WHEN aluno_id = auth.uid() THEN true
    WHEN is_responsavel_of(auth.uid(), aluno_id) THEN true
    ELSE false
  END
);

CREATE POLICY "Admin pode inserir conquistas de alunos"
ON public.conquistas_alunos
FOR INSERT
WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

CREATE POLICY "Admin pode deletar conquistas de alunos"
ON public.conquistas_alunos
FOR DELETE
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- Popular tabela de conquistas mestre com dados iniciais
INSERT INTO public.conquistas_mestre (slug, nome, descricao, icone, ordem_exibicao) VALUES
('primeira_aula', 'Primeira Aula', 'Complete sua primeira aula', 'Star', 1),
('assiduidade', 'Assiduidade', 'Compareça a 5 aulas consecutivas', 'Trophy', 2),
('dedicado', 'Dedicado', 'Complete 10 tarefas obrigatórias', 'Target', 3),
('progresso_rapido', 'Progresso Rápido', 'Atinja 50% de progresso geral', 'Zap', 4),
('estudante_modelo', 'Estudante Modelo', 'Complete todas as tarefas de um mês', 'Award', 5),
('persistente', 'Persistente', 'Estude por 3 meses consecutivos', 'Heart', 6),
('mestre_b1', 'Mestre B1', 'Complete todos os tópicos do nível B1', 'Trophy', 7),
('comunicador', 'Comunicador', 'Complete todas as atividades de Speaking', 'Star', 8),
('escritor', 'Escritor', 'Complete todas as atividades de Writing', 'Target', 9),
('leitor_avido', 'Leitor Ávido', 'Complete todas as atividades de Reading', 'Award', 10),
('ouvinte_atento', 'Ouvinte Atento', 'Complete todas as atividades de Listening', 'Zap', 11),
('expert_gramatica', 'Expert em Gramática', 'Complete todos os tópicos de Grammar', 'Trophy', 12),
('vocabulario_rico', 'Vocabulário Rico', 'Complete todos os tópicos de Vocabulary', 'Star', 13);