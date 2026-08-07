import 'server-only';

// Resolve vídeos e canais do YouTube para tocar DENTRO do nexo.social.
//
// Por que precisa de API: o player embutido do YouTube só aceita id de vídeo,
// de playlist ou de canal — não aceita um termo de busca. Sem resolver o termo
// para um id, o máximo que dá para fazer é mandar a pessoa para a busca do
// YouTube, que é exatamente o comportamento que queremos eliminar.
//
// A YOUTUBE_API_KEY é gratuita (10.000 unidades/dia; cada busca custa 100).
// Sem ela, quem chama recebe `configurado: false` e cai no link externo.

const API = 'https://www.googleapis.com/youtube/v3';

export interface ResolvedVideo {
  id: string;
  title: string;
  channel: string;
  thumb: string | null;
  embedUrl: string;
}

function key(): string {
  return (process.env.YOUTUBE_API_KEY || '').trim();
}

export function isYoutubeConfigured(): boolean {
  return Boolean(key());
}

async function call(path: string, params: Record<string, string>, revalidate: number) {
  const qs = new URLSearchParams({ ...params, key: key() }).toString();
  const res = await fetch(`${API}/${path}?${qs}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const motivo = body?.error?.errors?.[0]?.reason || body?.error?.message || `HTTP ${res.status}`;
    throw new Error(String(motivo));
  }
  return body;
}

/**
 * Melhor vídeo para um termo. Cache de 24h: a indicação de um craque não muda
 * de hora em hora, e cada busca custa 100 unidades da cota.
 */
export async function searchVideo(query: string): Promise<ResolvedVideo | null> {
  const body = await call(
    'search',
    {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '1',
      // Só o que pode ser embutido e tem duração de vídeo (não Shorts soltos).
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      safeSearch: 'moderate',
      relevanceLanguage: 'pt',
    },
    86400,
  );

  const item = body?.items?.[0];
  if (!item?.id?.videoId) return null;
  return {
    id: item.id.videoId,
    title: item.snippet?.title ?? '',
    channel: item.snippet?.channelTitle ?? '',
    thumb: item.snippet?.thumbnails?.medium?.url ?? null,
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?rel=0`,
  };
}

/**
 * Id do canal a partir do @handle. Necessário para embutir a transmissão ao
 * vivo: o YouTube aceita /embed/live_stream?channel=<ID>, mas não o handle.
 * Cache de 30 dias — id de canal não muda.
 */
export async function resolveChannelId(handle: string): Promise<string | null> {
  const limpo = handle.replace(/^@/, '');
  try {
    const body = await call('channels', { part: 'id', forHandle: `@${limpo}` }, 2592000);
    const id = body?.items?.[0]?.id;
    if (id) return id;
  } catch {
    /* forHandle é recente; se falhar, tenta a busca abaixo */
  }
  const body = await call('search', { part: 'snippet', q: limpo, type: 'channel', maxResults: '1' }, 2592000);
  return body?.items?.[0]?.snippet?.channelId ?? body?.items?.[0]?.id?.channelId ?? null;
}

/** URL de embed da transmissão ao vivo corrente de um canal. */
export function liveEmbedUrl(channelId: string): string {
  return `https://www.youtube.com/embed/live_stream?channel=${channelId}`;
}
