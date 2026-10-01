-- nexo.social — itens exclusivos enviados pelo superadministrador
--
-- O catálogo é global, mas cada item só aparece para quem recebeu uma concessão.
-- Imagens ficam no bucket `exclusivos`; o catálogo/grants controlam quem pode
-- escolher e usar o item na plataforma.

CREATE TABLE IF NOT EXISTS exclusive_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  kind TEXT NOT NULL CHECK (kind IN ('sticker', 'wallpaper')),
  collection TEXT NOT NULL DEFAULT 'geral' CHECK (char_length(collection) BETWEEN 1 AND 80),
  image_path TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exclusive_assets_kind_order_idx
  ON exclusive_assets(kind, sort_order, created_at);

CREATE TABLE IF NOT EXISTS exclusive_asset_grants (
  asset_id UUID NOT NULL REFERENCES exclusive_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, user_id)
);

CREATE INDEX IF NOT EXISTS exclusive_asset_grants_user_idx
  ON exclusive_asset_grants(user_id, granted_at DESC);

ALTER TABLE exclusive_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusive_asset_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exclusive_assets_select ON exclusive_assets;
CREATE POLICY exclusive_assets_select ON exclusive_assets
FOR SELECT TO authenticated
USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM exclusive_asset_grants g
    WHERE g.asset_id = exclusive_assets.id
      AND g.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS exclusive_assets_admin_insert ON exclusive_assets;
CREATE POLICY exclusive_assets_admin_insert ON exclusive_assets
FOR INSERT TO authenticated
WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS exclusive_assets_admin_update ON exclusive_assets;
CREATE POLICY exclusive_assets_admin_update ON exclusive_assets
FOR UPDATE TO authenticated
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS exclusive_assets_admin_delete ON exclusive_assets;
CREATE POLICY exclusive_assets_admin_delete ON exclusive_assets
FOR DELETE TO authenticated
USING (is_platform_admin());

DROP POLICY IF EXISTS exclusive_grants_select ON exclusive_asset_grants;
CREATE POLICY exclusive_grants_select ON exclusive_asset_grants
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS exclusive_grants_admin_insert ON exclusive_asset_grants;
CREATE POLICY exclusive_grants_admin_insert ON exclusive_asset_grants
FOR INSERT TO authenticated
WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS exclusive_grants_admin_delete ON exclusive_asset_grants;
CREATE POLICY exclusive_grants_admin_delete ON exclusive_asset_grants
FOR DELETE TO authenticated
USING (is_platform_admin());

-- Bucket público somente para leitura da imagem. A permissão de possuir/usar
-- continua no catálogo e nas concessões; somente o superadmin consegue enviar,
-- substituir ou apagar arquivos.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exclusivos',
  'exclusivos',
  TRUE,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS exclusivos_storage_admin_insert ON storage.objects;
CREATE POLICY exclusivos_storage_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exclusivos' AND is_platform_admin());

DROP POLICY IF EXISTS exclusivos_storage_admin_update ON storage.objects;
CREATE POLICY exclusivos_storage_admin_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'exclusivos' AND is_platform_admin())
WITH CHECK (bucket_id = 'exclusivos' AND is_platform_admin());

DROP POLICY IF EXISTS exclusivos_storage_admin_delete ON storage.objects;
CREATE POLICY exclusivos_storage_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'exclusivos' AND is_platform_admin());
