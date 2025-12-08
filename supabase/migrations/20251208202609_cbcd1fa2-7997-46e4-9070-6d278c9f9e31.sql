-- Recriar a view dashboard_resumo_alunos para contar tarefas da tabela correta
DROP VIEW IF EXISTS public.dashboard_resumo_alunos;

CREATE VIEW public.dashboard_resumo_alunos AS
SELECT
  u.user_id AS aluno_id,
  u.nome_completo AS nome_aluno,
  u.nome_de_usuario,
  u.nivel_cefr,
  u.modalidade,
  u.data_inicio_aulas,
  u.frequencia_mensal,
  u.progresso_geral,
  u.status_aluno,
  COALESCE(aulas_resumo.total_aulas, 0) AS total_aulas,
  COALESCE(aulas_resumo.total_concluidas, 0) AS total_concluidas,
  COALESCE(aulas_resumo.total_agendadas, 0) AS total_agendadas,
  COALESCE(aulas_resumo.total_canceladas, 0) AS total_canceladas,
  COALESCE(aulas_resumo.total_remarcadas, 0) AS total_remarcadas,
  aulas_resumo.proxima_aula_data,
  rel.ultimo_mes_referencia,
  rel.ultimo_relatorio_data,
  rel.ultimo_relatorio_concluida,
  rel.ultimo_relatorio_em_desenvolvimento,
  COALESCE(conquistas_count.total_conquistas, 0) AS total_conquistas,
  COALESCE(sugeridas_count.atividades_sugeridas_pendentes, 0) AS atividades_sugeridas_pendentes,
  COALESCE(tarefas_count.atividades_tarefas_pendentes, 0) AS atividades_tarefas_pendentes
FROM public.usuarios u
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_aulas,
    COUNT(*) FILTER (WHERE status = 'Realizada') AS total_concluidas,
    COUNT(*) FILTER (WHERE status = 'Agendada') AS total_agendadas,
    COUNT(*) FILTER (WHERE status = 'Cancelada') AS total_canceladas,
    COUNT(*) FILTER (WHERE status = 'Remarcada') AS total_remarcadas,
    MIN(data_aula) FILTER (WHERE status = 'Agendada' AND data_aula > NOW()) AS proxima_aula_data
  FROM public.aulas
  WHERE aluno = u.user_id
) aulas_resumo ON true
LEFT JOIN LATERAL (
  SELECT
    mes_referencia AS ultimo_mes_referencia,
    data_geracao AS ultimo_relatorio_data,
    porcentagem_concluida AS ultimo_relatorio_concluida,
    porcentagem_em_desenvolvimento AS ultimo_relatorio_em_desenvolvimento
  FROM public.relatorios_mensais
  WHERE aluno = u.user_id
  ORDER BY data_geracao DESC
  LIMIT 1
) rel ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_conquistas
  FROM public.conquistas_alunos
  WHERE aluno_id = u.user_id
) conquistas_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS atividades_sugeridas_pendentes
  FROM public.atividades_sugeridas
  WHERE aluno = u.user_id AND status != 'Concluída'
) sugeridas_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS atividades_tarefas_pendentes
  FROM public.tarefas
  WHERE aluno_id = u.user_id AND status = 'Pendente'
) tarefas_count ON true
WHERE u.tipo_usuario IN ('Aluno', 'Adulto');