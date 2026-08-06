-- =============================================================================
-- nexo-social — Esquema multi-tenant (Supabase / PostgreSQL)
-- =============================================================================
-- Cada conta (pessoal ou organização) é um TENANT isolado. A conta
-- administradora da plataforma (super admin) é identificada pelo e-mail
-- thiagohccarvalho00@gmail.com e tem acesso global.
--
-- Este script é IDEMPOTENTE: pode ser executado quantas vezes for necessário,
-- inclusive sobre um banco que já tinha uma versão anterior das tabelas
-- (contents/events/bom_dia/subscribers criadas sem `tenant_id`). As migrações
-- com ALTER TABLE ... ADD COLUMN IF NOT EXISTS garantem que as colunas novas
-- existam antes das políticas de RLS que as utilizam.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tenants (organizações / contas pessoais)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'pessoal' CHECK (account_type IN ('pessoal', 'organizacao')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Perfis (1:1 com auth.users, vinculados a um tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Preferências do usuário (resultado do questionário de interesses)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  interests TEXT[] NOT NULL DEFAULT '{}',
  city TEXT,
  radius_km INTEGER NOT NULL DEFAULT 50,
  frequency TEXT NOT NULL DEFAULT 'semanal' CHECK (frequency IN ('diaria', 'semanal', 'mensal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Conteúdos editoriais (Hub de Entretenimento)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,             -- slug do tema: tecnologia, musica, moda, cultura, esporte
  subtopic TEXT,
  snippet TEXT NOT NULL,
  body TEXT,
  read_time TEXT DEFAULT '5 min',
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Eventos (com geolocalização para ordenação por proximidade)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,             -- slug do tema
  event_date TEXT NOT NULL,
  city TEXT,
  location TEXT NOT NULL,             -- nome do local / venue
  lat DOUBLE PRECISION,               -- latitude para cálculo de distância
  lng DOUBLE PRECISION,               -- longitude para cálculo de distância
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT DEFAULT 'Gratuito',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Curadoria "Bom Dia"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bom_dia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  soundtrack_title TEXT NOT NULL,
  soundtrack_artist TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  recipe_description TEXT NOT NULL,
  quick_tip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Inscritos na newsletter
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  frequency TEXT DEFAULT 'semanal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email)
);

-- =============================================================================
-- Migrações idempotentes
-- Garante que colunas novas existam em tabelas que já haviam sido criadas por
-- uma versão anterior deste esquema (é o que evita o erro 42703 tenant_id).
-- =============================================================================
ALTER TABLE contents    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE contents    ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE contents    ADD COLUMN IF NOT EXISTS body TEXT;

ALTER TABLE events      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS price TEXT DEFAULT 'Gratuito';
-- Datas reais: alimentam o algoritmo de indicação (acontecendo agora / futuro).
ALTER TABLE events      ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
-- Palavras-chave e atração principal: afinidade e links de música/vídeo.
ALTER TABLE events      ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE events      ADD COLUMN IF NOT EXISTS artist TEXT;
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events (starts_at);
-- Origem do evento: 'manual' (painel) ou o provedor externo ('ticketmaster'...).
-- O par (source, external_id) evita duplicar na reimportação.
ALTER TABLE events      ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE events      ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS events_source_external_idx
  ON events (source, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE bom_dia     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'semanal';

-- =============================================================================
-- Helpers de autorização
-- =============================================================================

-- Identifica o super admin da plataforma pelo e-mail do JWT.
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') = 'thiagohccarvalho00@gmail.com';
$$;

-- Tenant do usuário autenticado.
--
-- SECURITY DEFINER é OBRIGATÓRIO aqui: esta função lê `profiles`, e as políticas
-- de RLS de `profiles`/`tenants` chamam esta função. Sem SECURITY DEFINER, a
-- leitura interna reaplica a política, que chama a função de novo →
-- "infinite recursion detected in policy" (Postgres 42P17), cujo erro chega ao
-- cliente com corpo vazio. Como DEFINER, a função roda como dona da tabela e
-- ignora o RLS, encerrando o ciclo.
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

-- =============================================================================
-- Provisionamento automático de tenant + perfil ao criar um usuário
-- (lê os metadados enviados no signUp: full_name, account_type, tenant_name...)
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_slug TEXT;
BEGIN
  -- IMPORTANTE: este gatilho roda dentro da transação que cria o usuário em
  -- auth.users. Qualquer exceção aqui aborta o cadastro inteiro e o Supabase
  -- responde "Database error saving new user". Por isso todo o provisionamento
  -- fica dentro de um bloco com tratamento de exceção: se algo falhar, o
  -- usuário AINDA É CRIADO (o perfil pode ser provisionado depois pelo app).
  BEGIN
    -- Slug único: usa o enviado no cadastro e, em caso de colisão, sufixa com
    -- parte do id do usuário.
    v_slug := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'tenant_slug', ''), 'tenant');
    IF EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) THEN
      v_slug := v_slug || '-' || substr(NEW.id::text, 1, 8);
    END IF;

    INSERT INTO tenants (name, slug, account_type, owner_id)
    VALUES (
      COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'tenant_name', ''), NEW.email),
      v_slug,
      COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'account_type', ''), 'pessoal'),
      NEW.id
    )
    RETURNING id INTO v_tenant_id;

    INSERT INTO profiles (id, tenant_id, full_name, email, role, is_platform_admin)
    VALUES (
      NEW.id,
      v_tenant_id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.email,
      'owner',
      NEW.email = 'thiagohccarvalho00@gmail.com'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Não derruba o cadastro: apenas registra o motivo nos logs do Postgres.
    RAISE WARNING 'handle_new_user falhou para % (%): %', NEW.email, NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Tenants: membros veem o próprio tenant; admin vê tudo.
DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (is_platform_admin() OR id = current_tenant_id());
DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (is_platform_admin() OR owner_id = auth.uid());

-- Profiles: cada um vê/edita o próprio; admin vê todos.
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT
  -- `id = auth.uid()` primeiro: resolve o caso comum sem tocar em função alguma.
  USING (id = auth.uid() OR is_platform_admin() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (is_platform_admin() OR id = auth.uid());

-- Preferências: cada usuário gerencia as suas.
DROP POLICY IF EXISTS prefs_all ON user_preferences;
CREATE POLICY prefs_all ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Conteúdos, eventos e bom_dia: leitura pública; escrita do dono do tenant ou admin.
DROP POLICY IF EXISTS contents_read ON contents;
CREATE POLICY contents_read ON contents FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS contents_write ON contents;
CREATE POLICY contents_write ON contents FOR ALL
  USING (is_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS events_read ON events;
CREATE POLICY events_read ON events FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS events_write ON events;
CREATE POLICY events_write ON events FOR ALL
  USING (is_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS bomdia_read ON bom_dia;
CREATE POLICY bomdia_read ON bom_dia FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS bomdia_write ON bom_dia;
CREATE POLICY bomdia_write ON bom_dia FOR ALL
  USING (is_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- Newsletter: qualquer um se inscreve; somente admin lê a lista.
DROP POLICY IF EXISTS subscribers_insert ON subscribers;
CREATE POLICY subscribers_insert ON subscribers FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS subscribers_select ON subscribers;
CREATE POLICY subscribers_select ON subscribers FOR SELECT USING (is_platform_admin());
