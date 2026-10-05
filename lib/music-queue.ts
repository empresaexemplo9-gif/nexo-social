/** Próxima faixa disponível, voltando ao início ao chegar ao fim da lista. */
export function nextPlayable(ids: string[], current: number, unavailable: Record<string, unknown>): number | null {
  for (let step = 1; step <= ids.length; step++) {
    const index = (current + step) % ids.length;
    if (!unavailable[ids[index]]) return index;
  }
  return null;
}
