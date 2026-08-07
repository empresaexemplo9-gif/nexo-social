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

/** Erro do YouTube com o motivo estruturado, para diagnóstico preciso. */
export class YoutubeError extends Error {
  constructor(
    /** Código do Google: accessNotConfigured, API_KEY_HTTP_REFERRER_BLOCKED… */
    readonly reason: string,
    /** Mensagem original — costuma trazer o link de ativação e o nº do projeto. */
    readonly detalhe: string,
    readonly status: number,
  ) {
    super(detalhe || reason);
    this.name = 'YoutubeError';
  }
}

async function call(path: string, params: Record<string, string>, revalidate: number) {
  const qs = new URLSearchParams({ ...params, key: key() }).toString();
  const res = await fetch(`${API}/${path}?${qs}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Guarda motivo E mensagem: só o motivo perde o link de ativação que o
    // Google manda junto, que é justamente o que resolve o caso mais comum.
    throw new YoutubeError(
      String(body?.error?.errors?.[0]?.reason || body?.error?.status || ''),
      String(body?.error?.message || `HTTP ${res.status}`),
      res.status,
    );
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

/**
 * Traduz o motivo do Google na correção exata. Sem isso o usuário recebe um
 * conselho genérico e fica adivinhando qual das cinco causas possíveis é a sua.
 */
export function explicarErroYoutube(reason: string, detalhe: string): string {
  const r = `${reason} ${detalhe}`.toLowerCase();

  if (/accessnotconfigured|has not been used in project|is disabled/.test(r)) {
    return 'A YouTube Data API v3 não está ativada NO MESMO projeto a que a chave pertence — é comum ativar num projeto e criar a chave em outro. A mensagem do Google acima traz o número do projeto e o link direto de ativação. Depois de ativar, espere alguns minutos.';
  }
  if (/referer|referrer/.test(r)) {
    return 'A chave está restrita por referenciador HTTP. As chamadas saem do servidor da Vercel, sem referenciador — nenhuma restrição desse tipo funciona aqui. Em Credenciais → sua chave → Restrições de aplicativo, escolha "Nenhuma".';
  }
  if (/ip_address_blocked|ip address/.test(r)) {
    return 'A chave está restrita por endereço IP, e os IPs da Vercel mudam a cada requisição. Em Restrições de aplicativo, escolha "Nenhuma".';
  }
  // "Requests to this API <serviço> method <método> are blocked." é o texto
  // canônico do API_KEY_SERVICE_BLOCKED — a chave é válida, mas a lista de
  // "Restrições de API" dela não inclui esta API. Não confundir com a API
  // desativada no projeto, que dá accessNotConfigured e tem outra correção.
  if (/service_blocked|api_key_service_blocked|requests to this api .*are blocked/.test(r)) {
    return 'A chave é válida, mas as Restrições de API dela não incluem a YouTube Data API v3 — é a lista da própria chave, não a ativação no projeto. Vá em Credenciais → clique no lápis da sua chave → Restrições de API → escolha "Não restringir chave", ou mantenha "Restringir chave" e MARQUE "YouTube Data API v3" na lista. Salve e espere até 5 minutos. Se a YouTube Data API v3 não aparecer nessa lista, é porque ela ainda não está ativada neste projeto: ative em console.cloud.google.com/apis/library/youtube.googleapis.com e volte aqui.';
  }
  if (/keyinvalid|api key not valid|api_key_invalid/.test(r)) {
    return 'A chave é inválida — provavelmente foi copiada incompleta ou apagada no Console. Gere outra em Credenciais → Criar credenciais → Chave de API.';
  }
  if (/quota|ratelimit|dailylimit/.test(r)) {
    return 'A cota diária (10.000 unidades) acabou. Cada busca custa 100. Ela reabre à meia-noite no fuso do Pacífico.';
  }
  if (/forbidden|permission_denied|does not have permission|insufficient/.test(r)) {
    return 'O Google recusou a chamada. Verifique, no mesmo projeto da chave, se a YouTube Data API v3 está ativada e se as Restrições de API incluem essa API.';
  }
  return 'Veja a mensagem do Google acima — ela costuma dizer exatamente o que falta.';
}
