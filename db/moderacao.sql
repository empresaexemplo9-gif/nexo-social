-- nexo.social — regras da comunidade: palavras proibidas e banimento (2026-10-01)
--
-- A plataforma é um ambiente seguro e saudável. Quem escreve palavra grotesca
-- (palavrão pesado, termo sexual explícito, ofensa de ódio) em qualquer lugar
-- — mural, comentários, chats, recados, grupos, álbuns, agenda, nome do perfil
-- e o que vier depois — é banido na hora e perde o acesso para sempre. O texto
-- não chega a ser gravado. O aviso aparece na criação da conta.
--
-- Como funciona:
--   * moderation_terms guarda os termos (o administrador acrescenta e tira no
--     painel). Cada termo vale como palavra inteira, como começo de palavra
--     ("prefixo") ou como sequência de palavras ("frase").
--   * O texto é normalizado antes de comparar: sem acento, minúsculo, com
--     número no lugar de letra desfeito ("p0rr4"), letras repetidas aceitas
--     ("porrrra") e letras soltas juntadas ("p o r r a", "p.o.r.r.a").
--   * Um gatilho em cada tabela de texto confere o que a pessoa escreveu. Se
--     achar termo proibido: registra o banimento, tira o acesso (o middleware
--     passa a mandar para /banido), marca a conta como banida no Auth (não
--     entra nem renova a sessão) e descarta a escrita.
--   * O administrador da plataforma não é banido (o texto dele só é
--     descartado) e pode revogar um banimento no painel, caso de engano.
--
-- Pode rodar mais de uma vez. Aplicar depois de schema.sql e das migrações da
-- Comunidade (community-*.sql) e de platform-invites.sql.

-- --- 1. Termos proibidos --------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_terms (
  termo TEXT PRIMARY KEY CHECK (char_length(trim(termo)) BETWEEN 2 AND 60),
  tipo TEXT NOT NULL DEFAULT 'palavra' CHECK (tipo IN ('palavra', 'prefixo', 'frase')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- 2. Banimentos ----------------------------------------------------------------
-- Uma linha por conta. Revogado, fica o histórico (revogado_em); banido de
-- novo, a linha é reaproveitada.
CREATE TABLE IF NOT EXISTS user_bans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  termo TEXT,
  trecho TEXT CHECK (trecho IS NULL OR char_length(trecho) <= 500),
  origem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revogado_em TIMESTAMPTZ,
  revogado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS user_bans_revogado_por_idx ON user_bans (revogado_por);

-- --- 3. Aceite das regras ---------------------------------------------------------
-- Quem criou a conta depois das regras aceitou no cadastro; quem já estava na
-- plataforma aceita no aviso que aparece uma vez.
CREATE TABLE IF NOT EXISTS community_rules_acceptance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  versao INT NOT NULL DEFAULT 1,
  aceitas_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- 4. Normalização ---------------------------------------------------------------
-- Sem acento, minúsculo, número/símbolo no lugar de letra desfeito; o resto
-- que não é letra vira espaço. (translate em vez da extensão unaccent: não
-- depende de nada instalado, e o lower() do Postgres pode não baixar letra
-- acentuada conforme a collation — por isso as maiúsculas acentuadas vão
-- direto para a minúscula sem acento.)
CREATE OR REPLACE FUNCTION moderacao_base(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(lower(translate(COALESCE(p, ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ013457@$',
    'aaaaaaaaaaaaeeeeeeeeiiiiiiiioooooooooouuuuuuuuccnnoieastas')), '[^a-z]+', ' ', 'g'));
$$;

-- O texto normalizado mais, no fim, as letras soltas em sequência juntadas
-- ("p o r r a" → "porra"), separadas por espaço duplo para não emendar frase.
CREATE OR REPLACE FUNCTION moderacao_normalizar(p TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  s TEXT := moderacao_base(p);
  t TEXT;
  junta TEXT := '';
  extras TEXT := '';
BEGIN
  FOREACH t IN ARRAY string_to_array(s, ' ') LOOP
    IF char_length(t) = 1 THEN
      junta := junta || t;
    ELSE
      IF char_length(junta) >= 3 THEN extras := extras || '  ' || junta; END IF;
      junta := '';
    END IF;
  END LOOP;
  IF char_length(junta) >= 3 THEN extras := extras || '  ' || junta; END IF;
  RETURN s || extras;
END;
$$;

-- Termo → expressão regular: cada letra pode se repetir ("porrrra"), mas
-- letra dobrada no termo continua exigindo pelo menos duas ("porra" não pega
-- "pora"; o termo em inglês com "gg" não pega o nome do país).
CREATE OR REPLACE FUNCTION moderacao_padrao(p_termo TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  s TEXT := moderacao_base(p_termo);
  saida TEXT := '';
  i INT := 1;
  n INT;
  c TEXT;
  tamanho INT := char_length(s);
BEGIN
  WHILE i <= tamanho LOOP
    c := substr(s, i, 1);
    IF c = ' ' THEN
      saida := saida || ' ';
      i := i + 1;
      CONTINUE;
    END IF;
    n := 1;
    WHILE i + n <= tamanho AND substr(s, i + n, 1) = c LOOP
      n := n + 1;
    END LOOP;
    saida := saida || c || CASE WHEN n = 1 THEN '+' ELSE '{' || n || ',}' END;
    i := i + n;
  END LOOP;
  RETURN saida;
END;
$$;

ALTER TABLE moderation_terms ADD COLUMN IF NOT EXISTS padrao TEXT GENERATED ALWAYS AS (moderacao_padrao(termo)) STORED;

-- O termo proibido que aparece no texto (normalizado), ou NULL.
CREATE OR REPLACE FUNCTION moderacao_termo(p TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_texto TEXT := moderacao_normalizar(p);
  v_inteiras TEXT;
  v_prefixos TEXT;
  v_re TEXT;
BEGIN
  IF v_texto = '' THEN
    RETURN NULL;
  END IF;
  SELECT string_agg(padrao, '|') FILTER (WHERE tipo <> 'prefixo'),
         string_agg(padrao, '|') FILTER (WHERE tipo = 'prefixo')
    INTO v_inteiras, v_prefixos
    FROM moderation_terms
   WHERE padrao <> '';
  v_re := concat_ws('|',
    CASE WHEN v_inteiras IS NOT NULL THEN '(?:^| )(?:' || v_inteiras || ')(?: |$)' END,
    CASE WHEN v_prefixos IS NOT NULL THEN '(?:^| )(?:' || v_prefixos || ')' END);
  IF v_re = '' THEN
    RETURN NULL;
  END IF;
  RETURN NULLIF(btrim(substring(v_texto FROM v_re)), '');
END;
$$;

-- --- 5. Banir e revogar ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION usuario_banido(p_user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_bans WHERE user_id = p_user AND revogado_em IS NULL);
$$;

CREATE OR REPLACE FUNCTION banir_usuario(p_user UUID, p_termo TEXT, p_trecho TEXT, p_origem TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_bans (user_id, termo, trecho, origem)
  VALUES (p_user, p_termo, left(p_trecho, 500), p_origem)
  ON CONFLICT (user_id) DO UPDATE
    SET termo = EXCLUDED.termo, trecho = EXCLUDED.trecho, origem = EXCLUDED.origem,
        created_at = NOW(), revogado_em = NULL, revogado_por = NULL;
  -- Sem acesso, o middleware manda para /banido na próxima requisição.
  DELETE FROM platform_access WHERE user_id = p_user;
  -- O Auth recusa login e renovação de sessão de conta banida. (Comandos
  -- dinâmicos e protegidos: num Postgres sem o schema completo do Auth, o
  -- banimento acima continua valendo.)
  BEGIN
    EXECUTE 'UPDATE auth.users SET banned_until = NOW() + INTERVAL ''100 years'' WHERE id = $1' USING p_user;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DELETE FROM auth.sessions WHERE user_id = $1' USING p_user;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id = $1::text' USING p_user;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION revogar_banimento(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Só o administrador da plataforma pode revogar um banimento.';
  END IF;
  UPDATE user_bans SET revogado_em = NOW(), revogado_por = auth.uid()
   WHERE user_id = p_user AND revogado_em IS NULL;
  INSERT INTO platform_access (user_id) VALUES (p_user) ON CONFLICT (user_id) DO NOTHING;
  BEGIN
    EXECUTE 'UPDATE auth.users SET banned_until = NULL WHERE id = $1' USING p_user;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION aceitar_regras()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO community_rules_acceptance (user_id) SELECT auth.uid() WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id) DO NOTHING;
$$;

-- --- 6. O gatilho -------------------------------------------------------------------
-- Argumentos: as colunas de texto da tabela. Numa edição, só confere o que
-- mudou. Escrita do servidor (service role, gatilhos do cadastro: sem
-- auth.uid()) não passa pela regra.
CREATE OR REPLACE FUNCTION moderar_conteudo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_novo JSONB := to_jsonb(NEW);
  v_velho JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END;
  v_texto TEXT := '';
  v_coluna TEXT;
  v_termo TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;
  FOREACH v_coluna IN ARRAY TG_ARGV LOOP
    IF COALESCE(v_novo ->> v_coluna, '') <> ''
       AND (v_velho IS NULL OR (v_novo ->> v_coluna) IS DISTINCT FROM (v_velho ->> v_coluna)) THEN
      v_texto := concat_ws(E'\n', NULLIF(v_texto, ''), v_novo ->> v_coluna);
    END IF;
  END LOOP;
  v_termo := moderacao_termo(v_texto);
  IF v_termo IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT is_platform_admin() THEN
    PERFORM banir_usuario(v_uid, v_termo, v_texto, TG_TABLE_NAME);
  END IF;
  -- Descarta a escrita: o texto não fica gravado em lugar nenhum além do
  -- registro do banimento (para o administrador revisar).
  RETURN NULL;
END;
$$;

-- Liga o gatilho numa tabela, se ela existir (as migrações da Comunidade são
-- separadas e podem ainda não ter rodado).
CREATE OR REPLACE FUNCTION moderacao_ligar(p_tabela TEXT, p_colunas TEXT[])
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_nome TEXT := p_tabela || '_moderacao';
  v_cols TEXT[];
BEGIN
  IF to_regclass('public.' || p_tabela) IS NULL THEN
    RETURN;
  END IF;
  SELECT array_agg(c ORDER BY ord) INTO v_cols
    FROM unnest(p_colunas) WITH ORDINALITY AS u(c, ord)
   WHERE EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = p_tabela AND column_name = u.c);
  IF v_cols IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', v_nome, p_tabela);
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %s ON public.%I FOR EACH ROW EXECUTE FUNCTION moderar_conteudo(%s)',
    v_nome,
    (SELECT string_agg(format('%I', c), ', ') FROM unnest(v_cols) c),
    p_tabela,
    (SELECT string_agg(quote_literal(c), ', ') FROM unnest(v_cols) c));
END;
$$;

SELECT moderacao_ligar('profiles', ARRAY['full_name']);
SELECT moderacao_ligar('community_groups', ARRAY['name', 'description']);
SELECT moderacao_ligar('community_posts', ARRAY['title', 'subtitle', 'body']);
SELECT moderacao_ligar('community_post_comments', ARRAY['body']);
SELECT moderacao_ligar('community_chat_messages', ARRAY['body']);
SELECT moderacao_ligar('community_albums', ARRAY['title', 'description']);
SELECT moderacao_ligar('messages', ARRAY['body']);
SELECT moderacao_ligar('appointments', ARRAY['title', 'description', 'location']);

-- --- 7. Acesso ------------------------------------------------------------------------
ALTER TABLE moderation_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_rules_acceptance ENABLE ROW LEVEL SECURITY;

-- Termos: só o administrador vê e mexe.
DROP POLICY IF EXISTS moderation_terms_admin ON moderation_terms;
CREATE POLICY moderation_terms_admin ON moderation_terms FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- Banimentos: a própria conta vê o seu (o middleware precisa), o
-- administrador vê todos. Ninguém escreve direto: só as funções acima.
DROP POLICY IF EXISTS user_bans_select ON user_bans;
CREATE POLICY user_bans_select ON user_bans FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR is_platform_admin());

DROP POLICY IF EXISTS community_rules_acceptance_select ON community_rules_acceptance;
CREATE POLICY community_rules_acceptance_select ON community_rules_acceptance FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR is_platform_admin());

REVOKE ALL ON FUNCTION moderacao_termo(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION banir_usuario(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION moderar_conteudo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION moderacao_ligar(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION usuario_banido(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION usuario_banido(UUID) TO authenticated;
REVOKE ALL ON FUNCTION revogar_banimento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION revogar_banimento(UUID) TO authenticated;
REVOKE ALL ON FUNCTION aceitar_regras() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION aceitar_regras() TO authenticated;

-- --- 8. Lista inicial ------------------------------------------------------------------
-- Só o que não tem uso inocente no português do dia a dia: palavrão pesado,
-- termo sexual explícito e ofensa de ódio. Palavra comum com outro sentido
-- ("arrombado" de porta, "bicha" de fila, "macaco" de bicho) fica de fora — o
-- administrador acrescenta ou tira no painel.
INSERT INTO moderation_terms (termo, tipo) VALUES
  ('porra', 'palavra'), ('porras', 'palavra'), ('poha', 'palavra'),
  ('caralh', 'prefixo'), ('krl', 'palavra'),
  ('merda', 'palavra'), ('merdas', 'palavra'), ('bosta', 'palavra'), ('bostas', 'palavra'),
  ('foda', 'palavra'), ('fodas', 'palavra'), ('foder', 'palavra'), ('fodeu', 'palavra'),
  ('fodido', 'palavra'), ('fodida', 'palavra'), ('fodidos', 'palavra'), ('fodidas', 'palavra'),
  ('fodase', 'palavra'), ('fodasse', 'palavra'), ('fodão', 'palavra'),
  ('fuder', 'palavra'), ('fudeu', 'palavra'), ('fudido', 'palavra'), ('fudida', 'palavra'),
  ('puta', 'palavra'), ('putas', 'palavra'), ('putaria', 'palavra'), ('puteiro', 'palavra'), ('putinha', 'palavra'),
  ('filhadaput', 'prefixo'), ('fdp', 'palavra'), ('pqp', 'palavra'), ('vsf', 'palavra'), ('tnc', 'palavra'),
  ('bucet', 'prefixo'), ('xoxot', 'prefixo'), ('xereca', 'palavra'), ('piroc', 'prefixo'),
  ('punhet', 'prefixo'), ('boquete', 'palavra'), ('boquetes', 'palavra'),
  ('cuzão', 'palavra'), ('cuzinho', 'palavra'),
  ('no cu', 'frase'), ('do cu', 'frase'), ('seu cu', 'frase'), ('teu cu', 'frase'), ('meu cu', 'frase'), ('o cu', 'frase'),
  ('viado', 'palavra'), ('viados', 'palavra'), ('viadinho', 'palavra'), ('viadagem', 'palavra'),
  ('boiola', 'palavra'), ('boiolas', 'palavra'), ('traveco', 'palavra'), ('travecos', 'palavra'),
  ('mongoloide', 'palavra'),
  ('fuck', 'prefixo'), ('motherfucker', 'palavra'), ('cunt', 'palavra'),
  ('nigger', 'palavra'), ('niggers', 'palavra'), ('nigga', 'palavra'), ('niggas', 'palavra'),
  ('faggot', 'palavra'), ('faggots', 'palavra')
ON CONFLICT (termo) DO NOTHING;
