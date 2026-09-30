-- nexo.social — jogos da Comunidade (2026-09-30)
-- Trilha do Saber (quiz de tabuleiro) e Arcanos (duelo de cartas), jogados ao
-- vivo dentro dos grupos. As partidas correm num canal privado do Realtime
-- ("grupo:<id>:jogos", só membros); aqui ficam a permissão desse canal e o
-- placar das partidas terminadas (para o ranking do grupo).
-- Aplicar depois de community-chat-media.sql. Pode rodar mais de uma vez.

-- --- Canal dos jogos ---------------------------------------------------------------
-- Mesma função de community-chat-media.sql, agora aceitando "jogos".
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
  IF array_length(v, 1) = 3 AND v[3] IN ('sala', 'chamada', 'jogos') THEN
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

-- --- Placar ------------------------------------------------------------------------
-- Uma linha por partida (o id é o da mesa: gravar duas vezes não duplica).
CREATE TABLE IF NOT EXISTS community_game_results (
  id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{6,40}$'),
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  game TEXT NOT NULL CHECK (game IN ('trilha', 'arcanos')),
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  players UUID[] NOT NULL CHECK (array_length(players, 1) BETWEEN 1 AND 12),
  details JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_game_results_group_idx
  ON community_game_results (group_id, game, created_at DESC);

ALTER TABLE community_game_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_game_results_select ON community_game_results;
CREATE POLICY community_game_results_select ON community_game_results FOR SELECT TO authenticated
  USING (is_group_member(group_id));
-- Quem grava é membro e jogou a partida; o vencedor (se houver) também jogou.
DROP POLICY IF EXISTS community_game_results_insert ON community_game_results;
CREATE POLICY community_game_results_insert ON community_game_results FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_group_member(group_id)
    AND auth.uid() = ANY (players)
    AND (winner_id IS NULL OR winner_id = ANY (players))
  );
