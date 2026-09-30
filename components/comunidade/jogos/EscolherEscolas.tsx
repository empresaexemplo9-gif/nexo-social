'use client';

import React, { useState } from 'react';
import Icon from '../../icons';
import Arte from './Arte';
import { ESCOLAS, type Escola } from '@/lib/jogos/arcanos/cartas';

const OURO = '#d4af37';
const MESA_BG = 'radial-gradient(ellipse at 50% 45%, #3a2a1b 0%, #20160d 55%, #0d0906 100%)';

/** Escolher as duas escolas do grimório (ao abrir ou aceitar um duelo). */
export default function EscolherEscolas({ titulo, botao, onEscolher, onCancelar }: { titulo: string; botao: string; onEscolher: (e: [Escola, Escola]) => void; onCancelar: () => void }) {
  const [sel, setSel] = useState<Escola[]>([]);
  const alternar = (e: Escola) => setSel((s) => (s.includes(e) ? s.filter((x) => x !== e) : s.length >= 2 ? [s[1], e] : [...s, e]));
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl" style={{ background: MESA_BG, boxShadow: `0 0 0 1px ${OURO}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="fonte-arcana text-xs font-bold uppercase tracking-[0.3em]" style={{ color: OURO }}>Arcanos</p>
            <h2 className="fonte-arcana mt-1 text-2xl font-black text-[#fdf6e3]">{titulo}</h2>
            <p className="fonte-pergaminho mt-1 text-sm text-[#fef3c7]/80">Escolha duas escolas: seu grimório terá as 24 cartas delas e mais 6 cópias das básicas — 30 cartas.</p>
          </div>
          <button type="button" onClick={onCancelar} aria-label="Fechar" className="rounded-full p-2 text-[#fef3c7]/70 hover:bg-white/10 hover:text-[#fdf6e3]">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {(Object.keys(ESCOLAS) as Escola[]).map((id) => {
            const e = ESCOLAS[id];
            const ativa = sel.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => alternar(id)}
                aria-pressed={ativa}
                className="flex items-center gap-3 rounded-2xl p-3 text-left transition"
                style={{
                  background: `linear-gradient(135deg, ${e.escura}, ${e.cor}${ativa ? 'ee' : '66'})`,
                  boxShadow: ativa ? `0 0 0 2px ${OURO}, 0 0 18px ${e.brilho}` : '0 0 0 1px rgba(212,175,55,.35)',
                }}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: e.escura, boxShadow: `0 0 0 2px ${e.brilho}` }}>
                  <Arte nome={e.arte} className="h-8 w-8" style={{ color: e.clara }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="fonte-arcana block text-lg font-black text-white">{e.nome}</span>
                  <span className="fonte-pergaminho block text-xs italic text-white/85">“{e.lema}”</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-white/75">{e.estilo}</span>
                </span>
                {ativa && <span className="fonte-arcana text-xl font-black" style={{ color: OURO }}>{sel.indexOf(id) + 1}</span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={sel.length !== 2}
          onClick={() => onEscolher([sel[0], sel[1]])}
          className="fonte-arcana mt-4 w-full rounded-2xl py-3 text-base font-black uppercase tracking-widest text-[#1c1208] transition disabled:opacity-40"
          style={{ background: `linear-gradient(180deg, #f5d77a, ${OURO})`, boxShadow: '0 4px 14px rgba(0,0,0,.5)' }}
        >
          {sel.length === 2 ? `${botao} · ${ESCOLAS[sel[0]].nome} + ${ESCOLAS[sel[1]].nome}` : 'Escolha duas escolas'}
        </button>
      </div>
    </div>
  );
}
