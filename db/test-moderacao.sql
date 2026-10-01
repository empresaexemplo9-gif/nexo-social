-- ############################################################################
-- ATENÇÃO: NÃO RODE ESTE ARQUIVO NO SUPABASE.
--
-- Ele cria usuários falsos em auth.users para testar as regras. Para
-- configurar seu banco, use apenas db/moderacao.sql.
-- ############################################################################

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_admin'))
     OR EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    RAISE EXCEPTION
      'Este arquivo é só para um Postgres local de teste — ele cria contas falsas. Para configurar o banco, use db/moderacao.sql.';
  END IF;
END $$;

-- Verificação das regras da comunidade (palavras proibidas e banimento).
--
--   psql -h /tmp/sock -U postgres -f db/supabase-shim.sql
--   psql -h /tmp/sock -U postgres -f db/schema.sql
--   psql -h /tmp/sock -U postgres -f db/platform-invites.sql
--   psql -h /tmp/sock -U postgres -f db/community-chat.sql   (e as outras da Comunidade)
--   psql -h /tmp/sock -U postgres -f db/moderacao.sql
--   psql -h /tmp/sock -U postgres -f db/test-moderacao.sql
--
-- Checa, com asserção, que:
--   1. a normalização tira acento, desfaz número no lugar de letra e junta letras soltas;
--   2. o termo é achado com disfarce (repetição, número, acento, letras soltas, frase);
--   3. palavra inocente parecida não é confundida (cultura, Níger, disputa, FODMAP…);
--   4. texto limpo é gravado normalmente;
--   5. texto com termo proibido não é gravado, e quem escreveu é banido e perde o acesso;
--   6. numa edição, só o que mudou é conferido;
--   7. o administrador não é banido (o texto dele só é descartado);
--   8. só o administrador revoga, e revogar devolve o acesso;
--   9. a pessoa vê o próprio banimento, mas não o dos outros, e não escreve na tabela;
--  10. termos e aceite das regras: só o administrador mexe nos termos; cada um aceita as regras.

\set ON_ERROR_STOP on
\pset pager off

\set ana   '88888888-8888-8888-8888-888888888881'
\set beto  '88888888-8888-8888-8888-888888888882'
\set admin '88888888-8888-8888-8888-888888888883'

\set jwt_ana   '{"sub":"88888888-8888-8888-8888-888888888881","email":"ana.mod@exemplo.com","role":"authenticated"}'
\set jwt_beto  '{"sub":"88888888-8888-8888-8888-888888888882","email":"beto.mod@exemplo.com","role":"authenticated"}'
\set jwt_admin '{"sub":"88888888-8888-8888-8888-888888888883","email":"thiagohccarvalho00@gmail.com","role":"authenticated"}'

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

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'ana',   'ana.mod@exemplo.com',  '{"full_name":"Ana Moderação","tenant_slug":"ana-mod"}'),
  (:'beto',  'beto.mod@exemplo.com', '{"full_name":"Beto Moderação","tenant_slug":"beto-mod"}'),
  (:'admin', 'thiagohccarvalho00@gmail.com', '{"full_name":"Admin","tenant_slug":"admin-mod"}')
ON CONFLICT DO NOTHING;
INSERT INTO platform_access (user_id) VALUES (:'ana'), (:'beto') ON CONFLICT DO NOTHING;

-- --- 1) Normalização ------------------------------------------------------------
SELECT assert(moderacao_base('Ação, ÉPICA!! 2026') = 'acao epica o', '1. sem acento, minúsculo, número vira letra');
SELECT assert(moderacao_normalizar('p.o.r.r.a sim') = 'p o r r a sim  porra', '1. letras soltas em sequência também aparecem juntas');
SELECT assert(moderacao_padrao('porra') = 'p+o+r{2,}a+', '1. letra dobrada no termo exige pelo menos duas');

-- --- 2) Termos achados ---------------------------------------------------------------
SELECT assert(moderacao_termo('Que porrrraaa é essa') = 'porrrraaa', '2. repetição de letras');
SELECT assert(moderacao_termo('P0RR4 de novo') IS NOT NULL, '2. número no lugar de letra');
SELECT assert(moderacao_termo('p o r r a') IS NOT NULL, '2. letras soltas');
SELECT assert(moderacao_termo('p.o.r.r.a') IS NOT NULL, '2. letras soltas com ponto');
SELECT assert(moderacao_termo('CARALHOOO que show') IS NOT NULL, '2. prefixo, em maiúscula');
SELECT assert(moderacao_termo('vai tomar no cu') = 'no cu', '2. frase');
SELECT assert(moderacao_termo('seu filho da puta') = 'puta', '2. palavra dentro da expressão');
SELECT assert(moderacao_termo('esse cuzão') IS NOT NULL, '2. com acento no texto e no termo');
SELECT assert(moderacao_termo('fucking hell') IS NOT NULL, '2. prefixo em inglês');

-- --- 3) Palavras inocentes ------------------------------------------------------------
SELECT assert(moderacao_termo('A cultura de Cuba e o escopo da obra') IS NULL, '3. "cu" dentro de palavra não conta');
SELECT assert(moderacao_termo('Níger é um país da África') IS NULL, '3. nome de país parecido com termo em inglês');
SELECT assert(moderacao_termo('A disputa pela reputação, putz') IS NULL, '3. "puta" dentro de palavra não conta');
SELECT assert(moderacao_termo('Dieta low FODMAP e picanha no almoço') IS NULL, '3. FODMAP e picanha passam');
SELECT assert(moderacao_termo('Uma pora de coisa, a porta da casa') IS NULL, '3. "porra" exige o r dobrado');
SELECT assert(moderacao_termo('') IS NULL AND moderacao_termo(NULL) IS NULL, '3. vazio e nulo');
SELECT assert(moderacao_termo('Fui no Rock in Rio, foi maravilhoso porém cansativo; será que vou gostar do The Town?') IS NULL,
  '3. o relato do usuário passa');

-- --- 4) Texto limpo é gravado ---------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO community_groups (id, owner_id, name, description)
  VALUES ('99999999-0000-0000-0000-000000000001', :'ana', 'Clube do livro', 'Conversas sobre o que lemos');
COMMIT;
SELECT assert(EXISTS (SELECT 1 FROM community_groups WHERE id = '99999999-0000-0000-0000-000000000001'),
  '4. texto limpo é gravado');

-- --- 6) Edição sem mexer no texto (antes do banimento, para testar a regra) -------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  UPDATE community_groups SET privacy = 'aberto' WHERE id = '99999999-0000-0000-0000-000000000001';
COMMIT;
SELECT assert((SELECT privacy FROM community_groups WHERE id = '99999999-0000-0000-0000-000000000001') = 'aberto',
  '6. edição que não mexe no texto passa');

-- --- 5) Texto proibido: não grava e bane ------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO community_posts (group_id, author_id, kind, body)
  VALUES ('99999999-0000-0000-0000-000000000001', :'ana', 'recado', 'Que livro de merda');
COMMIT;
SELECT assert(NOT EXISTS (SELECT 1 FROM community_posts WHERE body LIKE '%merda%'), '5. o texto proibido não é gravado');
SELECT assert(usuario_banido(:'ana'), '5. quem escreveu é banido');
SELECT assert((SELECT termo FROM user_bans WHERE user_id = :'ana') = 'merda'
          AND (SELECT origem FROM user_bans WHERE user_id = :'ana') = 'community_posts'
          AND (SELECT trecho FROM user_bans WHERE user_id = :'ana') = 'Que livro de merda',
  '5. o banimento guarda o termo, a tabela e o trecho para revisão');
SELECT assert(NOT EXISTS (SELECT 1 FROM platform_access WHERE user_id = :'ana'), '5. e perde o acesso à plataforma');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  INSERT INTO community_groups (id, owner_id, name) VALUES ('99999999-0000-0000-0000-000000000002', :'beto', 'Grupo do Beto');
  -- Edição que troca o texto por um proibido também bane (e não grava).
  UPDATE community_groups SET description = 'só p0rr4' WHERE id = '99999999-0000-0000-0000-000000000002';
COMMIT;
SELECT assert((SELECT description FROM community_groups WHERE id = '99999999-0000-0000-0000-000000000002') IS NULL
          AND usuario_banido(:'beto'), '6. edição com texto proibido não grava e bane');

-- --- 7) Administrador ------------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_admin';
  INSERT INTO community_groups (id, owner_id, name) VALUES ('99999999-0000-0000-0000-000000000003', :'admin', 'Teste: puta merda');
COMMIT;
SELECT assert(NOT EXISTS (SELECT 1 FROM community_groups WHERE id = '99999999-0000-0000-0000-000000000003')
          AND NOT usuario_banido(:'admin'), '7. o texto do administrador é descartado, sem banir');

-- --- 8) Revogar ------------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"88888888-8888-8888-8888-888888888882","email":"beto.mod@exemplo.com","role":"authenticated"}', TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM revogar_banimento('88888888-8888-8888-8888-888888888882');
    RAISE EXCEPTION 'FALHOU: 8. quem não é administrador conseguiu revogar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    RAISE NOTICE 'ok   8. quem não é administrador não revoga';
  END;
END $$;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_admin';
  SELECT revogar_banimento(:'beto');
COMMIT;
SELECT assert(NOT usuario_banido(:'beto') AND EXISTS (SELECT 1 FROM platform_access WHERE user_id = :'beto')
          AND (SELECT revogado_por FROM user_bans WHERE user_id = :'beto') = :'admin',
  '8. o administrador revoga e o acesso volta (o histórico fica)');

-- --- 9) Quem vê os banimentos ------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT assert((SELECT count(*) FROM user_bans) = 1, '9. a pessoa vê só o próprio banimento');
  SAVEPOINT s;
  DO $$
  BEGIN
    DELETE FROM user_bans;
    IF (SELECT count(*) FROM user_bans) <> 1 THEN RAISE EXCEPTION 'FALHOU: 9. a pessoa apagou o próprio banimento'; END IF;
    RAISE NOTICE 'ok   9. a pessoa não apaga o próprio banimento';
  END $$;
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_admin';
  SELECT assert((SELECT count(*) FROM user_bans) = 2, '9. o administrador vê todos');
COMMIT;

-- --- 10) Termos e aceite -------------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  SELECT assert((SELECT count(*) FROM moderation_terms) = 0, '10. quem não é administrador não vê os termos');
  SELECT aceitar_regras();
  SELECT assert(EXISTS (SELECT 1 FROM community_rules_acceptance WHERE user_id = :'beto'), '10. a pessoa aceita as regras');
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_admin';
  INSERT INTO moderation_terms (termo, tipo) VALUES ('xingamentoteste', 'palavra');
COMMIT;
SELECT assert(moderacao_termo('isso é xingamentoteste') IS NOT NULL, '10. o administrador acrescenta um termo e ele passa a valer');
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_admin';
  DELETE FROM moderation_terms WHERE termo = 'xingamentoteste';
COMMIT;
SELECT assert(moderacao_termo('isso é xingamentoteste') IS NULL, '10. e tira');

\echo 'test-moderacao: todas as verificações passaram'
