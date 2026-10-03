// O que a pessoa escolheu para a aparência (ids dos temas dos convites). Fica
// separado de lib/aparencia.ts, que traz as paletas: as preferências e o
// aplicador global só precisam disto.

/** Os murais das áreas (lib/areas.ts): o muro escuro ou a versão clara. */
export type Muro = 'escuro' | 'claro';

/** Onde vale o plano de fundo exclusivo: só na home ou em todas as abas. */
export type EscopoDoFundo = 'home' | 'todas';

/** O plano de fundo exclusivo em uso (lib/exclusivos.ts). */
export interface FundoExclusivo {
  id: string;
  url: string;
  escopo: EscopoDoFundo;
}

/** Adesivo ou botton colado no banner da home (posição em % do banner). */
export interface ItemNoBanner {
  id: string;
  url: string;
  tipo: 'sticker' | 'button';
  /** Centro do item, de 0 a 100 (% da largura e da altura do banner). */
  x: number;
  y: number;
  /** Inclinação, em graus. */
  giro: number;
}

/** Quantos itens cabem no banner. */
export const MAXIMO_NO_BANNER = 12;

export interface Aparencia {
  /** Tema do fundo da home (null: o papel padrão). */
  fundo: string | null;
  /** Tema dos botões e destaques (null: o azul da plataforma). */
  botoes: string | null;
  /** Versão dos murais de fundo das áreas. */
  muro: Muro;
  /** Plano de fundo exclusivo escolhido (null: nenhum). */
  exclusivo: FundoExclusivo | null;
  /** Adesivos e bottons colados no banner da home. */
  banner: ItemNoBanner[];
}

export const APARENCIA_PADRAO: Aparencia = { fundo: null, botoes: null, muro: 'escuro', exclusivo: null, banner: [] };

/** Chave do cache no aparelho: as variáveis prontas, aplicadas antes de pintar. */
export const CACHE_DA_APARENCIA = 'nexo:aparencia:vars';
/** Chave do cache do muro (o script do layout marca o <html> antes de pintar). */
export const CACHE_DO_MURO = 'nexo:muro';

/** Chave do cache do plano de fundo exclusivo ({url, escopo}; aplicado antes de pintar). */
export const CACHE_DO_FUNDO_EXCLUSIVO = 'nexo:fundo-exclusivo';
/** Chave do tom medido do plano de fundo ({url, tom}): o script do layout marca o <html> antes de pintar. */
export const CACHE_DO_TOM_DO_FUNDO = 'nexo:fundo-exclusivo:tom';

/**
 * Tom do plano de fundo exclusivo, medido no aparelho. Arte clara (traço preto
 * no branco, como os Gatinhos) precisa de mais cobertura no muro escuro para o
 * texto não brigar com o desenho.
 */
export type TomDoFundo = 'claro' | 'escuro';
export const tomPelaLuz = (media: number): TomDoFundo => (media > 0.55 ? 'claro' : 'escuro');

export const formaDoMuro = (v: unknown): Muro => (v === 'claro' ? 'claro' : 'escuro');

/** Um plano de fundo da coleção embutida ou do bucket `exclusivos` do Supabase. */
export const URL_DO_FUNDO_EXCLUSIVO =
  /^(\/colecao\/[a-z0-9-]+\/fundos\/[a-z0-9-]+\.webp|https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/exclusivos\/[A-Za-z0-9_\/.-]+)$/;

export function formaDoFundoExclusivo(v: unknown): FundoExclusivo | null {
  const o = (v && typeof v === 'object' ? v : null) as Record<string, unknown> | null;
  if (!o) return null;
  const id = typeof o.id === 'string' && /^[0-9a-f-]{36}$/i.test(o.id) ? o.id : '';
  const url = typeof o.url === 'string' && URL_DO_FUNDO_EXCLUSIVO.test(o.url) && !o.url.includes('..') ? o.url : '';
  if (!id || !url) return null;
  return { id, url, escopo: o.escopo === 'home' ? 'home' : 'todas' };
}

/** Um adesivo ou botton da coleção embutida ou do bucket `exclusivos`. */
export const URL_DO_ITEM_DO_BANNER =
  /^(\/colecao\/[a-z0-9-]+\/(adesivos|bottons)\/[a-z0-9-]+\.webp|https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/exclusivos\/[A-Za-z0-9_\/.-]+)$/;

const entre = (v: unknown, min: number, max: number, padrao: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : padrao;
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;
};

/** Os itens do banner, limpos: só adesivo e botton com endereço válido, dentro do banner, no máximo 12. */
export function formaDoBanner(v: unknown): ItemNoBanner[] {
  if (!Array.isArray(v)) return [];
  const itens: ItemNoBanner[] = [];
  for (const bruto of v) {
    const o = (bruto && typeof bruto === 'object' ? bruto : null) as Record<string, unknown> | null;
    if (!o) continue;
    const id = typeof o.id === 'string' && /^[0-9a-f-]{36}$/i.test(o.id) ? o.id : '';
    const url = typeof o.url === 'string' && URL_DO_ITEM_DO_BANNER.test(o.url) && !o.url.includes('..') ? o.url : '';
    const tipo = o.tipo === 'button' ? 'button' : o.tipo === 'sticker' ? 'sticker' : null;
    if (!id || !url || !tipo) continue;
    itens.push({ id, url, tipo, x: entre(o.x, 2, 98, 50), y: entre(o.y, 2, 98, 50), giro: entre(o.giro, -30, 30, 0) });
    if (itens.length >= MAXIMO_NO_BANNER) break;
  }
  return itens;
}

/** Formato mínimo (a validação dos ids é feita na conta). */
export function formaDaAparencia(v: unknown): Aparencia {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const id = (x: unknown) => (typeof x === 'string' && /^[a-z0-9-]{2,40}$/.test(x) ? x : null);
  return { fundo: id(o.fundo), botoes: id(o.botoes), muro: formaDoMuro(o.muro), exclusivo: formaDoFundoExclusivo(o.exclusivo), banner: formaDoBanner(o.banner) };
}
