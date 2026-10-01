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

-- Verificação do mural, das opiniões e da página de cada pessoa.
--
--   shim → schema → platform-invites → community-*.sql → moderacao.sql → social.sql → este arquivo
--
--   1. "todos" vê todo mundo; "contatos" só os contatos; "grupo" só os membros;
--   2. ninguém publica como outra pessoa nem num grupo de que não participa;
--   3. opina quem vê a publicação; a opinião avisa quem publicou e quem foi respondido;
--   4. quem publicou apaga as opiniões da própria publicação; os outros, só as suas;
--   5. uma reação por pessoa por publicação;
--   6. a página da pessoa: aberta a todos ou só aos contatos;
--   7. as regras da comunidade valem no mural, e conta banida some para os outros;
--   8. a busca usa o texto sem acento, com os números.

\set ON_ERROR_STOP on
\pset pager off

\set ana  'aaaaaaaa-0000-0000-0000-000000000001'
\set beto 'aaaaaaaa-0000-0000-0000-000000000002'
\set caio 'aaaaaaaa-0000-0000-0000-000000000003'
\set dani 'aaaaaaaa-0000-0000-0000-000000000004'

\set jwt_ana  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"ana.soc@exemplo.com","role":"authenticated"}'
\set jwt_beto '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"beto.soc@exemplo.com","role":"authenticated"}'
\set jwt_caio '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","email":"caio.soc@exemplo.com","role":"authenticated"}'
\set jwt_dani '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","email":"dani.soc@exemplo.com","role":"authenticated"}'

CREATE OR REPLACE FUNCTION assert(p_cond BOOLEAN, p_label TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond THEN RAISE NOTICE 'ok   %', p_label; ELSE RAISE EXCEPTION 'FALHOU: %', p_label; END IF;
END;
$$;

-- Quanto alguém enxerga de uma consulta (rodando como essa pessoa).
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

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'ana',  'ana.soc@exemplo.com',  '{"full_name":"Ana Social","tenant_slug":"ana-soc"}'),
  (:'beto', 'beto.soc@exemplo.com', '{"full_name":"Beto Social","tenant_slug":"beto-soc"}'),
  (:'caio', 'caio.soc@exemplo.com', '{"full_name":"Caio Social","tenant_slug":"caio-soc"}'),
  (:'dani', 'dani.soc@exemplo.com', '{"full_name":"Dani Social","tenant_slug":"dani-soc"}')
ON CONFLICT DO NOTHING;
INSERT INTO platform_access (user_id) VALUES (:'ana'), (:'beto'), (:'caio'), (:'dani') ON CONFLICT DO NOTHING;

-- Ana e Beto são contatos. Dani está no grupo da Ana. Caio não tem vínculo.
INSERT INTO connections (user_id, contact_id, status) VALUES (:'ana', :'beto', 'aceito') ON CONFLICT DO NOTHING;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO community_groups (id, owner_id, name) VALUES ('bbbbbbbb-0000-0000-0000-000000000001', :'ana', 'Shows');
COMMIT;
INSERT INTO community_members (group_id, user_id, role, status) VALUES ('bbbbbbbb-0000-0000-0000-000000000001', :'dani', 'membro', 'ativo');

-- --- 1) Visibilidade ------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO publicacoes (id, autor_id, tipo, assunto, assunto_tipo, corpo, visibilidade) VALUES
    ('cccccccc-0000-0000-0000-000000000001', :'ana', 'experiencia', 'Rock in Rio 2026', 'show',
     'Fui no Rock in Rio, foi maravilhoso porém cansativo. Será que eu iria gostar mais do The Town?', 'todos');
  INSERT INTO publicacoes (id, autor_id, tipo, corpo, visibilidade) VALUES
    ('cccccccc-0000-0000-0000-000000000002', :'ana', 'conversa', 'Só para os meus contatos', 'contatos');
  INSERT INTO publicacoes (id, autor_id, tipo, corpo, visibilidade, grupo_id) VALUES
    ('cccccccc-0000-0000-0000-000000000003', :'ana', 'pergunta', 'Quem vai no próximo show?', 'grupo', 'bbbbbbbb-0000-0000-0000-000000000001');
COMMIT;

SELECT assert(ve(:'jwt_ana',  'SELECT 1 FROM publicacoes') = 3, '1. quem publicou vê tudo o que publicou');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM publicacoes') = 2, '1. o contato vê "todos" e "contatos"');
SELECT assert(ve(:'jwt_dani', 'SELECT 1 FROM publicacoes') = 2, '1. o membro do grupo vê "todos" e a do grupo');
SELECT assert(ve(:'jwt_caio', 'SELECT 1 FROM publicacoes') = 1, '1. quem não tem vínculo vê só "todos"');

-- --- 2) Publicar como outro / em grupo alheio ---------------------------------------------
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO publicacoes (autor_id, tipo, corpo) VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'conversa', 'como se fosse a Ana');
    RAISE EXCEPTION 'FALHOU: 2. publicou como outra pessoa';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok   2. ninguém publica como outra pessoa';
  END;
  BEGIN
    INSERT INTO publicacoes (autor_id, tipo, corpo, visibilidade, grupo_id)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000003', 'conversa', 'entrando no grupo', 'grupo', 'bbbbbbbb-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'FALHOU: 2. publicou num grupo de que não participa';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok   2. ninguém publica num grupo de que não participa';
  END;
END $$;

-- --- 3) Opiniões e avisos --------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  INSERT INTO publicacao_comentarios (id, publicacao_id, autor_id, corpo)
  VALUES ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', :'caio', 'Vai no The Town sim, é mais tranquilo!');
COMMIT;
SELECT assert((SELECT count(*) FROM notifications WHERE user_id = :'ana' AND type = 'opiniao'
               AND link = '/comunidade/publicacao/cccccccc-0000-0000-0000-000000000001'
               AND body LIKE 'Caio Social opinou sobre "Rock in Rio 2026": Vai no The Town%') = 1,
  '3. a opinião avisa quem publicou, com o assunto e o link');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  INSERT INTO publicacao_comentarios (publicacao_id, autor_id, resposta_a, corpo)
  VALUES ('cccccccc-0000-0000-0000-000000000001', :'beto', 'dddddddd-0000-0000-0000-000000000001', 'Concordo com o Caio');
COMMIT;
SELECT assert((SELECT count(*) FROM notifications WHERE user_id = :'caio' AND type = 'opiniao' AND title = 'Responderam sua opinião') = 1,
  '3. a resposta avisa quem foi respondido');

-- Responder, numa publicação, a uma opinião de outra (aviso enganoso para quem foi "respondido").
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO publicacao_comentarios (publicacao_id, autor_id, resposta_a, corpo)
    VALUES ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 'resposta fora do lugar');
    RAISE EXCEPTION 'FALHOU: 3. respondeu a opinião de outra publicação';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok   3. só responde a opinião da mesma publicação';
  END;
END $$;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO publicacao_comentarios (publicacao_id, autor_id, corpo)
    VALUES ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'opinando no que não vejo');
    RAISE EXCEPTION 'FALHOU: 3. opinou numa publicação que não vê';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok   3. só opina quem vê a publicação';
  END;
END $$;

-- --- 4) Quem apaga opinião --------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  DELETE FROM publicacao_comentarios WHERE id = 'dddddddd-0000-0000-0000-000000000001';
COMMIT;
SELECT assert(EXISTS (SELECT 1 FROM publicacao_comentarios WHERE id = 'dddddddd-0000-0000-0000-000000000001'),
  '4. ninguém apaga a opinião dos outros numa publicação alheia');
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DELETE FROM publicacao_comentarios WHERE id = 'dddddddd-0000-0000-0000-000000000001';
COMMIT;
SELECT assert(NOT EXISTS (SELECT 1 FROM publicacao_comentarios WHERE id = 'dddddddd-0000-0000-0000-000000000001'),
  '4. quem publicou apaga opiniões da própria publicação');

-- --- 5) Reações ---------------------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  INSERT INTO publicacao_reacoes (publicacao_id, user_id, reacao) VALUES ('cccccccc-0000-0000-0000-000000000001', :'beto', 'curti')
  ON CONFLICT (publicacao_id, user_id) DO UPDATE SET reacao = EXCLUDED.reacao;
  INSERT INTO publicacao_reacoes (publicacao_id, user_id, reacao) VALUES ('cccccccc-0000-0000-0000-000000000001', :'beto', 'concordo')
  ON CONFLICT (publicacao_id, user_id) DO UPDATE SET reacao = EXCLUDED.reacao;
COMMIT;
SELECT assert((SELECT string_agg(reacao, ',') FROM publicacao_reacoes WHERE user_id = :'beto') = 'concordo',
  '5. uma reação por pessoa por publicação (trocar substitui)');

-- Caio reage ao que vê e tenta mover a reação para a publicação só dos contatos da Ana.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  INSERT INTO publicacao_reacoes (publicacao_id, user_id, reacao) VALUES ('cccccccc-0000-0000-0000-000000000001', :'caio', 'amei');
COMMIT;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE publicacao_reacoes SET publicacao_id = 'cccccccc-0000-0000-0000-000000000002'
     WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000003';
    RAISE EXCEPTION 'FALHOU: 5. moveu a reação para publicação que não vê';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok   5. a reação não vai para publicação que a pessoa não vê';
  END;
END $$;

-- --- 6) Página da pessoa ------------------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO perfil_social (user_id, bio, visibilidade_perfil) VALUES (:'ana', 'Gosto de shows e livros', 'contatos');
COMMIT;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  SELECT assert((SELECT pode_ver FROM perfil_publico(:'ana')) = FALSE AND (SELECT contato FROM perfil_publico(:'ana')) = 'nenhum',
    '6. página "só contatos" fechada para quem não é contato');
  SELECT assert((SELECT count(*) FROM perfil_social) = 0, '6. ninguém lê a configuração do perfil alheio direto');
COMMIT;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  SELECT assert((SELECT pode_ver FROM perfil_publico(:'ana')) AND (SELECT bio FROM perfil_publico(:'ana')) = 'Gosto de shows e livros',
    '6. aberta para o contato, com a bio');
COMMIT;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  UPDATE perfil_social SET visibilidade_perfil = 'todos' WHERE user_id = :'ana';
COMMIT;
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  SELECT assert((SELECT pode_ver FROM perfil_publico(:'ana')), '6. aberta a todos quando a pessoa escolhe');
COMMIT;

-- --- 7) Regras da comunidade no mural ------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  INSERT INTO publicacao_comentarios (publicacao_id, autor_id, corpo)
  VALUES ('cccccccc-0000-0000-0000-000000000001', :'caio', 'que show de merda');
COMMIT;
SELECT assert(NOT EXISTS (SELECT 1 FROM publicacao_comentarios WHERE corpo LIKE '%merda%') AND usuario_banido(:'caio'),
  '7. opinião com palavra proibida não é gravada e bane');
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO publicacoes (autor_id, tipo, corpo) VALUES ('aaaaaaaa-0000-0000-0000-000000000003', 'conversa', 'voltei');
    RAISE EXCEPTION 'FALHOU: 7. conta banida publicou';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok   7. conta banida não publica';
  END;
END $$;
INSERT INTO publicacoes (id, autor_id, tipo, corpo) VALUES ('cccccccc-0000-0000-0000-000000000009', :'caio', 'conversa', 'publicada antes do banimento');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM publicacoes WHERE autor_id = ''aaaaaaaa-0000-0000-0000-000000000003''') = 0,
  '7. o que a conta banida publicou some para os outros');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM perfil_publico(''aaaaaaaa-0000-0000-0000-000000000003'') WHERE banido AND NOT pode_ver') = 1,
  '7. a página da conta banida fica fechada');

-- --- 8) Busca ---------------------------------------------------------------------------------------
SELECT assert(busca_normalizar('Rock in Rio 2026: ÓTIMO!') = 'rock in rio 2026 otimo', '8. sem acento, minúsculo, números mantidos');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM publicacoes WHERE busca LIKE ''%the town%'' AND busca LIKE ''%rock in rio%''') = 1,
  '8. acha pelo texto, respeitando quem vê');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM publicacoes WHERE busca LIKE ''%proximo show%''') = 0,
  '8. a busca não mostra o que a pessoa não pode ver');

\echo 'test-social: todas as verificações passaram'
