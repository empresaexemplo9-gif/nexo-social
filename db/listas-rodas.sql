-- nexo.social — listas compartilhadas e rodas de conversa (2026-10-01)
--
-- LISTAS: playlists de músicas e clipes, e listas de livros, filmes, séries,
-- jogos… Quem vê é escolha de quem cria (todos, contatos ou um grupo). Cada
-- item e a lista inteira recebem reações e comentários. As listas abertas a
-- todos aparecem para os outros como sugestão.
--
-- RODAS DE CONVERSA: bate-papo ao vivo sobre um assunto (um livro, um show,
-- um jogo…). Quando quem abriu encerra — ou depois de 24 h sem mensagem — a
-- conversa some (as mensagens são apagadas) e fica, por 7 dias, só a lista de
-- quem participou, para quem quiser se adicionar aos contatos.
--
-- Pode rodar mais de uma vez. Aplicar depois de social.sql (usa
-- pode_ver_conteudo, busca_normalizar e as regras da comunidade).

-- --- 1. Listas ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('musicas', 'clipes', 'livros', 'filmes', 'series', 'jogos', 'mista')),
  titulo TEXT NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 1 AND 120),
  descricao TEXT CHECK (descricao IS NULL OR char_length(descricao) <= 1000),
  visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'contatos', 'grupo')),
  grupo_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  busca TEXT GENERATED ALWAYS AS (busca_normalizar(titulo || ' ' || COALESCE(descricao, ''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT listas_grupo_check CHECK ((visibilidade = 'grupo') = (grupo_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS listas_recentes_idx ON listas (updated_at DESC);
CREATE INDEX IF NOT EXISTS listas_autor_idx ON listas (autor_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS listas_grupo_idx ON listas (grupo_id) WHERE grupo_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lista_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
  posicao INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 1 AND 200),
  -- Artista, autor(a), diretor(a), plataforma…
  subtitulo TEXT CHECK (subtitulo IS NULL OR char_length(subtitulo) <= 200),
  youtube_id TEXT CHECK (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  url TEXT CHECK (url IS NULL OR (char_length(url) <= 1000 AND url ~* '^https?://')),
  -- Por que entrou na lista (de quem criou).
  nota TEXT CHECK (nota IS NULL OR char_length(nota) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lista_itens_lista_idx ON lista_itens (lista_id, posicao);

-- Reações: uma por pessoa na lista inteira (item_id nulo) e uma por item.
CREATE TABLE IF NOT EXISTS lista_reacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
  item_id UUID REFERENCES lista_itens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reacao TEXT NOT NULL CHECK (reacao IN ('curti', 'amei', 'concordo', 'discordo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS lista_reacoes_uma_na_lista ON lista_reacoes (lista_id, user_id) WHERE item_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS lista_reacoes_uma_no_item ON lista_reacoes (item_id, user_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lista_reacoes_user_idx ON lista_reacoes (user_id);

-- Comentários: na lista inteira (item_id nulo) ou num item.
CREATE TABLE IF NOT EXISTS lista_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
  item_id UUID REFERENCES lista_itens(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corpo TEXT NOT NULL CHECK (char_length(trim(corpo)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lista_comentarios_lista_idx ON lista_comentarios (lista_id, created_at);
CREATE INDEX IF NOT EXISTS lista_comentarios_item_idx ON lista_comentarios (item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lista_comentarios_autor_idx ON lista_comentarios (autor_id);

-- O item é desta lista? (Fora da política, para não consultar a própria tabela nela.)
CREATE OR REPLACE FUNCTION item_da_lista(p_item UUID, p_lista UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM lista_itens WHERE id = p_item AND lista_id = p_lista);
$$;

-- Mexer nos itens deixa a lista "atualizada" (sobe nas sugestões).
CREATE OR REPLACE FUNCTION lista_tocar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE listas SET updated_at = NOW() WHERE id = COALESCE(NEW.lista_id, OLD.lista_id);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS lista_itens_tocar ON lista_itens;
CREATE TRIGGER lista_itens_tocar AFTER INSERT OR UPDATE OR DELETE ON lista_itens
  FOR EACH ROW EXECUTE FUNCTION lista_tocar();

-- Comentário novo avisa quem criou a lista.
CREATE OR REPLACE FUNCTION notificar_comentario_lista()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lista listas%ROWTYPE;
  v_item TEXT;
BEGIN
  SELECT * INTO v_lista FROM listas WHERE id = NEW.lista_id;
  IF NOT FOUND OR v_lista.autor_id = NEW.autor_id THEN RETURN NEW; END IF;
  IF NEW.item_id IS NOT NULL THEN SELECT titulo INTO v_item FROM lista_itens WHERE id = NEW.item_id; END IF;
  INSERT INTO notifications (user_id, type, title, body, link, actor_id)
  VALUES (v_lista.autor_id, 'lista', 'Comentaram sua lista',
          display_name(NEW.autor_id) || ' comentou ' ||
            CASE WHEN v_item IS NOT NULL THEN '"' || v_item || '" em ' ELSE '' END ||
            '"' || v_lista.titulo || '": ' || left(NEW.corpo, 120),
          '/comunidade/lista/' || v_lista.id, NEW.autor_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS lista_comentarios_notificar ON lista_comentarios;
CREATE TRIGGER lista_comentarios_notificar AFTER INSERT ON lista_comentarios
  FOR EACH ROW EXECUTE FUNCTION notificar_comentario_lista();

-- --- 2. Rodas de conversa ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rodas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tema TEXT NOT NULL CHECK (char_length(trim(tema)) BETWEEN 1 AND 160),
  descricao TEXT CHECK (descricao IS NULL OR char_length(descricao) <= 1000),
  assunto_tipo TEXT CHECK (assunto_tipo IS NULL OR assunto_tipo IN
    ('filme', 'serie', 'livro', 'evento', 'show', 'jogo', 'esporte', 'musica', 'lugar', 'outro')),
  visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'contatos', 'grupo')),
  grupo_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  aberta BOOLEAN NOT NULL DEFAULT TRUE,
  ultima_atividade TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrada_em TIMESTAMPTZ,
  busca TEXT GENERATED ALWAYS AS (busca_normalizar(tema || ' ' || COALESCE(descricao, ''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rodas_grupo_check CHECK ((visibilidade = 'grupo') = (grupo_id IS NOT NULL)),
  CONSTRAINT rodas_encerrada_check CHECK (aberta = (encerrada_em IS NULL))
);
CREATE INDEX IF NOT EXISTS rodas_abertas_idx ON rodas (ultima_atividade DESC) WHERE aberta;
CREATE INDEX IF NOT EXISTS rodas_criador_idx ON rodas (criador_id);
CREATE INDEX IF NOT EXISTS rodas_grupo_idx ON rodas (grupo_id) WHERE grupo_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS roda_participantes (
  roda_id UUID NOT NULL REFERENCES rodas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entrou_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (roda_id, user_id)
);
CREATE INDEX IF NOT EXISTS roda_participantes_user_idx ON roda_participantes (user_id);

CREATE TABLE IF NOT EXISTS roda_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roda_id UUID NOT NULL REFERENCES rodas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corpo TEXT NOT NULL CHECK (char_length(trim(corpo)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS roda_mensagens_roda_idx ON roda_mensagens (roda_id, created_at);
CREATE INDEX IF NOT EXISTS roda_mensagens_autor_idx ON roda_mensagens (autor_id);

-- Quem vê a roda (aberta): quem pode ver pelo que o criador escolheu.
-- Depois de encerrada, só quem participou (para se adicionar aos contatos).
CREATE OR REPLACE FUNCTION pode_ver_roda(p_roda UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM rodas r
     WHERE r.id = p_roda
       AND CASE WHEN r.aberta THEN pode_ver_conteudo(r.criador_id, r.visibilidade, r.grupo_id)
                ELSE EXISTS (SELECT 1 FROM roda_participantes p WHERE p.roda_id = r.id AND p.user_id = auth.uid()) END
  );
$$;

CREATE OR REPLACE FUNCTION participa_da_roda(p_roda UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM roda_participantes WHERE roda_id = p_roda AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION roda_aberta(p_roda UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM rodas WHERE id = p_roda AND aberta);
$$;

-- Quem abre a roda já está nela.
CREATE OR REPLACE FUNCTION roda_criador_entra()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO roda_participantes (roda_id, user_id) VALUES (NEW.id, NEW.criador_id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rodas_criador_entra ON rodas;
CREATE TRIGGER rodas_criador_entra AFTER INSERT ON rodas FOR EACH ROW EXECUTE FUNCTION roda_criador_entra();

-- Mensagem nova mantém a roda viva.
CREATE OR REPLACE FUNCTION roda_atividade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE rodas SET ultima_atividade = NOW() WHERE id = NEW.roda_id AND aberta;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS roda_mensagens_atividade ON roda_mensagens;
CREATE TRIGGER roda_mensagens_atividade AFTER INSERT ON roda_mensagens FOR EACH ROW EXECUTE FUNCTION roda_atividade();

-- Encerrar: a conversa some (mensagens apagadas) e cada participante recebe
-- o aviso com o link para ver quem estava e se adicionar aos contatos.
CREATE OR REPLACE FUNCTION encerrar_roda_interno(p_roda UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tema TEXT;
BEGIN
  UPDATE rodas SET aberta = FALSE, encerrada_em = NOW() WHERE id = p_roda AND aberta RETURNING tema INTO v_tema;
  IF v_tema IS NULL THEN RETURN; END IF;
  DELETE FROM roda_mensagens WHERE roda_id = p_roda;
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT p.user_id, 'roda', 'A roda terminou',
         'A conversa sobre "' || v_tema || '" acabou. Veja quem participou e adicione quem quiser aos contatos.',
         '/comunidade/roda/' || p_roda
    FROM roda_participantes p
   WHERE (SELECT count(*) FROM roda_participantes WHERE roda_id = p_roda) > 1
     AND p.roda_id = p_roda;
END;
$$;

CREATE OR REPLACE FUNCTION encerrar_roda(p_roda UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rodas WHERE id = p_roda AND criador_id = auth.uid()) THEN
    RAISE EXCEPTION 'Só quem abriu a roda pode encerrá-la.' USING ERRCODE = 'P0001';
  END IF;
  PERFORM encerrar_roda_interno(p_roda);
END;
$$;

-- Faxina: roda parada há 24 h encerra; roda encerrada há 7 dias some de vez.
CREATE OR REPLACE FUNCTION rodas_faxina()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r UUID;
BEGIN
  FOR r IN SELECT id FROM rodas WHERE aberta AND ultima_atividade < NOW() - INTERVAL '24 hours' LOOP
    PERFORM encerrar_roda_interno(r);
  END LOOP;
  DELETE FROM rodas WHERE NOT aberta AND encerrada_em < NOW() - INTERVAL '7 days';
END;
$$;

-- --- 3. Regras da comunidade (db/moderacao.sql) -----------------------------------------------
SELECT moderacao_ligar('listas', ARRAY['titulo', 'descricao']);
-- No item, só a nota é fala de quem criou a lista (e bane). Título e artista
-- são o nome da obra — às vezes vêm prontos do YouTube —, então palavra
-- proibida ali só barra o item, sem banir.
SELECT moderacao_ligar('lista_itens', ARRAY['nota']);
CREATE OR REPLACE FUNCTION lista_item_nome_limpo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF moderacao_termo(NEW.titulo || ' ' || COALESCE(NEW.subtitulo, '')) IS NOT NULL THEN
    RAISE EXCEPTION 'Este título tem uma palavra que a plataforma não aceita. Escreva de outro jeito.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION lista_item_nome_limpo() FROM PUBLIC, anon, authenticated;
-- O nome do gatilho vem depois de "lista_itens_moderacao": a nota é conferida antes.
DROP TRIGGER IF EXISTS lista_itens_nome_limpo ON lista_itens;
CREATE TRIGGER lista_itens_nome_limpo BEFORE INSERT OR UPDATE OF titulo, subtitulo ON lista_itens
  FOR EACH ROW EXECUTE FUNCTION lista_item_nome_limpo();
SELECT moderacao_ligar('lista_comentarios', ARRAY['corpo']);
SELECT moderacao_ligar('rodas', ARRAY['tema', 'descricao']);
SELECT moderacao_ligar('roda_mensagens', ARRAY['corpo']);

-- --- 4. Acesso --------------------------------------------------------------------------------
ALTER TABLE listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_reacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rodas ENABLE ROW LEVEL SECURITY;
ALTER TABLE roda_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE roda_mensagens ENABLE ROW LEVEL SECURITY;

-- Listas: vê quem pode ver (como no mural); mexe só quem criou.
DROP POLICY IF EXISTS listas_select ON listas;
CREATE POLICY listas_select ON listas FOR SELECT TO authenticated
  USING (pode_ver_conteudo(autor_id, visibilidade, grupo_id));
DROP POLICY IF EXISTS listas_insert ON listas;
CREATE POLICY listas_insert ON listas FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND NOT usuario_banido((SELECT auth.uid()))
              AND (visibilidade <> 'grupo' OR is_group_member(grupo_id)));
DROP POLICY IF EXISTS listas_update ON listas;
CREATE POLICY listas_update ON listas FOR UPDATE TO authenticated
  USING (autor_id = (SELECT auth.uid()))
  WITH CHECK (autor_id = (SELECT auth.uid()) AND (visibilidade <> 'grupo' OR is_group_member(grupo_id)));
DROP POLICY IF EXISTS listas_delete ON listas;
CREATE POLICY listas_delete ON listas FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid()) OR (grupo_id IS NOT NULL AND is_group_owner(grupo_id)));

-- Itens: vê quem vê a lista; põe, muda e tira só quem criou a lista.
DROP POLICY IF EXISTS lista_itens_select ON lista_itens;
CREATE POLICY lista_itens_select ON lista_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id));
DROP POLICY IF EXISTS lista_itens_dono ON lista_itens;
CREATE POLICY lista_itens_dono ON lista_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id AND l.autor_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id AND l.autor_id = (SELECT auth.uid())));

-- Reações e comentários: de quem vê a lista; o item tem de ser da mesma lista.
DROP POLICY IF EXISTS lista_reacoes_select ON lista_reacoes;
CREATE POLICY lista_reacoes_select ON lista_reacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id));
DROP POLICY IF EXISTS lista_reacoes_insert ON lista_reacoes;
CREATE POLICY lista_reacoes_insert ON lista_reacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id)
              AND (item_id IS NULL OR item_da_lista(item_id, lista_id)));
DROP POLICY IF EXISTS lista_reacoes_update ON lista_reacoes;
CREATE POLICY lista_reacoes_update ON lista_reacoes FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id)
              AND (item_id IS NULL OR item_da_lista(item_id, lista_id)));
DROP POLICY IF EXISTS lista_reacoes_delete ON lista_reacoes;
CREATE POLICY lista_reacoes_delete ON lista_reacoes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lista_comentarios_select ON lista_comentarios;
CREATE POLICY lista_comentarios_select ON lista_comentarios FOR SELECT TO authenticated
  USING (NOT usuario_banido(autor_id) AND EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id));
DROP POLICY IF EXISTS lista_comentarios_insert ON lista_comentarios;
CREATE POLICY lista_comentarios_insert ON lista_comentarios FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND NOT usuario_banido((SELECT auth.uid()))
              AND EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id)
              AND (item_id IS NULL OR item_da_lista(item_id, lista_id)));
DROP POLICY IF EXISTS lista_comentarios_delete ON lista_comentarios;
CREATE POLICY lista_comentarios_delete ON lista_comentarios FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM listas l WHERE l.id = lista_id AND l.autor_id = (SELECT auth.uid())));

-- Rodas: vê quem pode (aberta) ou quem participou (encerrada). Abre quem quiser;
-- só quem abriu muda o texto. Encerrar é pela função (apaga as mensagens).
DROP POLICY IF EXISTS rodas_select ON rodas;
CREATE POLICY rodas_select ON rodas FOR SELECT TO authenticated
  USING (pode_ver_roda(id));
DROP POLICY IF EXISTS rodas_insert ON rodas;
CREATE POLICY rodas_insert ON rodas FOR INSERT TO authenticated
  WITH CHECK (criador_id = (SELECT auth.uid()) AND NOT usuario_banido((SELECT auth.uid())) AND aberta
              AND (visibilidade <> 'grupo' OR is_group_member(grupo_id)));
DROP POLICY IF EXISTS rodas_update ON rodas;
CREATE POLICY rodas_update ON rodas FOR UPDATE TO authenticated
  USING (criador_id = (SELECT auth.uid()) AND aberta)
  WITH CHECK (criador_id = (SELECT auth.uid()) AND aberta AND (visibilidade <> 'grupo' OR is_group_member(grupo_id)));
DROP POLICY IF EXISTS rodas_delete ON rodas;
CREATE POLICY rodas_delete ON rodas FOR DELETE TO authenticated
  USING (criador_id = (SELECT auth.uid()));

-- Participantes: vê quem vê a roda; entra quem vê a roda aberta; sai quando quiser.
DROP POLICY IF EXISTS roda_participantes_select ON roda_participantes;
CREATE POLICY roda_participantes_select ON roda_participantes FOR SELECT TO authenticated
  USING (pode_ver_roda(roda_id));
DROP POLICY IF EXISTS roda_participantes_insert ON roda_participantes;
CREATE POLICY roda_participantes_insert ON roda_participantes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND NOT usuario_banido((SELECT auth.uid()))
              AND roda_aberta(roda_id) AND pode_ver_roda(roda_id));
DROP POLICY IF EXISTS roda_participantes_delete ON roda_participantes;
CREATE POLICY roda_participantes_delete ON roda_participantes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND roda_aberta(roda_id));

-- Mensagens: só quem está na roda lê e escreve, e só com ela aberta.
DROP POLICY IF EXISTS roda_mensagens_select ON roda_mensagens;
CREATE POLICY roda_mensagens_select ON roda_mensagens FOR SELECT TO authenticated
  USING (participa_da_roda(roda_id) AND NOT usuario_banido(autor_id));
DROP POLICY IF EXISTS roda_mensagens_insert ON roda_mensagens;
CREATE POLICY roda_mensagens_insert ON roda_mensagens FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND NOT usuario_banido((SELECT auth.uid()))
              AND participa_da_roda(roda_id) AND roda_aberta(roda_id));
DROP POLICY IF EXISTS roda_mensagens_delete ON roda_mensagens;
CREATE POLICY roda_mensagens_delete ON roda_mensagens FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid()));

REVOKE ALL ON FUNCTION item_da_lista(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION item_da_lista(UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION pode_ver_roda(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pode_ver_roda(UUID) TO authenticated;
REVOKE ALL ON FUNCTION participa_da_roda(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION participa_da_roda(UUID) TO authenticated;
REVOKE ALL ON FUNCTION roda_aberta(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION roda_aberta(UUID) TO authenticated;
REVOKE ALL ON FUNCTION encerrar_roda(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION encerrar_roda(UUID) TO authenticated;
REVOKE ALL ON FUNCTION encerrar_roda_interno(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rodas_faxina() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lista_tocar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION notificar_comentario_lista() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION roda_criador_entra() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION roda_atividade() FROM PUBLIC, anon, authenticated;

-- Mensagens e participantes da roda chegam ao vivo; o fim da roda também.
DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['roda_mensagens', 'roda_participantes', 'rodas'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- Faxina a cada 15 minutos, se o pg_cron estiver ligado (senão, a API chama ao listar).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('nexo-rodas');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule('nexo-rodas', '*/15 * * * *', 'SELECT public.rodas_faxina()');
  END IF;
END $$;
