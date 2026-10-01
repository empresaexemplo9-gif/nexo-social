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

-- Verificação das listas compartilhadas e das rodas de conversa.
--
--   shim → schema → platform-invites → community-*.sql → moderacao.sql → social.sql
--   → listas-rodas.sql → este arquivo
--
--   1. lista: quem vê é escolha de quem cria; só quem criou mexe nos itens;
--   2. reação e comentário na lista inteira e em cada item (uma reação por alvo),
--      o item tem de ser da mesma lista, e o comentário avisa quem criou;
--   3. palavra proibida: na fala de quem escreve, bane; no nome da obra, só barra;
--   4. roda: quem vê entra; só quem está nela lê e escreve;
--   5. encerrar: só quem abriu; as mensagens somem e cada um recebe o aviso;
--      depois, só quem participou vê a roda (para se adicionar aos contatos);
--   6. faxina: roda parada há 24 h encerra; encerrada há 7 dias some.

\set ON_ERROR_STOP on
\pset pager off

\set ana  'aaaaaaaa-0000-0000-0000-000000000011'
\set beto 'aaaaaaaa-0000-0000-0000-000000000012'
\set caio 'aaaaaaaa-0000-0000-0000-000000000013'
\set dani 'aaaaaaaa-0000-0000-0000-000000000014'

\set jwt_ana  '{"sub":"aaaaaaaa-0000-0000-0000-000000000011","role":"authenticated"}'
\set jwt_beto '{"sub":"aaaaaaaa-0000-0000-0000-000000000012","role":"authenticated"}'
\set jwt_caio '{"sub":"aaaaaaaa-0000-0000-0000-000000000013","role":"authenticated"}'
\set jwt_dani '{"sub":"aaaaaaaa-0000-0000-0000-000000000014","role":"authenticated"}'

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

-- Roda um comando como a pessoa; devolve o código do erro (ou 'ok').
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
  (:'ana',  'ana.lr@exemplo.com',  '{"full_name":"Ana Listas","tenant_slug":"ana-lr"}'),
  (:'beto', 'beto.lr@exemplo.com', '{"full_name":"Beto Listas","tenant_slug":"beto-lr"}'),
  (:'caio', 'caio.lr@exemplo.com', '{"full_name":"Caio Listas","tenant_slug":"caio-lr"}'),
  (:'dani', 'dani.lr@exemplo.com', '{"full_name":"Dani Listas","tenant_slug":"dani-lr"}')
ON CONFLICT DO NOTHING;
INSERT INTO platform_access (user_id) VALUES (:'ana'), (:'beto'), (:'caio'), (:'dani') ON CONFLICT DO NOTHING;
-- Ana e Beto são contatos; Caio e Dani não têm vínculo com ninguém.
INSERT INTO connections (user_id, contact_id, status) VALUES (:'ana', :'beto', 'aceito') ON CONFLICT DO NOTHING;

-- --- 1) Listas -------------------------------------------------------------------------------
SELECT assert(como(:'jwt_ana', $q$
  INSERT INTO listas (id, autor_id, tipo, titulo, descricao, visibilidade) VALUES
    ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000011', 'musicas', 'Para correr', 'Rock nacional que empurra', 'todos'),
    ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000011', 'livros', 'Lidos em 2026', NULL, 'contatos');
  INSERT INTO lista_itens (id, lista_id, posicao, titulo, subtitulo, youtube_id) VALUES
    ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 1, 'Tempo Perdido', 'Legião Urbana', 'aaaaaaaaaaa'),
    ('ffffffff-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000001', 2, 'Admirável Chip Novo', 'Pitty', 'bbbbbbbbbbb'),
    ('ffffffff-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000002', 1, 'Torto Arado', 'Itamar Vieira Junior', NULL);
$q$) = 'ok', '1. quem cria monta a lista com itens');

SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM listas') = 2, '1. o contato vê "todos" e "contatos"');
SELECT assert(ve(:'jwt_caio', 'SELECT 1 FROM listas') = 1, '1. quem não tem vínculo vê só a aberta a todos');
SELECT assert(ve(:'jwt_caio', 'SELECT 1 FROM lista_itens') = 2, '1. e só os itens dela');
SELECT assert(como(:'jwt_beto', $q$
  INSERT INTO lista_itens (lista_id, titulo) VALUES ('eeeeeeee-0000-0000-0000-000000000001', 'Intruso')
$q$) = '42501', '1. ninguém põe item na lista dos outros');
-- (Cada efeito é conferido num comando à parte: um comando só enxerga o banco como estava no começo dele.)
SELECT como(:'jwt_beto', $q$ DELETE FROM lista_itens WHERE lista_id = 'eeeeeeee-0000-0000-0000-000000000001' $q$);
SELECT assert((SELECT count(*) FROM lista_itens WHERE lista_id = 'eeeeeeee-0000-0000-0000-000000000001') = 2, '1. nem tira');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO listas (autor_id, tipo, titulo) VALUES ('aaaaaaaa-0000-0000-0000-000000000011', 'mista', 'Em nome da Ana')
$q$) = '42501', '1. ninguém cria lista em nome de outra pessoa');

-- --- 2) Reações e comentários ------------------------------------------------------------------
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO lista_reacoes (lista_id, item_id, user_id, reacao) VALUES
    ('eeeeeeee-0000-0000-0000-000000000001', NULL, 'aaaaaaaa-0000-0000-0000-000000000013', 'amei'),
    ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000013', 'curti'),
    ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000013', 'discordo');
$q$) = 'ok', '2. reage à lista inteira e a cada item');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO lista_reacoes (lista_id, item_id, user_id, reacao) VALUES
    ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000013', 'amei')
$q$) = '23505', '2. uma reação por pessoa em cada item');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO lista_reacoes (lista_id, item_id, user_id, reacao) VALUES
    ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000013', 'amei')
$q$) = '42501', '2. o item tem de ser da mesma lista');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO lista_comentarios (lista_id, autor_id, corpo) VALUES
    ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000013', 'opinando no que não vejo')
$q$) = '42501', '2. só comenta quem vê a lista');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO lista_comentarios (lista_id, item_id, autor_id, corpo) VALUES
    ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000013', 'Essa abre qualquer treino!')
$q$) = 'ok', '2. comenta um item');
SELECT assert((SELECT count(*) FROM notifications WHERE user_id = :'ana' AND type = 'lista'
               AND link = '/comunidade/lista/eeeeeeee-0000-0000-0000-000000000001'
               AND body LIKE 'Caio Listas comentou "Admirável Chip Novo" em "Para correr": Essa abre%') = 1,
  '2. o comentário avisa quem criou a lista, com o item');
SELECT como(:'jwt_ana', $q$ DELETE FROM lista_comentarios WHERE autor_id = 'aaaaaaaa-0000-0000-0000-000000000013' $q$);
SELECT assert(NOT EXISTS (SELECT 1 FROM lista_comentarios WHERE autor_id = :'caio'), '2. quem criou a lista apaga comentários dela');

-- --- 3) Regras da comunidade -------------------------------------------------------------------
SELECT assert(como(:'jwt_dani', $q$
  INSERT INTO listas (autor_id, tipo, titulo) VALUES ('aaaaaaaa-0000-0000-0000-000000000014', 'clipes', 'Clipes')
$q$) = 'ok', '3. (Dani cria uma lista)');
SELECT assert(como(:'jwt_dani', $q$
  INSERT INTO lista_itens (lista_id, titulo, subtitulo)
  SELECT id, 'Que porra é essa', 'Banda X' FROM listas WHERE autor_id = 'aaaaaaaa-0000-0000-0000-000000000014'
$q$) = 'P0001' AND NOT usuario_banido(:'dani'), '3. palavra proibida no nome da obra só barra o item');
SELECT como(:'jwt_dani', $q$
  INSERT INTO lista_itens (lista_id, titulo, nota)
  SELECT id, 'Um clipe', 'que merda de clipe' FROM listas WHERE autor_id = 'aaaaaaaa-0000-0000-0000-000000000014'
$q$);
SELECT assert(usuario_banido(:'dani') AND NOT EXISTS (SELECT 1 FROM lista_itens WHERE titulo = 'Um clipe'),
  '3. palavra proibida na nota de quem escreveu: não grava e bane');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM listas WHERE autor_id = ''aaaaaaaa-0000-0000-0000-000000000014''') = 0,
  '3. a lista da conta banida some para os outros');

-- --- 4) Rodas de conversa -----------------------------------------------------------------------
SELECT assert(como(:'jwt_ana', $q$
  INSERT INTO rodas (id, criador_id, tema, descricao, assunto_tipo, visibilidade) VALUES
    ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000011', 'O final de Torto Arado', 'Com spoiler!', 'livro', 'todos'),
    ('99999999-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000011', 'Só entre amigos', NULL, NULL, 'contatos');
$q$) = 'ok', '4. abre a roda');
SELECT assert(EXISTS (SELECT 1 FROM roda_participantes WHERE roda_id = '99999999-0000-0000-0000-000000000001' AND user_id = :'ana'),
  '4. quem abre já está na roda');
SELECT assert(ve(:'jwt_caio', 'SELECT 1 FROM rodas') = 1, '4. quem não é contato vê só a roda aberta a todos');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO roda_participantes (roda_id, user_id) VALUES ('99999999-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000013')
$q$) = '42501', '4. não entra na roda que não vê');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO roda_mensagens (roda_id, autor_id, corpo) VALUES ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000013', 'Oi!')
$q$) = '42501', '4. só escreve quem entrou');
SELECT assert(como(:'jwt_caio', $q$
  INSERT INTO roda_participantes (roda_id, user_id) VALUES ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000013');
  INSERT INTO roda_mensagens (roda_id, autor_id, corpo) VALUES ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000013', 'Achei o final lindo.');
$q$) = 'ok', '4. entra e conversa');
SELECT assert(como(:'jwt_beto', $q$
  INSERT INTO roda_participantes (roda_id, user_id) VALUES ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000012');
  INSERT INTO roda_mensagens (roda_id, autor_id, corpo) VALUES ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000012', 'Eu chorei.');
$q$) = 'ok', '4. (Beto também)');
SELECT assert(ve(:'jwt_beto', 'SELECT 1 FROM roda_mensagens') = 2, '4. quem está na roda lê a conversa');
SELECT assert(ve(:'jwt_dani', 'SELECT 1 FROM roda_mensagens') = 0, '4. quem não entrou não lê');

-- --- 5) Encerrar -------------------------------------------------------------------------------
SELECT assert(como(:'jwt_caio', $q$ SELECT encerrar_roda('99999999-0000-0000-0000-000000000001') $q$) = 'P0001',
  '5. só quem abriu encerra');
SELECT como(:'jwt_caio', $q$ UPDATE rodas SET aberta = FALSE, encerrada_em = NOW() $q$);
SELECT assert((SELECT aberta FROM rodas WHERE id = '99999999-0000-0000-0000-000000000001'), '5. nem por fora da função');
SELECT assert(como(:'jwt_ana', $q$ SELECT encerrar_roda('99999999-0000-0000-0000-000000000001') $q$) = 'ok', '5. quem abriu encerra');
SELECT assert(NOT EXISTS (SELECT 1 FROM roda_mensagens WHERE roda_id = '99999999-0000-0000-0000-000000000001'),
  '5. a conversa some');
SELECT assert((SELECT count(*) FROM notifications WHERE type = 'roda' AND link = '/comunidade/roda/99999999-0000-0000-0000-000000000001') = 3,
  '5. cada participante recebe o aviso do fim');
SELECT assert(ve(:'jwt_caio', 'SELECT 1 FROM roda_participantes WHERE roda_id = ''99999999-0000-0000-0000-000000000001''') = 3,
  '5. quem participou vê quem estava (para se adicionar)');
SELECT assert(ve(:'jwt_dani', 'SELECT 1 FROM rodas WHERE id = ''99999999-0000-0000-0000-000000000001''') = 0,
  '5. quem não participou não vê mais a roda');
SELECT assert(como(:'jwt_beto', $q$
  INSERT INTO roda_mensagens (roda_id, autor_id, corpo) VALUES ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000012', 'Volta!')
$q$) = '42501', '5. roda encerrada não recebe mensagem');
SELECT como(:'jwt_caio', $q$ DELETE FROM roda_participantes WHERE roda_id = '99999999-0000-0000-0000-000000000001' $q$);
SELECT assert((SELECT count(*) FROM roda_participantes WHERE roda_id = '99999999-0000-0000-0000-000000000001') = 3,
  '5. a lista de quem participou fica até a faxina');

-- --- 6) Faxina ---------------------------------------------------------------------------------
UPDATE rodas SET ultima_atividade = NOW() - INTERVAL '25 hours' WHERE id = '99999999-0000-0000-0000-000000000002';
SELECT rodas_faxina();
SELECT assert(NOT (SELECT aberta FROM rodas WHERE id = '99999999-0000-0000-0000-000000000002'), '6. roda parada há 24 h encerra');
UPDATE rodas SET encerrada_em = NOW() - INTERVAL '8 days' WHERE id = '99999999-0000-0000-0000-000000000001';
SELECT rodas_faxina();
SELECT assert(NOT EXISTS (SELECT 1 FROM rodas WHERE id = '99999999-0000-0000-0000-000000000001')
              AND NOT EXISTS (SELECT 1 FROM roda_participantes WHERE roda_id = '99999999-0000-0000-0000-000000000001'),
  '6. roda encerrada há 7 dias some de vez');
SELECT assert((SELECT busca FROM listas WHERE id = 'eeeeeeee-0000-0000-0000-000000000001') = 'para correr rock nacional que empurra',
  '6. a lista entra na busca');

\echo 'test-listas-rodas: todas as verificações passaram'
