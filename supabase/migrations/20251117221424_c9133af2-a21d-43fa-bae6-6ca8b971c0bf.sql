-- Migration: Adicionar novos valores ao enum tipo_conquista
-- Esta migration apenas adiciona os valores necessários ao enum existente
-- Não cria nem altera tabelas

-- Adicionar 'Comportamento' ao enum tipo_conquista
ALTER TYPE tipo_conquista ADD VALUE IF NOT EXISTS 'Comportamento';

-- Adicionar 'Engajamento' ao enum tipo_conquista
ALTER TYPE tipo_conquista ADD VALUE IF NOT EXISTS 'Engajamento';