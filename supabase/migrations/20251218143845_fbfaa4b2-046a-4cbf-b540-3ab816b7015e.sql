-- Adicionar coluna para URL do enunciado PDF na tabela tarefas
ALTER TABLE public.tarefas 
ADD COLUMN url_enunciado text;