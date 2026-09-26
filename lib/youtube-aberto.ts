import 'server-only';

// O que dá para saber do YouTube SEM chave de API: se um canal está ao vivo
// agora (pela página pública /@canal/live) e os vídeos mais recentes dele
// (pelo RSS público). É o que mantém o esporte ao vivo, os melhores momentos e
// os Shorts funcionando mesmo sem YOUTUBE_API_KEY — ou com a cota do dia gasta.

import { decodificarEntidades } from './midia';

const CABECALHOS = { 'Accept-Language': 'pt-BR,pt;q=0.9', 'User-Agent': 'Mozilla/5.0 (compatible; nexo-social/1.0)' };

const arroba = (h: string) => (h.startsWith('@') ? h : `@${h}`);

/** @handle → id do canal (UC…), lido da página pública. Cache de 30 dias. */
export async function canalPorHandle(handle: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/${arroba(handle)}`, {
      next: { revalidate: 2592000 },
      signal: AbortSignal.timeout(10000),
      headers: CABECALHOS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    return (
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ??
      html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ??
      html.match(/"channelId":"(UC[\w-]{22})"/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

export interface AoVivo {
  id: string;
  titulo: string;
}

/**
 * O canal está transmitindo agora? A página /@canal/live aponta (canonical)
 * para o vídeo da transmissão; "isLiveNow":true separa o ao vivo de uma live
 * só agendada. `null` = não está ao vivo (ou não deu para saber).
 */
export async function aoVivoDoCanal(handle: string): Promise<AoVivo | null> {
  try {
    const res = await fetch(`https://www.youtube.com/${arroba(handle)}/live`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(10000),
      headers: CABECALHOS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const id = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1];
    if (!id || !/"isLiveNow":\s*true/.test(html)) return null;
    const titulo = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? '';
    return { id, titulo: decodificarEntidades(titulo) };
  } catch {
    return null;
  }
}

export interface VideoDoFeed {
  id: string;
  titulo: string;
  canal: string;
  publicado: string | null;
  capa: string;
  /** Link é /shorts/… */
  short: boolean;
}

/** Entradas de um feed RSS do YouTube. */
export function lerFeedDoYoutube(xml: string): VideoDoFeed[] {
  const saida: VideoDoFeed[] = [];
  for (const bruto of xml.split(/<entry>/).slice(1)) {
    const e = bruto.split('</entry>')[0];
    const id = e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    if (!id) continue;
    const link = e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ?? '';
    saida.push({
      id,
      titulo: decodificarEntidades(e.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? ''),
      canal: decodificarEntidades(e.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1]?.trim() ?? ''),
      publicado: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
      capa: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      short: link.includes('/shorts/'),
    });
  }
  return saida;
}

async function feed(url: string, revalidate: number): Promise<VideoDoFeed[] | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return lerFeedDoYoutube(await res.text());
  } catch {
    return null;
  }
}

/**
 * Vídeos recentes de um canal. `tipo` escolhe a playlist automática do
 * YouTube: "longos" (UULF, sem Shorts nem lives) ou "shorts" (UUSH). Se a
 * playlist não existir, usa o feed do canal e separa pelo link.
 */
export async function videosDoCanal(channelId: string, tipo: 'longos' | 'shorts', revalidate = 1800): Promise<VideoDoFeed[]> {
  const prefixo = tipo === 'shorts' ? 'UUSH' : 'UULF';
  const daPlaylist = await feed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${prefixo}${channelId.slice(2)}`, revalidate);
  if (daPlaylist && daPlaylist.length) return daPlaylist;
  const doCanal = (await feed(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, revalidate)) ?? [];
  return doCanal.filter((v) => (tipo === 'shorts' ? v.short : !v.short));
}
