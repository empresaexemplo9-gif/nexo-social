import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Jogos de graça, ao vivo: os da semana na Epic Games Store (e os que vêm
// a seguir) e os free-to-play mais jogados, segundo o FreeToGame.
// Cada fonte é independente — se uma cair, a outra ainda responde.

export const dynamic = 'force-dynamic';

const EPIC_URL = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=pt-BR&country=BR&allowCountries=BR';
const FREETOGAME_URL = 'https://www.freetogame.com/api/games?sort-by=popularity';
const LOJA_EPIC = 'https://store.epicgames.com/pt-BR';
const TEMPO_LIMITE = 8000;
const QUANTOS_F2P = 12;

export interface JogoEpic {
  titulo: string;
  imagem: string | null;
  link: string;
  /** Fim da gratuidade (ISO). */
  ate: string | null;
  /** Começo da gratuidade (ISO) — útil para os que vêm "em breve". */
  inicio: string | null;
  emBreve: boolean;
}

export interface JogoGratis {
  titulo: string;
  imagem: string | null;
  link: string;
  genero: string;
  plataforma: string;
  /** Descrição curta, em inglês (é como o FreeToGame publica). */
  resumo: string;
}

// ---------------------------------------------------------------------------
// Formato cru das fontes (só o que é lido)

interface OfertaEpic {
  startDate?: string;
  endDate?: string;
  discountSetting?: { discountPercentage?: number };
}
interface ElementoEpic {
  title?: string;
  offerType?: string;
  productSlug?: string | null;
  urlSlug?: string | null;
  keyImages?: { type?: string; url?: string }[];
  catalogNs?: { mappings?: { pageSlug?: string; pageType?: string }[] | null };
  offerMappings?: { pageSlug?: string; pageType?: string }[] | null;
  promotions?: {
    promotionalOffers?: { promotionalOffers?: OfertaEpic[] }[];
    upcomingPromotionalOffers?: { promotionalOffers?: OfertaEpic[] }[];
  } | null;
}
interface ItemFreeToGame {
  title?: string;
  thumbnail?: string;
  short_description?: string;
  genre?: string;
  platform?: string;
  freetogame_profile_url?: string;
  game_url?: string;
}

async function buscarJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TEMPO_LIMITE),
    headers: { Accept: 'application/json', 'User-Agent': 'nexo-social/1.0 (+jogos-gratis)' },
    // Quem guarda é o unstable_cache abaixo (que não guarda falhas).
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).hostname}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Epic Games Store

/** Promoção "de graça" = desconto que deixa o preço em 0%. */
const ehGratis = (o: OfertaEpic) => o.discountSetting?.discountPercentage === 0 && !!o.startDate && !!o.endDate;

function imagemEpic(e: ElementoEpic): string | null {
  const ordem = ['OfferImageWide', 'DieselStoreFrontWide', 'featuredMedia', 'Thumbnail', 'OfferImageTall', 'DieselStoreFrontTall'];
  const imgs = (e.keyImages ?? []).filter((k) => k.url && /^https:\/\//.test(k.url));
  for (const tipo of ordem) {
    const k = imgs.find((i) => i.type === tipo);
    if (k?.url) {
      // O CDN da Epic redimensiona sob demanda: ~30 KB em vez de alguns MB.
      return new URL(k.url).hostname.endsWith('.epicgames.com') && !k.url.includes('?')
        ? `${k.url}?h=270&quality=medium&resize=1&w=480`
        : k.url;
    }
  }
  return null;
}

function linkEpic(e: ElementoEpic): string {
  const mapeamentos = [...(e.offerMappings ?? []), ...(e.catalogNs?.mappings ?? [])];
  const pagina = mapeamentos.find((m) => m.pageType === 'productHome' && m.pageSlug)?.pageSlug;
  const produto = e.productSlug ? e.productSlug.replace(/\/home$/, '') : null;
  // urlSlug às vezes é só um id hexadecimal — não serve de endereço.
  const url = e.urlSlug && !/^[0-9a-f]{32}$/.test(e.urlSlug) ? e.urlSlug : null;
  const slug = pagina || produto || url;
  if (!slug) return `${LOJA_EPIC}/free-games`;
  return `${LOJA_EPIC}/${e.offerType === 'BUNDLE' ? 'bundles' : 'p'}/${encodeURIComponent(slug)}`;
}

/** Guarda as ofertas grátis (atuais e futuras) com as datas; quem filtra por "agora" é a rota. */
async function epicCru(): Promise<(JogoEpic & { ofertas: { de: string; ate: string }[] })[]> {
  const json = (await buscarJson(EPIC_URL)) as { data?: { Catalog?: { searchStore?: { elements?: ElementoEpic[] } } } };
  const elementos = json?.data?.Catalog?.searchStore?.elements;
  if (!Array.isArray(elementos)) throw new Error('Formato inesperado da Epic');

  const saida: (JogoEpic & { ofertas: { de: string; ate: string }[] })[] = [];
  for (const e of elementos) {
    if (!e?.title || !e.promotions) continue;
    const ofertas = [
      ...(e.promotions.promotionalOffers ?? []).flatMap((p) => p.promotionalOffers ?? []),
      ...(e.promotions.upcomingPromotionalOffers ?? []).flatMap((p) => p.promotionalOffers ?? []),
    ]
      .filter(ehGratis)
      .map((o) => ({ de: o.startDate as string, ate: o.endDate as string }));
    if (!ofertas.length) continue;
    saida.push({ titulo: e.title, imagem: imagemEpic(e), link: linkEpic(e), ate: null, inicio: null, emBreve: false, ofertas });
  }
  return saida;
}

const epicEmCache = unstable_cache(epicCru, ['jogos-gratis-epic-v1'], { revalidate: 3600 });

function epicAgora(lista: Awaited<ReturnType<typeof epicCru>>): JogoEpic[] {
  const agora = Date.now();
  const vistos = new Set<string>();
  const jogos: JogoEpic[] = [];
  for (const j of lista) {
    const valida = j.ofertas
      .filter((o) => Date.parse(o.ate) > agora)
      .sort((a, b) => Date.parse(a.de) - Date.parse(b.de))[0];
    if (!valida || vistos.has(j.titulo)) continue;
    vistos.add(j.titulo);
    const emBreve = Date.parse(valida.de) > agora;
    jogos.push({ titulo: j.titulo, imagem: j.imagem, link: j.link, ate: valida.ate, inicio: valida.de, emBreve });
  }
  // Primeiro os grátis agora (os que acabam antes na frente), depois os que vêm.
  return jogos.sort((a, b) =>
    a.emBreve !== b.emBreve ? (a.emBreve ? 1 : -1) : Date.parse((a.emBreve ? a.inicio : a.ate) ?? '') - Date.parse((b.emBreve ? b.inicio : b.ate) ?? ''),
  );
}

// ---------------------------------------------------------------------------
// FreeToGame

const GENEROS: Record<string, string> = {
  shooter: 'Tiro',
  strategy: 'Estratégia',
  'card game': 'Cartas',
  sports: 'Esporte',
  fighting: 'Luta',
  racing: 'Corrida',
  social: 'Social',
  fantasy: 'Fantasia',
  action: 'Ação',
  'action game': 'Ação',
  'action rpg': 'RPG de ação',
  arpg: 'RPG de ação',
  'dungeon crawler': 'Masmorras',
  'battle royale': 'Battle royale',
};

function plataformaPt(p: string): string {
  return p
    .split(',')
    .map((s) => s.trim())
    .map((s) => (/windows/i.test(s) ? 'PC' : /browser/i.test(s) ? 'Navegador' : s))
    .filter(Boolean)
    .join(' · ');
}

async function freeToGameCru(): Promise<JogoGratis[]> {
  const json = await buscarJson(FREETOGAME_URL);
  if (!Array.isArray(json)) throw new Error('Formato inesperado do FreeToGame');
  const jogos = (json as ItemFreeToGame[])
    .filter((g) => g?.title && (g.freetogame_profile_url || g.game_url))
    .slice(0, QUANTOS_F2P)
    .map((g) => {
      const genero = (g.genre ?? '').trim();
      return {
        titulo: String(g.title),
        imagem: g.thumbnail && /^https:\/\//.test(g.thumbnail) ? g.thumbnail : null,
        link: String(g.freetogame_profile_url || g.game_url),
        genero: GENEROS[genero.toLowerCase()] ?? genero,
        plataforma: plataformaPt(g.platform ?? ''),
        resumo: (g.short_description ?? '').trim(),
      };
    });
  if (!jogos.length) throw new Error('FreeToGame sem jogos');
  return jogos;
}

const freeToGameEmCache = unstable_cache(freeToGameCru, ['jogos-gratis-f2p-v1'], { revalidate: 3600 });

// ---------------------------------------------------------------------------

/**
 * GET /api/jogos-gratis
 * → { epic: JogoEpic[], gratis: JogoGratis[], falhas: string[] }
 */
export async function GET() {
  const [epic, gratis] = await Promise.allSettled([epicEmCache(), freeToGameEmCache()]);
  const falhas: string[] = [];
  if (epic.status === 'rejected') falhas.push('epic');
  if (gratis.status === 'rejected') falhas.push('freetogame');

  const corpo = {
    epic: epic.status === 'fulfilled' ? epicAgora(epic.value) : [],
    gratis: gratis.status === 'fulfilled' ? gratis.value : [],
    falhas,
  };
  return NextResponse.json(corpo, {
    status: falhas.length === 2 ? 502 : 200,
    headers: { 'Cache-Control': falhas.length ? 'no-store' : 'public, s-maxage=1800, stale-while-revalidate=3600' },
  });
}
