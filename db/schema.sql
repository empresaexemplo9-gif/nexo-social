-- =============================================================================
-- nexo-social — Esquema multi-tenant (Supabase / PostgreSQL)
-- =============================================================================
-- Cada conta (pessoal ou organização) é um TENANT isolado. A conta
-- administradora da plataforma (super admin) é identificada pelo e-mail
-- thiagohccarvalho00@gmail.com e tem acesso global.
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
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
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
AS $$
DECLARE
  v_tenant_id UUID;
  v_slug TEXT;
BEGIN
  v_slug := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'tenant_slug', ''), 'tenant-' || substr(NEW.id::text, 1, 8));

  INSERT INTO tenants (name, slug, account_type, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'tenant_name', NEW.email),
    v_slug,
    COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'pessoal'),
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
  );

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
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (is_platform_admin() OR id = current_tenant_id());
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (is_platform_admin() OR owner_id = auth.uid());

-- Profiles: cada um vê/edita o próprio; admin vê todos.
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (is_platform_admin() OR id = auth.uid() OR tenant_id = current_tenant_id());
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (is_platform_admin() OR id = auth.uid());

-- Preferências: cada usuário gerencia as suas.
CREATE POLICY prefs_all ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Conteúdos, eventos e bom_dia: leitura pública; escrita do dono do tenant ou admin.
CREATE POLICY contents_read ON contents FOR SELECT USING (TRUE);
CREATE POLICY contents_write ON contents FOR ALL
  USING (is_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

CREATE POLICY events_read ON events FOR SELECT USING (TRUE);
CREATE POLICY events_write ON events FOR ALL
  USING (is_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

CREATE POLICY bomdia_read ON bom_dia FOR SELECT USING (TRUE);
CREATE POLICY bomdia_write ON bom_dia FOR ALL
  USING (is_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- Newsletter: qualquer um se inscreve; somente admin lê a lista.
CREATE POLICY subscribers_insert ON subscribers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY subscribers_select ON subscribers FOR SELECT USING (is_platform_admin());
