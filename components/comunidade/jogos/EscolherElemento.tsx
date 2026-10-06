'use client';

import React, { useState } from 'react';
import Icon from '../../icons';
import { Glifo } from './ArteArcanos';
import { METAL } from './CartaArcana';
import { ELEMENTOS, ELEMENTOS_ORDEM, type Elemento } from '@/lib/jogos/arcanos/cartas';

const OURO = '#e0b84a';
const MESA_BG = 'radial-gradient(ellipse at 50% 38%, #2a2038 0%, #150f20 55%, #07040b 100%)';

/** Escolher o elemento do duelo (ao abrir ou aceitar uma mesa): vale o grimório e a reserva de mana dele. */
export default function EscolherElemento({ titulo, botao, onEscolher, onCancelar }: { titulo: string; botao: string; onEscolher: (e: Elemento) => void; onCancelar: () => void }) {
  const [sel, setSel] = useState<Elemento | null>(null);
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl" style={{ background: MESA_BG, boxShadow: `0 0 0 1px ${OURO}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="fonte-arcana text-xs font-bold uppercase tracking-[0.3em]" style={{ color: OURO }}>Arcanos</p>
            <h2 className="fonte-arcana mt-1 text-2xl font-black text-[#fdf6e3]">{titulo}</h2>
            <p className="fonte-pergaminho mt-1 text-sm text-[#fef3c7]/80">Escolha seu elemento: 10 personagens já em campo, 48 magias/feitiços e 24 cartas de mana.</p>
          </div>
          <button type="button" onClick={onCancelar} aria-label="Fechar" className="rounded-full p-2 text-[#fef3c7]/70 hover:bg-white/10 hover:text-[#fdf6e3]">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ELEMENTOS_ORDEM.map((id) => {
            const e = ELEMENTOS[id];
            const ativa = sel === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSel(id)}
                aria-pressed={ativa}
                className="flex items-center gap-3 rounded-2xl p-3 text-left transition"
                style={{
                  background: `linear-gradient(135deg, ${e.escura}, ${e.cor}${ativa ? 'ee' : '55'})`,
                  boxShadow: ativa ? `0 0 0 2px #fff, 0 0 22px ${e.brilho}` : `0 0 0 1px ${METAL[id].borda}88`,
                  transform: ativa ? 'scale(1.02)' : undefined,
                }}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: e.escura, boxShadow: `0 0 0 2px ${e.brilho}` }}>
                  <Glifo el={id} className="h-7 w-7" style={{ color: e.clara, filter: `drop-shadow(0 0 5px ${e.brilho})` }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="fonte-arcana block text-lg font-black text-white">{e.nome}</span>
                  <span className="fonte-pergaminho block text-xs italic text-white/85">“{e.lema}”</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-white/75">{e.estilo}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!sel}
          onClick={() => sel && onEscolher(sel)}
          className="fonte-arcana mt-4 w-full rounded-2xl py-3 text-base font-black uppercase tracking-widest text-[#1c1208] transition disabled:opacity-40"
          style={{ background: `linear-gradient(180deg, #f5d77a, ${OURO})`, boxShadow: '0 4px 14px rgba(0,0,0,.5)' }}
        >
          {sel ? `${botao} · ${ELEMENTOS[sel].nome}` : 'Escolha um elemento'}
        </button>
      </div>
    </div>
  );
}
