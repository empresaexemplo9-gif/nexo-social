'use client';

import React, { useState } from 'react';
import { REACOES, type Reacao } from '@/lib/mural-tipos';

/**
 * Reações rápidas: uma por pessoa (tocar de novo tira). `url` é a rota que
 * grava (POST { reacao }) e devolve { reacoes, minhaReacao }.
 */
export default function Reacoes({
  url,
  reacoes,
  minha,
  compacta = false,
}: {
  url: string;
  reacoes: Partial<Record<Reacao, number>>;
  minha: Reacao | null;
  compacta?: boolean;
}) {
  const [estado, setEstado] = useState({ reacoes, minha });
  const [ocupado, setOcupado] = useState(false);

  const reagir = async (r: Reacao) => {
    const nova = estado.minha === r ? null : r;
    // Mostra na hora; se falhar, volta.
    const antes = estado;
    const contas = { ...estado.reacoes };
    if (estado.minha) contas[estado.minha] = Math.max(0, (contas[estado.minha] ?? 1) - 1);
    if (nova) contas[nova] = (contas[nova] ?? 0) + 1;
    setEstado({ reacoes: contas, minha: nova });
    setOcupado(true);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reacao: nova }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error);
      setEstado({ reacoes: j.reacoes ?? contas, minha: j.minhaReacao ?? null });
    } catch {
      setEstado(antes);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Reações">
      {REACOES.map((r) => {
        const n = estado.reacoes[r.id] ?? 0;
        const ativa = estado.minha === r.id;
        if (compacta && !n && !ativa) {
          return (
            <button key={r.id} type="button" disabled={ocupado} onClick={() => void reagir(r.id)} aria-label={r.rotulo} title={r.rotulo}
              className="rounded-full px-1.5 py-0.5 text-sm opacity-60 transition hover:opacity-100">
              {r.emoji}
            </button>
          );
        }
        return (
          <button
            key={r.id}
            type="button"
            disabled={ocupado}
            aria-pressed={ativa}
            onClick={() => void reagir(r.id)}
            title={r.rotulo}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
              ativa ? 'border-emerald-600 bg-emerald-500/15 text-emerald-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100'
            }`}
          >
            <span aria-hidden>{r.emoji}</span> {compacta ? '' : r.rotulo}{n ? <span className="font-semibold">{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
