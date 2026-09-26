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
-- Índice COMUM, não parcial: a importação grava com
-- `ON CONFLICT (source, external_id)`, e o PostgreSQL só usa índice parcial ali
-- se o comando repetir a condição do WHERE — o PostgREST não repete. Com o
-- índice parcial toda importação falhava com "no unique or exclusion
-- constraint matching the ON CONFLICT specification". O efeito é o mesmo:
-- NULL não conflita com NULL, então eventos manuais (sem external_id) seguem
-- livres. Bancos que já têm o parcial trocam por este.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'events_source_external_idx' AND indexdef LIKE '%WHERE%') THEN
    DROP INDEX public.events_source_external_idx;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS events_source_external_idx ON events (source, external_id);

-- Bancos criados por uma versão ANTIGA do projeto têm outra tabela events
-- (category_id, location_id, cover_image_url, start_datetime obrigatório…).
-- O CREATE TABLE IF NOT EXISTS lá em cima não mexe nela, então as colunas que
-- o app usa nunca chegavam e todo cadastro de evento falhava — pelo painel,
-- pelo "Popular banco" e pela importação. Aqui elas entram (opcionais, para
-- não travar linhas antigas) e o start_datetime antigo deixa de ser exigido.
ALTER TABLE events      ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE events      ADD COLUMN IF NOT EXISTS image_url TEXT;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_datetime' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE events ALTER COLUMN start_datetime DROP NOT NULL;
  END IF;
END $$;

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
-- Evita duplicar a mesma obra vinda da mesma fonte. Índice COMUM pelo mesmo
-- motivo do events_source_external_idx: /api/leituras grava com
-- `ON CONFLICT (user_id, source, external_id)`, que não usa índice parcial, e
-- salvar um livro do catálogo falhava. NULL não conflita, então as obras
-- digitadas à mão (sem fonte) continuam podendo repetir título.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'reading_log_unique_source' AND indexdef LIKE '%WHERE%') THEN
    DROP INDEX public.reading_log_unique_source;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS reading_log_unique_source ON reading_log (user_id, source, external_id);

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

-- Link direto de compra do ingresso, vindo da plataforma de venda.
-- Sem ele, a importação traz o evento mas o usuário não tem para onde ir.
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_url TEXT;

-- =============================================================================
-- VENDA DE INGRESSOS — removida
--
-- A plataforma não vende ingresso: cada evento indica onde comprar, pelo
-- `events.ticket_url` acima. A bilheteria própria que existiu aqui é desligada
-- no banco, não só na tela: as funções de compra eram publicadas pelo PostgREST
-- em `/rest/v1/rpc/<função>`, e sem este DROP continuariam aceitando pedido —
-- lote gratuito emitia ingresso na hora, sem tela nenhuma.
--
-- As TABELAS (ticket_types, ticket_orders, ticket_order_items, tickets) NÃO são
-- apagadas aqui, e rodar este arquivo de novo continua sem apagar dado: elas
-- podem guardar pedidos já pagos, e apagar registro de venda não tem volta.
-- Para removê-las, exporte o que precisar e rode db/remover-bilheteria.sql.
-- =============================================================================

DROP FUNCTION IF EXISTS criar_pedido_ingresso(UUID, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS cancelar_meu_pedido(UUID);
DROP FUNCTION IF EXISTS confirmar_pedido_ingresso(UUID, TEXT);
DROP FUNCTION IF EXISTS cancelar_pedido_ingresso(UUID, TEXT);
DROP FUNCTION IF EXISTS expirar_pedidos_vencidos();
DROP FUNCTION IF EXISTS emitir_ingressos(UUID);
DROP FUNCTION IF EXISTS validar_ingresso(TEXT);

-- ============================================================================
-- Permissão de execução das funções
-- ============================================================================
-- ISTO NÃO É DETALHE: o PostgreSQL concede EXECUTE a PUBLIC em toda função
-- nova. Como o PostgREST publica `/rest/v1/rpc/<função>`, uma função
-- SECURITY DEFINER sem REVOKE fica ao alcance de qualquer pessoa logada — e
-- SECURITY DEFINER ignora RLS. Um GRANT sozinho não resolve: ele soma ao que
-- PUBLIC já tem.

-- Funções de gatilho não são para chamada direta.
REVOKE ALL ON FUNCTION handle_new_user()          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION protect_profile_columns()  FROM PUBLIC, anon, authenticated;

-- Buscar perfil por e-mail serve para convidar alguém para um compromisso.
-- Quem não está logado não tem esse motivo — e com acesso anônimo a função
-- vira um confirmador de contas: informe um e-mail, receba o nome de quem o usa.
REVOKE ALL ON FUNCTION find_profile_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_profile_by_email(TEXT) TO authenticated;

-- As funções de predicado (is_platform_admin, current_tenant_id, owns_tenant…)
-- continuam abertas de propósito: as policies de RLS as chamam com os direitos
-- de quem consulta, então revogar quebraria o acesso legítimo. Todas são
-- somente leitura e só respondem sobre o próprio chamador.

-- =============================================================================
-- QUESTIONÁRIO — o "sempre volta"
--
-- O resultado do questionário vivia só no localStorage do aparelho: em outro
-- navegador, no app instalado, depois de limpar os dados ou numa aba anônima,
-- a plataforma via um perfil vazio e pedia o questionário de novo.
--
-- A resposta passa a ficar na conta, e para isso a tabela precisa registrar
-- QUANDO o questionário foi concluído — sem isso não há como distinguir "ainda
-- não respondeu" de "respondeu e não escolheu nenhum tema".
-- =============================================================================

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Quem já respondeu antes desta migração tem interesses gravados, mas não a
-- data. Sem este backfill essas contas continuariam vendo "Responder
-- questionário" para sempre.
UPDATE user_preferences
   SET completed_at = COALESCE(updated_at, created_at, NOW())
 WHERE completed_at IS NULL
   AND COALESCE(array_length(interests, 1), 0) > 0;

-- =============================================================================
-- MÚSICA — como a pessoa gosta de ouvir
--
-- Duas perguntas do questionário decidem a trilha: se ela gosta dos hits e
-- clássicos do estilo (music_hits) e se prefere misturar lançamentos com
-- antigas, ouvir só as mais famosas ou só lançamentos (music_mix). O padrão é
-- fugir do óbvio misturando novas e antigas.
-- =============================================================================

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS music_hits BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS music_mix TEXT NOT NULL DEFAULT 'misturar';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_music_mix_check') THEN
    ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_music_mix_check CHECK (music_mix IN ('misturar', 'famosas', 'lancamentos'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Widgets da home (lib/widgets.ts): a pessoa escolhe quais blocos aparecem, a
-- ordem e o tamanho. Lista de {id, tamanho}; NULL = arranjo padrão.
-- ---------------------------------------------------------------------------
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS home_widgets JSONB;

-- ---------------------------------------------------------------------------
-- Filtro das indicações de filmes, livros, audiolivros e vídeos (lib/gratis.ts):
-- os clássicos, as descobertas ou os dois; e se só em português.
-- ---------------------------------------------------------------------------
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS estilo_indicacao TEXT NOT NULL DEFAULT 'misturar';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS idioma_indicacao TEXT NOT NULL DEFAULT 'pt';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_estilo_indicacao_check') THEN
    ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_estilo_indicacao_check CHECK (estilo_indicacao IN ('misturar', 'classicos', 'descobertas'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_idioma_indicacao_check') THEN
    ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_idioma_indicacao_check CHECK (idioma_indicacao IN ('pt', 'todos'));
  END IF;
END $$;

-- =============================================================================
-- CONVITES DENTRO DA PLATAFORMA
--
-- Compromissos não pedem mais e-mail: quem cria escolhe as pessoas pelo nome,
-- entre as contas da plataforma. O convite fica na agenda e nas notificações
-- de quem foi marcado até ele responder: positivo (concordo) ou negativo (não
-- concordo).
--
-- As notificações de convite e de resposta nascem aqui, em gatilhos, e não
-- mais no servidor com a service role: sem a SUPABASE_SERVICE_ROLE_KEY o
-- convite era gravado, mas a notificação se perdia — e o convidado nunca
-- ficava sabendo.
-- =============================================================================

-- Nome para mostrar: o cadastrado ou, sem ele, o começo do e-mail. Só é usada
-- dentro das funções SECURITY DEFINER abaixo (roda com os direitos delas).
CREATE OR REPLACE FUNCTION display_name(p_user UUID)
RETURNS TEXT LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT COALESCE(NULLIF(trim(full_name), ''), split_part(email, '@', 1)) FROM profiles WHERE id = p_user),
    'Alguém'
  );
$$;

-- "thiago@gmail.com" → "th•••@gmail.com": ajuda a distinguir homônimos sem
-- entregar o e-mail de quem não tem vínculo com você.
CREATE OR REPLACE FUNCTION mask_email(p_email TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_email IS NULL OR position('@' IN p_email) = 0 THEN NULL
    ELSE left(split_part(p_email, '@', 1), 2) || '•••@' || split_part(p_email, '@', 2)
  END;
$$;

-- --- Convite para compromisso → notificação para o convidado ----------------
CREATE OR REPLACE FUNCTION notify_appointment_invite()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a RECORD;
BEGIN
  SELECT id, owner_id, title, starts_at INTO a FROM appointments WHERE id = NEW.appointment_id;
  IF a.owner_id IS NULL OR a.owner_id = NEW.user_id OR NEW.status <> 'pendente' THEN
    RETURN NEW;
  END IF;
  INSERT INTO notifications (user_id, type, title, body, link, appointment_id, actor_id)
  VALUES (
    NEW.user_id,
    'convite',
    'Convite para um compromisso',
    display_name(a.owner_id) || ' convidou você para "' || a.title || '" em '
      || to_char(a.starts_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
      || '. Você concorda?',
    '/agenda',
    a.id,
    a.owner_id
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Notificação é aviso: a falha dela não pode desfazer o convite.
  RAISE WARNING 'notify_appointment_invite: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointment_participants_notify_invite ON appointment_participants;
CREATE TRIGGER appointment_participants_notify_invite
  AFTER INSERT ON appointment_participants
  FOR EACH ROW EXECUTE FUNCTION notify_appointment_invite();

-- --- Resposta do convidado → aviso para quem criou --------------------------
-- A notificação do convite sai de "pendente" só aqui, quando a pessoa
-- responde; "marcar como lidas" não a apaga (ver /api/agenda/notifications).
CREATE OR REPLACE FUNCTION notify_appointment_answer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a RECORD;
BEGIN
  IF NEW.status NOT IN ('confirmado', 'recusado') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  UPDATE notifications SET read_at = NOW()
   WHERE user_id = NEW.user_id AND appointment_id = NEW.appointment_id AND type = 'convite' AND read_at IS NULL;

  SELECT id, owner_id, title INTO a FROM appointments WHERE id = NEW.appointment_id;
  IF a.owner_id IS NOT NULL AND a.owner_id <> NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, body, link, appointment_id, actor_id)
    VALUES (
      a.owner_id,
      'resposta',
      CASE WHEN NEW.status = 'confirmado' THEN 'Concordou com o compromisso' ELSE 'Não concordou com o compromisso' END,
      display_name(NEW.user_id)
        || CASE WHEN NEW.status = 'confirmado' THEN ' concordou com "' ELSE ' não concordou com "' END
        || a.title || '".',
      '/agenda',
      a.id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_appointment_answer: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointment_participants_notify_answer ON appointment_participants;
CREATE TRIGGER appointment_participants_notify_answer
  AFTER UPDATE OF status ON appointment_participants
  FOR EACH ROW EXECUTE FUNCTION notify_appointment_answer();

-- =============================================================================
-- COMUNIDADE — grupos para compartilhar livros, músicas, clipes e filmes, e
-- para ouvir e assistir juntos, sincronizados.
--
-- Qualquer conta cria quantos grupos quiser. Qualquer membro convida: contas
-- da plataforma recebem o convite nas notificações; quem ainda não tem conta
-- recebe o link do grupo (community_groups.invite_token), cria o acesso e
-- entra direto.
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  -- Link de convite. gen_random_uuid (122 bits aleatórios) e não
  -- gen_random_bytes: este não depende da extensão pgcrypto estar no
  -- search_path de quem insere.
  invite_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_groups_owner_idx ON community_groups (owner_id);

CREATE TABLE IF NOT EXISTS community_members (
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'membro' CHECK (role IN ('dono', 'membro')),
  status TEXT NOT NULL DEFAULT 'convidado' CHECK (status IN ('convidado', 'ativo', 'recusado')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT community_members_pkey PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_members_user_idx ON community_members (user_id, status);

-- O que se compartilha no grupo.
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'recado' CHECK (kind IN ('recado', 'livro', 'musica', 'clipe', 'filme', 'link')),
  title TEXT CHECK (title IS NULL OR char_length(title) <= 200),
  subtitle TEXT CHECK (subtitle IS NULL OR char_length(subtitle) <= 200),
  url TEXT CHECK (url IS NULL OR (char_length(url) <= 1000 AND url ~* '^https?://')),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 2000),
  youtube_id TEXT CHECK (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (COALESCE(NULLIF(trim(title), ''), NULLIF(trim(body), '')) IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS community_posts_group_idx ON community_posts (group_id, created_at DESC);

-- A sala do grupo: o que está tocando para todos e em que ponto. Cada
-- aparelho calcula a posição atual a partir de position_sec + (agora -
-- updated_at) e se ajusta sozinho — é o que mantém todo mundo no mesmo
-- segundo da música ou do clipe.
CREATE TABLE IF NOT EXISTS community_sessions (
  group_id UUID PRIMARY KEY REFERENCES community_groups(id) ON DELETE CASCADE,
  youtube_id TEXT CHECK (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title TEXT CHECK (title IS NULL OR char_length(title) <= 200),
  kind TEXT NOT NULL DEFAULT 'clipe' CHECK (kind IN ('musica', 'clipe')),
  is_playing BOOLEAN NOT NULL DEFAULT FALSE,
  position_sec DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (position_sec >= 0),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE;

-- --- Helpers SECURITY DEFINER (evitam recursão entre as políticas) ----------
CREATE OR REPLACE FUNCTION is_group_member(p_group UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members WHERE group_id = p_group AND user_id = auth.uid() AND status = 'ativo'
  );
$$;

CREATE OR REPLACE FUNCTION is_group_invitee(p_group UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members WHERE group_id = p_group AND user_id = auth.uid() AND status = 'convidado'
  );
$$;

CREATE OR REPLACE FUNCTION is_group_owner(p_group UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM community_groups WHERE id = p_group AND owner_id = auth.uid());
$$;

-- --- Quem cria o grupo já entra como dono -----------------------------------
CREATE OR REPLACE FUNCTION community_group_add_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO community_members (group_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'dono', 'ativo', NOW())
  ON CONFLICT ON CONSTRAINT community_members_pkey DO UPDATE SET role = 'dono', status = 'ativo';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_groups_add_owner ON community_groups;
CREATE TRIGGER community_groups_add_owner
  AFTER INSERT ON community_groups
  FOR EACH ROW EXECUTE FUNCTION community_group_add_owner();

-- --- Notificações do grupo ---------------------------------------------------
--   convidado            → avisa o convidado (fica pendente até ele responder)
--   convidado → ativo    → avisa quem convidou; o convite sai de pendente
--   convidado → recusado → idem
--   entrou pelo link     → avisa o dono do grupo
CREATE OR REPLACE FUNCTION notify_community_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g RECORD;
  v_old TEXT := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM v_old OR NEW.role = 'dono' THEN
    RETURN NEW;
  END IF;
  SELECT id, name, owner_id INTO g FROM community_groups WHERE id = NEW.group_id;

  IF NEW.status = 'convidado' THEN
    INSERT INTO notifications (user_id, type, title, body, link, group_id, actor_id)
    VALUES (
      NEW.user_id, 'convite_grupo', 'Convite para um grupo',
      display_name(NEW.invited_by) || ' convidou você para o grupo "' || g.name || '". Quer participar?',
      '/comunidade', g.id, NEW.invited_by
    );
    RETURN NEW;
  END IF;

  IF v_old = 'convidado' THEN
    UPDATE notifications SET read_at = NOW()
     WHERE user_id = NEW.user_id AND group_id = NEW.group_id AND type = 'convite_grupo' AND read_at IS NULL;
    IF NEW.invited_by IS NOT NULL AND NEW.invited_by <> NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, body, link, group_id, actor_id)
      VALUES (
        NEW.invited_by, 'resposta_grupo',
        CASE WHEN NEW.status = 'ativo' THEN 'Aceitou o convite do grupo' ELSE 'Recusou o convite do grupo' END,
        display_name(NEW.user_id)
          || CASE WHEN NEW.status = 'ativo' THEN ' entrou no grupo "' ELSE ' recusou o convite para o grupo "' END
          || g.name || '".',
        '/comunidade/' || g.id, g.id, NEW.user_id
      );
    END IF;
  ELSIF NEW.status = 'ativo' AND g.owner_id <> NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, body, link, group_id, actor_id)
    VALUES (
      g.owner_id, 'entrou_grupo', 'Alguém entrou no seu grupo',
      display_name(NEW.user_id) || ' entrou no grupo "' || g.name || '" pelo link de convite.',
      '/comunidade/' || g.id, g.id, NEW.user_id
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_community_member: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_members_notify ON community_members;
CREATE TRIGGER community_members_notify
  AFTER INSERT OR UPDATE OF status ON community_members
  FOR EACH ROW EXECUTE FUNCTION notify_community_member();

-- --- A sala guarda o relógio do servidor, nunca o do aparelho ---------------
CREATE OR REPLACE FUNCTION community_session_stamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_sessions_stamp ON community_sessions;
CREATE TRIGGER community_sessions_stamp
  BEFORE INSERT OR UPDATE ON community_sessions
  FOR EACH ROW EXECUTE FUNCTION community_session_stamp();

-- --- RLS ----------------------------------------------------------------------
ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_sessions ENABLE ROW LEVEL SECURITY;

-- Grupos: membros e convidados enxergam; só o dono edita e apaga.
DROP POLICY IF EXISTS community_groups_select ON community_groups;
CREATE POLICY community_groups_select ON community_groups FOR SELECT
  USING (owner_id = auth.uid() OR is_group_member(id) OR is_group_invitee(id));
DROP POLICY IF EXISTS community_groups_insert ON community_groups;
CREATE POLICY community_groups_insert ON community_groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS community_groups_update ON community_groups;
CREATE POLICY community_groups_update ON community_groups FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS community_groups_delete ON community_groups;
CREATE POLICY community_groups_delete ON community_groups FOR DELETE
  USING (owner_id = auth.uid());

-- Membros: quem participa vê a lista. Entrar, convidar e responder passam
-- pelas funções abaixo (sem INSERT/UPDATE direto: ninguém se faz dono nem
-- entra num grupo sem convite ou link). Sair é apagar a própria linha — menos
-- o dono, que apaga o grupo; o dono também remove membros e convites.
DROP POLICY IF EXISTS community_members_select ON community_members;
CREATE POLICY community_members_select ON community_members FOR SELECT
  USING (user_id = auth.uid() OR is_group_member(group_id) OR is_group_owner(group_id));
DROP POLICY IF EXISTS community_members_delete ON community_members;
CREATE POLICY community_members_delete ON community_members FOR DELETE
  USING ((user_id = auth.uid() AND role <> 'dono') OR (is_group_owner(group_id) AND user_id <> auth.uid()));

-- Publicações: só membros leem e publicam; autor ou dono do grupo apagam.
DROP POLICY IF EXISTS community_posts_select ON community_posts;
CREATE POLICY community_posts_select ON community_posts FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS community_posts_insert ON community_posts;
CREATE POLICY community_posts_insert ON community_posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND is_group_member(group_id));
DROP POLICY IF EXISTS community_posts_delete ON community_posts;
CREATE POLICY community_posts_delete ON community_posts FOR DELETE
  USING (author_id = auth.uid() OR is_group_owner(group_id));

-- Sala: qualquer membro escolhe o que toca, dá play, pausa e avança.
DROP POLICY IF EXISTS community_sessions_select ON community_sessions;
CREATE POLICY community_sessions_select ON community_sessions FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS community_sessions_insert ON community_sessions;
CREATE POLICY community_sessions_insert ON community_sessions FOR INSERT
  WITH CHECK (is_group_member(group_id));
DROP POLICY IF EXISTS community_sessions_update ON community_sessions;
CREATE POLICY community_sessions_update ON community_sessions FOR UPDATE
  USING (is_group_member(group_id)) WITH CHECK (is_group_member(group_id));

-- --- Funções da comunidade --------------------------------------------------

-- Convida contas da plataforma. Qualquer membro ativo convida.
CREATE OR REPLACE FUNCTION invite_to_group(p_group UUID, p_users UUID[])
RETURNS TABLE (convidado_id UUID, resultado TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_u UUID;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para convidar.';
  END IF;
  IF NOT is_group_member(p_group) THEN
    RAISE EXCEPTION 'Só quem participa do grupo pode convidar.';
  END IF;

  FOR v_u IN SELECT DISTINCT u FROM unnest(COALESCE(p_users, '{}')) AS u WHERE u IS NOT NULL LIMIT 50 LOOP
    convidado_id := v_u;
    IF v_u = v_uid THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_u) THEN
      resultado := 'inexistente';
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT m.status INTO v_status FROM community_members m WHERE m.group_id = p_group AND m.user_id = v_u;
    IF v_status = 'ativo' THEN
      resultado := 'ja_membro';
    ELSIF v_status = 'convidado' THEN
      resultado := 'ja_convidado';
    ELSE
      INSERT INTO community_members (group_id, user_id, role, status, invited_by)
      VALUES (p_group, v_u, 'membro', 'convidado', v_uid)
      ON CONFLICT ON CONSTRAINT community_members_pkey
        DO UPDATE SET status = 'convidado', invited_by = v_uid, created_at = NOW();
      resultado := 'convidado';
    END IF;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Resposta ao convite: positivo entra no grupo, negativo recusa.
CREATE OR REPLACE FUNCTION respond_group_invite(p_group UUID, p_accept BOOLEAN)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para responder.';
  END IF;
  UPDATE community_members
     SET status = CASE WHEN p_accept THEN 'ativo' ELSE 'recusado' END,
         joined_at = CASE WHEN p_accept THEN NOW() ELSE joined_at END
   WHERE group_id = p_group AND user_id = auth.uid() AND status = 'convidado'
  RETURNING status INTO v_status;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Não há convite pendente para este grupo.';
  END IF;
  RETURN v_status;
END;
$$;

-- Entrada pelo link de convite (inclusive de quem acabou de criar a conta).
CREATE OR REPLACE FUNCTION join_group_by_token(p_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_group UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para participar do grupo.';
  END IF;
  SELECT id INTO v_group FROM community_groups WHERE invite_token = trim(COALESCE(p_token, ''));
  IF v_group IS NULL THEN
    RAISE EXCEPTION 'Convite inválido: o link pode ter sido trocado pelo dono do grupo.';
  END IF;
  INSERT INTO community_members (group_id, user_id, role, status, joined_at)
  VALUES (v_group, v_uid, 'membro', 'ativo', NOW())
  ON CONFLICT ON CONSTRAINT community_members_pkey
    DO UPDATE SET status = 'ativo', joined_at = NOW()
    WHERE community_members.status <> 'ativo';
  RETURN v_group;
END;
$$;

-- Prévia do convite por link — aberta a quem ainda não tem conta, para a
-- página mostrar o grupo antes do cadastro. Só responde a quem tem o token.
CREATE OR REPLACE FUNCTION group_invite_preview(p_token TEXT)
RETURNS TABLE (group_id UUID, name TEXT, description TEXT, owner_name TEXT, member_count INT, already_member BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description, display_name(g.owner_id),
         (SELECT count(*)::int FROM community_members m WHERE m.group_id = g.id AND m.status = 'ativo'),
         EXISTS (SELECT 1 FROM community_members m WHERE m.group_id = g.id AND m.user_id = auth.uid() AND m.status = 'ativo')
  FROM community_groups g
  WHERE length(trim(COALESCE(p_token, ''))) >= 16 AND g.invite_token = trim(p_token);
$$;

-- Meus grupos e os convites que estão esperando resposta.
CREATE OR REPLACE FUNCTION my_community_groups()
RETURNS TABLE (
  id UUID, name TEXT, description TEXT, owner_id UUID, owner_name TEXT,
  my_role TEXT, my_status TEXT, invited_by_name TEXT,
  member_count INT, post_count INT, playing_title TEXT,
  last_activity TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description, g.owner_id, display_name(g.owner_id),
         m.role, m.status,
         CASE WHEN m.invited_by IS NOT NULL AND m.invited_by <> m.user_id THEN display_name(m.invited_by) END,
         (SELECT count(*)::int FROM community_members x WHERE x.group_id = g.id AND x.status = 'ativo'),
         (SELECT count(*)::int FROM community_posts p WHERE p.group_id = g.id),
         (SELECT s.title FROM community_sessions s WHERE s.group_id = g.id AND s.is_playing),
         GREATEST(g.created_at, (SELECT max(p.created_at) FROM community_posts p WHERE p.group_id = g.id)),
         g.created_at
  FROM community_members m
  JOIN community_groups g ON g.id = m.group_id
  WHERE m.user_id = auth.uid() AND m.status IN ('ativo', 'convidado')
  ORDER BY (m.status = 'convidado') DESC, 12 DESC NULLS LAST;
$$;

-- Membros de um grupo com o nome de cada um (sem expor e-mail).
CREATE OR REPLACE FUNCTION community_group_members(p_group UUID)
RETURNS TABLE (user_id UUID, name TEXT, role TEXT, status TEXT, invited_by_name TEXT, joined_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, display_name(m.user_id), m.role, m.status,
         CASE WHEN m.invited_by IS NOT NULL AND m.invited_by <> m.user_id THEN display_name(m.invited_by) END,
         m.joined_at
  FROM community_members m
  WHERE m.group_id = p_group
    AND m.status IN ('ativo', 'convidado')
    AND is_group_member(p_group)
  ORDER BY (m.role = 'dono') DESC, (m.status = 'ativo') DESC, m.joined_at NULLS LAST;
$$;

-- --- Enxergar quem está na sua agenda — agora também pela comunidade --------
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
  )
  OR EXISTS (
    SELECT 1
    FROM community_members eu
    JOIN community_members outro ON outro.group_id = eu.group_id
    WHERE eu.user_id = auth.uid() AND eu.status = 'ativo'
      AND outro.user_id = p_user AND outro.status IN ('ativo', 'convidado')
  )
  OR EXISTS (
    SELECT 1 FROM community_members m
    WHERE (m.user_id = auth.uid() AND m.invited_by = p_user)
       OR (m.user_id = p_user AND m.invited_by = auth.uid())
  );
$$;

-- --- Encontrar pessoas para convidar (compromissos e grupos) ----------------
-- Sem termo: as pessoas próximas (contatos, quem já esteve num compromisso
-- com você, quem está nos seus grupos). Com termo: busca por nome ou pelo
-- e-mail exato. Para quem não tem vínculo, o e-mail volta mascarado.
CREATE OR REPLACE FUNCTION search_profiles(p_query TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, name TEXT, email_hint TEXT, proximo BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q TEXT := lower(trim(COALESCE(p_query, '')));
  v_like TEXT := '%' || replace(replace(replace(lower(trim(COALESCE(p_query, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH proximos AS (
    SELECT c.contact_id AS uid FROM connections c WHERE c.user_id = v_uid AND c.status <> 'recusado'
    UNION SELECT c.user_id FROM connections c WHERE c.contact_id = v_uid AND c.status <> 'recusado'
    UNION SELECT outro.user_id
            FROM appointment_participants eu
            JOIN appointment_participants outro ON outro.appointment_id = eu.appointment_id
           WHERE eu.user_id = v_uid
    UNION SELECT p.user_id FROM appointments a JOIN appointment_participants p ON p.appointment_id = a.id WHERE a.owner_id = v_uid
    UNION SELECT a.owner_id FROM appointments a JOIN appointment_participants p ON p.appointment_id = a.id WHERE p.user_id = v_uid
    UNION SELECT outro.user_id
            FROM community_members eu
            JOIN community_members outro ON outro.group_id = eu.group_id
           WHERE eu.user_id = v_uid AND eu.status = 'ativo' AND outro.status = 'ativo'
  )
  SELECT pr.id,
         COALESCE(NULLIF(trim(pr.full_name), ''), split_part(pr.email, '@', 1)),
         CASE WHEN px.uid IS NOT NULL OR lower(pr.email) = v_q THEN pr.email ELSE mask_email(pr.email) END,
         px.uid IS NOT NULL
  FROM profiles pr
  LEFT JOIN proximos px ON px.uid = pr.id
  WHERE pr.id <> v_uid
    AND CASE
          WHEN v_q = '' THEN px.uid IS NOT NULL
          WHEN position('@' IN v_q) > 0 THEN lower(pr.email) = v_q
          WHEN length(v_q) < 2 THEN FALSE
          ELSE lower(COALESCE(pr.full_name, '')) LIKE v_like
            OR lower(split_part(COALESCE(pr.email, ''), '@', 1)) LIKE v_like
        END
  ORDER BY (px.uid IS NOT NULL) DESC, lower(COALESCE(NULLIF(trim(pr.full_name), ''), pr.email))
  LIMIT 12;
END;
$$;

-- --- Tempo real: notificação chega na hora; a sala e o mural se atualizam
-- sozinhos. (O Realtime respeita as políticas de RLS acima.)
DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['notifications', 'community_sessions', 'community_posts'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- --- Permissão de execução (ver a nota em "Permissão de execução" acima) ----
REVOKE ALL ON FUNCTION display_name(UUID)               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION mask_email(TEXT)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION notify_appointment_invite()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION notify_appointment_answer()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION community_group_add_owner()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION notify_community_member()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION community_session_stamp()        FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION search_profiles(TEXT)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION invite_to_group(UUID, UUID[])    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION respond_group_invite(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION join_group_by_token(TEXT)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION my_community_groups()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION community_group_members(UUID)    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_profiles(TEXT)            TO authenticated;
GRANT EXECUTE ON FUNCTION invite_to_group(UUID, UUID[])    TO authenticated;
GRANT EXECUTE ON FUNCTION respond_group_invite(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION join_group_by_token(TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION my_community_groups()            TO authenticated;
GRANT EXECUTE ON FUNCTION community_group_members(UUID)    TO authenticated;

-- A prévia do convite abre para quem ainda não tem conta: é ela que mostra o
-- grupo na página do link antes do cadastro.
GRANT EXECUTE ON FUNCTION group_invite_preview(TEXT) TO anon, authenticated;
