-- nexo.social — acesso por convite (2026-09-28)
-- Idempotente. Usuários existentes na data de implantação recebem acesso + 3 convites.
-- Novas contas só recebem acesso ao resgatar um convite válido.

CREATE TABLE IF NOT EXISTS platform_access (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_id UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_invite_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used','revoked')),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

ALTER TABLE platform_access
  ADD CONSTRAINT platform_access_invite_fk
  FOREIGN KEY (invite_id) REFERENCES platform_invites(id) ON DELETE SET NULL
  NOT VALID;
DO $$
BEGIN
  ALTER TABLE platform_access VALIDATE CONSTRAINT platform_access_invite_fk;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Marco fixo: somente contas que já existiam quando o modelo por convite foi implantado
-- recebem o lote inicial automaticamente. Reexecutar este arquivo não libera contas novas.
INSERT INTO platform_access (user_id)
SELECT id FROM auth.users
WHERE created_at <= TIMESTAMPTZ '2026-09-29 01:30:00+00'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO platform_invite_balances (user_id, credits)
SELECT id, 3 FROM auth.users
WHERE created_at <= TIMESTAMPTZ '2026-09-29 01:30:00+00'
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE platform_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invite_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_access_self_select ON platform_access;
CREATE POLICY platform_access_self_select ON platform_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS platform_balance_self_select ON platform_invite_balances;
CREATE POLICY platform_balance_self_select ON platform_invite_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS platform_invites_self_select ON platform_invites;
CREATE POLICY platform_invites_self_select ON platform_invites FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR is_platform_admin());

CREATE OR REPLACE FUNCTION create_platform_invite()
RETURNS TABLE(token TEXT, credits_remaining INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_token TEXT;
  v_remaining INTEGER;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (SELECT 1 FROM platform_access WHERE user_id = v_user) THEN
    RAISE EXCEPTION 'Acesso à plataforma não autorizado.';
  END IF;

  UPDATE platform_invite_balances
  SET credits = credits - 1, updated_at = NOW()
  WHERE user_id = v_user AND credits > 0
  RETURNING credits INTO v_remaining;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'Você não possui convites disponíveis.';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO platform_invites(token, inviter_id) VALUES (v_token, v_user);
  RETURN QUERY SELECT v_token, v_remaining;
END;
$$;

CREATE OR REPLACE FUNCTION platform_invite_preview(p_token TEXT)
RETURNS TABLE(valid BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_invites
    WHERE token = p_token AND status = 'pending'
  );
$$;

CREATE OR REPLACE FUNCTION claim_platform_invite(p_token TEXT, p_user UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite UUID;
BEGIN
  SELECT id INTO v_invite
  FROM platform_invites
  WHERE token = p_token AND status = 'pending'
  FOR UPDATE;

  IF v_invite IS NULL THEN RETURN FALSE; END IF;

  UPDATE platform_invites
  SET status = 'used', used_by = p_user, used_at = NOW()
  WHERE id = v_invite AND status = 'pending';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  INSERT INTO platform_access(user_id, invite_id)
  VALUES (p_user, v_invite)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO platform_invite_balances(user_id, credits)
  VALUES (p_user, 3)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION add_platform_invite_credits(p_user UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total INTEGER;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'Acesso restrito ao superadministrador.'; END IF;
  IF p_amount <= 0 OR p_amount > 1000 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;

  INSERT INTO platform_invite_balances(user_id, credits)
  VALUES (p_user, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET credits = platform_invite_balances.credits + EXCLUDED.credits, updated_at = NOW()
  RETURNING credits INTO v_total;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION create_platform_invite() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_platform_invite() TO authenticated;

REVOKE ALL ON FUNCTION platform_invite_preview(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_invite_preview(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION claim_platform_invite(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_platform_invite(TEXT, UUID) TO service_role;

REVOKE ALL ON FUNCTION add_platform_invite_credits(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_platform_invite_credits(UUID, INTEGER) TO authenticated;
