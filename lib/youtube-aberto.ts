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
/** Resolução mínima pedida à página de resultados (o filtro "4K" ou "HD" do YouTube). */
export type QualidadeDeBusca = 'qualquer' | 'hd' | '4k';

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

/**
 * O `sp` com a resolução junto: é o mesmo protobuf da página de busca
 * (campo 2 = filtros; dentro: tipo vídeo, duração e o selo 4K ou HD).
 */
export function filtroDaBusca(filtro: FiltroDeBusca, qualidade: QualidadeDeBusca = 'qualquer'): string {
  if (qualidade === 'qualquer' || filtro === 'shorts') return SP[filtro];
  const filtros = [0x10, 0x01];
  const duracao = { curto: 1, longo: 2, medio: 3 }[filtro as 'curto' | 'longo' | 'medio'];
  if (duracao) filtros.push(0x18, duracao);
  filtros.push(qualidade === '4k' ? 0x70 : 0x20, 0x01);
  const bytes = [0x12, filtros.length, ...filtros];
  const b64 = typeof btoa === 'function' ? btoa(String.fromCharCode(...bytes)) : Buffer.from(bytes).toString('base64');
  return encodeURIComponent(b64);
}

/**
 * Há quanto tempo o vídeo saiu, em anos, pelo texto da página ("há 2 anos",
 * "Transmitido há 3 meses", "1 year ago"). `null` quando não dá para saber.
 */
export function idadeEmAnos(texto: string | null | undefined): number | null {
  const t = String(texto ?? '').toLowerCase();
  if (!t) return null;
  const n = Number(t.match(/(\d+)/)?.[1] ?? '1');
  if (/\b(ano|anos|year|years)\b/.test(t)) return n;
  if (/\b(m[eê]s|meses|month|months)\b/.test(t)) return n / 12;
  if (/\b(semana|semanas|week|weeks|dia|dias|day|days|hora|horas|hour|hours|minuto|minutos|minute|minutes|segundo|segundos|second|seconds)\b/.test(t)) return 0;
  return null;
}

export interface VideoDaBusca {
  id: string;
  titulo: string;
  canal: string;
  /** Duração em segundos; `null` quando a página não informa (Shorts da prateleira). */
  segundos: number | null;
  short: boolean;
  capa: string;
  /** Há quantos anos saiu (`null` quando a página não diz). */
  anos?: number | null;
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
          anos: idadeEmAnos(textoDe(valor.publishedTimeText)),
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
          anos: idadeEmAnos(JSON.stringify(linhas).match(/"content":"([^"]*(?:há|ago)[^"]*)"/i)?.[1]),
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

async function paginaDeResultados(termo: string, filtro: FiltroDeBusca, qualidade: QualidadeDeBusca = 'qualquer'): Promise<VideoDaBusca[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}&sp=${filtroDaBusca(filtro, qualidade)}&hl=pt-BR&gl=BR`;
  // `revalidate` e não `no-store`: a busca também roda na geração estática
  // (ISR) das matérias da revista, onde um fetch sem cache derruba a página.
  const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(10000), headers: CABECALHOS_DE_NAVEGADOR });
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
  async (termo: string, filtro: FiltroDeBusca, qualidade: QualidadeDeBusca = 'qualquer'): Promise<VideoDaBusca[]> => {
    let r = await paginaDeResultados(termo, filtro, qualidade);
    // Shorts: se o filtro de tipo vier fraco, completa com vídeos curtos marcados #shorts.
    if (filtro === 'shorts' && r.length < 8) {
      const extra = await paginaDeResultados(/#shorts/i.test(termo) ? termo : `${termo} #shorts`, 'curto').catch(() => []);
      const ids = new Set(r.map((v) => v.id));
      r = [...r, ...extra.filter((v) => !ids.has(v.id) && cabeNoFiltro(v, 'shorts'))];
    }
    if (!r.length) throw new Error('Nenhum vídeo na página de resultados');
    return r;
  },
  ['youtube-busca-aberta-v3'],
  { revalidate: 600 },
);

export async function buscarNoYoutubeAberto(
  termo: string,
  filtro: FiltroDeBusca = 'qualquer',
  max = 12,
  qualidade: QualidadeDeBusca = 'qualquer',
): Promise<VideoDaBusca[]> {
  const t = termo.trim().slice(0, 150);
  if (!t) return [];
  const lists = await Promise.allSettled([
    buscaGuardada(t + ' português Brasil', filtro, qualidade),
    buscaGuardada(t + ' legendado português', filtro, qualidade),
    buscaGuardada(t, filtro, qualidade),
  ]);
  const all = lists.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  if (!all.length) {
    const failure = lists.find(r => r.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    return [];
  }
  const unique = Array.from(new Map(all.map(v => [v.id, v])).values());
  return (await priorizarPortugues(unique)).slice(0, max);
}


/** Preferência de idioma, sem excluir conteúdo internacional ou confundir legenda com áudio. */
export async function priorizarPortugues<T extends { id: string; titulo: string; canal: string }>(videos: T[]): Promise<(T & { preferenciaPt: number })[]> {
  const national = /caz[eé]tv|canal goat|ge tv|espn brasil|sportv|tecmundo|canaltech|manual do mundo|multishow|netflix brasil|omelete|prime video br|tastemade br|tudo ?gostoso|panelinha|drauzio|vogue brasil|tv cultura|tatiana feltrin|lnb|v[oô]lei brasil|flow sport/i;
  const scores = new Map(videos.map(v => [v.id, national.test(v.canal) ? 3 : /legendad[oa].*(portugu[eê]s|pt.?br)|(?:portugu[eê]s|pt.?br).*legend|dublad[oa]|portugu[eê]s brasileiro/i.test(v.titulo) ? 2 : 0]));
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (apiKey && videos.length) {
    try {
      const qs = new URLSearchParams({ key: apiKey, part: 'snippet,contentDetails', id: videos.slice(0, 50).map(v => v.id).join(',') });
      const res = await fetch('https://www.googleapis.com/youtube/v3/videos?' + qs, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        const captions: string[] = [];
        for (const v of data.items || []) {
          const audio = String(v.snippet?.defaultAudioLanguage || '').toLowerCase();
          if (audio === 'pt-br') scores.set(v.id, 5);
          else if (audio === 'pt' || audio.startsWith('pt-')) scores.set(v.id, 4);
          else if (v.contentDetails?.caption === 'true') captions.push(v.id);
        }
        // caption=true alone does NOT identify the language. Inspect published tracks.
        await Promise.all(captions.slice(0, 4).map(async id => {
          try {
            const page = await fetch('https://www.youtube.com/watch?v=' + id, { next: { revalidate: 21600 }, headers: CABECALHOS, signal: AbortSignal.timeout(5000) });
            if (!page.ok) return;
            const tracks = (await page.text()).match(/"captionTracks":(\[[\s\S]*?\])/);
            if (!tracks) return;
            const languages = JSON.parse(tracks[1]).map((t: any) => String(t.languageCode).toLowerCase());
            if (languages.some((l: string) => l === 'pt-br' || l === 'pt')) scores.set(id, Math.max(scores.get(id) || 0, 4));
          } catch { /* Unknown language stays unclassified. */ }
        }));
      }
    } catch { /* National channel/editorial signals remain useful if metadata fails. */ }
  }
  const ordered = videos.map(v => ({ ...v, preferenciaPt: scores.get(v.id) || 0 })).sort((a, b) => b.preferenciaPt - a.preferenciaPt);
  const preferred = ordered.filter(v => v.preferenciaPt > 0), original = ordered.filter(v => !v.preferenciaPt);
  const out: typeof ordered = [];
  while (preferred.length || original.length) {
    out.push(...preferred.splice(0, 3), ...original.splice(0, 1));
  }
  return out;
}
