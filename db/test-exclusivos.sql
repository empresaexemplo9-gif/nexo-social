-- ############################################################################
-- ATENÇÃO: NÃO RODE ESTE ARQUIVO NO SUPABASE.
-- Ele cria usuários falsos em auth.users para testar as regras.
-- ############################################################################

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_admin'))
     OR EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    RAISE EXCEPTION 'Este arquivo é só para um Postgres local de teste — ele cria contas falsas.';
  END IF;
END $$;

-- Verificação dos itens exclusivos (planos de fundo, adesivos e bottons).
--
--   shim → schema → exclusivos.sql → exclusivos-catalogo.sql → este arquivo
--
--   1. a coleção embutida entra organizada por tema, edição e tipo, e rodar de
--      novo não duplica nem mexe em quem já recebeu;
--   2. só o superadministrador cadastra, envia e revoga;
--   3. cada pessoa só enxerga o que recebeu (e só as próprias concessões);
--   4. o que a pessoa ganhou fica com ela (não há validade).

\set ON_ERROR_STOP on
\pset pager off

\set ana  'aaaaaaaa-0000-0000-0000-000000000021'
\set beto 'aaaaaaaa-0000-0000-0000-000000000022'
\set chefe 'aaaaaaaa-0000-0000-0000-000000000023'

\set jwt_ana   '{"sub":"aaaaaaaa-0000-0000-0000-000000000021","role":"authenticated","email":"ana.ex@exemplo.com"}'
\set jwt_beto  '{"sub":"aaaaaaaa-0000-0000-0000-000000000022","role":"authenticated","email":"beto.ex@exemplo.com"}'
\set jwt_chefe '{"sub":"aaaaaaaa-0000-0000-0000-000000000023","role":"authenticated","email":"thiagohccarvalho00@gmail.com"}'

CREATE OR REPLACE FUNCTION assert(p_cond BOOLEAN, p_label TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond THEN RAISE NOTICE 'ok   %', p_label; ELSE RAISE EXCEPTION 'FALHOU: %', p_label; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION ve(p_jwt TEXT, p_sql TEXT)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE n BIGINT;
BEGIN
  PERFORM set_config('request.jwt.claims', p_jwt, TRUE);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM (' || p_sql || ') x' INTO n;
  EXECUTE 'RESET ROLE';
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION como(p_jwt TEXT, p_sql TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', p_jwt, TRUE);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  RETURN 'ok';
END;
$$;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'ana',   'ana.ex@exemplo.com',   '{"full_name":"Ana Exclusiva","tenant_slug":"ana-ex"}'),
  (:'beto',  'beto.ex@exemplo.com',  '{"full_name":"Beto Exclusivo","tenant_slug":"beto-ex"}'),
  (:'chefe', 'thiagohccarvalho00@gmail.com', '{"full_name":"Chefe","tenant_slug":"chefe-ex"}')
ON CONFLICT DO NOTHING;

-- --- 1) Coleção embutida ---------------------------------------------------------------------
SELECT assert((SELECT count(*) FROM exclusive_assets) = 130, '1. a coleção embutida tem 130 itens');
SELECT assert((SELECT count(*) FROM exclusive_assets WHERE kind = 'wallpaper') = 12, '1. 12 planos de fundo (mais de um por banda quando há)');
SELECT assert((SELECT count(*) FROM exclusive_assets WHERE kind = 'wallpaper' AND collection = 'Linkin Park') = 2, '1. Linkin Park com os 2 planos de fundo');
SELECT assert((SELECT count(*) FROM exclusive_assets WHERE kind = 'wallpaper' AND collection = 'System of a Down') = 2, '1. System of a Down com os 2 planos de fundo');
SELECT assert((SELECT count(*) FROM exclusive_assets WHERE kind = 'button') = 16, '1. 16 bottons');
SELECT assert((SELECT count(*) FROM exclusive_assets WHERE kind = 'wallpaper' AND thumb_path IS NULL) = 0, '1. todo plano de fundo tem miniatura');
SELECT assert((SELECT count(DISTINCT collection) FROM exclusive_assets) = 6, '1. seis temas/bandas, cada um no seu espaço');
SELECT assert(NOT EXISTS (
  SELECT 1 FROM exclusive_assets
  WHERE image_path NOT LIKE '/colecao/%/' || CASE kind WHEN 'wallpaper' THEN 'fundos' WHEN 'sticker' THEN 'adesivos' ELSE 'bottons' END || '/%'
), '1. o caminho de cada arquivo segue tema/tipo');

-- --- 2) Só o superadministrador cadastra e envia ---------------------------------------------
SELECT assert(como(:'jwt_ana', $q$
  INSERT INTO exclusive_assets (title, kind, collection, image_path) VALUES ('Meu', 'sticker', 'geral', 'x/y.png')
$q$) = '42501', '2. quem não é superadministrador não cadastra item');
SELECT id AS um_item FROM exclusive_assets ORDER BY sort_order LIMIT 1 \gset
SELECT assert(como(:'jwt_ana', format($q$
  INSERT INTO exclusive_asset_grants (asset_id, user_id) VALUES (%L, 'aaaaaaaa-0000-0000-0000-000000000021')
$q$, :'um_item')) = '42501', '2. nem se dá item exclusivo');
SELECT assert(como(:'jwt_chefe', $q$
  INSERT INTO exclusive_asset_grants (asset_id, user_id)
  SELECT id, 'aaaaaaaa-0000-0000-0000-000000000021' FROM exclusive_assets
  WHERE collection = 'Linkin Park' AND (kind = 'wallpaper' OR edition = 'Discografia')
$q$) = 'ok', '2. o superadministrador monta e envia o kit (os 2 fundos e a discografia)');
SELECT assert(como(:'jwt_chefe', $q$
  INSERT INTO exclusive_assets (title, kind, collection, edition, image_path)
  VALUES ('Nova capa', 'button', 'Banda nova', 'Turnê', 'banda-nova/bottons/turne-01.webp')
$q$) = 'ok', '2. o superadministrador cadastra botton novo');

-- --- 3) Cada um só vê o que recebeu ----------------------------------------------------------
SELECT assert(ve(:'jwt_ana', 'SELECT 1 FROM exclusive_assets') = 18, '3. Ana vê só os 18 itens do kit');
SELECT assert(ve(:'jwt_ana', $q$SELECT 1 FROM exclusive_assets WHERE kind = 'wallpaper'$q$) = 2, '3. com os dois planos de fundo');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM exclusive_assets') = 0, '3. Beto não recebeu nada e não vê nada');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM exclusive_asset_grants') = 0, '3. nem as concessões dos outros');
SELECT assert(ve(:'jwt_ana', 'SELECT 1 FROM exclusive_asset_grants') = 18, '3. Ana vê as próprias concessões');
SELECT assert(ve(:'jwt_chefe', 'SELECT 1 FROM exclusive_assets') = 131, '3. o superadministrador vê o catálogo inteiro');

-- --- 4) Não expira; rodar a coleção de novo não mexe em nada ---------------------------------
SELECT assert(NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'exclusive_asset_grants' AND column_name ~ '(expir|valid|until|ate)'
), '4. a concessão não tem validade');
UPDATE exclusive_assets SET title = 'Renomeado' WHERE image_path = '/colecao/linkin-park/fundos/discografia.webp';
\i db/exclusivos-catalogo.sql
SELECT assert((SELECT count(*) FROM exclusive_assets) = 131, '4. rodar a coleção de novo não duplica');
SELECT assert((SELECT title FROM exclusive_assets WHERE image_path = '/colecao/linkin-park/fundos/discografia.webp') = 'Linkin Park · Discografia',
  '4. e devolve o nome da coleção');
SELECT assert(ve(:'jwt_ana', 'SELECT 1 FROM exclusive_asset_grants') = 18, '4. e Ana continua com o kit');

SELECT 'test-exclusivos: tudo certo' AS resultado;
