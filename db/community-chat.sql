-- nexo.social — contatos e chat da Comunidade (2026-09-28)
-- Reaproveita "connections" como a lista real de contatos da conta e "messages"
-- como histórico de chat direto. Adiciona chat persistente dentro dos grupos.

CREATE TABLE IF NOT EXISTS community_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_chat_group_idx
  ON community_chat_messages (group_id, created_at DESC);

ALTER TABLE community_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_chat_select ON community_chat_messages;
CREATE POLICY community_chat_select ON community_chat_messages FOR SELECT TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS community_chat_insert ON community_chat_messages;
CREATE POLICY community_chat_insert ON community_chat_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND is_group_member(group_id));

DROP POLICY IF EXISTS community_chat_delete ON community_chat_messages;
CREATE POLICY community_chat_delete ON community_chat_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR is_group_owner(group_id));

-- Contagens sociais são privadas: cada usuário pode consultar somente a própria
-- quantidade de contatos aceitos. Nenhuma função pública expõe números alheios.
CREATE OR REPLACE FUNCTION my_contact_count()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER
  FROM connections
  WHERE status = 'aceito'
    AND (user_id = auth.uid() OR contact_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION my_contact_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION my_contact_count() TO authenticated;


-- Convites de grupo por link deixam de existir. Nem mesmo um cliente autenticado
-- pode chamar os RPCs legados diretamente.
REVOKE ALL ON FUNCTION join_group_by_token(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION group_invite_preview(TEXT) FROM PUBLIC, anon, authenticated;
