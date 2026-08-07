-- ############################################################################
-- ATENÇÃO: NÃO RODE ESTE ARQUIVO NO SUPABASE.
--
-- Ele reproduz o mínimo do ambiente Supabase (schema auth, auth.uid(),
-- auth.jwt(), roles) para que db/schema.sql possa ser testado num Postgres
-- LOCAL e descartável. Executado num projeto real, ele SUBSTITUIRIA as funções
-- de autenticação do Supabase e quebraria o login de todos os usuários.
--
-- Para configurar seu projeto, use apenas db/schema.sql.
-- ############################################################################

-- Trava: aborta se detectar que o banco é um Supabase de verdade.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_admin'))
     OR EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    RAISE EXCEPTION
      'Este arquivo é só para um Postgres local de teste. Rodá-lo aqui substituiria auth.uid()/auth.jwt() e quebraria o login do projeto. Para configurar o banco, use db/schema.sql.';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Igual ao Supabase: lê as claims do JWT de um GUC da sessão.
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', TRUE), ''), '{}')::jsonb;
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid;
$$;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
