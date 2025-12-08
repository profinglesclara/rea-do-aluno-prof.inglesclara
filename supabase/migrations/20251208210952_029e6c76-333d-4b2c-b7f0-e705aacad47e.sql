-- Adicionar campo de comentário na tabela entregas_tarefas
ALTER TABLE public.entregas_tarefas 
ADD COLUMN comentario text;