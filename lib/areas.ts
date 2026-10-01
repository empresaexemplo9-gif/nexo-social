// Tema de cada área do site, no mesmo espírito da Comunidade: um muro de
// fundo montado dos murais da marca (public/bg/paredes), o quadro que dá o
// estilo dos botões (lib/comunidade-quadros.ts), a moldura dos cartões e a cor
// de destaque. O CSS lê os atributos que <TemaDaArea> põe na página.

import type { Quadro } from './comunidade-quadros';

export type Moldura = 'lambe' | 'holo' | 'grafite' | 'metro' | 'sinal' | 'oxford' | 'cyber' | 'recorte' | 'skyline';

export type Area =
  | 'inicio'
  | 'descobrir'
  | 'shorts'
  | 'revista'
  | 'historicas'
  | 'agenda'
  | 'esporte'
  | 'livros'
  | 'bomdia'
  | 'questionario'
  | 'busca'
  | 'colecionaveis'
  | 'pessoal';

export interface TemaDeArea {
  /** O muro do fundo (public/bg/paredes/<parede>.webp e -cel.webp). */
  parede: string;
  quadro: Quadro;
  moldura: Moldura;
  /** Cor de destaque (links, botões e selos da área). */
  acento: string;
}

export const AREAS: Record<Area, TemaDeArea> = {
  // Os murais da marca: o olho, a estátua, o selo NEXO.
  inicio: { parede: 'inicio', quadro: 'selo', moldura: 'recorte', acento: '#2f6bff' },
  // Faroeste e fantasia, Brasil e festa: o que dá para ver, ler e ouvir.
  descobrir: { parede: 'descobrir', quadro: 'fantasia', moldura: 'holo', acento: '#c026d3' },
  // Ação e adrenalina, a cidade de neon.
  shorts: { parede: 'shorts', quadro: 'cyber', moldura: 'cyber', acento: '#db2777' },
  // As placas e cartazes da marca: a banca de revista.
  revista: { parede: 'revista', quadro: 'recorte', moldura: 'lambe', acento: '#d42a1d' },
  // Samurai, xadrez, Paris e a estátua clássica.
  historicas: { parede: 'historicas', quadro: 'estatua', moldura: 'oxford', acento: '#a16207' },
  // Festa, carnaval e o painel de horários.
  agenda: { parede: 'agenda', quadro: 'festa', moldura: 'metro', acento: '#7c3aed' },
  // Futebol, tênis, basquete e golfe.
  esporte: { parede: 'esporte', quadro: 'futebol', moldura: 'sinal', acento: '#15803d' },
  // Oxford, ilhas no céu e o violão.
  livros: { parede: 'livros', quadro: 'oxford', moldura: 'oxford', acento: '#b45309' },
  // O Cristo, o céu do paraquedas e as ilhas: o começo do dia.
  bomdia: { parede: 'bomdia', quadro: 'skyline', moldura: 'skyline', acento: '#ea580c' },
  // O olho que observa: conhecer você.
  questionario: { parede: 'questionario', quadro: 'halftone', moldura: 'grafite', acento: '#1f5bff' },
  // Placas, sinais e o metrô: achar o caminho.
  busca: { parede: 'busca', quadro: 'placa', moldura: 'metro', acento: '#0891b2' },
  // Colecionáveis: vilões, F1, Oxford e o DRAP — e o holográfico dos adesivos.
  colecionaveis: { parede: 'colecionaveis', quadro: 'holo', moldura: 'holo', acento: '#9333ea' },
  // Minha conta, convites e a página de cada pessoa: o muro da marca.
  pessoal: { parede: 'parede', quadro: 'selo', moldura: 'lambe', acento: '#2f6bff' },
};

/** Cada tema (/tema/<slug>) usa o muro e o quadro da área mais próxima. */
const TEMA_DO_ASSUNTO: Record<string, { area: Area; quadro: Quadro }> = {
  tecnologia: { area: 'shorts', quadro: 'cyber' },
  musica: { area: 'agenda', quadro: 'festa' },
  moda: { area: 'descobrir', quadro: 'mundo' },
  cultura: { area: 'historicas', quadro: 'estatua' },
  esporte: { area: 'esporte', quadro: 'futebol' },
  cinema: { area: 'descobrir', quadro: 'faroeste' },
  livros: { area: 'livros', quadro: 'oxford' },
  gastronomia: { area: 'bomdia', quadro: 'brasil' },
  viagem: { area: 'bomdia', quadro: 'paraquedas' },
  games: { area: 'shorts', quadro: 'f1' },
  'bem-estar': { area: 'bomdia', quadro: 'fantasia' },
  arte: { area: 'revista', quadro: 'grafite' },
};

/** O tema de uma página de tema (muro da área parecida, quadro do assunto). */
export function temaDoAssunto(slug: string): { area: Area; tema: TemaDeArea } {
  const t = TEMA_DO_ASSUNTO[slug];
  if (!t) return { area: 'inicio', tema: AREAS.inicio };
  return { area: t.area, tema: { ...AREAS[t.area], quadro: t.quadro } };
}

export const PAREDES_DAS_AREAS = Array.from(new Set(Object.values(AREAS).map((a) => a.parede)));
