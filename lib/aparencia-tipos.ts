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

export interface Aparencia {
  /** Tema do fundo da home (null: o papel padrão). */
  fundo: string | null;
  /** Tema dos botões e destaques (null: o azul da plataforma). */
  botoes: string | null;
  /** Versão dos murais de fundo das áreas. */
  muro: Muro;
  /** Plano de fundo exclusivo escolhido (null: nenhum). */
  exclusivo: FundoExclusivo | null;
}

export const APARENCIA_PADRAO: Aparencia = { fundo: null, botoes: null, muro: 'escuro', exclusivo: null };

/** Chave do cache no aparelho: as variáveis prontas, aplicadas antes de pintar. */
export const CACHE_DA_APARENCIA = 'nexo:aparencia:vars';
/** Chave do cache do muro (o script do layout marca o <html> antes de pintar). */
export const CACHE_DO_MURO = 'nexo:muro';

/** Chave do cache do plano de fundo exclusivo ({url, escopo}; aplicado antes de pintar). */
export const CACHE_DO_FUNDO_EXCLUSIVO = 'nexo:fundo-exclusivo';

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

/** Formato mínimo (a validação dos ids é feita na conta). */
export function formaDaAparencia(v: unknown): Aparencia {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const id = (x: unknown) => (typeof x === 'string' && /^[a-z0-9-]{2,40}$/.test(x) ? x : null);
  return { fundo: id(o.fundo), botoes: id(o.botoes), muro: formaDoMuro(o.muro), exclusivo: formaDoFundoExclusivo(o.exclusivo) };
}
