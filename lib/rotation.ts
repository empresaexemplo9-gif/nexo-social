// Rotação determinística por período.
//
// É o que faz a plataforma trazer indicações novas sozinha — por dia, semana
// ou mês — sem ninguém publicar nada e sem o conteúdo dançar a cada
// recarregamento: dentro do período a ordem é sempre a mesma, e vira na
// passagem para o próximo.

import { saoPauloParts } from './datetime';

/** Embaralhamento estável a partir de uma semente (mulberry32 + Fisher-Yates). */
export function seededPick<T>(pool: T[], seed: number, n: number): T[] {
  return seededShuffle(pool, seed).slice(0, n);
}

export function seededShuffle<T>(pool: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente do dia corrente no fuso de São Paulo — vira à meia-noite. */
export function dailySeed(extra = 0): number {
  const { year, month, day } = saoPauloParts(new Date());
  return year * 10000 + month * 100 + day + extra;
}

/** Seleção que muda todo dia e fica estável durante o dia inteiro. */
export function daily<T>(pool: T[], n: number, extra = 0): T[] {
  return seededPick(pool, dailySeed(extra), n);
}

/**
 * Variação diária de 0 a `amplitude` para uma chave estável (id do item).
 * Somada à pontuação, faz o ranking girar todo dia entre itens de relevância
 * parecida, sem nunca passar por cima de uma diferença real de relevância.
 */
export function dailyJitter(key: string, amplitude = 10): number {
  let h = 2166136261 >>> 0;
  const mix = `${key}:${dailySeed()}`;
  for (let i = 0; i < mix.length; i++) {
    h ^= mix.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h / 4294967296) * amplitude;
}
