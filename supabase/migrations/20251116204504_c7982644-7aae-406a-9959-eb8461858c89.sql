-- Corrigir search_path nas funções para segurança

-- Recriar função status_to_numeric com search_path
CREATE OR REPLACE FUNCTION public.status_to_numeric(status status_topico)
RETURNS numeric 
LANGUAGE plpgsql 
IMMUTABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE status
    WHEN 'A Introduzir'::status_topico THEN 0
    WHEN 'Em Desenvolvimento'::status_topico THEN 0.5
    WHEN 'Concluído'::status_topico THEN 1
    ELSE 0
  END;
END;
$$;

-- Recriar função atualizar_ultima_atualizacao com search_path
CREATE OR REPLACE FUNCTION public.atualizar_ultima_atualizacao()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.ultima_atualizacao := NOW();
  RETURN NEW;
END;
$$;