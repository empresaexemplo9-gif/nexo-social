// Trilha do Saber — a lógica do tabuleiro (funções puras).
//
// Todos respondem a mesma pergunta ao mesmo tempo. Quem acerta anda 2 casas;
// quem acerta mais rápido ganha +1. Casa de estrela dá +1; ponte leva adiante.
// Vence quem chegar primeiro à casa 30 — ou quem estiver mais à frente quando
// as rodadas acabarem (empate: mais pontos, que premiam a rapidez).

import { CATEGORIAS_DO_QUIZ, PERGUNTAS, type CategoriaDoQuiz, type Pergunta } from './perguntas';

export const CASAS = 30;
export const SEGUNDOS_POR_PERGUNTA = 20;
export const AVANCO_ACERTO = 2;
export const BONUS_RAPIDO = 1;

export type Especial = { tipo: 'estrela' } | { tipo: 'ponte'; para: number };
export const ESPECIAIS: Record<number, Especial> = {
  4: { tipo: 'estrela' },
  8: { tipo: 'ponte', para: 12 },
  13: { tipo: 'estrela' },
  19: { tipo: 'ponte', para: 23 },
  25: { tipo: 'estrela' },
};

/** Cor de cada casa: as categorias se revezam ao longo da trilha. */
export function corDaCasa(i: number): string {
  if (i === 0 || i === CASAS) return '#1f2937';
  return CATEGORIAS_DO_QUIZ[(i - 1) % CATEGORIAS_DO_QUIZ.length].cor;
}

export const CORES_DOS_PEOES = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#475569'];

export interface JogadorTrilha {
  userId: string;
  nome: string;
  avatar: string | null;
  cor: string;
  casa: number;
  pontos: number;
  acertos: number;
}

export interface Revelacao {
  correta: number;
  /** Opção escolhida por cada um (-1: não respondeu). */
  escolhas: Record<string, number>;
  certos: string[];
  maisRapido: string | null;
  /** Quantas casas cada um andou nesta rodada (já com estrela/ponte). */
  avancos: Record<string, number>;
  curiosidade: string;
}

export interface EstadoTrilha {
  mesa: string;
  /** Id da partida (muda a cada "jogar de novo"; é a chave do placar). */
  partida: string;
  host: string;
  fase: 'lobby' | 'roleta' | 'pergunta' | 'revelacao' | 'fim';
  jogadores: JogadorTrilha[];
  rodada: number;
  totalRodadas: number;
  categorias: CategoriaDoQuiz[];
  categoria: CategoriaDoQuiz | null;
  pergunta: { texto: string; opcoes: string[]; nivel: number; n: number } | null;
  /** Quanto falta (ms) no momento em que o estado foi enviado. */
  restanteMs: number;
  respondidos: string[];
  revelacao: Revelacao | null;
  usadas: string[];
  vencedores: string[];
  seq: number;
}

export function novaTrilha(mesa: string, host: { userId: string; nome: string; avatar: string | null }, totalRodadas = 12, categorias?: CategoriaDoQuiz[]): EstadoTrilha {
  return {
    mesa,
    partida: mesa,
    host: host.userId,
    fase: 'lobby',
    jogadores: [{ ...host, cor: CORES_DOS_PEOES[0], casa: 0, pontos: 0, acertos: 0 }],
    rodada: 0,
    totalRodadas,
    categorias: categorias?.length ? categorias : CATEGORIAS_DO_QUIZ.map((c) => c.id),
    categoria: null,
    pergunta: null,
    restanteMs: 0,
    respondidos: [],
    revelacao: null,
    usadas: [],
    vencedores: [],
    seq: 0,
  };
}

export function entrar(e: EstadoTrilha, p: { userId: string; nome: string; avatar: string | null }): EstadoTrilha {
  if (e.jogadores.some((j) => j.userId === p.userId) || e.jogadores.length >= CORES_DOS_PEOES.length) return e;
  const usadas = new Set(e.jogadores.map((j) => j.cor));
  const cor = CORES_DOS_PEOES.find((c) => !usadas.has(c)) ?? CORES_DOS_PEOES[0];
  return { ...e, jogadores: [...e.jogadores, { ...p, cor, casa: 0, pontos: 0, acertos: 0 }] };
}

export const sair = (e: EstadoTrilha, userId: string): EstadoTrilha => ({ ...e, jogadores: e.jogadores.filter((j) => j.userId !== userId) });

/** Sorteia a categoria da rodada (sem repetir a anterior quando dá). */
export function sortearCategoria(e: EstadoTrilha, aleatorio = Math.random): CategoriaDoQuiz {
  const opcoes = e.categorias.length > 1 ? e.categorias.filter((c) => c !== e.categoria) : e.categorias;
  return opcoes[Math.floor(aleatorio() * opcoes.length)];
}

/** Uma pergunta ainda não usada da categoria, com as opções embaralhadas. */
export function sortearPergunta(e: EstadoTrilha, cat: CategoriaDoQuiz, aleatorio = Math.random): { pergunta: Pergunta; opcoes: string[]; correta: number } {
  const usadas = new Set(e.usadas);
  let pool = PERGUNTAS.filter((p) => p.cat === cat && !usadas.has(p.id));
  if (!pool.length) pool = PERGUNTAS.filter((p) => !usadas.has(p.id));
  if (!pool.length) pool = PERGUNTAS;
  // Começa mais fácil e fica mais difícil com as rodadas.
  const alvo = e.rodada <= Math.ceil(e.totalRodadas / 3) ? 1 : e.rodada <= Math.ceil((2 * e.totalRodadas) / 3) ? 2 : 3;
  const noNivel = pool.filter((p) => p.nivel === alvo);
  const escolhida = (noNivel.length ? noNivel : pool)[Math.floor(aleatorio() * (noNivel.length ? noNivel.length : pool.length))];
  const ordem = [0, 1, 2, 3];
  for (let i = ordem.length - 1; i > 0; i--) {
    const k = Math.floor(aleatorio() * (i + 1));
    [ordem[i], ordem[k]] = [ordem[k], ordem[i]];
  }
  return { pergunta: escolhida, opcoes: ordem.map((i) => escolhida.o[i]), correta: ordem.indexOf(0) };
}

/** Anda pela trilha a partir de `casa`, aplicando estrela e ponte da casa onde parar. */
export function andar(casa: number, passos: number): number {
  if (passos <= 0) return casa;
  let destino = Math.min(CASAS, casa + passos);
  const especial = ESPECIAIS[destino];
  if (especial?.tipo === 'estrela') destino = Math.min(CASAS, destino + 1);
  else if (especial?.tipo === 'ponte') destino = especial.para;
  return destino;
}

/**
 * Fecha a rodada: quem acertou anda, o mais rápido ganha bônus, e os pontos
 * premiam a rapidez. `respostas` traz a opção e quanto tempo cada um levou.
 */
export function revelar(e: EstadoTrilha, correta: number, curiosidade: string, respostas: Record<string, { opcao: number; ms: number }>): EstadoTrilha {
  const limite = SEGUNDOS_POR_PERGUNTA * 1000;
  const certos = e.jogadores.filter((j) => respostas[j.userId]?.opcao === correta).map((j) => j.userId);
  const maisRapido = certos.length ? certos.reduce((a, b) => (respostas[b].ms < respostas[a].ms ? b : a)) : null;
  const avancos: Record<string, number> = {};
  const escolhas: Record<string, number> = {};
  const jogadores = e.jogadores.map((j) => {
    escolhas[j.userId] = respostas[j.userId]?.opcao ?? -1;
    if (!certos.includes(j.userId)) {
      avancos[j.userId] = 0;
      return j;
    }
    const passos = AVANCO_ACERTO + (j.userId === maisRapido ? BONUS_RAPIDO : 0);
    const casa = andar(j.casa, passos);
    avancos[j.userId] = casa - j.casa;
    const rapidez = Math.max(0, 1 - Math.min(respostas[j.userId].ms, limite) / limite);
    return { ...j, casa, acertos: j.acertos + 1, pontos: j.pontos + 100 + Math.round(50 * rapidez) };
  });
  const fim = jogadores.some((j) => j.casa >= CASAS) || e.rodada >= e.totalRodadas;
  const proximo: EstadoTrilha = {
    ...e,
    jogadores,
    fase: 'revelacao',
    restanteMs: 0,
    revelacao: { correta, escolhas, certos, maisRapido, avancos, curiosidade },
  };
  if (fim) proximo.vencedores = classificacao(proximo).filter((j, _i, arr) => j.casa === arr[0].casa && j.pontos === arr[0].pontos).map((j) => j.userId);
  return proximo;
}

export const acabou = (e: EstadoTrilha) => e.jogadores.some((j) => j.casa >= CASAS) || e.rodada >= e.totalRodadas;

/** Ordem do placar: mais à frente, depois mais pontos. */
export const classificacao = (e: EstadoTrilha) => [...e.jogadores].sort((a, b) => b.casa - a.casa || b.pontos - a.pontos);

export const rotuloDaCategoria = (c: CategoriaDoQuiz | null) => CATEGORIAS_DO_QUIZ.find((x) => x.id === c)?.rotulo ?? '';
export const corDaCategoria = (c: CategoriaDoQuiz | null) => CATEGORIAS_DO_QUIZ.find((x) => x.id === c)?.cor ?? '#1f2937';
