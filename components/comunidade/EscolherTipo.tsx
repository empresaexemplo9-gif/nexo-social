'use client';

import React from 'react';
import Icon from '../icons';
import type { Privacidade } from '@/lib/comunidade-tipos';

export const TIPOS_DE_GRUPO: { id: Privacidade; rotulo: string; explica: string; icone: 'lock' | 'globe' }[] = [
  { id: 'fechado', rotulo: 'Fechado', explica: 'Só você (quem criou) convida pessoas.', icone: 'lock' },
  { id: 'aberto', rotulo: 'Aberto', explica: 'Qualquer membro pode convidar amigos.', icone: 'globe' },
];

/** Fechado (só o dono convida) ou aberto (todos convidam). */
export default function EscolherTipo({ value, onChange }: { value: Privacidade; onChange: (v: Privacidade) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo do grupo">
      {TIPOS_DE_GRUPO.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left transition ${
            value === t.id ? 'border-emerald-600 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Icon name={t.icone} size={16} className={`mt-0.5 shrink-0 ${value === t.id ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span>
            <span className="block text-sm font-semibold text-zinc-100">{t.rotulo}</span>
            <span className="block text-[11px] text-zinc-400">{t.explica}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Selo "Fechado"/"Aberto" para cartões e cabeçalho. */
export function SeloDoTipo({ privacy }: { privacy: Privacidade }) {
  const t = TIPOS_DE_GRUPO.find((x) => x.id === privacy)!;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
      title={t.explica}
    >
      <Icon name={t.icone} size={11} /> {t.rotulo}
    </span>
  );
}
