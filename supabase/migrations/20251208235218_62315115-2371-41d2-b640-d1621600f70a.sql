-- Add feedback_professor column to tarefas table for teacher observations when correcting
ALTER TABLE public.tarefas 
ADD COLUMN feedback_professor text;