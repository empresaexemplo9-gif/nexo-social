// O que a pessoa escolheu para a aparência (ids dos temas dos convites). Fica
// separado de lib/aparencia.ts, que traz as paletas: as preferências e o
// aplicador global só precisam disto.

/** Os murais das áreas (lib/areas.ts): o muro escuro ou a versão clara. */
export type Muro = 'escuro' | 'claro';

export interface Aparencia {
  /** Tema do fundo da home (null: o papel padrão). */
  fundo: string | null;
  /** Tema dos botões e destaques (null: o azul da plataforma). */
  botoes: string | null;
  /** Versão dos murais de fundo das áreas. */
  muro: Muro;
}

export const APARENCIA_PADRAO: Aparencia = { fundo: null, botoes: null, muro: 'escuro' };

/** Chave do cache no aparelho: as variáveis prontas, aplicadas antes de pintar. */
export const CACHE_DA_APARENCIA = 'nexo:aparencia:vars';
/** Chave do cache do muro (o script do layout marca o <html> antes de pintar). */
export const CACHE_DO_MURO = 'nexo:muro';

export const formaDoMuro = (v: unknown): Muro => (v === 'claro' ? 'claro' : 'escuro');

/** Formato mínimo (a validação dos ids é feita na conta). */
export function formaDaAparencia(v: unknown): Aparencia {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const id = (x: unknown) => (typeof x === 'string' && /^[a-z0-9-]{2,40}$/.test(x) ? x : null);
  return { fundo: id(o.fundo), botoes: id(o.botoes), muro: formaDoMuro(o.muro) };
}
