'use client';

import React from 'react';
import Icon from './icons';
import type { ParticipantStatus } from '@/lib/compromissos';

/** Positivo (concordo) e negativo (não concordo): a resposta do convidado. */
export default function BotoesResposta({
  status,
  busy,
  onResponder,
  grande = false,
}: {
  status: ParticipantStatus | null;
  busy: boolean;
  onResponder: (s: 'confirmado' | 'recusado') => void;
  grande?: boolean;
}) {
  const tam = grande ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs';
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onResponder('confirmado')}
        disabled={busy || status === 'confirmado'}
        aria-pressed={status === 'confirmado'}
        className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-default ${tam} ${
          status === 'confirmado'
            ? 'border border-emerald-700 bg-emerald-950/40 text-emerald-300'
            : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-60'
        }`}
      >
        <Icon name="thumbUp" size={grande ? 16 : 14} /> {status === 'confirmado' ? 'Você concordou' : 'Concordo'}
      </button>
      <button
        type="button"
        onClick={() => onResponder('recusado')}
        disabled={busy || status === 'recusado'}
        aria-pressed={status === 'recusado'}
        className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-default ${tam} ${
          status === 'recusado'
            ? 'border border-clay-700 bg-clay-950/40 text-clay-300'
            : 'border border-zinc-700 text-zinc-300 hover:border-clay-600 hover:text-clay-300 disabled:opacity-60'
        }`}
      >
        <Icon name="thumbDown" size={grande ? 16 : 14} /> {status === 'recusado' ? 'Você não concordou' : 'Não concordo'}
      </button>
    </div>
  );
}

