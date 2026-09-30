-- nexo.social — avisos no aparelho (Web Push) e lembretes da agenda (2026-09-30)
-- Pode rodar mais de uma vez. Aplicar depois de schema.sql.
--
-- O que faz:
--   1. push_subscriptions: os aparelhos de cada pessoa que aceitaram avisos.
--   2. notifications.pushed_at + claim_pending_pushes(): cada notificação sai
--      para o aparelho uma vez só.
--   3. user_preferences.notification_prefs: o que cada pessoa quer receber.
--   4. Lembretes: 30 minutos antes de cada compromisso (dono + confirmados).
--   5. Agendador (pg_cron) a cada minuto: gera os lembretes e chama o app
--      (pg_net) para entregar o que ficou pendente. O endereço e o segredo do
--      app são gravados pelo próprio app (configurar_push) — nada a editar aqui.

-- --- 1. Aparelhos ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(endpoint) <= 1000),
  p256dh TEXT NOT NULL CHECK (length(p256dh) <= 200),
  auth TEXT NOT NULL CHECK (length(auth) <= 100),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_subscriptions_select ON push_subscriptions;
CREATE POLICY push_subscriptions_select ON push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS push_subscriptions_delete ON push_subscriptions;
CREATE POLICY push_subscriptions_delete ON push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());
-- Inserir e trocar de dono (aparelho usado por outra conta) é pelo servidor (service role).

-- --- 2. Cada notificação sai uma vez ------------------------------------------------------
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;
-- As antigas não saem agora (seriam avisos velhos).
UPDATE notifications SET pushed_at = created_at WHERE pushed_at IS NULL AND created_at < NOW() - INTERVAL '15 minutes';
CREATE INDEX IF NOT EXISTS notifications_push_pendente_idx ON notifications (created_at) WHERE pushed_at IS NULL;

-- Reserva as notificações novas ainda não entregues (quem chamar primeiro leva).
CREATE OR REPLACE FUNCTION claim_pending_pushes(p_limit INT DEFAULT 200)
RETURNS SETOF notifications LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE notifications n SET pushed_at = NOW()
  WHERE n.id IN (
    SELECT id FROM notifications
    WHERE pushed_at IS NULL AND created_at > NOW() - INTERVAL '15 minutes'
    ORDER BY created_at
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING n.*;
$$;
REVOKE ALL ON FUNCTION claim_pending_pushes(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_pending_pushes(INT) TO service_role;

-- --- 3. O que cada pessoa quer receber -------------------------------------------------------
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_prefs JSONB;

-- --- 4. Lembretes da agenda -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_reminders (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (appointment_id, user_id)
);
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY; -- só o banco usa

-- Compromissos que começam nos próximos 30 minutos: um lembrete para o dono e
-- para quem confirmou (uma vez por pessoa e compromisso).
CREATE OR REPLACE FUNCTION enqueue_appointment_reminders()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_n INT;
BEGIN
  WITH alvo AS (
    SELECT a.id, u.user_id
    FROM appointments a
    CROSS JOIN LATERAL (
      SELECT a.owner_id AS user_id
      UNION
      SELECT p.user_id FROM appointment_participants p WHERE p.appointment_id = a.id AND p.status = 'confirmado'
    ) u
    WHERE a.starts_at > NOW() AND a.starts_at <= NOW() + INTERVAL '30 minutes'
  ), novos AS (
    INSERT INTO appointment_reminders (appointment_id, user_id)
    SELECT id, user_id FROM alvo
    ON CONFLICT DO NOTHING
    RETURNING appointment_id, user_id
  )
  INSERT INTO notifications (user_id, type, title, body, link, appointment_id)
  SELECT n.user_id,
         'lembrete',
         'Daqui a pouco: ' || a.title,
         'Começa às ' || to_char(a.starts_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
           || ' (em ' || GREATEST(1, CEIL(EXTRACT(EPOCH FROM (a.starts_at - NOW())) / 60))::INT || ' min)'
           || COALESCE(' · ' || NULLIF(a.location, ''), ''),
         '/agenda',
         a.id
  FROM novos n JOIN appointments a ON a.id = n.appointment_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION enqueue_appointment_reminders() FROM PUBLIC, anon, authenticated;

-- --- 5. Agendador: a cada minuto ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Para onde chamar o app e com que segredo. Quem grava é o próprio app.
CREATE TABLE IF NOT EXISTS push_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  url TEXT NOT NULL,
  segredo TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE push_config ENABLE ROW LEVEL SECURITY; -- sem políticas: ninguém de fora lê

CREATE OR REPLACE FUNCTION configurar_push(p_url TEXT, p_segredo TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/api/push/despachar$' OR length(COALESCE(p_segredo, '')) < 32 THEN
    RAISE EXCEPTION 'Configuração de push inválida.';
  END IF;
  INSERT INTO push_config (id, url, segredo, updated_at) VALUES (1, p_url, p_segredo, NOW())
  ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, segredo = EXCLUDED.segredo, updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION configurar_push(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION configurar_push(TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION push_tick()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  c push_config%ROWTYPE;
BEGIN
  PERFORM enqueue_appointment_reminders();
  SELECT * INTO c FROM push_config WHERE id = 1;
  IF c.url IS NOT NULL AND EXISTS (
    SELECT 1 FROM notifications WHERE pushed_at IS NULL AND created_at > NOW() - INTERVAL '15 minutes'
  ) THEN
    PERFORM net.http_post(
      url := c.url,
      body := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segredo', c.segredo),
      timeout_milliseconds := 10000
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION push_tick() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('nexo-push');
EXCEPTION WHEN OTHERS THEN
  NULL; -- ainda não existia
END $$;
SELECT cron.schedule('nexo-push', '* * * * *', 'SELECT public.push_tick()');
