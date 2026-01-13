-- =============================================
-- MIGRAÇÃO: Atualizar Sistema de Tópicos por Nível CEFR
-- 7 Categorias Fixas + Tópicos A1 completos
-- =============================================

-- 1. Limpar tópicos padrão existentes (vamos recriar com estrutura correta)
DELETE FROM topicos_padrao;

-- 2. Limpar tópicos de progresso dos alunos (serão recriados quando admin atribuir)
DELETE FROM topicos_progresso;

-- 3. Inserir tópicos A1 com as 7 categorias fixas e ordem correta
-- Ordem das categorias: Phonetics(1), Grammar(2), Vocabulary(3), Communication(4), Expressions(5), Pronunciation(6), Listening(7)

-- Phonetics (3 tópicos)
INSERT INTO topicos_padrao (nivel_cefr, categoria, descricao_topico, ordem) VALUES
('A1', 'Phonetics', 'Basic diphthongs', 1),
('A1', 'Phonetics', 'Voiced/voiceless consonants', 2),
('A1', 'Phonetics', 'Intonation in simple questions/statements', 3);

-- Grammar (5 tópicos)
INSERT INTO topicos_padrao (nivel_cefr, categoria, descricao_topico, ordem) VALUES
('A1', 'Grammar', 'Simple Present', 1),
('A1', 'Grammar', 'Frequency adverbs', 2),
('A1', 'Grammar', 'Simple Past regular verbs', 3),
('A1', 'Grammar', 'Present Continuous', 4),
('A1', 'Grammar', 'Past Continuous', 5);

-- Vocabulary (5 tópicos)
INSERT INTO topicos_padrao (nivel_cefr, categoria, descricao_topico, ordem) VALUES
('A1', 'Vocabulary', 'Home/rooms', 1),
('A1', 'Vocabulary', 'Places', 2),
('A1', 'Vocabulary', 'Transport', 3),
('A1', 'Vocabulary', 'Weather', 4),
('A1', 'Vocabulary', 'Daily routine', 5);

-- Communication (3 tópicos)
INSERT INTO topicos_padrao (nivel_cefr, categoria, descricao_topico, ordem) VALUES
('A1', 'Communication', 'Asking/giving directions', 1),
('A1', 'Communication', 'Ordering in shops', 2),
('A1', 'Communication', 'Describing objects/people', 3);

-- Expressions (2 tópicos)
INSERT INTO topicos_padrao (nivel_cefr, categoria, descricao_topico, ordem) VALUES
('A1', 'Expressions', 'Small talk', 1),
('A1', 'Expressions', 'Agree/disagree', 2);

-- Pronunciation (2 tópicos)
INSERT INTO topicos_padrao (nivel_cefr, categoria, descricao_topico, ordem) VALUES
('A1', 'Pronunciation', 'Basic sentence melody', 1),
('A1', 'Pronunciation', 'Reduced vowels', 2);

-- Listening (2 tópicos)
INSERT INTO topicos_padrao (nivel_cefr, categoria, descricao_topico, ordem) VALUES
('A1', 'Listening', 'Understand instructions', 1),
('A1', 'Listening', 'Short dialogues', 2);