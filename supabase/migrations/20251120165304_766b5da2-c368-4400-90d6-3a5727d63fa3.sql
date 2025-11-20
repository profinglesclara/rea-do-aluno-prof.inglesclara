-- ============================================================
-- REFATORAÇÃO COMPLETA DO SISTEMA DE USUÁRIOS (v2)
-- ============================================================

-- 1. Atualizar registros existentes de "Adulto" para "Aluno"
UPDATE public.usuarios 
SET tipo_usuario = 'Aluno'::tipo_usuario 
WHERE tipo_usuario = 'Adulto'::tipo_usuario;

-- 2. Adicionar novos campos à tabela usuarios
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
ADD COLUMN IF NOT EXISTS notas_internas TEXT,
ADD COLUMN IF NOT EXISTS show_relatorios BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_pagamentos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_contratos BOOLEAN DEFAULT false;

-- 3. Garantir que nome_de_usuario seja único
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_nome_de_usuario_unique 
ON public.usuarios(nome_de_usuario);

-- 4. Criar tabela de vínculo responsáveis-alunos (sem constraints problemáticas)
CREATE TABLE IF NOT EXISTS public.responsaveis_alunos (
  responsavel_id UUID NOT NULL REFERENCES public.usuarios(user_id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.usuarios(user_id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (responsavel_id, aluno_id)
);

-- 5. Criar função de validação para responsaveis_alunos
CREATE OR REPLACE FUNCTION public.validar_vinculo_responsavel_aluno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo_responsavel tipo_usuario;
  v_tipo_aluno tipo_usuario;
BEGIN
  -- Verificar tipo do responsável
  SELECT tipo_usuario INTO v_tipo_responsavel
  FROM public.usuarios
  WHERE user_id = NEW.responsavel_id;
  
  IF v_tipo_responsavel != 'Responsável'::tipo_usuario THEN
    RAISE EXCEPTION 'O responsavel_id deve ser um usuário do tipo Responsável';
  END IF;
  
  -- Verificar tipo do aluno
  SELECT tipo_usuario INTO v_tipo_aluno
  FROM public.usuarios
  WHERE user_id = NEW.aluno_id;
  
  IF v_tipo_aluno != 'Aluno'::tipo_usuario THEN
    RAISE EXCEPTION 'O aluno_id deve ser um usuário do tipo Aluno';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Trigger para validar vínculos
DROP TRIGGER IF EXISTS trigger_validar_vinculo ON public.responsaveis_alunos;
CREATE TRIGGER trigger_validar_vinculo
BEFORE INSERT OR UPDATE ON public.responsaveis_alunos
FOR EACH ROW
EXECUTE FUNCTION public.validar_vinculo_responsavel_aluno();

-- 7. Habilitar RLS na tabela responsaveis_alunos
ALTER TABLE public.responsaveis_alunos ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS para responsaveis_alunos
DROP POLICY IF EXISTS "Admin pode ver todos os vínculos" ON public.responsaveis_alunos;
CREATE POLICY "Admin pode ver todos os vínculos"
ON public.responsaveis_alunos
FOR SELECT
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

DROP POLICY IF EXISTS "Responsável pode ver seus próprios vínculos" ON public.responsaveis_alunos;
CREATE POLICY "Responsável pode ver seus próprios vínculos"
ON public.responsaveis_alunos
FOR SELECT
USING (responsavel_id = auth.uid());

DROP POLICY IF EXISTS "Admin pode inserir vínculos" ON public.responsaveis_alunos;
CREATE POLICY "Admin pode inserir vínculos"
ON public.responsaveis_alunos
FOR INSERT
WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

DROP POLICY IF EXISTS "Admin pode deletar vínculos" ON public.responsaveis_alunos;
CREATE POLICY "Admin pode deletar vínculos"
ON public.responsaveis_alunos
FOR DELETE
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- 9. Criar função para verificar se aluno tem responsável
CREATE OR REPLACE FUNCTION public.aluno_tem_responsavel(p_aluno_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responsaveis_alunos 
    WHERE aluno_id = p_aluno_id
  );
$$;

-- 10. Criar função para configurar flags padrão de cards
CREATE OR REPLACE FUNCTION public.configurar_flags_cards_aluno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só executa para alunos
  IF NEW.tipo_usuario = 'Aluno'::tipo_usuario THEN
    -- Se tiver responsável, defaults false
    IF aluno_tem_responsavel(NEW.user_id) THEN
      NEW.show_relatorios := COALESCE(NEW.show_relatorios, false);
      NEW.show_pagamentos := COALESCE(NEW.show_pagamentos, false);
      NEW.show_contratos := COALESCE(NEW.show_contratos, false);
    ELSE
      -- Se não tiver responsável (aluno adulto), defaults true
      NEW.show_relatorios := COALESCE(NEW.show_relatorios, true);
      NEW.show_pagamentos := COALESCE(NEW.show_pagamentos, true);
      NEW.show_contratos := COALESCE(NEW.show_contratos, true);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 11. Trigger para configurar flags automaticamente
DROP TRIGGER IF EXISTS trigger_configurar_flags_cards ON public.usuarios;
CREATE TRIGGER trigger_configurar_flags_cards
BEFORE INSERT OR UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.configurar_flags_cards_aluno();

-- 12. Migrar vínculos existentes (responsavel_por -> responsaveis_alunos)
INSERT INTO public.responsaveis_alunos (responsavel_id, aluno_id)
SELECT DISTINCT responsavel_por, user_id
FROM public.usuarios
WHERE tipo_usuario = 'Aluno'::tipo_usuario
  AND responsavel_por IS NOT NULL
ON CONFLICT DO NOTHING;

-- 13. Configurar flags para alunos existentes baseado em vínculos
UPDATE public.usuarios u
SET 
  show_relatorios = CASE 
    WHEN EXISTS (SELECT 1 FROM public.responsaveis_alunos WHERE aluno_id = u.user_id) 
    THEN false ELSE true 
  END,
  show_pagamentos = CASE 
    WHEN EXISTS (SELECT 1 FROM public.responsaveis_alunos WHERE aluno_id = u.user_id) 
    THEN false ELSE true 
  END,
  show_contratos = CASE 
    WHEN EXISTS (SELECT 1 FROM public.responsaveis_alunos WHERE aluno_id = u.user_id) 
    THEN false ELSE true 
  END
WHERE tipo_usuario = 'Aluno'::tipo_usuario;