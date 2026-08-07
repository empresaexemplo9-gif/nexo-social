-- Verificação do multi-tenant.
--
-- Roda contra um Postgres limpo (não contra o banco de produção). Prepara três
-- contas — o super admin e duas pessoas comuns — e checa, com asserção, que:
--
--   1. o cadastro provisiona tenant + perfil, e só a conta oficial nasce admin;
--   2. uma conta órfã (gatilho falhou) se conserta com ensure_my_profile, sem
--      duplicar nada se for chamada de novo;
--   3. ninguém consegue se mudar para o tenant de outro nem se marcar admin;
--   4. qualquer conta autenticada lê os nichos (conteúdos e eventos);
--   5. mas não edita nem apaga o que é de outro tenant;
--   6. a lista de inscritos (ferramenta administrativa) só abre para o admin;
--   7. um perfil só fica visível para quem tem vínculo de agenda com ele;
--   8. e nunca para um estranho.
--
-- Como rodar (exemplo com um cluster local):
--
--   initdb -U postgres -A trust $PGDATA
--   pg_ctl -D $PGDATA -o "-k /tmp/sock" -w start
--   psql -h /tmp/sock -U postgres -f db/supabase-shim.sql
--   psql -h /tmp/sock -U postgres -f db/schema.sql
--   psql -h /tmp/sock -U postgres -f db/test-multitenant.sql

\set ON_ERROR_STOP on
\pset pager off

\set adm  '11111111-1111-1111-1111-111111111111'
\set alice '22222222-2222-2222-2222-222222222222'
\set bob   '33333333-3333-3333-3333-333333333333'
\set outro '44444444-4444-4444-4444-444444444444'

\set jwt_adm   '{"sub":"11111111-1111-1111-1111-111111111111","email":"thiagohccarvalho00@gmail.com","role":"authenticated"}'
\set jwt_alice '{"sub":"22222222-2222-2222-2222-222222222222","email":"alice@exemplo.com","role":"authenticated"}'

-- Asserção simples: falha alto e claro se a condição não se cumprir.
CREATE OR REPLACE FUNCTION assert(p_cond BOOLEAN, p_label TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond THEN
    RAISE NOTICE 'ok   %', p_label;
  ELSE
    RAISE EXCEPTION 'FALHOU: %', p_label;
  END IF;
END;
$$;

-- --- Cenário -----------------------------------------------------------------
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'adm',   'thiagohccarvalho00@gmail.com', '{"full_name":"Thiago","tenant_name":"Thiago","tenant_slug":"thiago"}'),
  (:'alice', 'alice@exemplo.com',            '{"full_name":"Alice","tenant_name":"Alice","tenant_slug":"alice"}'),
  (:'bob',   'bob@exemplo.com',              '{"full_name":"Bob","tenant_name":"Bob","tenant_slug":"bob"}'),
  (:'outro', 'estranho@exemplo.com',         '{"tenant_slug":"estranho"}')
ON CONFLICT DO NOTHING;

INSERT INTO contents (title, category, snippet, image_url, tenant_id)
SELECT 'Matéria do admin', 'tecnologia', 'teste', 'https://exemplo/i.jpg', tenant_id
FROM profiles WHERE id = :'adm';

INSERT INTO events (title, category, event_date, location, image_url, description, tenant_id)
SELECT 'Evento do admin', 'esporte', '10 de ago', 'Arena', 'https://exemplo/e.jpg', 'teste', tenant_id
FROM profiles WHERE id = :'adm';

INSERT INTO subscribers (email) VALUES ('inscrito@exemplo.com') ON CONFLICT DO NOTHING;

-- --- 1) Cadastro provisiona, e só a conta oficial é admin --------------------
SELECT assert(
  (SELECT count(*) FROM profiles p JOIN auth.users u ON u.id = p.id WHERE p.tenant_id IS NOT NULL) = 4,
  '1. cadastro provisionou tenant + perfil para as 4 contas');
SELECT assert(
  (SELECT count(*) FROM profiles WHERE is_platform_admin) = 1
  AND (SELECT is_platform_admin FROM profiles WHERE id = :'adm'),
  '1. só thiagohccarvalho00@gmail.com nasce marcado como admin');

-- --- 2) Conta órfã se conserta ------------------------------------------------
DELETE FROM profiles WHERE id = :'alice';
DELETE FROM tenants  WHERE owner_id = :'alice';

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_alice';
  SELECT ensure_my_profile('Alice', 'pessoal', 'Alice');
  SELECT ensure_my_profile('Alice', 'pessoal', 'Alice');  -- idempotente
COMMIT;

SELECT assert(
  (SELECT count(*) FROM profiles WHERE id = :'alice' AND tenant_id IS NOT NULL) = 1
  AND (SELECT count(*) FROM tenants WHERE owner_id = :'alice') = 1,
  '2. conta órfã reprovisionada sem duplicar tenant nem perfil');

-- --- 3) Sem escalada de privilégio pelo próprio perfil -----------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_alice';
  UPDATE profiles
     SET tenant_id = (SELECT tenant_id FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333'),
         role = 'owner',
         is_platform_admin = TRUE
   WHERE id = '22222222-2222-2222-2222-222222222222';
COMMIT;

SELECT assert(
  (SELECT tenant_id FROM profiles WHERE id = :'alice')
    IS DISTINCT FROM (SELECT tenant_id FROM profiles WHERE id = :'bob')
  AND NOT (SELECT is_platform_admin FROM profiles WHERE id = :'alice'),
  '3. usuário não muda o próprio tenant nem se promove a admin');

-- --- 4) Nichos abertos para qualquer conta -----------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_alice';
  SELECT assert((SELECT count(*) FROM contents) > 0, '4. conta comum lê os conteúdos dos nichos');
  SELECT assert((SELECT count(*) FROM events) > 0,   '4. conta comum lê os eventos dos nichos');
COMMIT;

-- --- 5) Mas não escreve no que é de outro tenant ------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_alice';
  UPDATE contents SET title = 'INVADIDO';
  DELETE FROM contents;
COMMIT;

SELECT assert(
  (SELECT count(*) FROM contents WHERE title = 'Matéria do admin') = 1,
  '5. conta comum não edita nem apaga conteúdo de outro tenant');

-- --- 6) Ferramentas administrativas ------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_alice';
  SELECT assert((SELECT count(*) FROM subscribers) = 0, '6. conta comum não lê a lista de inscritos');
COMMIT;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_adm';
  SELECT assert((SELECT count(*) FROM subscribers) > 0, '6. admin lê a lista de inscritos');
COMMIT;

-- --- 7) Perfis visíveis só com vínculo de agenda ------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_alice';
  SELECT assert((SELECT count(*) FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333') = 0,
                 '7. sem vínculo, Alice não enxerga o perfil do Bob');
  INSERT INTO connections (user_id, contact_id, status)
  VALUES ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'aceito');
  SELECT assert((SELECT count(*) FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333') = 1,
                 '7. após conectar, Alice enxerga o perfil do Bob');
COMMIT;

-- --- 8) Nunca um estranho -----------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_alice';
  SELECT assert((SELECT count(*) FROM profiles WHERE id = '44444444-4444-4444-4444-444444444444') = 0,
                 '8. Alice não enxerga o perfil de um estranho');
  SELECT assert((SELECT count(*) FROM profiles) = 2,
                 '8. Alice enxerga apenas o próprio perfil e o do contato');
COMMIT;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_adm';
  SELECT assert((SELECT count(*) FROM profiles) = 4, '8. admin enxerga todos os perfis');
COMMIT;

\echo ''
\echo 'Todas as verificações de multi-tenant passaram.'
