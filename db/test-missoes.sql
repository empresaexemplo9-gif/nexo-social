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

-- Missões, sorteio e trocas de repetidos.
--
--   shim → schema → exclusivos.sql → exclusivos-catalogo.sql → missoes.sql → este arquivo
--
--   1. só o servidor (chave de serviço) resgata, propõe e troca;
--   2. a missão se resgata uma vez por período e sorteia itens quaisquer
--      (ativos e sorteáveis); item que sai de novo vira repetido;
--   3. só repetido por repetido; aceitar troca na hora, e ninguém fica sem o seu;
--   4. cada pessoa só vê os próprios resgates e as próprias propostas.

\set ON_ERROR_STOP on
\pset pager off

\set ana  'aaaaaaaa-0000-0000-0000-000000000031'
\set beto 'aaaaaaaa-0000-0000-0000-000000000032'
\set caio 'aaaaaaaa-0000-0000-0000-000000000033'

\set jwt_ana   '{"sub":"aaaaaaaa-0000-0000-0000-000000000031","role":"authenticated","email":"ana.mi@exemplo.com"}'
\set jwt_beto  '{"sub":"aaaaaaaa-0000-0000-0000-000000000032","role":"authenticated","email":"beto.mi@exemplo.com"}'
\set jwt_caio  '{"sub":"aaaaaaaa-0000-0000-0000-000000000033","role":"authenticated","email":"caio.mi@exemplo.com"}'

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

-- Como o servidor (chave de serviço): devolve 'ok' ou o SQLSTATE.
CREATE OR REPLACE FUNCTION servidor(p_sql TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'SET LOCAL ROLE service_role';
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
  (:'ana',  'ana.mi@exemplo.com',  '{"full_name":"Ana Missão","tenant_slug":"ana-mi"}'),
  (:'beto', 'beto.mi@exemplo.com', '{"full_name":"Beto Missão","tenant_slug":"beto-mi"}'),
  (:'caio', 'caio.mi@exemplo.com', '{"full_name":"Caio Missão","tenant_slug":"caio-mi"}')
ON CONFLICT DO NOTHING;

-- --- 1) Só o servidor ----------------------------------------------------------------
SELECT assert(como(:'jwt_ana', format($q$SELECT exclusivos_resgatar_missao(%L, 'primeira-publicacao', 'sempre', 3)$q$, :'ana')) = '42501',
  '1. a pessoa não resgata direto (sem passar pela conferência do servidor)');
SELECT assert(como(:'jwt_ana', format($q$INSERT INTO missao_resgates (user_id, missao, periodo) VALUES (%L, 'x', 'sempre')$q$, :'ana')) = '42501',
  '1. nem grava resgate na mão');
SELECT assert(como(:'jwt_ana', format($q$UPDATE exclusive_asset_grants SET quantidade = 99 WHERE user_id = %L$q$, :'ana')) = 'ok'
  AND NOT EXISTS (SELECT 1 FROM exclusive_asset_grants WHERE user_id = :'ana' AND quantidade = 99),
  '1. nem aumenta a própria quantidade');

-- --- 2) Resgate e sorteio ------------------------------------------------------------
-- Um catálogo pequeno para o sorteio cair em repetidos com certeza.
UPDATE exclusive_assets SET sorteavel = FALSE;
UPDATE exclusive_assets SET sorteavel = TRUE
 WHERE id IN (SELECT id FROM exclusive_assets WHERE active ORDER BY sort_order LIMIT 2);
SELECT assert(servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'primeira-publicacao', 'sempre', 5)$q$, :'ana')) = 'ok',
  '2. o servidor resgata a missão e sorteia');
SELECT assert((SELECT cardinality(itens) FROM missao_resgates WHERE user_id = :'ana' AND missao = 'primeira-publicacao') = 5,
  '2. os cinco itens sorteados ficam registrados');
SELECT assert((SELECT sum(quantidade) FROM exclusive_asset_grants WHERE user_id = :'ana') = 5,
  '2. a coleção ganha os cinco (contando repetidos)');
SELECT assert((SELECT count(*) FROM exclusive_asset_grants WHERE user_id = :'ana') <= 2,
  '2. com dois itens no sorteio, o resto sai repetido');
SELECT assert(NOT EXISTS (
  SELECT 1 FROM exclusive_asset_grants g JOIN exclusive_assets a ON a.id = g.asset_id WHERE g.user_id = :'ana' AND NOT a.sorteavel
), '2. só sai item sorteável');
SELECT assert(servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'primeira-publicacao', 'sempre', 1)$q$, :'ana')) = '23505',
  '2. a mesma conquista não se resgata duas vezes');
SELECT assert(servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'semana-publicar', '2026-S40', 1)$q$, :'ana')) = 'ok'
  AND servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'semana-publicar', '2026-S41', 1)$q$, :'ana')) = 'ok'
  AND servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'semana-publicar', '2026-S41', 1)$q$, :'ana')) = '23505',
  '2. a semanal volta toda semana, uma vez por semana');
SELECT assert(servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'x', 'sempre', 0)$q$, :'ana')) = '22023'
  AND servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'x', 'sempre', 6)$q$, :'ana')) = '22023',
  '2. de 1 a 5 itens por resgate');
UPDATE exclusive_assets SET sorteavel = FALSE;
SELECT assert(servidor(format($q$SELECT exclusivos_resgatar_missao(%L, 'sem-itens', 'sempre', 1)$q$, :'beto')) = 'P0002'
  AND NOT EXISTS (SELECT 1 FROM missao_resgates WHERE user_id = :'beto' AND missao = 'sem-itens'),
  '2. sem item no sorteio, o resgate não fica gasto');
UPDATE exclusive_assets SET sorteavel = TRUE;

-- --- 3) Trocas -----------------------------------------------------------------------
-- Dois itens fixos: Ana tem 3 do A, Beto tem 2 do B; Caio tem 1 do A.
DELETE FROM exclusive_asset_grants WHERE user_id IN (:'ana', :'beto', :'caio');
SELECT id AS item_a FROM exclusive_assets ORDER BY sort_order LIMIT 1 \gset
SELECT id AS item_b FROM exclusive_assets ORDER BY sort_order OFFSET 1 LIMIT 1 \gset
INSERT INTO exclusive_asset_grants (asset_id, user_id, quantidade) VALUES
  (:'item_a', :'ana', 3), (:'item_b', :'beto', 2), (:'item_a', :'caio', 1), (:'item_b', :'caio', 1);

SELECT assert(servidor(format($q$SELECT exclusivos_propor_troca(%L, %L, %L, %L)$q$, :'caio', :'beto', :'item_a', :'item_b')) = 'P0001',
  '3. só oferece quem tem o item repetido');
SELECT assert(servidor(format($q$SELECT exclusivos_propor_troca(%L, %L, %L, %L)$q$, :'ana', :'caio', :'item_a', :'item_b')) = 'P0001',
  '3. só pede o que está repetido com a outra pessoa');
SELECT assert(servidor(format($q$SELECT exclusivos_propor_troca(%L, %L, %L, %L)$q$, :'ana', :'beto', :'item_a', :'item_b')) = 'ok',
  '3. Ana propõe: dá um A repetido, pede um B repetido do Beto');
SELECT assert(servidor(format($q$SELECT exclusivos_propor_troca(%L, %L, %L, %L)$q$, :'ana', :'beto', :'item_a', :'item_b')) = '23505',
  '3. a mesma proposta não fica aberta duas vezes');
SELECT id AS troca FROM exclusivos_trocas WHERE de_id = :'ana' AND status = 'aberta' \gset

SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM exclusivos_trocas') = 1 AND ve(:'jwt_caio', 'SELECT 1 FROM exclusivos_trocas') = 0,
  '4. a proposta só aparece para quem está nela');
SELECT assert(servidor(format($q$SELECT exclusivos_responder_troca(%L, %L, TRUE)$q$, :'ana', :'troca')) = 'P0002',
  '3. quem propôs não aceita a própria proposta');
SELECT assert(servidor(format($q$SELECT exclusivos_responder_troca(%L, %L, TRUE)$q$, :'beto', :'troca')) = 'ok',
  '3. Beto aceita');
SELECT assert((SELECT status FROM exclusivos_trocas WHERE id = :'troca') = 'aceita', '3. a proposta fica aceita');
SELECT assert(exclusivos_quantos(:'ana', :'item_a') = 2 AND exclusivos_quantos(:'ana', :'item_b') = 1
  AND exclusivos_quantos(:'beto', :'item_b') = 1 AND exclusivos_quantos(:'beto', :'item_a') = 1,
  '3. os itens trocam de mão e cada um fica com o seu');
SELECT assert(servidor(format($q$SELECT exclusivos_responder_troca(%L, %L, TRUE)$q$, :'beto', :'troca')) = 'ok'
  AND exclusivos_quantos(:'beto', :'item_a') = 1, '3. aceitar de novo não troca duas vezes');

-- Proposta que deixou de valer (o repetido foi embora antes do aceite).
UPDATE exclusive_asset_grants SET quantidade = 2 WHERE user_id = :'beto' AND asset_id = :'item_b';
SELECT assert(servidor(format($q$SELECT exclusivos_propor_troca(%L, %L, %L, %L)$q$, :'ana', :'beto', :'item_a', :'item_b')) = 'ok', '3. nova proposta');
SELECT id AS troca2 FROM exclusivos_trocas WHERE de_id = :'ana' AND status = 'aberta' \gset
UPDATE exclusive_asset_grants SET quantidade = 1 WHERE user_id = :'ana' AND asset_id = :'item_a';
SELECT assert((SELECT exclusivos_responder_troca(:'beto', :'troca2', TRUE)) = 'indisponivel'
  AND exclusivos_quantos(:'beto', :'item_b') = 2 AND exclusivos_quantos(:'ana', :'item_a') = 1,
  '3. sem o repetido na hora do aceite, nada muda e a proposta fica indisponível');

-- Recusar e cancelar.
UPDATE exclusive_asset_grants SET quantidade = 3 WHERE user_id = :'ana' AND asset_id = :'item_a';
SELECT exclusivos_propor_troca(:'ana', :'beto', :'item_a', :'item_b') AS troca3 \gset
SELECT assert(servidor(format($q$SELECT exclusivos_cancelar_troca(%L, %L)$q$, :'beto', :'troca3')) = 'P0002', '3. só quem propôs cancela');
SELECT assert((SELECT exclusivos_responder_troca(:'beto', :'troca3', FALSE)) = 'recusada', '3. Beto recusa');
SELECT exclusivos_propor_troca(:'ana', :'beto', :'item_a', :'item_b') AS troca4 \gset
SELECT assert((SELECT exclusivos_cancelar_troca(:'ana', :'troca4')) = 'cancelada', '3. Ana cancela a sua');
SELECT assert(como(:'jwt_ana', format($q$UPDATE exclusivos_trocas SET status = 'aceita' WHERE id = %L$q$, :'troca4')) = 'ok'
  AND (SELECT status FROM exclusivos_trocas WHERE id = :'troca4') = 'cancelada', '4. ninguém muda proposta na mão');

-- --- 4) Cada um vê os próprios resgates ---------------------------------------------
SELECT assert(ve(:'jwt_ana', 'SELECT 1 FROM missao_resgates') = 3 AND ve(:'jwt_beto', 'SELECT 1 FROM missao_resgates') = 0,
  '4. os resgates de cada um são só dele');
