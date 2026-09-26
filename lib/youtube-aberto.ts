import 'server-only';
/* eslint-disable @typescript-eslint/no-explicit-any */

// O que dá para saber do YouTube SEM chave de API: se um canal está ao vivo
// agora (pela página pública /@canal/live) e os vídeos mais recentes dele
// (pelo RSS público). É o que mantém o esporte ao vivo, os melhores momentos e
// os Shorts funcionando mesmo sem YOUTUBE_API_KEY — ou com a cota do dia gasta.

import { unstable_cache } from 'next/cache';
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

// ---------------------------------------------------------------------------
// Busca sem chave — a mesma página de resultados que a pessoa vê no YouTube
// ---------------------------------------------------------------------------

export type FiltroDeBusca = 'qualquer' | 'longo' | 'medio' | 'curto' | 'shorts';

/**
 * Filtros da página de resultados (parâmetro `sp`): tipo vídeo + duração
 * (longo > 20 min, médio 4–20 min, curto < 4 min) ou o tipo Shorts.
 */
const SP: Record<FiltroDeBusca, string> = {
  qualquer: 'EgIQAQ%3D%3D',
  longo: 'EgQQARgC',
  medio: 'EgQQARgD',
  curto: 'EgQQARgB',
  shorts: 'EgIQCQ%3D%3D',
};

export interface VideoDaBusca {
  id: string;
  titulo: string;
  canal: string;
  /** Duração em segundos; `null` quando a página não informa (Shorts da prateleira). */
  segundos: number | null;
  short: boolean;
  capa: string;
}

// Cabeçalhos de navegador: sem eles a página vem sem os resultados. O cookie
// SOCS pula a tela de consentimento que aparece para alguns IPs.
const CABECALHOS_DE_NAVEGADOR = {
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.6',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Cookie: 'SOCS=CAI; CONSENT=YES+cb',
};

/** "9:12:40" → 33160. */
function paraSegundos(texto?: string | null): number | null {
  if (!texto || !/^\d{1,2}(:\d{2}){1,2}$/.test(texto.trim())) return null;
  return texto
    .trim()
    .split(':')
    .reduce((t, p) => t * 60 + Number(p), 0);
}

const textoDe = (t: any): string => (t?.simpleText ?? (Array.isArray(t?.runs) ? t.runs.map((r: any) => r?.text ?? '').join('') : '')) || '';

/** O JSON que a página traz embutido (`ytInitialData`). */
export function extrairDadosIniciais(html: string): any | null {
  const m =
    html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/) ?? html.match(/window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Blocos de anúncio: nada dentro deles entra no resultado. */
const ANUNCIO = /^(adSlotRenderer|promotedVideoRenderer|promotedSparklesWebRenderer|searchPyvRenderer|inFeedAdLayoutRenderer)$/;

/**
 * Percorre o JSON da página e junta os vídeos, venham como `videoRenderer`
 * (lista comum), `reelItemRenderer` / `shortsLockupViewModel` (prateleira de
 * Shorts) ou `lockupViewModel` (o formato novo que o YouTube vem adotando).
 */
export function videosDosDados(dados: any): VideoDaBusca[] {
  const saida: VideoDaBusca[] = [];
  const vistos = new Set<string>();
  const add = (v: VideoDaBusca | null) => {
    if (!v || !/^[\w-]{11}$/.test(v.id) || vistos.has(v.id) || !v.titulo) return;
    vistos.add(v.id);
    saida.push(v);
  };

  const visitar = (no: any, profundidade: number) => {
    if (!no || typeof no !== 'object' || profundidade > 40) return;
    if (Array.isArray(no)) {
      for (const x of no) visitar(x, profundidade + 1);
      return;
    }
    for (const [chave, valor] of Object.entries<any>(no)) {
      if (ANUNCIO.test(chave)) continue;
      if (chave === 'videoRenderer' && valor?.videoId) {
        const url: string = valor?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?? '';
        const duracao = textoDe(valor.lengthText) || null;
        // Sem duração é transmissão ao vivo ou estreia: não serve para ouvir/assistir inteiro.
        if (!duracao) continue;
        add({
          id: valor.videoId,
          titulo: textoDe(valor.title),
          canal: textoDe(valor.ownerText) || textoDe(valor.longBylineText),
          segundos: paraSegundos(duracao),
          short: url.startsWith('/shorts/'),
          capa: `https://i.ytimg.com/vi/${valor.videoId}/hqdefault.jpg`,
        });
        continue;
      }
      if (chave === 'reelItemRenderer' && valor?.videoId) {
        add({ id: valor.videoId, titulo: textoDe(valor.headline), canal: '', segundos: null, short: true, capa: `https://i.ytimg.com/vi/${valor.videoId}/hqdefault.jpg` });
        continue;
      }
      if (chave === 'shortsLockupViewModel') {
        const id = valor?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ?? String(valor?.entityId ?? '').replace(/^shorts-shelf-item-/, '');
        add({ id, titulo: valor?.overlayMetadata?.primaryText?.content ?? valor?.accessibilityText ?? '', canal: '', segundos: null, short: true, capa: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
        continue;
      }
      if (chave === 'lockupViewModel' && /VIDEO/.test(String(valor?.contentType ?? ''))) {
        const meta = valor?.metadata?.lockupMetadataViewModel;
        const linhas: any[] = meta?.metadata?.contentMetadataViewModel?.metadataRows ?? [];
        const selos = JSON.stringify(valor?.contentImage ?? {}).match(/"text":"(\d{1,2}(?::\d{2}){1,2})"/)?.[1] ?? null;
        if (!selos) continue;
        add({
          id: valor?.contentId,
          titulo: meta?.title?.content ?? '',
          canal: linhas[0]?.metadataParts?.[0]?.text?.content ?? '',
          segundos: paraSegundos(selos),
          short: false,
          capa: `https://i.ytimg.com/vi/${valor?.contentId}/hqdefault.jpg`,
        });
        continue;
      }
      visitar(valor, profundidade + 1);
    }
  };
  visitar(dados?.contents ?? dados, 0);
  return saida;
}

/** A duração combina com o filtro? (Confere mesmo quando o `sp` é ignorado.) */
function cabeNoFiltro(v: VideoDaBusca, filtro: FiltroDeBusca): boolean {
  if (filtro === 'shorts') return v.short || (v.segundos != null && v.segundos <= 90);
  if (v.short) return filtro === 'curto' || filtro === 'qualquer';
  if (v.segundos == null) return filtro === 'qualquer';
  if (filtro === 'longo') return v.segundos >= 20 * 60;
  if (filtro === 'medio') return v.segundos >= 4 * 60 && v.segundos <= 20 * 60;
  if (filtro === 'curto') return v.segundos < 4 * 60;
  return true;
}

async function paginaDeResultados(termo: string, filtro: FiltroDeBusca): Promise<VideoDaBusca[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}&sp=${SP[filtro]}&hl=pt-BR&gl=BR`;
  // `revalidate` e não `no-store`: a busca também roda na geração estática
  // (ISR) das matérias da revista, onde um fetch sem cache derruba a página.
  const res = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10000), headers: CABECALHOS_DE_NAVEGADOR });
  if (!res.ok) throw new Error(`YouTube respondeu ${res.status}`);
  const dados = extrairDadosIniciais(await res.text());
  if (!dados) throw new Error('Página de resultados do YouTube sem dados');
  return videosDosDados(dados).filter((v) => cabeNoFiltro(v, filtro));
}

/**
 * Busca no YouTube sem chave e sem cota. O resultado fica guardado por 6h
 * (lista vazia não é guardada, para tentar de novo na próxima visita).
 */
const buscaGuardada = unstable_cache(
  async (termo: string, filtro: FiltroDeBusca): Promise<VideoDaBusca[]> => {
    let r = await paginaDeResultados(termo, filtro);
    // Shorts: se o filtro de tipo vier fraco, completa com vídeos curtos marcados #shorts.
    if (filtro === 'shorts' && r.length < 8) {
      const extra = await paginaDeResultados(/#shorts/i.test(termo) ? termo : `${termo} #shorts`, 'curto').catch(() => []);
      const ids = new Set(r.map((v) => v.id));
      r = [...r, ...extra.filter((v) => !ids.has(v.id) && cabeNoFiltro(v, 'shorts'))];
    }
    if (!r.length) throw new Error('Nenhum vídeo na página de resultados');
    return r;
  },
  ['youtube-busca-aberta-v1'],
  { revalidate: 21600 },
);

export async function buscarNoYoutubeAberto(termo: string, filtro: FiltroDeBusca = 'qualquer', max = 12): Promise<VideoDaBusca[]> {
  const t = termo.trim().slice(0, 150);
  if (!t) return [];
  return (await buscaGuardada(t, filtro)).slice(0, max);
}
