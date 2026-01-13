-- Adicionar política de DELETE para topicos_progresso (admin only)
CREATE POLICY "topicos_delete_policy" ON public.topicos_progresso
FOR DELETE
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- Popular topicos_progresso para alunos existentes que ainda não têm tópicos
-- baseado no nivel_cefr do aluno e nos topicos_padrao disponíveis
INSERT INTO public.topicos_progresso (aluno, nivel_cefr, categoria, descricao_topico, status)
SELECT 
    u.user_id,
    tp.nivel_cefr,
    tp.categoria::categoria_topico,
    tp.descricao_topico,
    'A Introduzir'::status_topico
FROM public.usuarios u
CROSS JOIN public.topicos_padrao tp
WHERE u.tipo_usuario = 'Aluno'
  AND u.nivel_cefr IS NOT NULL
  AND tp.nivel_cefr = u.nivel_cefr
  AND NOT EXISTS (
    SELECT 1 FROM public.topicos_progresso tprog 
    WHERE tprog.aluno = u.user_id
  )
ON CONFLICT DO NOTHING;