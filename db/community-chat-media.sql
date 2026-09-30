-- nexo.social — chat completo da Comunidade (2026-09-30)
-- Mensagens com imagem, vídeo, áudio, figurinha e adesivo, nos chats de grupo
-- e nos chats entre contatos; mídia num bucket privado (link assinado); e
-- chamadas de voz/vídeo também entre contatos. Aplicar depois de
-- schema.sql e community-chat.sql. Pode rodar mais de uma vez.

-- --- Tipos de mensagem --------------------------------------------------------
ALTER TABLE community_chat_messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'texto';
ALTER TABLE community_chat_messages ADD COLUMN IF NOT EXISTS media_path TEXT;
ALTER TABLE community_chat_messages ADD COLUMN IF NOT EXISTS media_meta JSONB;
ALTER TABLE community_chat_messages DROP CONSTRAINT IF EXISTS community_chat_messages_body_check;
ALTER TABLE community_chat_messages DROP CONSTRAINT IF EXISTS community_chat_messages_kind_check;
ALTER TABLE community_chat_messages ADD CONSTRAINT community_chat_messages_kind_check
  CHECK (kind IN ('texto', 'imagem', 'video', 'audio', 'figurinha', 'adesivo'));
ALTER TABLE community_chat_messages DROP CONSTRAINT IF EXISTS community_chat_messages_conteudo_check;
ALTER TABLE community_chat_messages ADD CONSTRAINT community_chat_messages_conteudo_check
  CHECK (char_length(body) <= 4000 AND (kind <> 'texto' OR char_length(trim(body)) >= 1));

ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'texto';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_path TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_meta JSONB;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check;
ALTER TABLE messages ADD CONSTRAINT messages_kind_check
  CHECK (kind IN ('texto', 'imagem', 'video', 'audio', 'figurinha', 'adesivo'));

-- Quem enviou pode apagar a própria mensagem direta.
DROP POLICY IF EXISTS messages_delete ON messages;
CREATE POLICY messages_delete ON messages FOR DELETE USING (from_user = auth.uid());

-- --- Contato aceito entre duas pessoas -------------------------------------------
CREATE OR REPLACE FUNCTION are_contacts(p_a UUID, p_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM connections
    WHERE status = 'aceito'
      AND ((user_id = p_a AND contact_id = p_b) OR (user_id = p_b AND contact_id = p_a))
  );
$$;

-- Pasta de uma conversa direta: "<menor uuid>_<maior uuid>", e quem pede é
-- uma das duas pessoas, com o contato aceito.
CREATE OR REPLACE FUNCTION is_dm_folder(p_folder TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v TEXT[] := string_to_array(COALESCE(p_folder, ''), '_');
  v_eu TEXT := auth.uid()::text;
BEGIN
  IF v_eu IS NULL OR COALESCE(array_length(v, 1), 0) <> 2 OR v[1] >= v[2] OR v_eu NOT IN (v[1], v[2]) THEN
    RETURN FALSE;
  END IF;
  RETURN are_contacts(v[1]::uuid, v[2]::uuid);
EXCEPTION WHEN invalid_text_representation THEN
  RETURN FALSE;
END;
$$;

-- --- Mídia do chat (bucket privado "chat") -------------------------------------
--   grupos/<grupo>/<quem enviou>/…    só membros do grupo abrem e enviam
--   diretas/<a>_<b>/<quem enviou>/…   só as duas pessoas (contato aceito)
--   figurinhas/<dono>/…               figurinhas criadas pela pessoa; qualquer
--                                     conta logada vê (para receber e reenviar)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat', 'chat', FALSE, 52428800, ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'
])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS nexo_chat_select ON storage.objects;
CREATE POLICY nexo_chat_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat' AND (
      ((storage.foldername(name))[1] = 'grupos' AND is_group_member_folder((storage.foldername(name))[2]))
      OR ((storage.foldername(name))[1] = 'diretas' AND is_dm_folder((storage.foldername(name))[2]))
      OR (storage.foldername(name))[1] = 'figurinhas'
    )
  );
DROP POLICY IF EXISTS nexo_chat_insert ON storage.objects;
CREATE POLICY nexo_chat_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat' AND (
      ((storage.foldername(name))[1] = 'grupos' AND is_group_member_folder((storage.foldername(name))[2])
        AND (storage.foldername(name))[3] = auth.uid()::text)
      OR ((storage.foldername(name))[1] = 'diretas' AND is_dm_folder((storage.foldername(name))[2])
        AND (storage.foldername(name))[3] = auth.uid()::text)
      OR ((storage.foldername(name))[1] = 'figurinhas' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );
DROP POLICY IF EXISTS nexo_chat_delete ON storage.objects;
CREATE POLICY nexo_chat_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat' AND owner_id = auth.uid()::text);

-- --- Chamadas entre contatos ------------------------------------------------------
-- Tópico privado "contato:<a>:<b>" (a < b): só as duas pessoas, com o contato
-- aceito, entram no canal da chamada. Os tópicos de grupo seguem como antes.
CREATE OR REPLACE FUNCTION can_use_group_topic(p_topic TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v TEXT[] := string_to_array(COALESCE(p_topic, ''), ':');
  v_eu TEXT := auth.uid()::text;
BEGIN
  IF v_eu IS NULL THEN
    RETURN FALSE;
  END IF;
  IF COALESCE(array_length(v, 1), 0) = 3 AND v[1] = 'contato' THEN
    IF v[2] >= v[3] OR v_eu NOT IN (v[2], v[3]) THEN
      RETURN FALSE;
    END IF;
    BEGIN
      RETURN are_contacts(v[2]::uuid, v[3]::uuid);
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN FALSE;
    END;
  END IF;
  IF COALESCE(array_length(v, 1), 0) < 3 OR v[1] <> 'grupo' OR NOT is_group_member_folder(v[2]) THEN
    RETURN FALSE;
  END IF;
  IF array_length(v, 1) = 3 AND v[3] IN ('sala', 'chamada') THEN
    RETURN TRUE;
  END IF;
  IF array_length(v, 1) = 5 AND v[3] = 'dupla' AND v[4] < v[5] AND v_eu IN (v[4], v[5]) THEN
    RETURN EXISTS (
      SELECT 1 FROM community_members
      WHERE group_id::text = v[2]
        AND user_id::text = CASE WHEN v[4] = v_eu THEN v[5] ELSE v[4] END
        AND status = 'ativo'
    );
  END IF;
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION are_contacts(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION are_contacts(UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION is_dm_folder(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_dm_folder(TEXT) TO authenticated;
