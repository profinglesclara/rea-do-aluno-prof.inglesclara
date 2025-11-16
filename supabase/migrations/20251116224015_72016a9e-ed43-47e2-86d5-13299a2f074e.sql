-- Criar tabela topicos_padrao como catálogo de tópicos modelo
CREATE TABLE public.topicos_padrao (
  modelo_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nivel_cefr nivel_cefr NOT NULL,
  categoria TEXT NOT NULL,
  descricao_topico TEXT NOT NULL,
  ordem INTEGER
);

-- Habilitar Row Level Security
ALTER TABLE public.topicos_padrao ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: todos os usuários autenticados podem visualizar
CREATE POLICY "topicos_padrao_select_policy" 
ON public.topicos_padrao 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy para INSERT: apenas Admin pode inserir
CREATE POLICY "topicos_padrao_insert_policy" 
ON public.topicos_padrao 
FOR INSERT 
WITH CHECK (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- Policy para UPDATE: apenas Admin pode atualizar
CREATE POLICY "topicos_padrao_update_policy" 
ON public.topicos_padrao 
FOR UPDATE 
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- Policy para DELETE: apenas Admin pode deletar
CREATE POLICY "topicos_padrao_delete_policy" 
ON public.topicos_padrao 
FOR DELETE 
USING (get_user_type(auth.uid()) = 'Admin'::tipo_usuario);

-- Criar índices para melhor performance
CREATE INDEX idx_topicos_padrao_nivel ON public.topicos_padrao(nivel_cefr);
CREATE INDEX idx_topicos_padrao_categoria ON public.topicos_padrao(categoria);
CREATE INDEX idx_topicos_padrao_ordem ON public.topicos_padrao(ordem);