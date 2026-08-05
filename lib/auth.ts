// Regras de identidade e multi-tenant do nexo-social.

/**
 * E-mail da conta administradora da plataforma (super admin).
 * Somente esta conta tem acesso ao painel global em /admin.
 */
export const ADMIN_EMAIL = 'thiagohccarvalho00@gmail.com';

export type AccountType = 'pessoal' | 'organizacao';

export type Role = 'owner' | 'admin' | 'member';

export function isPlatformAdmin(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
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
