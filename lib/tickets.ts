import 'server-only';

// Venda de ingressos — shows, eventos e jogos.
//
// O QUE CADA API REALMENTE PERMITE (isto define o desenho):
//
// • Ticketmaster Discovery — é a ÚNICA com busca pública de verdade sobre o
//   catálogo inteiro, e cobre tanto música quanto esporte. É ela que descobre
//   evento de terceiro e traz o link de compra. Cobertura no Brasil é parcial:
//   grandes casas, turnês internacionais e alguns jogos.
//
// • Sympla — a maior do Brasil em eventos, mas a API pública devolve APENAS os
//   eventos do dono do token. Não é busca no catálogo da Sympla. Serve quando a
//   nexo.social (ou um parceiro) é a organizadora.
//
// • Eventbrite — mesma situação: a busca pública de eventos foi removida em
//   2020. Só lista os eventos da própria organização.
//
// Ou seja: para DESCOBRIR ingresso de terceiro, só o Ticketmaster. Para os
// próprios eventos, Sympla e Eventbrite. E para os jogos que vêm da agenda
// esportiva (ESPN/TheSportsDB), que não trazem link de venda, montamos busca
// direcionada nas bilheterias — ver `ticketSearchForMatch`.

import type { CategorySlug } from './data';

export interface ImportedEvent {
  source: string;
  external_id: string;
  title: string;
  category: CategorySlug;
  event_date: string;
  starts_at: string | null;
  ends_at: string | null;
  city: string;
  location: string;
  lat: number | null;
  lng: number | null;
  image_url: string;
  description: string;
  price: string;
  artist: string | null;
  ticket_url: string | null;
}

const TIMEOUT_MS = 12000;

async function pedir(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': 'nexo-social/1.0 (+https://nexo-social-two.vercel.app)',
        Accept: 'application/json',
        ...headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function env(nome: string): string {
  return (process.env[nome] || '').trim();
}

function dataBr(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ---------------------------------------------------------------------------
// Sympla — eventos da própria organização
// ---------------------------------------------------------------------------

/** Classifica um evento da Sympla no tema da plataforma. */
function categoriaSympla(nome?: string): CategorySlug {
  const s = (nome || '').toLowerCase();
  if (/música|musica|show|festival|sertanejo|rock|samba/.test(s)) return 'musica';
  if (/esporte|corrida|futebol|vôlei|volei|basquete|tênis|tenis|maratona/.test(s)) return 'esporte';
  if (/gastronom|culinár|culinar|comida|cerveja|vinho/.test(s)) return 'gastronomia';
  if (/teatro|arte|cultura|expos|cinema/.test(s)) return 'cultura';
  if (/tecnolog|startup|inovação|inovacao|dados/.test(s)) return 'tecnologia';
  if (/livro|literat/.test(s)) return 'livros';
  if (/saúde|saude|bem-estar|yoga|medita/.test(s)) return 'bem-estar';
  if (/game|jogo eletr|esports/.test(s)) return 'games';
  return 'cultura';
}

const SYMPLA_BASE = 'https://api.sympla.com.br/public/v1.6.0';
const TZ = 'America/Sao_Paulo';
/** Teto de páginas por importação — a paginação é por cursor e não tem fim. */
const MAX_PAGINAS = 5;

/** Converte um evento da Sympla no formato da plataforma. */
function mapearSympla(e: any): ImportedEvent {
  const end = e?.address ?? {};
  return {
    source: 'sympla',
    external_id: String(e.id),
    title: e.name ?? 'Evento',
    category: categoriaSympla(e?.category_prim?.name ?? e?.category_sec?.name ?? e?.name),
    event_date: dataBr(e.start_date),
    starts_at: e.start_date ? new Date(e.start_date).toISOString() : null,
    ends_at: e.end_date ? new Date(e.end_date).toISOString() : null,
    city: end.city ?? '',
    location: end.name || end.address || 'Local a confirmar',
    lat: end.lat != null ? Number(end.lat) : null,
    lng: end.lon != null ? Number(end.lon) : null,
    image_url: e.image ?? '',
    description:
      (e.detail ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600) ||
      `${e.name} — ingressos pela Sympla.`,
    price: 'Consultar na Sympla',
    // O produtor do evento é o equivalente mais próximo de "atração".
    artist: e?.host?.name ?? null,
    ticket_url: e.url ?? null,
  };
}

/**
 * Eventos da conta Sympla do token.
 *
 * Segue o contrato da v1.6.0:
 *  - `published`, `timezone` e `sort` são OBRIGATÓRIOS;
 *  - `sort` é minúsculo (`asc`/`desc`) — `DESC` é recusado;
 *  - a paginação é por CURSOR (`pagination.next_cursor`), não por número de
 *    página, então uma chamada só devolve no máximo `page_size` eventos.
 *
 * Ordenamos por data crescente a partir de hoje: uma agenda quer o que vem
 * pela frente, não o que já passou.
 */
export async function buscarSympla(): Promise<{ eventos: ImportedEvent[]; erro?: string; dica?: string }> {
  const token = env('SYMPLA_API_TOKEN');
  if (!token) {
    return {
      eventos: [],
      erro: 'SYMPLA_API_TOKEN não configurada.',
      dica: 'Gere o token em Sympla → Minha conta → Integrações → Tokens de API e adicione SYMPLA_API_TOKEN na Vercel.',
    };
  }

  // `from` é data local na timezone informada, sem sufixo Z.
  const agora = new Date();
  const hojeSP = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora);

  const eventos: ImportedEvent[] = [];
  let cursor: string | undefined;
  let descartados = 0;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const params = new URLSearchParams({
      published: 'published',
      timezone: TZ,
      sort: 'asc',
      field_sort: 'start_date',
      from: `${hojeSP}T00:00:00`,
      page_size: '100',
    });
    if (cursor) params.set('cursor', cursor);

    const res = await pedir(`${SYMPLA_BASE}/events?${params}`, { s_token: token });
    const texto = await res.text();

    if (!res.ok) {
      // Se já trouxemos algo, entrega o que deu — melhor que perder tudo.
      if (eventos.length) break;
      return {
        eventos: [],
        erro: `Sympla respondeu ${res.status}: ${texto.replace(/\s+/g, ' ').slice(0, 160)}`,
        dica:
          res.status === 401 || res.status === 403
            ? 'Token inválido ou sem permissão. Gere outro em Sympla → Minha conta → Integrações.'
            : 'Confira os parâmetros em developers.sympla.com.br/api-doc.',
      };
    }

    let json: any;
    try {
      json = JSON.parse(texto || '{}');
    } catch {
      return { eventos: [], erro: 'A Sympla respondeu algo que não é JSON.' };
    }

    const itens: any[] = json?.data ?? [];
    for (const e of itens) {
      // Cancelado e privado não podem virar evento público na agenda —
      // a API devolve os dois, sinalizados por 0/1.
      if (e?.cancelled === 1 || e?.private_event === 1) {
        descartados++;
        continue;
      }
      eventos.push(mapearSympla(e));
    }

    cursor = json?.pagination?.next_cursor || undefined;
    if (!cursor || itens.length === 0) break;
  }

  if (!eventos.length) {
    return {
      eventos: [],
      erro: undefined,
      dica: descartados
        ? `Todos os ${descartados} evento(s) encontrados estão cancelados ou são privados.`
        : undefined,
    };
  }

  return { eventos };
}

// ---------------------------------------------------------------------------
// Eventbrite — eventos da própria organização
// ---------------------------------------------------------------------------

export async function buscarEventbrite(): Promise<{ eventos: ImportedEvent[]; erro?: string; dica?: string }> {
  const token = env('EVENTBRITE_TOKEN');
  if (!token) {
    return {
      eventos: [],
      erro: 'EVENTBRITE_TOKEN não configurada.',
      dica: 'Crie um token privado em eventbrite.com/platform/api-keys e adicione EVENTBRITE_TOKEN na Vercel.',
    };
  }
  const auth = { Authorization: `Bearer ${token}` };

  // A API não tem busca pública desde 2020 — é preciso partir da organização.
  const orgRes = await pedir('https://www.eventbriteapi.com/v3/users/me/organizations/', auth);
  if (!orgRes.ok) {
    const corpo = (await orgRes.text()).replace(/\s+/g, ' ').slice(0, 160);
    return {
      eventos: [],
      erro: `Eventbrite respondeu ${orgRes.status}: ${corpo}`,
      dica:
        orgRes.status === 401
          ? 'Token inválido. Gere outro em eventbrite.com/platform/api-keys (Private Token).'
          : 'Confira as permissões do token.',
    };
  }

  const orgs = (await orgRes.json())?.organizations ?? [];
  if (!orgs.length) {
    return {
      eventos: [],
      erro: 'Nenhuma organização encontrada nesta conta do Eventbrite.',
      dica: 'A API do Eventbrite só lista eventos da SUA organização — ela não busca eventos de terceiros desde 2020.',
    };
  }

  const orgId = orgs[0].id;
  const evRes = await pedir(
    `https://www.eventbriteapi.com/v3/organizations/${orgId}/events/?status=live&expand=venue&page_size=50`,
    auth,
  );
  if (!evRes.ok) {
    const corpo = (await evRes.text()).replace(/\s+/g, ' ').slice(0, 160);
    return { eventos: [], erro: `Eventbrite respondeu ${evRes.status}: ${corpo}` };
  }

  const itens: any[] = (await evRes.json())?.events ?? [];
  const eventos = itens.map((e: any): ImportedEvent => {
    const v = e?.venue ?? {};
    const inicio = e?.start?.utc ?? null;
    return {
      source: 'eventbrite',
      external_id: String(e.id),
      title: e?.name?.text ?? 'Evento',
      category: categoriaSympla(e?.name?.text),
      event_date: dataBr(inicio),
      starts_at: inicio,
      ends_at: e?.end?.utc ?? null,
      city: v?.address?.city ?? '',
      location: v?.name || v?.address?.localized_address_display || 'Local a confirmar',
      lat: v?.latitude ? Number(v.latitude) : null,
      lng: v?.longitude ? Number(v.longitude) : null,
      image_url: e?.logo?.url ?? '',
      description: (e?.description?.text ?? '').trim().slice(0, 600) || `${e?.name?.text} — ingressos pelo Eventbrite.`,
      price: e?.is_free ? 'Gratuito' : 'Consultar no Eventbrite',
      artist: null,
      ticket_url: e?.url ?? null,
    };
  });

  return { eventos };
}

// Os links de bilheteria vivem em ./tickets-links (sem `server-only`), para o
// SportsHub poder usá-los no navegador.
export { ticketSearchForMatch, type TicketLink } from './tickets-links';
