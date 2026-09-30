-- nexo.social — respostas e comentários na Comunidade (2026-09-30)
-- Responder uma mensagem citando-a (chat de grupo e chat entre contatos) e
-- comentar as publicações do Mural. Aplicar depois de community-chat.sql e
-- community-chat-media.sql. Pode rodar mais de uma vez.

-- --- Respostas citadas nos chats ------------------------------------------------
-- A citação só é mostrada quando a mensagem citada é da mesma conversa (a API
-- filtra ao ler); apagada a original, a resposta fica sem a citação.
ALTER TABLE community_chat_messages
  ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES community_chat_messages(id) ON DELETE SET NULL;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;

-- --- Comentários no Mural --------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Resposta a outro comentário da mesma publicação (a API confere).
  reply_to UUID REFERENCES community_post_comments(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_post_comments_post_idx
  ON community_post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS community_post_comments_group_idx
  ON community_post_comments (group_id, created_at DESC);

ALTER TABLE community_post_comments ENABLE ROW LEVEL SECURITY;

-- Só membros leem e comentam; o comentário tem que ser de uma publicação do
-- mesmo grupo. Quem comentou ou o dono do grupo apagam.
DROP POLICY IF EXISTS community_post_comments_select ON community_post_comments;
CREATE POLICY community_post_comments_select ON community_post_comments FOR SELECT TO authenticated
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS community_post_comments_insert ON community_post_comments;
CREATE POLICY community_post_comments_insert ON community_post_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM community_posts p WHERE p.id = post_id AND p.group_id = community_post_comments.group_id)
  );
DROP POLICY IF EXISTS community_post_comments_delete ON community_post_comments;
CREATE POLICY community_post_comments_delete ON community_post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR is_group_owner(group_id));
