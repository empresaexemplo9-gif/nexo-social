// Rotação determinística por período.
//
// É o que faz a plataforma trazer indicações novas sozinha — por dia, semana
// ou mês — sem ninguém publicar nada e sem o conteúdo dançar a cada
// recarregamento: dentro do período a ordem é sempre a mesma, e vira na
// passagem para o próximo.

import { saoPauloParts } from './datetime';

/** 2^32 — divisor que leva um uint32 para o intervalo [0, 1). */
const UINT32_MAX_PLUS_1 = 4294967296;
/** Incremento canônico do mulberry32. */
const MULBERRY_INCREMENT = 0x6d2b79f5;

/**
 * Embaralhamento estável a partir de uma semente (mulberry32 + Fisher-Yates).
 *
 * Copia o pool inteiro e corta os `n` primeiros de propósito. Existe uma versão
 * que embaralha só as `n` primeiras posições usando um Map esparso, sem copiar
 * o pool — ela ganha de lavada a partir de uns mil itens (num pool de 100 mil é
 * a diferença entre 4,6 s e 2 ms). Só que os pools daqui têm de 6 a 75 itens,
 * onde o custo de alocar o Map supera o da cópia: medido com aquecimento e
 * ordem alternada, num pool de 12 itens a versão com Map fica ~2,5x MAIS lenta.
 * Se algum pool passar de mil itens, vale trocar.
 */
export function seededPick<T>(pool: readonly T[], seed: number, n: number): T[] {
  return seededShuffle(pool, seed).slice(0, n);
}

export function seededShuffle<T>(pool: readonly T[], seed: number): T[] {
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
    a = (a + MULBERRY_INCREMENT) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX_PLUS_1;
  };
}

/** Semente do dia corrente no fuso de São Paulo — vira à meia-noite. */
export function dailySeed(extra = 0): number {
  const { year, month, day } = saoPauloParts(new Date());
  return year * 10000 + month * 100 + day + extra;
}

/** Seleção que muda todo dia e fica estável durante o dia inteiro. */
export function daily<T>(pool: readonly T[], n: number, extra = 0): T[] {
  return seededPick(pool, dailySeed(extra), n);
}

/**
 * Gira, com a semente do dia, a ordem DENTRO de faixas de pontuação parecida.
 *
 * Recebe a lista já ordenada por relevância e agrupa itens cuja pontuação
 * caiba numa janela de `tierWidth`; cada faixa é embaralhada por inteiro. É
 * mais forte que somar um ruído à pontuação: o ruído só troca itens quando a
 * diferença entre eles é menor que a amplitude, então um corte de "top 8"
 * acabava congelado nos mesmos itens dia após dia. Aqui a faixa inteira gira,
 * e nenhum item pula uma diferença real de relevância — nem a pontuação
 * relatada é adulterada.
 */
export function rotateWithinTiers<T>(
  items: readonly T[],
  scoreOf: (item: T) => number,
  tierWidth: number,
  seed = dailySeed(),
): T[] {
  const out: T[] = [];
  let tier: T[] = [];
  let top = 0;

  const flush = () => {
    if (tier.length > 1) out.push(...seededShuffle(tier, seed + out.length));
    else out.push(...tier);
    tier = [];
  };

  for (const item of items) {
    const score = scoreOf(item);
    if (tier.length === 0) top = score;
    else if (top - score > tierWidth) {
      flush();
      top = score;
    }
    tier.push(item);
  }
  flush();
  return out;
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
  return (h / UINT32_MAX_PLUS_1) * amplitude;
}
