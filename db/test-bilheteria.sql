-- ############################################################################
-- ATENÇÃO: NÃO RODE ESTE ARQUIVO NO SUPABASE — ele cria contas e pedidos falsos.
-- Para configurar o banco, use apenas db/schema.sql.
-- ############################################################################
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_admin'))
     OR EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    RAISE EXCEPTION 'Arquivo de teste local. Para configurar o banco, use db/schema.sql.';
  END IF;
END $$;

-- Verificação da bilheteria própria.
--
--   1. compra gratuita confirma na hora e emite o ingresso;
--   2. compra paga fica pendente, sem emitir ingresso antes de pagar;
--   3. confirmar o pagamento emite, e reconfirmar NÃO duplica (webhook repetido);
--   4. o estoque não fica negativo: pedir mais que o disponível é recusado;
--   5. cancelar devolve o estoque;
--   6. limite por pedido é respeitado;
--   7. o comprador vê só os próprios ingressos; o dono do evento vê os do evento;
--   8. check-in funciona uma vez só, e só para quem organiza.

\set ON_ERROR_STOP on
\pset pager off

\set org   '55555555-5555-5555-5555-555555555555'
\set ana   '66666666-6666-6666-6666-666666666666'
\set caio  '77777777-7777-7777-7777-777777777777'
\set jwt_org  '{"sub":"55555555-5555-5555-5555-555555555555","email":"org@exemplo.com","role":"authenticated"}'
\set jwt_ana  '{"sub":"66666666-6666-6666-6666-666666666666","email":"ana@exemplo.com","role":"authenticated"}'
\set jwt_caio '{"sub":"77777777-7777-7777-7777-777777777777","email":"caio@exemplo.com","role":"authenticated"}'

CREATE OR REPLACE FUNCTION assert(p_cond BOOLEAN, p_label TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond THEN RAISE NOTICE 'ok   %', p_label;
  ELSE RAISE EXCEPTION 'FALHOU: %', p_label; END IF;
END; $$;

-- --- Cenário: um produtor com um evento e dois tipos de ingresso -------------
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'org',  'org@exemplo.com',  '{"tenant_slug":"produtora"}'),
  (:'ana',  'ana@exemplo.com',  '{"tenant_slug":"ana"}'),
  (:'caio', 'caio@exemplo.com', '{"tenant_slug":"caio"}')
ON CONFLICT DO NOTHING;

INSERT INTO events (id, tenant_id, title, category, event_date, location, image_url, description, city)
SELECT '99999999-9999-9999-9999-999999999999', tenant_id, 'Show na Praça', 'musica', '20 de set',
       'Praça Central', 'https://x/i.jpg', 'teste', 'São Paulo'
FROM profiles WHERE id = :'org';

INSERT INTO ticket_types (id, event_id, tenant_id, name, price_cents, quantity, max_per_order)
SELECT 'aaaaaaaa-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', tenant_id,
       'Gratuito', 0, 5, 2 FROM profiles WHERE id = :'org';
INSERT INTO ticket_types (id, event_id, tenant_id, name, price_cents, quantity, max_per_order)
SELECT 'aaaaaaaa-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', tenant_id,
       'Pista', 5000, 3, 2 FROM profiles WHERE id = :'org';

-- --- 1) Compra gratuita ------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT criar_pedido_ingresso(
    '99999999-9999-9999-9999-999999999999',
    '[{"ticket_type_id":"aaaaaaaa-0000-0000-0000-000000000001","quantity":2}]'::jsonb,
    'Ana', 'ana@exemplo.com') AS pedido_gratuito \gset
COMMIT;

SELECT assert(
  (SELECT status FROM ticket_orders WHERE user_id = :'ana') = 'pago'
  AND (SELECT count(*) FROM tickets WHERE user_id = :'ana') = 2,
  '1. compra gratuita confirma na hora e emite 2 ingressos');

SELECT assert((SELECT sold FROM ticket_types WHERE name = 'Gratuito') = 2,
  '1. estoque do gratuito baixou para 2');

-- --- 2) Compra paga fica pendente -------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  SELECT criar_pedido_ingresso(
    '99999999-9999-9999-9999-999999999999',
    '[{"ticket_type_id":"aaaaaaaa-0000-0000-0000-000000000002","quantity":2}]'::jsonb,
    'Caio', 'caio@exemplo.com') AS pedido_pago \gset
COMMIT;

SELECT assert(
  (SELECT status FROM ticket_orders WHERE user_id = :'caio') = 'pendente'
  AND (SELECT total_cents FROM ticket_orders WHERE user_id = :'caio') = 10000
  AND (SELECT count(*) FROM tickets WHERE user_id = :'caio') = 0,
  '2. compra paga fica pendente, total R$ 100,00, sem emitir ingresso');

-- --- 3) Confirmar pagamento emite; reconfirmar não duplica -------------------
SELECT confirmar_pedido_ingresso((SELECT id FROM ticket_orders WHERE user_id = :'caio'), 'mp-123');
SELECT assert((SELECT count(*) FROM tickets WHERE user_id = :'caio') = 2,
  '3. pagamento confirmado emitiu 2 ingressos');
SELECT confirmar_pedido_ingresso((SELECT id FROM ticket_orders WHERE user_id = :'caio'), 'mp-123');
SELECT assert((SELECT count(*) FROM tickets WHERE user_id = :'caio') = 2,
  '3. webhook repetido NÃO duplica ingresso');

-- --- 4) Estoque não fica negativo -------------------------------------------
-- Restam 1 de "Pista" (3 - 2). Pedir 2 tem de falhar.
DO $$
DECLARE v_ok BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","email":"ana@exemplo.com"}', TRUE);
    PERFORM criar_pedido_ingresso(
      '99999999-9999-9999-9999-999999999999',
      '[{"ticket_type_id":"aaaaaaaa-0000-0000-0000-000000000002","quantity":2}]'::jsonb, 'Ana', 'a@b.c');
  EXCEPTION WHEN OTHERS THEN
    v_ok := SQLERRM LIKE '%Restam apenas 1%';
  END;
  PERFORM assert(v_ok, '4. pedir mais que o estoque é recusado com a quantidade restante');
END $$;

SELECT assert((SELECT sold FROM ticket_types WHERE name = 'Pista') = 2,
  '4. o estoque não foi alterado pela tentativa recusada');

-- --- 5) Limite por pedido ----------------------------------------------------
DO $$
DECLARE v_ok BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","email":"ana@exemplo.com"}', TRUE);
    PERFORM criar_pedido_ingresso(
      '99999999-9999-9999-9999-999999999999',
      '[{"ticket_type_id":"aaaaaaaa-0000-0000-0000-000000000001","quantity":3}]'::jsonb, 'Ana', 'a@b.c');
  EXCEPTION WHEN OTHERS THEN
    v_ok := SQLERRM LIKE '%Máximo de 2%';
  END;
  PERFORM assert(v_ok, '5. limite de ingressos por pedido é respeitado');
END $$;

-- --- 6) Cancelar devolve o estoque ------------------------------------------
SELECT cancelar_pedido_ingresso((SELECT id FROM ticket_orders WHERE user_id = :'caio'));
SELECT assert(
  (SELECT sold FROM ticket_types WHERE name = 'Pista') = 0
  AND (SELECT status FROM ticket_orders WHERE user_id = :'caio') = 'cancelado'
  AND (SELECT count(*) FROM tickets WHERE user_id = :'caio' AND status = 'cancelado') = 2,
  '6. cancelamento devolve o estoque e invalida os ingressos');

-- --- 7) Quem vê o quê --------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT assert((SELECT count(*) FROM tickets) = 2, '7. Ana vê apenas os 2 ingressos dela');
  SELECT assert((SELECT count(*) FROM ticket_orders) = 1, '7. Ana vê apenas o pedido dela');
COMMIT;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_org';
  SELECT assert((SELECT count(*) FROM tickets) = 4, '7. o produtor vê os 4 ingressos do evento dele');
COMMIT;

-- --- 8) Check-in -------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  SELECT assert(
    (validar_ingresso((SELECT code FROM tickets WHERE user_id = '66666666-6666-6666-6666-666666666666' LIMIT 1)) ->> 'ok')::boolean = FALSE,
    '8. quem não organiza o evento não valida ingresso');
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_org';
  SELECT assert(
    (validar_ingresso((SELECT code FROM tickets WHERE user_id = '66666666-6666-6666-6666-666666666666' ORDER BY code LIMIT 1)) ->> 'ok')::boolean = TRUE,
    '8. o produtor valida o ingresso');
  SELECT assert(
    (validar_ingresso((SELECT code FROM tickets WHERE user_id = '66666666-6666-6666-6666-666666666666' ORDER BY code LIMIT 1)) ->> 'ok')::boolean = FALSE,
    '8. o mesmo ingresso NÃO passa duas vezes');
COMMIT;

-- --- 9) Ninguém emite ingresso por fora --------------------------------------
DO $$
DECLARE v_ok BOOLEAN := FALSE;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","email":"ana@exemplo.com"}', TRUE);
    INSERT INTO tickets (order_id, ticket_type_id, event_id, user_id, code)
    VALUES ((SELECT id FROM ticket_orders LIMIT 1), 'aaaaaaaa-0000-0000-0000-000000000002',
            '99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'FRAUDE');
  EXCEPTION WHEN OTHERS THEN v_ok := TRUE;
  END;
  RESET ROLE;
  PERFORM assert(v_ok, '9. usuário não consegue emitir ingresso direto na tabela');
END $$;

-- --- 10) Quem pode CHAMAR cada função ----------------------------------------
-- O PostgREST publica /rest/v1/rpc/<função> e o PostgreSQL concede EXECUTE a
-- PUBLIC por padrão. Sem REVOKE, um comprador chamava confirmar_pedido_ingresso
-- no próprio pedido e saía com ingresso pago sem pagar. Estas verificações
-- existem para que essa porta não reabra por descuido em uma função nova.
CREATE OR REPLACE FUNCTION nega_execucao(p_sql TEXT, p_label TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_ok BOOLEAN := FALSE;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
      '{"sub":"77777777-7777-7777-7777-777777777777","email":"caio@exemplo.com"}', TRUE);
    EXECUTE p_sql;
  EXCEPTION
    WHEN insufficient_privilege THEN v_ok := TRUE;
    WHEN OTHERS THEN v_ok := FALSE;
  END;
  RESET ROLE;
  PERFORM assert(v_ok, p_label);
END; $$;

DO $$
DECLARE v_order UUID := (SELECT id FROM ticket_orders LIMIT 1);
BEGIN
  PERFORM nega_execucao(format('SELECT confirmar_pedido_ingresso(%L, %L)', v_order, 'x'),
    '10. usuário logado NÃO confirma pagamento de pedido');
  PERFORM nega_execucao(format('SELECT emitir_ingressos(%L)', v_order),
    '10. usuário logado NÃO emite ingresso');
  PERFORM nega_execucao(format('SELECT cancelar_pedido_ingresso(%L)', v_order),
    '10. usuário logado NÃO cancela pedido arbitrário');
  PERFORM nega_execucao('SELECT expirar_pedidos_vencidos()',
    '10. usuário logado NÃO dispara a expiração em massa');
END $$;

-- Anônimo não pode transformar e-mail em nome de pessoa.
DO $$
DECLARE v_ok BOOLEAN := FALSE;
BEGIN
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM find_profile_by_email('org@exemplo.com');
  EXCEPTION WHEN insufficient_privilege THEN v_ok := TRUE;
  END;
  RESET ROLE;
  PERFORM assert(v_ok, '10. anônimo NÃO consulta perfil por e-mail');
END $$;

-- --- 11) O comprador desiste do próprio pedido pendente ----------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT criar_pedido_ingresso(
    '99999999-9999-9999-9999-999999999999',
    '[{"ticket_type_id":"aaaaaaaa-0000-0000-0000-000000000002","quantity":1}]'::jsonb,
    'Ana', 'ana@exemplo.com');
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  SELECT assert(
    (SELECT count(*) FROM (
      SELECT cancelar_meu_pedido(o.id) FROM ticket_orders o
      WHERE o.user_id = :'ana' AND o.status = 'pendente'
    ) t) = 0,
    '11. Caio não enxerga o pedido pendente de Ana para cancelar');
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT assert(
    cancelar_meu_pedido((SELECT id FROM ticket_orders WHERE user_id = :'ana' AND status = 'pendente')) = TRUE,
    '11. Ana cancela o próprio pedido pendente');
COMMIT;

SELECT assert((SELECT sold FROM ticket_types WHERE name = 'Pista') = 0,
  '11. o cancelamento devolveu o estoque');

\echo ''
\echo 'Todas as verificações da bilheteria passaram.'
