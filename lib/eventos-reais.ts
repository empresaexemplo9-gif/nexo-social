import 'server-only';
/* eslint-disable @typescript-eslint/no-explicit-any */

// Eventos reais para a agenda, direto da bilheteria.
//
// A tabela `events` só enche quando alguém roda a importação no painel — e,
// vazia, a agenda caía nos exemplos fixos de lib/data.ts: sempre os mesmos.
// Aqui a agenda consulta o Ticketmaster Discovery (TICKETMASTER_API_KEY) ao
// vivo, por tema, com cache de 3 horas:
//
//   • temas com segmento próprio (música, esporte, cultura, cinema) pedem o
//     segmento inteiro no Brasil;
//   • os demais (moda, gastronomia, games…) pedem por palavras-chave;
//   • perto da pessoa (?lat&lng) há uma consulta a mais, num raio de 200 km.
//
// Temporadas longas (a mesma peça em 30 sessões) viram um evento só, com a
// próxima data — senão uma única peça ocupava a agenda inteira.

import { unstable_cache } from 'next/cache';
import { CITIES, type CategorySlug, type EventItem } from './data';
import type { LatLng } from './geo';
import { formatEventDate } from './datetime';
import { descricaoEvento, eventoPublicavel, melhorImagem, precoEvento, semDuplicatasDeShow } from './integrations';

const API = 'https://app.ticketmaster.com/discovery/v2';
const TRES_HORAS = 10800;

interface Consulta {
  /** Segmento do Ticketmaster (Music, Sports, Arts & Theatre, Film). */
  segmento?: string;
  /** Palavras buscadas uma a uma quando o tema não tem segmento. */
  palavras?: string[];
}

const CONSULTAS: Record<CategorySlug, Consulta> = {
  musica: { segmento: 'Music' },
  esporte: { segmento: 'Sports' },
  cultura: { segmento: 'Arts & Theatre' },
  cinema: { segmento: 'Film', palavras: ['festival de cinema'] },
  arte: { palavras: ['exposição', 'arte', 'fotografia'] },
  moda: { palavras: ['moda', 'fashion', 'desfile'] },
  gastronomia: { palavras: ['gastronomia', 'food', 'cerveja'] },
  tecnologia: { palavras: ['tecnologia', 'tech'] },
  games: { palavras: ['games', 'geek', 'anime'] },
  livros: { palavras: ['livro', 'bienal'] },
  'bem-estar': { palavras: ['yoga', 'meditação', 'corrida'] },
  viagem: { palavras: ['turismo', 'passeio'] },
};

export function ticketmasterConfigurado(): boolean {
  return Boolean((process.env.TICKETMASTER_API_KEY || '').trim());
}

// --- Limite de 5 pedidos por segundo do Ticketmaster -------------------------
let fila: Promise<void> = Promise.resolve();
function naVez(): Promise<void> {
  const minha = fila.then(() => new Promise<void>((ok) => setTimeout(ok, 230)));
  fila = minha.catch(() => undefined);
  return minha;
}

async function pedir(caminho: string, params: Record<string, string>): Promise<any> {
  await naVez();
  const qs = new URLSearchParams({ apikey: (process.env.TICKETMASTER_API_KEY || '').trim(), locale: '*', ...params });
  // `revalidate` e não `no-store`: estas consultas rodam na geração estática
  // (ISR) das páginas de tema, onde um fetch sem cache derruba a renderização.
  const res = await fetch(`${API}/${caminho}?${qs}`, { next: { revalidate: TRES_HORAS }, signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Ticketmaster respondeu ${res.status}`);
  return res.json();
}

/** "2026-09-26T03:00:00Z" — o Discovery recusa milissegundos. */
const agoraIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// --- Geohash (o Discovery localiza por geoPoint) ------------------------------
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
export function geohash(lat: number, lng: number, precisao = 5): string {
  let [latMin, latMax, lngMin, lngMax] = [-90, 90, -180, 180];
  let hash = '';
  let bit = 0;
  let ch = 0;
  let par = true;
  while (hash.length < precisao) {
    if (par) {
      const meio = (lngMin + lngMax) / 2;
      if (lng >= meio) {
        ch = (ch << 1) | 1;
        lngMin = meio;
      } else {
        ch <<= 1;
        lngMax = meio;
      }
    } else {
      const meio = (latMin + latMax) / 2;
      if (lat >= meio) {
        ch = (ch << 1) | 1;
        latMin = meio;
      } else {
        ch <<= 1;
        latMax = meio;
      }
    }
    par = !par;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

// --- Conversão ----------------------------------------------------------------
const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

function coordenadas(venue: any): LatLng {
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) return { lat, lng };
  const cidade = semAcento(venue?.city?.name ?? '');
  return CITIES.find((c) => semAcento(c.name) === cidade)?.coords ?? { lat: 0, lng: 0 };
}

function paraEvento(ev: any, tema: CategorySlug): EventItem | null {
  const inicio: string | undefined = ev?.dates?.start?.dateTime ?? (ev?.dates?.start?.localDate ? `${ev.dates.start.localDate}T12:00:00-03:00` : undefined);
  if (!inicio) return null;
  const venue = ev?._embedded?.venues?.[0];
  const genero = ev?.classifications?.[0]?.genre?.name;
  const subgenero = ev?.classifications?.[0]?.subGenre?.name;
  const iso = new Date(inicio).toISOString();
  return {
    id: `tm-${ev.id}`,
    topic: tema,
    title: String(ev.name ?? 'Evento'),
    date: formatEventDate(iso),
    startsAt: iso,
    endsAt: ev?.dates?.end?.dateTime ? new Date(ev.dates.end.dateTime).toISOString() : undefined,
    city: venue?.city?.name ?? '',
    venue: venue?.name ?? 'Local a confirmar',
    coords: coordenadas(venue),
    imageUrl: melhorImagem(ev),
    description: descricaoEvento(ev),
    price: precoEvento(ev),
    tags: [genero, subgenero].filter((g) => g && g !== 'Undefined' && g !== 'Other'),
    artist: ev?._embedded?.attractions?.[0]?.name ?? undefined,
    ticketUrl: ev?.url ?? undefined,
  };
}

/** A mesma atração no mesmo local em várias datas vira um evento só (a próxima). */
function juntarTemporadas(eventos: EventItem[]): EventItem[] {
  const porChave = new Map<string, { ev: EventItem; datas: number }>();
  for (const e of eventos.sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!))) {
    const chave = `${semAcento(e.title).replace(/[^a-z0-9]+/g, ' ')}@${semAcento(e.venue)}`;
    const atual = porChave.get(chave);
    if (atual) atual.datas++;
    else porChave.set(chave, { ev: e, datas: 1 });
  }
  return Array.from(porChave.values()).map(({ ev, datas }) =>
    datas > 1 ? { ...ev, description: `${ev.description} Mais ${datas - 1} ${datas - 1 === 1 ? 'data' : 'datas'} na temporada.`.trim() } : ev,
  );
}

async function consultar(tema: CategorySlug, extra: Record<string, string>): Promise<EventItem[]> {
  const c = CONSULTAS[tema];
  const pedidos: Record<string, string>[] = [];
  if (c.segmento) pedidos.push({ classificationName: c.segmento, size: '120' });
  for (const p of c.palavras ?? []) pedidos.push({ keyword: p, size: '40' });

  const brutos: any[] = [];
  let falhas = 0;
  for (const p of pedidos) {
    try {
      const j = await pedir('events.json', { countryCode: 'BR', sort: 'date,asc', startDateTime: agoraIso(), ...p, ...extra });
      brutos.push(...(j?._embedded?.events ?? []));
    } catch {
      falhas++;
    }
  }
  // Tudo falhou: erro (não vai para o cache). Parte falhou: segue com o que veio.
  if (falhas && falhas === pedidos.length) throw new Error('Ticketmaster indisponível');

  const vistos = new Set<string>();
  const unicos = brutos.filter((ev) => ev?.id && !vistos.has(ev.id) && vistos.add(ev.id));
  const eventos = semDuplicatasDeShow(unicos.filter(eventoPublicavel))
    .map((ev) => paraEvento(ev, tema))
    .filter((e): e is EventItem => Boolean(e));
  return juntarTemporadas(eventos);
}

const doTemaGuardado = unstable_cache(async (tema: CategorySlug) => consultar(tema, {}), ['eventos-reais-v1'], { revalidate: TRES_HORAS });

const pertoGuardado = unstable_cache(
  async (tema: CategorySlug, ponto: string) => consultar(tema, { geoPoint: ponto, radius: '200', unit: 'km' }),
  ['eventos-reais-perto-v1'],
  { revalidate: TRES_HORAS },
);

/** Eventos reais de um tema no Brasil (lista vazia sem chave ou em falha). */
export async function eventosReais(tema: CategorySlug): Promise<EventItem[]> {
  if (!ticketmasterConfigurado() || !CONSULTAS[tema]) return [];
  return doTemaGuardado(tema).catch(() => []);
}

/** Eventos reais de um tema num raio de 200 km de um ponto. */
export async function eventosReaisPerto(tema: CategorySlug, ponto: LatLng): Promise<EventItem[]> {
  if (!ticketmasterConfigurado() || !CONSULTAS[tema]) return [];
  // Geohash de 4 letras (~20 km): pessoas da mesma região dividem o cache.
  return pertoGuardado(tema, geohash(ponto.lat, ponto.lng, 4)).catch(() => []);
}

/** Um evento do Ticketmaster pelo id da agenda (`tm-…`), para a página do evento. */
export async function eventoRealPorId(id: string, temas: CategorySlug[]): Promise<EventItem | null> {
  if (!id.startsWith('tm-') || !ticketmasterConfigurado()) return null;
  // Primeiro nas listas em cache (sem gastar pedido)…
  for (const t of temas) {
    const achado = (await eventosReais(t)).find((e) => e.id === id);
    if (achado) return achado;
  }
  // …depois direto na API.
  try {
    const ev = await pedir(`events/${encodeURIComponent(id.slice(3))}.json`, {});
    if (!ev || !eventoPublicavel(ev)) return null;
    const seg = String(ev?.classifications?.[0]?.segment?.name ?? '');
    const tema: CategorySlug = /music/i.test(seg) ? 'musica' : /sport/i.test(seg) ? 'esporte' : /film/i.test(seg) ? 'cinema' : 'cultura';
    return paraEvento(ev, tema);
  } catch {
    return null;
  }
}
