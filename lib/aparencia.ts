// Aparência da home e dos botões, escolhida por cada pessoa.
//
// As opções saem dos mesmos temas dos convites (lib/invite-themes.ts): cada
// adesivo tem cor de fundo, degradê, textura e cor de destaque. O fundo da home
// usa a cor + a textura do tema; os botões e destaques da plataforma usam a cor
// de destaque (escurecida quando preciso para o texto claro dos botões continuar
// legível). Os detalhes da plataforma — tecido, costura, papel — não mudam.

import { THEMES, TEX_FILES, isDark, type TexKey, type ThemeId } from './invite-themes';

import { formaDoFundoExclusivo, formaDoMuro, type Aparencia } from './aparencia-tipos';

export { APARENCIA_PADRAO, CACHE_DA_APARENCIA, CACHE_DO_MURO, type Aparencia, type EscopoDoFundo, type FundoExclusivo, type Muro } from './aparencia-tipos';

export interface OpcaoDeFundo {
  id: string;
  nome: string;
  cor: string;
  gradiente: string | null;
  textura: string | null;
  opacidade: number;
  /** Fundo escuro: os títulos soltos na home ficam claros. */
  escuro: boolean;
  /** Mural de colagens por trás (public/bg/murais), em rodízio entre as opções. */
  mural: (typeof MURAIS)[number];
  /**
   * O mural vai na versão escura (traço claro) — pela luz do que aparece de
   * fato: a textura, quando cobre tudo, ou a cor. Nem sempre é o mesmo que
   * `escuro` (a cor dos títulos): a lona do "Patch Lona" é clara.
   */
  muralEscuro: boolean;
}

/**
 * Os murais das opções de fundo, como no papel padrão: esmaecidos, vivos nas
 * bordas. Cada um tem duas versões — clara (entra por "multiply" e pega a cor
 * do fundo) e escura (a luz invertida, entra por "screen": traço claro no
 * escuro) — e uma miniatura para as amostras.
 */
export const MURAIS = ['colagem-1', 'colagem-2', 'colagem-3'] as const;

export const muralDoFundo = (o: Pick<OpcaoDeFundo, 'mural' | 'muralEscuro'>, mini = false) =>
  `/bg/murais/${o.mural}-${o.muralEscuro ? 'escuro' : 'claro'}${mini ? '-mini' : ''}.webp`;

/** Texturas de luz média para cima (média ≥ 140 de 255, medida nos arquivos de public/convite-assets/texturas). */
const TEXTURAS_CLARAS = new Set(['lona.jpg', 'holo.jpg', 'rachado.jpg', 'papel.jpg', 'concreto.jpg', 'couro-caramelo.jpg']);

export interface OpcaoDeBotao {
  id: string;
  /** Nome da cor ("Azul elétrico"). */
  nome: string;
  /** O adesivo de onde a cor saiu ("Edição Elétrica"). */
  origem: string;
  cor: string;
}

// ---------------------------------------------------------------------------
// Cores
// ---------------------------------------------------------------------------

type RGB = [number, number, number];
const PAPEL = '#fffdf8';

const rgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
const misturar = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
};
/** Luminância relativa (WCAG). */
export function luminancia(cor: string): number {
  const c = rgb(cor).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const contraste = (a: string, b: string) => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const triade = (cor: string) => rgb(cor).join(' ');
/** Tons praticamente iguais (distância no RGB) viram uma opção só. */
const parecidas = (a: string, b: string) => {
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 22;
};
/** Nome da cor pelo matiz, pela saturação e pela luz (para a lista dos botões). */
function nomeDaCor(cor: string): string {
  const [r, g, b] = rgb(cor).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.14) return l < 0.12 ? 'Preto' : l < 0.3 ? 'Grafite' : 'Cinza';
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 14 || h >= 345) return l < 0.2 ? 'Vinho' : 'Vermelho';
  if (h < 40) return l < 0.3 ? 'Marrom' : 'Laranja';
  if (h < 66) return l < 0.2 ? 'Oliva' : 'Mostarda';
  if (h < 165) return 'Verde';
  if (h < 200) return 'Petróleo';
  if (h < 250) return l < 0.2 ? 'Marinho' : s > 0.7 ? 'Azul elétrico' : 'Azul';
  if (h < 290) return s < 0.35 ? 'Lavanda' : l < 0.25 ? 'Ameixa' : 'Roxo';
  return 'Magenta';
}
const valida = (c: string | undefined) => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);

/** Escurece até o texto claro dos botões ficar legível (contraste ≥ 4,5). */
function legivelSobPapel(cor: string): string {
  let c = cor;
  for (let i = 0; i < 20 && contraste(c, PAPEL) < 4.5; i++) c = misturar(c, '#000000', 0.08);
  return c;
}

// ---------------------------------------------------------------------------
// Opções (dos temas dos convites)
// ---------------------------------------------------------------------------

const TEMAS = Object.entries(THEMES) as [ThemeId, (typeof THEMES)[ThemeId]][];

export const OPCOES_DE_FUNDO: OpcaoDeFundo[] = (() => {
  const vistos = new Set<string>();
  const lista: OpcaoDeFundo[] = [];
  for (const [id, t] of TEMAS) {
    if (!valida(t.fundo)) continue;
    const chave = `${t.fundo}|${t.gradiente ?? ''}|${t.textura ?? ''}`;
    if (vistos.has(chave)) continue;
    // Cor lisa quase igual a outra já na lista: fica só a primeira.
    if (!t.gradiente && !t.textura && lista.some((o) => !o.gradiente && !o.textura && parecidas(o.cor, t.fundo))) continue;
    vistos.add(chave);
    const arquivo = t.textura ? TEX_FILES[t.textura as TexKey] : null;
    const textura = arquivo ? `/convite-assets/texturas/${arquivo}` : null;
    const opacidade = t.textura ? Math.min(1, t.texturaOpacidade ?? 0.45) : 0;
    // O tema de tinta clara é um fundo escuro (couro, noite, preto…).
    const escuro = isDark(t) || luminancia(t.fundo) < 0.2;
    lista.push({
      id,
      nome: t.nome,
      mural: MURAIS[lista.length % MURAIS.length],
      cor: t.fundo,
      gradiente: t.gradiente ?? null,
      textura,
      opacidade,
      escuro,
      muralEscuro: arquivo && opacidade >= 0.9 ? !TEXTURAS_CLARAS.has(arquivo) : escuro,
    });
  }
  return lista;
})();

export const OPCOES_DE_BOTAO: OpcaoDeBotao[] = (() => {
  const lista: OpcaoDeBotao[] = [];
  for (const [id, t] of TEMAS) {
    // Destaque, fundo, tinta e tom suave do adesivo — os que não forem claros demais
    // (papel, creme) para um botão com texto claro.
    const candidatas = [t.destaque, t.fundo, t.tinta, t.suave].filter((c, i, arr): c is string => valida(c) && luminancia(c) < 0.75 && arr.indexOf(c) === i);
    candidatas.forEach((base, i) => {
      const cor = legivelSobPapel(base);
      if (lista.some((o) => parecidas(o.cor, cor))) return;
      lista.push({ id: i === 0 ? id : `${id}--${i + 1}`, nome: nomeDaCor(cor), origem: t.nome, cor });
    });
  }
  return lista;
})();

export const opcaoDeFundo = (id: string | null | undefined) => OPCOES_DE_FUNDO.find((o) => o.id === id) ?? null;
export const opcaoDeBotao = (id: string | null | undefined) => OPCOES_DE_BOTAO.find((o) => o.id === id) ?? null;

/** Só aceita ids que existem (é o que a conta guarda). */
export function normalizarAparencia(v: unknown): Aparencia {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    fundo: typeof o.fundo === 'string' && opcaoDeFundo(o.fundo) ? o.fundo : null,
    botoes: typeof o.botoes === 'string' && opcaoDeBotao(o.botoes) ? o.botoes : null,
    muro: formaDoMuro(o.muro),
    // Que o item foi mesmo dado à pessoa, quem confere é o aplicador
    // (components/AplicarAparencia.tsx), contra /api/exclusivos.
    exclusivo: formaDoFundoExclusivo(o.exclusivo),
  };
}

// ---------------------------------------------------------------------------
// Variáveis CSS
// ---------------------------------------------------------------------------

const PASSOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * As variáveis dos botões e destaques para uma cor. A escala segue a da marca
 * (invertida: 50 é o mais escuro, 400 o botão, 950 o tom mais claro).
 */
export function variaveisDoBotao(cor: string): Record<string, string> {
  const base = legivelSobPapel(cor);
  const mistura: Record<(typeof PASSOS)[number], [string, number]> = {
    50: ['#000000', 0.62], 100: ['#000000', 0.52], 200: ['#000000', 0.38], 300: ['#000000', 0.2], 400: [base, 0],
    500: [PAPEL, 0.14], 600: [PAPEL, 0.34], 700: [PAPEL, 0.55], 800: [PAPEL, 0.74], 900: [PAPEL, 0.86], 950: [PAPEL, 0.93],
  };
  const v: Record<string, string> = {};
  for (const p of PASSOS) v[`--acento-${p}`] = triade(misturar(base, mistura[p][0], mistura[p][1]));
  v['--botao'] = triade(base);
  v['--botao-borda'] = triade(misturar(base, '#000000', 0.35));
  v['--denim'] = triade(misturar(base, '#1c2430', 0.12));
  v['--denim-sutil'] = triade(misturar(base, PAPEL, 0.12));
  v['--denim-ativo'] = triade(misturar(base, '#000000', 0.25));
  v['--denim-borda'] = triade(misturar(base, '#000000', 0.45));
  return v;
}

/** Nomes das variáveis que a escolha dos botões mexe (para limpar). */
export const VARIAVEIS_DO_BOTAO = Object.keys(variaveisDoBotao('#2b5288'));
