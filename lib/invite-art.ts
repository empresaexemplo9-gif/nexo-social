import { STICKERS } from './invite-stickers';
import { THEMES, type Theme, type ThemeId } from './invite-themes';
export { STICKERS } from './invite-stickers';

function fnv(text: string, seed: number) {
  let hash = seed;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

// O token já tem entropia aleatória. A arte fica estável para o cache dos links.
export function inviteVariant(token: string): number {
  return fnv(token, 2166136261) % STICKERS.length;
}

// Número de série do convite (0001–9999). Vem de outro hash do token, então a
// URL da arte não revela o token.
export function inviteSerial(token: string): number {
  return (fnv(token, 0x9e3779b9) % 9999) + 1;
}

export type InviteEdition = {
  variant: number; serial: number; serialLabel: string; themeId: ThemeId; theme: Theme;
  sticker: (typeof STICKERS)[number];
};

export function inviteEdition(token: string): InviteEdition {
  const variant = inviteVariant(token);
  const serial = inviteSerial(token);
  const sticker = STICKERS[variant];
  return { variant, serial, serialLabel: `Nº ${String(serial).padStart(4, '0')}`, themeId: sticker.theme, theme: THEMES[sticker.theme], sticker };
}

export const INVITE_TITLE = 'Seu jeito único tem lugar aqui.';
export const INVITE_DESCRIPTION = 'Você recebeu um acesso especial ao ecossistema Nexo Social. Pessoas, cultura, descobertas e conexões para uma personalidade que não se repete. Abra seu convite.';
export const INVITE_SITE = 'https://nexo-social.drap.app.br';
export const INVITE_ART_VERSION = 6;

export const inviteImage = (token: string) => `/convite/arte/${inviteVariant(token)}?n=${inviteSerial(token)}&v=${INVITE_ART_VERSION}`;

// Título e descrição da prévia do link, na voz do tema do convite.
export function inviteMeta(token: string) {
  const e = inviteEdition(token);
  const titulo = e.theme.titulo.texto.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    title: `${titulo} — Convite ${e.serialLabel}`,
    description: `${e.theme.nome} do Nexo Social. ${e.theme.linha.replace(/\n/g, ' ')} Um convite pessoal, de uso único.`,
  };
}
