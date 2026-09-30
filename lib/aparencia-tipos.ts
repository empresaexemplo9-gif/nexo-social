// O que a pessoa escolheu para a aparência (ids dos temas dos convites). Fica
// separado de lib/aparencia.ts, que traz as paletas: as preferências e o
// aplicador global só precisam disto.

export interface Aparencia {
  /** Tema do fundo da home (null: o papel padrão). */
  fundo: string | null;
  /** Tema dos botões e destaques (null: o azul da plataforma). */
  botoes: string | null;
}

export const APARENCIA_PADRAO: Aparencia = { fundo: null, botoes: null };

/** Chave do cache no aparelho: as variáveis prontas, aplicadas antes de pintar. */
export const CACHE_DA_APARENCIA = 'nexo:aparencia:vars';

/** Formato mínimo (a validação dos ids é feita na conta). */
export function formaDaAparencia(v: unknown): Aparencia {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const id = (x: unknown) => (typeof x === 'string' && /^[a-z0-9-]{2,40}$/.test(x) ? x : null);
  return { fundo: id(o.fundo), botoes: id(o.botoes) };
}
