-- Atualizar enum categoria_topico para incluir as 7 novas categorias
-- Primeiro, adicionar os novos valores ao enum

ALTER TYPE categoria_topico ADD VALUE IF NOT EXISTS 'Phonetics';
ALTER TYPE categoria_topico ADD VALUE IF NOT EXISTS 'Expressions';

-- Remover valores antigos que não são mais usados (Reading, Speaking, Writing)
-- Nota: PostgreSQL não permite remover valores de enum diretamente,
-- então vamos manter os valores antigos por compatibilidade