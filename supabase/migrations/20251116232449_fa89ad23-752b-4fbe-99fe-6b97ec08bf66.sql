-- Criar VIEW para resumo de aulas por aluno
CREATE OR REPLACE VIEW public.resumo_aulas_por_aluno AS
SELECT 
  u.user_id AS aluno_id,
  u.nome_completo AS nome_aluno,
  COUNT(a.aula_id) AS total_aulas,
  COUNT(a.aula_id) FILTER (WHERE a.status = 'Realizada') AS total_concluidas,
  COUNT(a.aula_id) FILTER (WHERE a.status = 'Agendada') AS total_agendadas,
  COUNT(a.aula_id) FILTER (WHERE a.status = 'Cancelada') AS total_canceladas,
  COUNT(a.aula_id) FILTER (WHERE a.status = 'Remarcada') AS total_remarcadas,
  MIN(a.data_aula) FILTER (WHERE a.data_aula > NOW() AND a.status IN ('Agendada', 'Remarcada')) AS proxima_aula_data
FROM public.usuarios u
LEFT JOIN public.aulas a ON u.user_id = a.aluno
WHERE u.tipo_usuario = 'Aluno'::tipo_usuario
GROUP BY u.user_id, u.nome_completo;