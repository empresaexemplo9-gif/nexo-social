import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { STICKERS } from './invite-stickers';

// Mensagens dos chats da Comunidade (grupo e contato): o que pode ser enviado
// e como a mídia volta para quem lê. A mídia fica no bucket privado "chat";
// quem lê recebe links assinados (6 horas).

export const TIPOS = ['texto', 'imagem', 'video', 'audio', 'figurinha', 'adesivo'] as const;
export type TipoDeMensagem = (typeof TIPOS)[number];

export interface MensagemNova {
  kind: TipoDeMensagem;
  body: string;
  media_path: string | null;
  media_meta: Record<string, number | string> | null;
}

const CAMINHO = /^[A-Za-z0-9_\-/.]+$/;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FIGURINHA = new RegExp(`^figurinhas/${UUID}/[A-Za-z0-9_-]+\\.(webp|png|gif|jpg)$`, 'i');

function numeros(meta: unknown, campos: string[]): Record<string, number> {
  const saida: Record<string, number> = {};
  if (!meta || typeof meta !== 'object') return saida;
  for (const c of campos) {
    const v = Number((meta as Record<string, unknown>)[c]);
    if (Number.isFinite(v) && v >= 0 && v < 1e7) saida[c] = Math.round(v * 10) / 10;
  }
  return saida;
}

/**
 * Valida o que o cliente mandou. `pasta` é a pasta desta conversa no bucket
 * ("grupos/<id>" ou "diretas/<a>_<b>"): a mídia precisa estar lá, dentro da
 * subpasta de quem envia — ninguém anexa arquivo de outra conversa.
 */
export function validarMensagem(b: any, pasta: string, uid: string): MensagemNova | { erro: string } {
  const kind = (TIPOS as readonly string[]).includes(b?.kind) ? (b.kind as TipoDeMensagem) : 'texto';
  const body = String(b?.body ?? '').trim().slice(0, 4000);
  if (kind === 'texto') return body ? { kind, body, media_path: null, media_meta: null } : { erro: 'Escreva uma mensagem.' };

  if (kind === 'adesivo') {
    const n = Number(b?.meta?.n);
    if (!Number.isInteger(n) || n < 0 || n >= STICKERS.length) return { erro: 'Adesivo inválido.' };
    return { kind, body: '', media_path: null, media_meta: { n } };
  }

  if (kind === 'figurinha') {
    const emoji = typeof b?.meta?.emoji === 'string' ? b.meta.emoji.slice(0, 16) : '';
    if (emoji && !b?.mediaPath) return { kind, body: '', media_path: null, media_meta: { emoji } };
    const path = String(b?.mediaPath ?? '');
    if (!FIGURINHA.test(path)) return { erro: 'Figurinha inválida.' };
    return { kind, body: '', media_path: path, media_meta: null };
  }

  const path = String(b?.mediaPath ?? '');
  if (!path.startsWith(`${pasta}/${uid}/`) || !CAMINHO.test(path) || path.includes('..')) return { erro: 'Arquivo inválido.' };
  const meta = numeros(b?.meta, ['w', 'h', 'duracao']);
  return { kind, body, media_path: path, media_meta: Object.keys(meta).length ? meta : null };
}

/** Links assinados para a mídia das mensagens (um pedido só para todas). */
export async function linksDaMidia(sb: SupabaseClient, caminhos: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unicos = Array.from(new Set(caminhos.filter((c): c is string => Boolean(c))));
  const mapa = new Map<string, string>();
  if (!unicos.length) return mapa;
  const { data } = await sb.storage.from('chat').createSignedUrls(unicos, 6 * 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa.set(d.path, d.signedUrl);
  return mapa;
}

/** A parte da mensagem que é igual nos dois chats. */
export function conteudoParaCliente(row: any, links: Map<string, string>) {
  const kind: TipoDeMensagem = (TIPOS as readonly string[]).includes(row.kind) ? row.kind : 'texto';
  const meta = row.media_meta ?? null;
  return {
    kind,
    body: row.body ?? '',
    mediaUrl: kind === 'adesivo' ? STICKERS[Number(meta?.n)]?.file ?? null : row.media_path ? links.get(row.media_path) ?? null : null,
    mediaPath: row.media_path ?? null,
    meta,
  };
}

/** Prévia curta para notificação ("📷 Foto", "🎤 Áudio"…). */
export function previa(m: MensagemNova): string {
  switch (m.kind) {
    case 'imagem': return m.body ? `📷 ${m.body}` : '📷 Foto';
    case 'video': return m.body ? `🎬 ${m.body}` : '🎬 Vídeo';
    case 'audio': return '🎤 Mensagem de voz';
    case 'figurinha': return String(m.media_meta?.emoji ?? '🖼️ Figurinha');
    case 'adesivo': return '🏷️ Adesivo';
    default: return m.body;
  }
}

/** Colunas lidas nas duas tabelas de mensagem. */
export const COLUNAS_DE_MIDIA = 'kind, media_path, media_meta';

/** Fotos de perfil (a coluna só existe depois da migração da Comunidade). */
export async function avataresPorId(sb: SupabaseClient, ids: string[]): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>();
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (!unicos.length) return mapa;
  const { data } = await sb.from('profiles').select('id, avatar_path').in('id', unicos);
  for (const p of (data ?? []) as { id: string; avatar_path: string | null }[]) mapa.set(p.id, p.avatar_path ?? null);
  return mapa;
}

/** Pasta de uma conversa direta no bucket: "diretas/<menor>_<maior>". */
export const pastaDaConversa = (a: string, b: string) => `diretas/${[a, b].sort().join('_')}`;

/** Prévia de uma mensagem já gravada (resumo da Comunidade, listas de conversa). */
export function previaDaLinha(row: { kind?: string | null; body?: string | null; media_meta?: any }): string {
  const kind = (TIPOS as readonly string[]).includes(row.kind ?? '') ? (row.kind as TipoDeMensagem) : 'texto';
  return previa({ kind, body: row.body ?? '', media_path: null, media_meta: row.media_meta ?? null });
}
