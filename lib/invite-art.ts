import { STICKERS } from './invite-stickers';
export { STICKERS } from './invite-stickers';

// The token already contains random entropy. Keep its artwork stable for link caches.
export function inviteVariant(token: string): number {
  let hash = 2166136261;
  for (const char of token) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % STICKERS.length;
}

export const INVITE_TITLE = 'Seu jeito único tem lugar aqui.';
export const INVITE_DESCRIPTION = 'Você recebeu um acesso especial ao ecossistema Nexo Social. Pessoas, cultura, descobertas e conexões para uma personalidade que não se repete. Abra seu convite.';
export const INVITE_SITE = 'https://nexo-social-two.vercel.app';
export const inviteImage = (token: string) => `/convite/arte/${inviteVariant(token)}?v=3`;
