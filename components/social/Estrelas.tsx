'use client';

import React from 'react';

/** Nota de 1 a 5. Com `aoMudar`, vira campo (tocar na mesma estrela tira a nota). */
export default function Estrelas({ nota, aoMudar, tamanho = 'text-base' }: { nota: number | null; aoMudar?: (n: number | null) => void; tamanho?: string }) {
  if (!aoMudar) {
    if (!nota) return null;
    return (
      <span className={`${tamanho} leading-none text-amber-400`} aria-label={`Nota ${nota} de 5`} title={`Nota ${nota} de 5`}>
        {'★'.repeat(nota)}
        <span className="text-zinc-700">{'★'.repeat(5 - nota)}</span>
      </span>
    );
  }
  return (
    <span role="radiogroup" aria-label="Sua nota" className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={nota === n}
          aria-label={`${n} de 5`}
          onClick={() => aoMudar(nota === n ? null : n)}
          className={`${tamanho} leading-none transition hover:scale-110 ${nota && n <= nota ? 'text-amber-400' : 'text-zinc-600'}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}
