-- nexo.social — mural, opiniões e página de cada pessoa (2026-10-01)
--
-- Publicações para puxar conversa: texto livre, pergunta (pedir opinião),
-- resenha (filme, série, livro, evento, show, jogo, esporte…), experiência
-- ("fui no Rock in Rio… será que eu iria gostar do The Town?"), vídeo e
-- livro lido. Cada uma com opiniões (comentários, com resposta) e reações.
--
-- Quem vê o quê é sempre escolha de quem publica: todos da plataforma, só os
-- contatos, ou um grupo de que participa. A página da pessoa (/pessoa/<id>)
-- também: aberta a todos ou só aos contatos. Conta banida some do mural.
--
-- Pode rodar mais de uma vez. Aplicar depois de moderacao.sql (usa o
-- gatilho das regras da comunidade) e das migrações da Comunidade.

-- --- 1. Busca: texto normalizado (sem acento, minúsculo, números mantidos) -----
CREATE OR REPLACE FUNCTION busca_normalizar(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(lower(translate(COALESCE(p, ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'aaaaaaaaaaaaeeeeeeeeiiiiiiiioooooooooouuuuuuuuccnn')), '[^a-z0-9]+', ' ', 'g'));
$$;

-- No Supabase, extensões ficam no esquema "extensions" (fora do public).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
  ELSE
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm indisponível: a busca funciona, só sem o índice.';
END $$;

-- --- 2. A página de cada pessoa ------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfil_social (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 280),
  -- Quem abre a página: todos da plataforma ou só os contatos.
  visibilidade_perfil TEXT NOT NULL DEFAULT 'contatos' CHECK (visibilidade_perfil IN ('todos', 'contatos')),
  -- O que vem marcado ao publicar (sempre dá para trocar na hora).
  visibilidade_padrao TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade_padrao IN ('todos', 'contatos')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- 3. Publicações --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('conversa', 'pergunta', 'resenha', 'experiencia', 'video', 'livro')),
  titulo TEXT CHECK (titulo IS NULL OR char_length(titulo) <= 160),
  corpo TEXT CHECK (corpo IS NULL OR char_length(corpo) <= 5000),
  -- Resenha, experiência e livro: sobre o quê ("Rock in Rio", "Duna").
  assunto TEXT CHECK (assunto IS NULL OR char_length(assunto) <= 160),
  assunto_tipo TEXT CHECK (assunto_tipo IS NULL OR assunto_tipo IN
    ('filme', 'serie', 'livro', 'evento', 'show', 'jogo', 'esporte', 'musica', 'lugar', 'outro')),
  nota SMALLINT CHECK (nota IS NULL OR nota BETWEEN 1 AND 5),
  tema TEXT CHECK (tema IS NULL OR char_length(tema) <= 40),
  youtube_id TEXT CHECK (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  url TEXT CHECK (url IS NULL OR (char_length(url) <= 1000 AND url ~* '^https?://')),
  visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'contatos', 'grupo')),
  grupo_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  busca TEXT GENERATED ALWAYS AS (busca_normalizar(
    COALESCE(titulo, '') || ' ' || COALESCE(assunto, '') || ' ' || COALESCE(corpo, ''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT publicacoes_grupo_check CHECK ((visibilidade = 'grupo') = (grupo_id IS NOT NULL)),
  CONSTRAINT publicacoes_conteudo_check CHECK (
    COALESCE(NULLIF(trim(titulo), ''), NULLIF(trim(corpo), ''), NULLIF(trim(assunto), ''), youtube_id) IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS publicacoes_recentes_idx ON publicacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS publicacoes_autor_idx ON publicacoes (autor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS publicacoes_grupo_idx ON publicacoes (grupo_id, created_at DESC) WHERE grupo_id IS NOT NULL;
DO $$
DECLARE
  v_esquema TEXT := (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm');
BEGIN
  IF v_esquema IS NOT NULL THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS publicacoes_busca_trgm ON publicacoes USING gin (busca %I.gin_trgm_ops)', v_esquema);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Índice da busca não criado: %', SQLERRM;
END $$;

-- Opiniões: comentários, com resposta a outra opinião da mesma publicação.
CREATE TABLE IF NOT EXISTS publicacao_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacao_id UUID NOT NULL REFERENCES publicacoes(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resposta_a UUID REFERENCES publicacao_comentarios(id) ON DELETE SET NULL,
  corpo TEXT NOT NULL CHECK (char_length(trim(corpo)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS publicacao_comentarios_pub_idx ON publicacao_comentarios (publicacao_id, created_at);
CREATE INDEX IF NOT EXISTS publicacao_comentarios_autor_idx ON publicacao_comentarios (autor_id);
CREATE INDEX IF NOT EXISTS publicacao_comentarios_resposta_idx ON publicacao_comentarios (resposta_a);

-- Reações rápidas: uma por pessoa por publicação.
CREATE TABLE IF NOT EXISTS publicacao_reacoes (
  publicacao_id UUID NOT NULL REFERENCES publicacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reacao TEXT NOT NULL CHECK (reacao IN ('curti', 'amei', 'concordo', 'discordo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (publicacao_id, user_id)
);
CREATE INDEX IF NOT EXISTS publicacao_reacoes_user_idx ON publicacao_reacoes (user_id);

-- --- 4. Quem vê ----------------------------------------------------------------------------
-- 'todos' é todo mundo da plataforma (que é só por convite); 'contatos', os
-- contatos aceitos de quem publicou; 'grupo', os membros do grupo. Conta
-- banida não aparece para ninguém.
CREATE OR REPLACE FUNCTION pode_ver_conteudo(p_autor UUID, p_visibilidade TEXT, p_grupo UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN FALSE
    WHEN p_autor = auth.uid() THEN TRUE
    WHEN usuario_banido(p_autor) THEN FALSE
    WHEN p_visibilidade = 'todos' THEN TRUE
    WHEN p_visibilidade = 'contatos' THEN are_contacts(auth.uid(), p_autor)
    WHEN p_visibilidade = 'grupo' THEN is_group_member(p_grupo)
    ELSE FALSE
  END;
$$;

-- A opinião é desta publicação? (A política de quem opina não pode consultar a
-- própria tabela sem cair em recursão; a função consulta por fora.)
CREATE OR REPLACE FUNCTION opiniao_da_publicacao(p_opiniao UUID, p_publicacao UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM publicacao_comentarios WHERE id = p_opiniao AND publicacao_id = p_publicacao);
$$;

-- Nome e foto de quem aparece no mural (os perfis em si têm RLS por conta).
CREATE OR REPLACE FUNCTION perfis_basicos(p_ids UUID[])
RETURNS TABLE (id UUID, nome TEXT, avatar_path TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pr.id, display_name(pr.id), pr.avatar_path
    FROM profiles pr
   WHERE auth.uid() IS NOT NULL AND pr.id = ANY(p_ids);
$$;

-- A página da pessoa: nome, foto, bio, o vínculo com quem olha (e o id do
-- pedido de contato, para aceitar ali mesmo) e se quem olha pode abri-la.
DROP FUNCTION IF EXISTS perfil_publico(UUID);
CREATE OR REPLACE FUNCTION perfil_publico(p_user UUID)
RETURNS TABLE (id UUID, nome TEXT, avatar_path TEXT, bio TEXT, visibilidade_perfil TEXT,
               contato TEXT, conexao_id UUID, pode_ver BOOLEAN, banido BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH eu AS (SELECT auth.uid() AS uid),
  rel AS (
    SELECT CASE
      WHEN p_user = (SELECT uid FROM eu) THEN 'eu'
      WHEN are_contacts((SELECT uid FROM eu), p_user) THEN 'aceito'
      WHEN EXISTS (SELECT 1 FROM connections c WHERE c.user_id = (SELECT uid FROM eu) AND c.contact_id = p_user AND c.status = 'pendente') THEN 'enviado'
      WHEN EXISTS (SELECT 1 FROM connections c WHERE c.contact_id = (SELECT uid FROM eu) AND c.user_id = p_user AND c.status = 'pendente') THEN 'recebido'
      ELSE 'nenhum'
    END AS contato,
    (SELECT c.id FROM connections c
      WHERE (c.user_id = (SELECT uid FROM eu) AND c.contact_id = p_user)
         OR (c.user_id = p_user AND c.contact_id = (SELECT uid FROM eu))
      ORDER BY c.created_at DESC LIMIT 1) AS conexao_id
  )
  SELECT pr.id, display_name(pr.id), pr.avatar_path,
         ps.bio, COALESCE(ps.visibilidade_perfil, 'contatos'),
         (SELECT contato FROM rel), (SELECT conexao_id FROM rel),
         NOT usuario_banido(pr.id) AND (
           (SELECT contato FROM rel) IN ('eu', 'aceito') OR COALESCE(ps.visibilidade_perfil, 'contatos') = 'todos'
         ),
         usuario_banido(pr.id)
    FROM profiles pr
    LEFT JOIN perfil_social ps ON ps.user_id = pr.id
   WHERE (SELECT uid FROM eu) IS NOT NULL AND pr.id = p_user;
$$;

-- --- 5. Avisos: opinião nova chega para quem publicou (e para quem foi respondido) ---
CREATE OR REPLACE FUNCTION notificar_opiniao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pub publicacoes%ROWTYPE;
  v_resp UUID;
  v_sobre TEXT;
BEGIN
  SELECT * INTO v_pub FROM publicacoes WHERE id = NEW.publicacao_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_sobre := COALESCE(NULLIF(trim(v_pub.titulo), ''), NULLIF(trim(v_pub.assunto), ''), left(v_pub.corpo, 60), 'sua publicação');
  IF v_pub.autor_id <> NEW.autor_id THEN
    INSERT INTO notifications (user_id, type, title, body, link, actor_id)
    VALUES (v_pub.autor_id, 'opiniao', 'Nova opinião',
            display_name(NEW.autor_id) || ' opinou sobre "' || v_sobre || '": ' || left(NEW.corpo, 120),
            '/comunidade/publicacao/' || v_pub.id, NEW.autor_id);
  END IF;
  IF NEW.resposta_a IS NOT NULL THEN
    SELECT autor_id INTO v_resp FROM publicacao_comentarios WHERE id = NEW.resposta_a;
    IF v_resp IS NOT NULL AND v_resp <> NEW.autor_id AND v_resp <> v_pub.autor_id THEN
      INSERT INTO notifications (user_id, type, title, body, link, actor_id)
      VALUES (v_resp, 'opiniao', 'Responderam sua opinião',
              display_name(NEW.autor_id) || ' respondeu: ' || left(NEW.corpo, 120),
              '/comunidade/publicacao/' || v_pub.id, NEW.autor_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS publicacao_comentarios_notificar ON publicacao_comentarios;
CREATE TRIGGER publicacao_comentarios_notificar AFTER INSERT ON publicacao_comentarios
  FOR EACH ROW EXECUTE FUNCTION notificar_opiniao();

-- --- 6. Regras da comunidade (db/moderacao.sql) -------------------------------------------
SELECT moderacao_ligar('perfil_social', ARRAY['bio']);
SELECT moderacao_ligar('publicacoes', ARRAY['titulo', 'corpo', 'assunto']);
SELECT moderacao_ligar('publicacao_comentarios', ARRAY['corpo']);

-- --- 7. Acesso -----------------------------------------------------------------------------
ALTER TABLE perfil_social ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicacao_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicacao_reacoes ENABLE ROW LEVEL SECURITY;

-- Perfil social: cada um lê e mexe no seu (a página dos outros vem por perfil_publico).
DROP POLICY IF EXISTS perfil_social_proprio ON perfil_social;
CREATE POLICY perfil_social_proprio ON perfil_social FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS publicacoes_select ON publicacoes;
CREATE POLICY publicacoes_select ON publicacoes FOR SELECT TO authenticated
  USING (pode_ver_conteudo(autor_id, visibilidade, grupo_id));
DROP POLICY IF EXISTS publicacoes_insert ON publicacoes;
CREATE POLICY publicacoes_insert ON publicacoes FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND NOT usuario_banido((SELECT auth.uid()))
    AND (visibilidade <> 'grupo' OR is_group_member(grupo_id))
  );
DROP POLICY IF EXISTS publicacoes_update ON publicacoes;
CREATE POLICY publicacoes_update ON publicacoes FOR UPDATE TO authenticated
  USING (autor_id = (SELECT auth.uid()))
  WITH CHECK (autor_id = (SELECT auth.uid()) AND (visibilidade <> 'grupo' OR is_group_member(grupo_id)));
-- Apaga quem publicou; no grupo, também o dono do grupo.
DROP POLICY IF EXISTS publicacoes_delete ON publicacoes;
CREATE POLICY publicacoes_delete ON publicacoes FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid()) OR (grupo_id IS NOT NULL AND is_group_owner(grupo_id)));

-- Opiniões: vê e opina quem vê a publicação. Apaga quem opinou e quem publicou
-- (cada um cuida da conversa da própria publicação).
DROP POLICY IF EXISTS publicacao_comentarios_select ON publicacao_comentarios;
CREATE POLICY publicacao_comentarios_select ON publicacao_comentarios FOR SELECT TO authenticated
  USING (NOT usuario_banido(autor_id) AND EXISTS (SELECT 1 FROM publicacoes p WHERE p.id = publicacao_id));
DROP POLICY IF EXISTS publicacao_comentarios_insert ON publicacao_comentarios;
CREATE POLICY publicacao_comentarios_insert ON publicacao_comentarios FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND NOT usuario_banido((SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM publicacoes p WHERE p.id = publicacao_id)
    -- Resposta só a uma opinião da mesma publicação.
    AND (resposta_a IS NULL OR opiniao_da_publicacao(resposta_a, publicacao_id))
  );
DROP POLICY IF EXISTS publicacao_comentarios_delete ON publicacao_comentarios;
CREATE POLICY publicacao_comentarios_delete ON publicacao_comentarios FOR DELETE TO authenticated
  USING (
    autor_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM publicacoes p WHERE p.id = publicacao_id AND p.autor_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS publicacao_reacoes_select ON publicacao_reacoes;
CREATE POLICY publicacao_reacoes_select ON publicacao_reacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM publicacoes p WHERE p.id = publicacao_id));
DROP POLICY IF EXISTS publicacao_reacoes_insert ON publicacao_reacoes;
CREATE POLICY publicacao_reacoes_insert ON publicacao_reacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM publicacoes p WHERE p.id = publicacao_id));
DROP POLICY IF EXISTS publicacao_reacoes_update ON publicacao_reacoes;
CREATE POLICY publicacao_reacoes_update ON publicacao_reacoes FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM publicacoes p WHERE p.id = publicacao_id));
DROP POLICY IF EXISTS publicacao_reacoes_delete ON publicacao_reacoes;
CREATE POLICY publicacao_reacoes_delete ON publicacao_reacoes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON FUNCTION pode_ver_conteudo(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pode_ver_conteudo(UUID, TEXT, UUID) TO authenticated;
REVOKE ALL ON FUNCTION opiniao_da_publicacao(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION opiniao_da_publicacao(UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION perfis_basicos(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION perfis_basicos(UUID[]) TO authenticated;
REVOKE ALL ON FUNCTION perfil_publico(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION perfil_publico(UUID) TO authenticated;
REVOKE ALL ON FUNCTION notificar_opiniao() FROM PUBLIC, anon, authenticated;

-- Opinião nova aparece sozinha na tela da publicação.
DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['publicacao_comentarios'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
