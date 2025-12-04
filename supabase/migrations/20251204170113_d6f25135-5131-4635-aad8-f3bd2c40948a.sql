-- Desabilitar o trigger que está causando erro de tipo na criação de usuários
-- O trigger tenta copiar categoria TEXT para um campo ENUM, causando falha
DROP TRIGGER IF EXISTS trg_popular_topicos_iniciais ON public.usuarios;

-- Nota: A função popular_topicos_iniciais será mantida para referência futura
-- mas o trigger não será mais executado automaticamente na criação de usuários