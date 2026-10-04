-- nexo.social — superadministradores (2026-10-04)
-- Pode rodar mais de uma vez.
--
-- Até aqui só um e-mail era superadministrador. Agora é uma lista, com as
-- mesmas ferramentas para todos (moderação, convites, exclusivos, missões…).
-- Todas as regras do banco perguntam a is_platform_admin(), que passa a olhar
-- a lista. A mesma lista está no app, em lib/auth.ts (SUPERADMINS).

CREATE OR REPLACE FUNCTION platform_admin_emails()
RETURNS TEXT[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY[
    'thiagohccarvalho00@gmail.com',
    'tefi7009@gmail.com',
    'marcelocfurtadojr@gmail.com',
    'joaob2581@gmail.com'
  ]::TEXT[];
$$;

CREATE OR REPLACE FUNCTION is_platform_admin_email(p_email TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(trim(COALESCE(p_email, ''))) = ANY (platform_admin_emails());
$$;

-- O e-mail vem do token da sessão (assinado pelo Supabase).
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT is_platform_admin_email(auth.jwt() ->> 'email');
$$;

-- A marca no perfil acompanha a lista (é informativa; quem libera é a função).
UPDATE profiles SET is_platform_admin = is_platform_admin_email(email)
WHERE is_platform_admin IS DISTINCT FROM is_platform_admin_email(email);
