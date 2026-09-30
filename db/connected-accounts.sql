-- Contas conectadas (YouTube etc.) guardadas junto da conta do Nexo, para a
-- conexão não cair quando o cookie some: outro aparelho, app instalado,
-- limpeza do navegador. O conteúdo vem SELADO pelo servidor (AES-GCM com a
-- chave YOUTUBE_SESSION_SECRET): nem a própria pessoa consegue ler os tokens.
CREATE TABLE IF NOT EXISTS connected_accounts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube')),
  sealed TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connected_accounts_own ON connected_accounts;
CREATE POLICY connected_accounts_own ON connected_accounts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
