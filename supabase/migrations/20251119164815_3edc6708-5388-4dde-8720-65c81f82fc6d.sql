-- Ajustar VIEW dashboard_resumo_alunos para incluir usuários do tipo 'Adulto'
CREATE OR REPLACE VIEW public.dashboard_resumo_alunos AS
SELECT 
  -- Dados básicos do aluno
  u.user_id AS aluno_id,
  u.nome_completo AS nome_aluno,
  u.nome_de_usuario,
  u.nivel_cefr,
  u.modalidade,
  u.status_aluno,
  u.data_inicio_aulas,
  u.frequencia_mensal,
  u.progresso_geral,
  
  -- Resumo de aulas (da VIEW resumo_aulas_por_aluno)
  COALESCE(ra.total_aulas, 0) AS total_aulas,
  COALESCE(ra.total_concluidas, 0) AS total_concluidas,
  COALESCE(ra.total_agendadas, 0) AS total_agendadas,
  COALESCE(ra.total_canceladas, 0) AS total_canceladas,
  COALESCE(ra.total_remarcadas, 0) AS total_remarcadas,
  ra.proxima_aula_data,
  
  -- Último relatório mensal
  ur.mes_referencia AS ultimo_mes_referencia,
  ur.data_geracao AS ultimo_relatorio_data,
  ur.porcentagem_concluida AS ultimo_relatorio_concluida,
  ur.porcentagem_em_desenvolvimento AS ultimo_relatorio_em_desenvolvimento,
  
  -- Total de conquistas
  COALESCE(
    (SELECT COUNT(*) FROM public.conquistas c WHERE c.aluno = u.user_id),
    0
  ) AS total_conquistas,
  
  -- Atividades sugeridas pendentes (não concluídas)
  COALESCE(
    (SELECT COUNT(*) 
     FROM public.atividades_sugeridas ats 
     WHERE ats.aluno = u.user_id AND ats.status != 'Concluída'::status_sugestao),
    0
  ) AS atividades_sugeridas_pendentes,
  
  -- Atividades tarefas pendentes (disponíveis)
  COALESCE(
    (SELECT COUNT(*) 
     FROM public.atividades_tarefas att 
     WHERE att.aluno = u.user_id AND att.status = 'Disponível'::status_atividade),
    0
  ) AS atividades_tarefas_pendentes

FROM public.usuarios u

-- LEFT JOIN com a VIEW de resumo de aulas
LEFT JOIN public.resumo_aulas_por_aluno ra 
  ON ra.aluno_id = u.user_id

-- LEFT JOIN LATERAL para buscar o último relatório mensal de cada aluno
LEFT JOIN LATERAL (
  SELECT 
    mes_referencia,
    data_geracao,
    porcentagem_concluida,
    porcentagem_em_desenvolvimento
  FROM public.relatorios_mensais rm
  WHERE rm.aluno = u.user_id
  ORDER BY rm.data_geracao DESC
  LIMIT 1
) ur ON true

-- Filtrar alunos e adultos
WHERE u.tipo_usuario IN ('Aluno'::tipo_usuario, 'Adulto'::tipo_usuario)

ORDER BY u.nome_completo;