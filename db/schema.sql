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

-- =============================================================================
-- AGENDA SOCIAL — compromissos, convites, contatos, recados e notificações
-- =============================================================================

-- Compromissos criados pelo usuário (podem ou não referenciar um evento).
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  city TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS appointments_owner_idx ON appointments (owner_id, starts_at);

-- Participantes: cada convidado apenas CONFIRMA ou DESMARCA.
CREATE TABLE IF NOT EXISTS appointment_participants (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'recusado')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (appointment_id, user_id)
);
CREATE INDEX IF NOT EXISTS participants_user_idx ON appointment_participants (user_id);

-- Contatos ("adicionar usuários à minha agenda").
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, contact_id),
  CHECK (user_id <> contact_id)
);

-- Caixa de recados.
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_to_idx ON messages (to_user, created_at DESC);

-- Notificações.
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

-- --- Helpers SECURITY DEFINER (evitam recursão entre as políticas) ----------
CREATE OR REPLACE FUNCTION is_appointment_owner(p_appointment UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM appointments WHERE id = p_appointment AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_appointment_participant(p_appointment UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM appointment_participants
    WHERE appointment_id = p_appointment AND user_id = auth.uid()
  );
$$;

-- Busca um usuário pelo e-mail para convidar, expondo apenas o mínimo.
CREATE OR REPLACE FUNCTION find_profile_by_email(p_email TEXT)
RETURNS TABLE (id UUID, full_name TEXT, email TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email
  FROM profiles p
  WHERE lower(p.email) = lower(trim(p_email))
  LIMIT 1;
$$;

-- --- RLS --------------------------------------------------------------------
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_select ON appointments;
CREATE POLICY appointments_select ON appointments FOR SELECT
  USING (owner_id = auth.uid() OR is_appointment_participant(id));
DROP POLICY IF EXISTS appointments_insert ON appointments;
CREATE POLICY appointments_insert ON appointments FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS appointments_update ON appointments;
CREATE POLICY appointments_update ON appointments FOR UPDATE USING (owner_id = auth.uid());
DROP POLICY IF EXISTS appointments_delete ON appointments;
CREATE POLICY appointments_delete ON appointments FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS participants_select ON appointment_participants;
CREATE POLICY participants_select ON appointment_participants FOR SELECT
  USING (user_id = auth.uid() OR is_appointment_owner(appointment_id) OR is_appointment_participant(appointment_id));
DROP POLICY IF EXISTS participants_insert ON appointment_participants;
CREATE POLICY participants_insert ON appointment_participants FOR INSERT
  WITH CHECK (is_appointment_owner(appointment_id));
-- Cada convidado responde apenas a própria participação (confirmar/desmarcar).
DROP POLICY IF EXISTS participants_update ON appointment_participants;
CREATE POLICY participants_update ON appointment_participants FOR UPDATE
  USING (user_id = auth.uid() OR is_appointment_owner(appointment_id));
DROP POLICY IF EXISTS participants_delete ON appointment_participants;
CREATE POLICY participants_delete ON appointment_participants FOR DELETE
  USING (user_id = auth.uid() OR is_appointment_owner(appointment_id));

DROP POLICY IF EXISTS connections_select ON connections;
CREATE POLICY connections_select ON connections FOR SELECT
  USING (user_id = auth.uid() OR contact_id = auth.uid());
DROP POLICY IF EXISTS connections_insert ON connections;
CREATE POLICY connections_insert ON connections FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS connections_update ON connections;
CREATE POLICY connections_update ON connections FOR UPDATE
  USING (user_id = auth.uid() OR contact_id = auth.uid());
DROP POLICY IF EXISTS connections_delete ON connections;
CREATE POLICY connections_delete ON connections FOR DELETE
  USING (user_id = auth.uid() OR contact_id = auth.uid());

DROP POLICY IF EXISTS messages_select ON messages;
CREATE POLICY messages_select ON messages FOR SELECT
  USING (from_user = auth.uid() OR to_user = auth.uid());
DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (from_user = auth.uid());
DROP POLICY IF EXISTS messages_update ON messages;
CREATE POLICY messages_update ON messages FOR UPDATE USING (to_user = auth.uid());

DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Preferências detalhadas (questionário ampliado: música, cinema, livros, hobbies)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS subtopics TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS music_genres TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS film_genres TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS book_genres TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS hobbies TEXT[] DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- Livros que li esse ano + audiolivros
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reading_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  -- 'livro' ou 'audiolivro'
  kind TEXT NOT NULL DEFAULT 'livro',
  -- 'quero-ler' | 'lendo' | 'lido'
  status TEXT NOT NULL DEFAULT 'lido',
  source TEXT,
  external_id TEXT,
  url TEXT,
  cover_url TEXT,
  rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  notes TEXT,
  started_at DATE,
  finished_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrações para bases que já tinham a tabela.
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'livro';
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'lido';
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS rating SMALLINT;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS started_at DATE;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS finished_at DATE;
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS reading_log_user_idx ON reading_log (user_id, finished_at DESC);
-- Evita duplicar a mesma obra vinda da mesma fonte.
CREATE UNIQUE INDEX IF NOT EXISTS reading_log_unique_source
  ON reading_log (user_id, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

ALTER TABLE reading_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reading_log_select ON reading_log;
CREATE POLICY reading_log_select ON reading_log FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS reading_log_insert ON reading_log;
CREATE POLICY reading_log_insert ON reading_log FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS reading_log_update ON reading_log;
CREATE POLICY reading_log_update ON reading_log FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS reading_log_delete ON reading_log;
CREATE POLICY reading_log_delete ON reading_log FOR DELETE USING (user_id = auth.uid());

-- Meta anual de leitura (ex.: 12 livros em 2026).
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS reading_goal SMALLINT DEFAULT 12;

-- =============================================================================
-- MULTI-TENANT — correções
--
-- 1. Um usuário podia trocar o próprio tenant_id e passar a escrever no tenant
--    de outra pessoa (contents/events/bom_dia liberam por tenant_id).
-- 2. Contas ficavam órfãs: handle_new_user() engole exceções de propósito (para
--    não derrubar o cadastro), e não havia como criar o perfil depois — não
--    existia policy de INSERT em profiles/tenants.
-- 3. Como cada conta é o próprio tenant, ninguém enxergava o perfil de
--    ninguém: contatos e participantes de compromisso vinham sem nome e sem
--    e-mail, quebrando a agenda social entre contas diferentes.
-- =============================================================================

-- E-mail do super admin em um único lugar do schema.
CREATE OR REPLACE FUNCTION platform_admin_email()
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT 'thiagohccarvalho00@gmail.com';
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', '')) = platform_admin_email();
$$;

-- --- 1) Colunas sensíveis do perfil ------------------------------------------
-- tenant_id, role, is_platform_admin e email deixam de ser editáveis pelo
-- próprio usuário. O super admin e o service role (auth.uid() nulo) seguem
-- podendo ajustar.
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Liberado para o service role (sem auth.uid()), para o super admin e para o
  -- provisionamento — ensure_my_profile precisa gravar tenant_id e e-mail, e
  -- sem esta saída ela seria bloqueada justamente no caso que veio consertar.
  -- A flag é local à transação e só ensure_my_profile a define; o cliente não
  -- tem como ligá-la pelo PostgREST.
  IF auth.uid() IS NULL
     OR is_platform_admin()
     OR COALESCE(current_setting('nexo.provisioning', TRUE), '') = 'on' THEN
    RETURN NEW;
  END IF;
  NEW.id := OLD.id;
  NEW.tenant_id := OLD.tenant_id;
  NEW.role := OLD.role;
  NEW.is_platform_admin := OLD.is_platform_admin;
  NEW.email := OLD.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON profiles;
CREATE TRIGGER profiles_protect_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- Nenhum perfil deve carregar a marca de admin além da conta oficial.
UPDATE profiles SET is_platform_admin = (lower(email) = platform_admin_email())
WHERE is_platform_admin IS DISTINCT FROM (lower(email) = platform_admin_email());

-- --- 2) Auto-provisionamento --------------------------------------------------
CREATE OR REPLACE FUNCTION slugify(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(
      trim(BOTH '-' FROM regexp_replace(lower(COALESCE(p_text, '')), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'tenant'
  );
$$;

-- Owner do tenant, sem passar pelo RLS de tenants (evita recursão de política).
CREATE OR REPLACE FUNCTION owns_tenant(p_tenant UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant AND owner_id = auth.uid());
$$;

-- Garante tenant + perfil para quem está logado. Idempotente: pode ser chamada
-- em todo login. É o conserto para contas criadas antes desta migração e para
-- qualquer falha silenciosa do gatilho de cadastro.
CREATE OR REPLACE FUNCTION ensure_my_profile(
  p_full_name TEXT DEFAULT NULL,
  p_account_type TEXT DEFAULT 'pessoal',
  p_tenant_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_email  TEXT := auth.jwt() ->> 'email';
  v_tenant UUID;
  v_slug   TEXT;
  v_name   TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ensure_my_profile exige uma sessão autenticada';
  END IF;

  -- Destrava protect_profile_columns apenas nesta transação.
  PERFORM set_config('nexo.provisioning', 'on', TRUE);

  SELECT tenant_id INTO v_tenant FROM profiles WHERE id = v_uid;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  -- Reaproveita um tenant que já seja dele antes de criar outro.
  SELECT id INTO v_tenant FROM tenants WHERE owner_id = v_uid ORDER BY created_at LIMIT 1;

  IF v_tenant IS NULL THEN
    v_name := COALESCE(NULLIF(trim(p_tenant_name), ''), NULLIF(trim(p_full_name), ''), v_email);
    v_slug := slugify(v_name);
    IF EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) THEN
      v_slug := v_slug || '-' || substr(v_uid::text, 1, 8);
    END IF;

    INSERT INTO tenants (name, slug, account_type, owner_id)
    VALUES (v_name, v_slug, COALESCE(NULLIF(p_account_type, ''), 'pessoal'), v_uid)
    RETURNING id INTO v_tenant;
  END IF;

  INSERT INTO profiles (id, tenant_id, full_name, email, role, is_platform_admin)
  VALUES (v_uid, v_tenant, NULLIF(trim(p_full_name), ''), v_email, 'owner',
          lower(COALESCE(v_email, '')) = platform_admin_email())
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = COALESCE(profiles.tenant_id, EXCLUDED.tenant_id),
        email     = COALESCE(profiles.email, EXCLUDED.email),
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);

  RETURN v_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_my_profile(TEXT, TEXT, TEXT) TO authenticated;

-- Políticas de INSERT: o usuário cria o próprio tenant e o próprio perfil,
-- e o perfil só pode apontar para um tenant do qual ele é dono.
DROP POLICY IF EXISTS tenants_insert ON tenants;
CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid() AND (tenant_id IS NULL OR owns_tenant(tenant_id)));

-- --- 3) Enxergar quem está na sua agenda -------------------------------------
-- Cada conta é o próprio tenant, então a regra por tenant nunca casava entre
-- pessoas diferentes. SECURITY DEFINER para não reentrar no RLS de profiles.
CREATE OR REPLACE FUNCTION shares_agenda_with(p_user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM connections c
    WHERE (c.user_id = auth.uid() AND c.contact_id = p_user)
       OR (c.contact_id = auth.uid() AND c.user_id = p_user)
  )
  OR EXISTS (
    SELECT 1
    FROM appointment_participants eu
    JOIN appointment_participants outro ON outro.appointment_id = eu.appointment_id
    WHERE eu.user_id = auth.uid() AND outro.user_id = p_user
  )
  OR EXISTS (
    SELECT 1 FROM appointments a
    JOIN appointment_participants p ON p.appointment_id = a.id
    WHERE (a.owner_id = auth.uid() AND p.user_id = p_user)
       OR (a.owner_id = p_user      AND p.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM messages m
    WHERE (m.from_user = auth.uid() AND m.to_user = p_user)
       OR (m.to_user   = auth.uid() AND m.from_user = p_user)
  );
$$;

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT
  -- `id = auth.uid()` primeiro: resolve o caso comum sem tocar em função alguma.
  USING (
    id = auth.uid()
    OR is_platform_admin()
    OR tenant_id = current_tenant_id()
    OR shares_agenda_with(id)
  );
