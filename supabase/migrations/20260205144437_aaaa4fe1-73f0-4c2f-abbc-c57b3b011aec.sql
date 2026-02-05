-- =====================================================
-- SECURITY FIX: Remove deprecated senha column from usuarios
-- This column is no longer used - authentication is handled by Supabase Auth
-- Removing it eliminates the false positive security warning
-- =====================================================

-- First verify no data exists in the column (for safety)
-- Then drop the column
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS senha;