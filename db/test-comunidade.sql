-- ############################################################################
-- ATENÇÃO: NÃO RODE ESTE ARQUIVO NO SUPABASE.
--
-- Ele cria usuários falsos em auth.users para testar as regras. Num projeto
-- real isso sujaria a base de contas. Para configurar seu banco, use apenas
-- db/schema.sql.
-- ############################################################################

-- Trava: aborta se detectar que o banco é um Supabase de verdade.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_admin'))
     OR EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    RAISE EXCEPTION
      'Este arquivo é só para um Postgres local de teste — ele cria contas falsas. Para configurar o banco, use db/schema.sql.';
  END IF;
END $$;

-- Verificação dos convites dentro da plataforma e da Comunidade.
--
-- Roda contra um Postgres limpo, depois do shim e do schema (veja o passo a
-- passo em db/test-multitenant.sql):
--
--   psql -h /tmp/sock -U postgres -f db/supabase-shim.sql
--   psql -h /tmp/sock -U postgres -f db/schema.sql
--   psql -h /tmp/sock -U postgres -f db/test-comunidade.sql
--
-- Checa, com asserção, que:
--
--   1. o convite para um compromisso vira notificação pendente para o convidado,
--      sem depender da service role;
--   2. a resposta (positivo/negativo) tira o convite de pendente e avisa quem criou;
--   3. a busca de pessoas acha pelo nome, mascara o e-mail de quem não tem
--      vínculo e não responde a quem não está logado;
--   4. quem cria um grupo já entra como dono;
--   5. o convite para o grupo notifica o convidado, que vê o grupo mas não o mural;
--   6. ninguém entra num grupo por conta própria sem convite ou link;
--   7. aceitar o convite dá acesso ao mural e avisa quem convidou;
--   8. o link de convite mostra o grupo a quem não tem conta e põe quem entra
--      pelo link direto no grupo;
--   9. a sala sincronizada é só dos membros e guarda o relógio do servidor;
--  10. o dono não abandona o grupo (apaga-o), e só autor ou dono apagam publicação;
--  11. quem não participa não convida;
--  12. grupo fechado: só o dono convida e só ele vê o link; aberto: todo membro;
--  13. só o dono muda o grupo (tipo, nome, imagem);
--  14. fotos e álbuns só para membros; foto só entra em publicação própria e em
--      álbum do mesmo grupo; apagar álbum mantém as fotos, apagar a publicação
--      apaga as fotos dela;
--  15. Storage: foto de perfil só na própria pasta, imagem do grupo só pelo
--      dono, fotos do grupo só entre membros;
--  16. ninguém aponta a foto de perfil para a pasta de outra pessoa.

\set ON_ERROR_STOP on
\pset pager off

\set ana  '55555555-5555-5555-5555-555555555555'
\set beto '66666666-6666-6666-6666-666666666666'
\set caio '77777777-7777-7777-7777-777777777777'

\set jwt_ana  '{"sub":"55555555-5555-5555-5555-555555555555","email":"ana@exemplo.com","role":"authenticated"}'
\set jwt_beto '{"sub":"66666666-6666-6666-6666-666666666666","email":"beto@exemplo.com","role":"authenticated"}'
\set jwt_caio '{"sub":"77777777-7777-7777-7777-777777777777","email":"caio@exemplo.com","role":"authenticated"}'

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
  (:'ana',  'ana@exemplo.com',  '{"full_name":"Ana Souza","tenant_slug":"ana"}'),
  (:'beto', 'beto@exemplo.com', '{"full_name":"Beto Lima","tenant_slug":"beto"}'),
  (:'caio', 'caio@exemplo.com', '{"full_name":"Caio Prado","tenant_slug":"caio"}')
ON CONFLICT DO NOTHING;

-- --- 1) Convite de compromisso → notificação pendente ------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO appointments (id, owner_id, title, starts_at, is_group)
  VALUES ('a0000000-0000-0000-0000-000000000001', :'ana', 'Jantar', '2026-10-10 20:00-03', TRUE);
  INSERT INTO appointment_participants (appointment_id, user_id)
  VALUES ('a0000000-0000-0000-0000-000000000001', :'beto');
COMMIT;

SELECT assert(
  (SELECT count(*) FROM notifications
    WHERE user_id = :'beto' AND type = 'convite' AND read_at IS NULL
      AND appointment_id = 'a0000000-0000-0000-0000-000000000001'
      AND body LIKE 'Ana Souza convidou você para "Jantar" em 10/10 às 20:00%') = 1,
  '1. convidado recebe o convite nas notificações, com nome de quem convidou e horário');

-- --- 2) Resposta tira de pendente e avisa quem criou -------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  UPDATE appointment_participants SET status = 'confirmado', responded_at = NOW()
   WHERE appointment_id = 'a0000000-0000-0000-0000-000000000001' AND user_id = :'beto';
COMMIT;

SELECT assert(
  (SELECT count(*) FROM notifications WHERE user_id = :'beto' AND type = 'convite' AND read_at IS NULL) = 0,
  '2. depois de responder, o convite deixa de estar pendente');
SELECT assert(
  (SELECT count(*) FROM notifications
    WHERE user_id = :'ana' AND type = 'resposta' AND title = 'Concordou com o compromisso'
      AND body = 'Beto Lima concordou com "Jantar".') = 1,
  '2. quem criou fica sabendo que o convidado concordou');

-- --- 3) Busca de pessoas -----------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT assert(
    (SELECT count(*) FROM search_profiles('') WHERE id = '66666666-6666-6666-6666-666666666666' AND proximo) = 1,
    '3. sem termo, sugere quem já esteve num compromisso com você');
  SELECT assert(
    (SELECT email_hint FROM search_profiles('caio')) = 'ca•••@exemplo.com',
    '3. acha pelo nome e mascara o e-mail de quem não tem vínculo');
  SELECT assert(
    (SELECT email_hint FROM search_profiles('CAIO@exemplo.com')) = 'caio@exemplo.com',
    '3. pelo e-mail exato, acha e mostra o e-mail digitado');
  SELECT assert(
    (SELECT count(*) FROM search_profiles('%')) = 0,
    '3. curinga do LIKE não lista a base inteira');
  SELECT assert(
    (SELECT count(*) FROM search_profiles('ana')) = 0,
    '3. a própria pessoa não aparece na busca');
COMMIT;
BEGIN;
  SET LOCAL ROLE anon;
  SET LOCAL "request.jwt.claims" = '{}';
  DO $$
  BEGIN
    PERFORM search_profiles('caio');
    RAISE EXCEPTION 'FALHOU: anônimo executou search_profiles';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   3. anônimo não consegue buscar pessoas';
  END $$;
COMMIT;

-- --- 4) Quem cria o grupo já é dono ----------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO community_groups (id, owner_id, name) VALUES ('b0000000-0000-0000-0000-000000000001', :'ana', 'Clube do livro');
COMMIT;

SELECT assert(
  (SELECT count(*) FROM community_members
    WHERE group_id = 'b0000000-0000-0000-0000-000000000001' AND user_id = :'ana' AND role = 'dono' AND status = 'ativo') = 1,
  '4. quem cria o grupo entra como dono');

-- --- 5) Convite do grupo -----------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO community_posts (group_id, author_id, kind, title, subtitle)
  VALUES ('b0000000-0000-0000-0000-000000000001', :'ana', 'livro', 'Dom Casmurro', 'Machado de Assis');
  SELECT assert(
    (SELECT resultado FROM invite_to_group('b0000000-0000-0000-0000-000000000001', ARRAY['66666666-6666-6666-6666-666666666666'::uuid])) = 'convidado',
    '5. membro convida uma conta da plataforma');
  SELECT assert(
    (SELECT resultado FROM invite_to_group('b0000000-0000-0000-0000-000000000001', ARRAY['66666666-6666-6666-6666-666666666666'::uuid])) = 'ja_convidado',
    '5. convidar de novo não duplica');
COMMIT;

SELECT assert(
  (SELECT count(*) FROM notifications
    WHERE user_id = :'beto' AND type = 'convite_grupo' AND read_at IS NULL
      AND group_id = 'b0000000-0000-0000-0000-000000000001') = 1,
  '5. convidado recebe o convite do grupo nas notificações');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  SELECT assert((SELECT count(*) FROM community_groups) = 1, '5. convidado enxerga o grupo para decidir');
  SELECT assert((SELECT count(*) FROM community_posts) = 0,  '5. mas não lê o mural antes de aceitar');
  SELECT assert(
    (SELECT my_status FROM my_community_groups() WHERE id = 'b0000000-0000-0000-0000-000000000001') = 'convidado'
    AND (SELECT invited_by_name FROM my_community_groups() WHERE id = 'b0000000-0000-0000-0000-000000000001') = 'Ana Souza',
    '5. o convite aparece em "meus grupos" com quem convidou');
COMMIT;

-- --- 6) Ninguém entra sozinho ----------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  DO $$
  BEGIN
    INSERT INTO community_members (group_id, user_id, role, status)
    VALUES ('b0000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'dono', 'ativo');
    RAISE EXCEPTION 'FALHOU: entrou no grupo sem convite';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   6. ninguém se põe no grupo (nem como dono) sem convite ou link';
  END $$;
  SELECT assert((SELECT count(*) FROM community_groups) = 0, '6. estranho não enxerga o grupo');
COMMIT;

-- --- 7) Aceitar dá acesso e avisa quem convidou -----------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  SELECT assert(respond_group_invite('b0000000-0000-0000-0000-000000000001', TRUE) = 'ativo', '7. convidado aceita (positivo)');
  SELECT assert((SELECT count(*) FROM community_posts) = 1, '7. e passa a ler o mural');
  INSERT INTO community_posts (group_id, author_id, kind, title, url, youtube_id)
  VALUES ('b0000000-0000-0000-0000-000000000001', :'beto', 'musica', 'Garota de Ipanema',
          'https://www.youtube.com/watch?v=KJzBxJ8ExRk', 'KJzBxJ8ExRk');
COMMIT;

SELECT assert(
  (SELECT count(*) FROM notifications WHERE user_id = :'beto' AND type = 'convite_grupo' AND read_at IS NULL) = 0,
  '7. o convite do grupo sai de pendente');
SELECT assert(
  (SELECT count(*) FROM notifications WHERE user_id = :'ana' AND type = 'resposta_grupo'
     AND body = 'Beto Lima entrou no grupo "Clube do livro".') = 1,
  '7. quem convidou fica sabendo');

-- --- 8) Link de convite -----------------------------------------------------
SELECT token FROM community_group_links WHERE group_id = 'b0000000-0000-0000-0000-000000000001' \gset

BEGIN;
  SET LOCAL ROLE anon;
  SET LOCAL "request.jwt.claims" = '{}';
  SELECT assert(
    (SELECT name FROM group_invite_preview(:'token')) = 'Clube do livro'
    AND (SELECT member_count FROM group_invite_preview(:'token')) = 2
    AND (SELECT owner_name FROM group_invite_preview(:'token')) = 'Ana Souza',
    '8. quem ainda não tem conta vê o grupo pelo link');
  SELECT assert((SELECT count(*) FROM group_invite_preview('curto')) = 0, '8. token curto ou errado não mostra nada');
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  SELECT assert(join_group_by_token(:'token') = 'b0000000-0000-0000-0000-000000000001', '8. entrar pelo link põe a pessoa no grupo');
  SELECT assert((SELECT count(*) FROM community_posts) = 2, '8. e ela já lê o mural');
COMMIT;

SELECT assert(
  (SELECT count(*) FROM notifications WHERE user_id = :'ana' AND type = 'entrou_grupo'
     AND body LIKE 'Caio Prado entrou no grupo "Clube do livro" pelo link%') = 1,
  '8. o dono fica sabendo de quem entrou pelo link');

-- --- 9) Sala sincronizada ---------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  INSERT INTO community_sessions (group_id, youtube_id, title, kind, is_playing, position_sec, updated_at, updated_by)
  VALUES ('b0000000-0000-0000-0000-000000000001', 'KJzBxJ8ExRk', 'Garota de Ipanema', 'musica', TRUE, 12,
          '2000-01-01', '55555555-5555-5555-5555-555555555555');
COMMIT;

SELECT assert(
  (SELECT updated_at > NOW() - INTERVAL '1 minute' AND updated_by = :'beto' FROM community_sessions),
  '9. a sala grava o relógio do servidor e quem mexeu, não o que o aparelho mandou');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('88888888-8888-8888-8888-888888888888', 'dani@exemplo.com', '{"full_name":"Dani"}')
ON CONFLICT DO NOTHING;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"88888888-8888-8888-8888-888888888888","email":"dani@exemplo.com","role":"authenticated"}';
  SELECT assert((SELECT count(*) FROM community_sessions) = 0, '9. quem não é membro não vê a sala');
  UPDATE community_sessions SET is_playing = FALSE;
COMMIT;

SELECT assert((SELECT is_playing FROM community_sessions), '9. quem não é membro não pausa a sala');

-- --- 10) Saídas e remoções --------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DELETE FROM community_members WHERE user_id = :'ana';
COMMIT;
SELECT assert(
  (SELECT count(*) FROM community_members WHERE user_id = :'ana' AND role = 'dono') = 1,
  '10. o dono não abandona o grupo (para sair, apaga o grupo)');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  DELETE FROM community_posts WHERE author_id = :'beto';
COMMIT;
SELECT assert((SELECT count(*) FROM community_posts WHERE author_id = :'beto') = 1, '10. membro não apaga publicação de outro');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DELETE FROM community_posts WHERE author_id = :'beto';
COMMIT;
SELECT assert((SELECT count(*) FROM community_posts WHERE author_id = :'beto') = 0, '10. o dono do grupo apaga qualquer publicação');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  DELETE FROM community_members WHERE user_id = :'caio';
COMMIT;
SELECT assert((SELECT count(*) FROM community_members WHERE user_id = :'caio') = 0, '10. membro sai do grupo quando quiser');

-- --- 11) Quem não participa não convida -------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_caio';
  DO $$
  BEGIN
    PERFORM invite_to_group('b0000000-0000-0000-0000-000000000001', ARRAY['88888888-8888-8888-8888-888888888888'::uuid]);
    RAISE EXCEPTION 'FALHOU: ex-membro convidou';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    RAISE NOTICE 'ok   11. quem não participa do grupo não convida';
  END $$;
COMMIT;

-- --- 12) Fechado × aberto -------------------------------------------------
-- Clube do livro é fechado (o padrão). Beto é membro, mas não é o dono.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  SELECT assert(
    (SELECT privacy FROM community_groups WHERE id = 'b0000000-0000-0000-0000-000000000001') = 'fechado',
    '12. grupo nasce fechado (controle de quem cria)');
  SELECT assert((SELECT count(*) FROM community_group_links) = 0, '12. fechado: membro não vê o link de convite');
  DO $$
  BEGIN
    PERFORM invite_to_group('b0000000-0000-0000-0000-000000000001', ARRAY['88888888-8888-8888-8888-888888888888'::uuid]);
    RAISE EXCEPTION 'FALHOU: membro convidou em grupo fechado';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    RAISE NOTICE 'ok   12. fechado: membro não convida (%)', SQLERRM;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT assert((SELECT count(*) FROM community_group_links) = 1, '12. fechado: o dono vê o link');
  UPDATE community_groups SET privacy = 'aberto' WHERE id = 'b0000000-0000-0000-0000-000000000001';
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  SELECT assert((SELECT count(*) FROM community_group_links) = 1, '12. aberto: membro vê o link');
  SELECT assert(
    (SELECT resultado FROM invite_to_group('b0000000-0000-0000-0000-000000000001', ARRAY['88888888-8888-8888-8888-888888888888'::uuid])) = 'convidado',
    '12. aberto: membro convida');
  UPDATE community_group_links SET token = replace(gen_random_uuid()::text, '-', '');
COMMIT;
SELECT assert(
  (SELECT token FROM community_group_links WHERE group_id = 'b0000000-0000-0000-0000-000000000001') = :'token',
  '12. só o dono troca o link');

-- --- 13) Só o dono muda o grupo --------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  UPDATE community_groups SET privacy = 'fechado', name = 'Tomado',
         image_path = 'grupos/b0000000-0000-0000-0000-000000000001/x.jpg'
   WHERE id = 'b0000000-0000-0000-0000-000000000001';
COMMIT;
SELECT assert(
  (SELECT name = 'Clube do livro' AND privacy = 'aberto' AND image_path IS NULL
     FROM community_groups WHERE id = 'b0000000-0000-0000-0000-000000000001'),
  '13. membro não muda tipo, nome nem imagem do grupo');
DO $$
BEGIN
  UPDATE community_groups SET image_path = 'grupos/outro/x.jpg' WHERE id = 'b0000000-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FALHOU: imagem fora da pasta do grupo';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'ok   13. a imagem do grupo fica sempre na pasta dele';
END $$;

-- --- 14) Fotos e álbuns -----------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  INSERT INTO community_albums (id, group_id, created_by, title)
  VALUES ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', :'beto', 'Encontro de setembro');
  INSERT INTO community_posts (id, group_id, author_id, kind)
  VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', :'beto', 'foto');
  INSERT INTO community_photos (group_id, post_id, album_id, uploader_id, storage_path, thumb_path, width, height)
  VALUES ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
          'c0000000-0000-0000-0000-000000000001', :'beto',
          'grupos/b0000000-0000-0000-0000-000000000001/f1.jpg', 'grupos/b0000000-0000-0000-0000-000000000001/f1_p.jpg', 2048, 1536),
         ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
          'c0000000-0000-0000-0000-000000000001', :'beto',
          'grupos/b0000000-0000-0000-0000-000000000001/f2.jpg', NULL, 800, 600);
COMMIT;
SELECT assert((SELECT count(*) FROM community_photos WHERE album_id = 'c0000000-0000-0000-0000-000000000001') = 2,
              '14. membro cria álbum e publica fotos nele, sem precisar de texto');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"88888888-8888-8888-8888-888888888888","email":"dani@exemplo.com","role":"authenticated"}';
  SELECT assert((SELECT count(*) FROM community_photos) = 0 AND (SELECT count(*) FROM community_albums) = 0,
                '14. quem não é membro não vê fotos nem álbuns (convite pendente não basta)');
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DO $$
  BEGIN
    -- Ana tentando pendurar uma foto na publicação do Beto.
    INSERT INTO community_photos (group_id, post_id, uploader_id, storage_path)
    VALUES ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
            '55555555-5555-5555-5555-555555555555', 'grupos/b0000000-0000-0000-0000-000000000001/f3.jpg');
    RAISE EXCEPTION 'FALHOU: foto em publicação de outra pessoa';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   14. foto só entra em publicação de quem a envia';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  DELETE FROM community_albums WHERE id = 'c0000000-0000-0000-0000-000000000001';
COMMIT;
SELECT assert(
  (SELECT count(*) FROM community_photos WHERE post_id = 'd0000000-0000-0000-0000-000000000001' AND album_id IS NULL) = 2,
  '14. apagar o álbum mantém as fotos no grupo');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DELETE FROM community_posts WHERE id = 'd0000000-0000-0000-0000-000000000001';
COMMIT;
SELECT assert((SELECT count(*) FROM community_photos) = 0, '14. apagar a publicação (aqui pelo dono do grupo) apaga as fotos dela');

-- --- 15) Storage --------------------------------------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('perfis', 'usuarios/66666666-6666-6666-6666-666666666666/eu.jpg', '66666666-6666-6666-6666-666666666666'),
         ('comunidade', 'grupos/b0000000-0000-0000-0000-000000000001/f9.jpg', '66666666-6666-6666-6666-666666666666');
  SELECT assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'comunidade') = 1, '15. membro envia e abre fotos do grupo');
  DO $$
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('perfis', 'usuarios/55555555-5555-5555-5555-555555555555/falsa.jpg');
    RAISE EXCEPTION 'FALHOU: enviou foto de perfil na pasta de outra pessoa';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   15. foto de perfil só na própria pasta';
  END $$;
  DO $$
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('perfis', 'grupos/b0000000-0000-0000-0000-000000000001/capa.jpg');
    RAISE EXCEPTION 'FALHOU: membro trocou a imagem do grupo';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   15. só o dono envia a imagem do grupo';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('perfis', 'grupos/b0000000-0000-0000-0000-000000000001/capa.jpg', '55555555-5555-5555-5555-555555555555');
  SELECT assert(TRUE, '15. o dono envia a imagem do grupo');
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"88888888-8888-8888-8888-888888888888","email":"dani@exemplo.com","role":"authenticated"}';
  SELECT assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'comunidade') = 0, '15. quem não é membro não abre as fotos do grupo');
  DO $$
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('comunidade', 'grupos/b0000000-0000-0000-0000-000000000001/intruso.jpg');
    RAISE EXCEPTION 'FALHOU: não membro enviou foto ao grupo';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   15. quem não é membro não envia fotos ao grupo';
  END $$;
  DO $$
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('comunidade', 'grupos/nao-e-uuid/x.jpg');
    RAISE EXCEPTION 'FALHOU: pasta inválida aceita';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   15. pasta que não é de grupo é recusada (sem erro de conversão)';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DELETE FROM storage.objects WHERE bucket_id = 'comunidade';
COMMIT;
SELECT assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'comunidade') = 0, '15. o dono do grupo apaga fotos do grupo');

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DELETE FROM storage.objects WHERE bucket_id = 'perfis' AND name LIKE 'usuarios/%';
COMMIT;
SELECT assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'perfis' AND name LIKE 'usuarios/%') = 1,
              '15. ninguém apaga a foto de perfil de outra pessoa');
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  DELETE FROM storage.objects WHERE bucket_id = 'perfis' AND name LIKE 'grupos/%';
COMMIT;
SELECT assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'perfis' AND name LIKE 'grupos/%') = 0,
              '15. o dono troca (apaga) a imagem do grupo');
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  DELETE FROM storage.objects WHERE bucket_id = 'perfis' AND name LIKE 'usuarios/%';
COMMIT;
SELECT assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'perfis' AND name LIKE 'usuarios/%') = 0,
              '15. cada um apaga a própria foto de perfil');

-- --- 16) Foto de perfil só da própria pasta ---------------------------------
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_beto';
  UPDATE profiles SET avatar_path = 'usuarios/66666666-6666-6666-6666-666666666666/eu.jpg' WHERE id = :'beto';
  UPDATE profiles SET avatar_path = 'usuarios/55555555-5555-5555-5555-555555555555/ana.jpg' WHERE id = :'beto';
COMMIT;
SELECT assert(
  (SELECT avatar_path FROM profiles WHERE id = :'beto') = 'usuarios/66666666-6666-6666-6666-666666666666/eu.jpg',
  '16. foto de perfil só aponta para a própria pasta');
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = :'jwt_ana';
  SELECT assert(
    (SELECT avatar_path FROM community_group_members('b0000000-0000-0000-0000-000000000001') WHERE user_id = '66666666-6666-6666-6666-666666666666')
      = 'usuarios/66666666-6666-6666-6666-666666666666/eu.jpg',
    '16. a foto de perfil aparece para os colegas de grupo');
COMMIT;

\echo ''
\echo 'Todas as verificações de convites e comunidade passaram.'
