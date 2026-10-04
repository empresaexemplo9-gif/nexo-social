// Regras de identidade e multi-tenant do nexo-social.

/**
 * E-mail da conta oficial da plataforma (contato da administração nos termos e
 * na privacidade). É também um dos superadministradores.
 */
export const ADMIN_EMAIL = 'thiagohccarvalho00@gmail.com';

/**
 * Superadministradores: todos têm as mesmas ferramentas (painel global em
 * /admin, moderação, convites, exclusivos…). A mesma lista está no banco, em
 * platform_admin_emails() (db/superadmins.sql) — mude as duas juntas.
 */
export const SUPERADMINS: readonly string[] = [
  ADMIN_EMAIL,
  'tefi7009@gmail.com',
  'marcelocfurtadojr@gmail.com',
  'joaob2581@gmail.com',
];

export type AccountType = 'pessoal' | 'organizacao';

export type Role = 'owner' | 'admin' | 'member';

export function isPlatformAdmin(email: string | null | undefined): boolean {
  return !!email && SUPERADMINS.includes(email.trim().toLowerCase());
}

/**
 * Gera um slug de tenant a partir do nome informado no cadastro.
 * Cada conta (pessoal ou organização) é um tenant isolado.
 */
export function tenantSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos/diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
