'use client';

import React, { useEffect, useState } from 'react';
import Icon from '../icons';
import { VISIBILIDADES, type Visibilidade } from '@/lib/mural-tipos';

/** Os grupos de que a pessoa participa (lidos uma vez por sessão). */
let gruposGuardados: { id: string; nome: string }[] | null = null;

/**
 * Quem vê: todos, só os contatos ou um grupo de que a pessoa participa. É
 * sempre escolha de quem publica.
 */
export default function SeletorDeVisibilidade({
  valor,
  grupoId,
  aoMudar,
}: {
  valor: Visibilidade;
  grupoId: string | null;
  aoMudar: (v: Visibilidade, grupoId: string | null) => void;
}) {
  const [grupos, setGrupos] = useState(gruposGuardados);

  useEffect(() => {
    if (valor !== 'grupo' || grupos) return;
    fetch('/api/comunidade/grupos')
      .then((r) => (r.ok ? r.json() : { grupos: [] }))
      .then((j) => {
        gruposGuardados = (j.grupos || []).map((g: { id: string; name: string }) => ({ id: g.id, nome: g.name }));
        setGrupos(gruposGuardados);
      })
      .catch(() => setGrupos([]));
  }, [valor, grupos]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Quem vê">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Quem vê</span>
        {VISIBILIDADES.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={valor === v.id}
            title={v.explica}
            onClick={() => aoMudar(v.id, v.id === 'grupo' ? grupoId : null)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              valor === v.id ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-800 text-zinc-300 hover:text-zinc-50'
            }`}
          >
            <Icon name={v.icone} size={12} /> {v.rotulo}
          </button>
        ))}
      </div>
      {valor === 'grupo' && (
        grupos === null ? (
          <p className="text-xs text-zinc-500">Carregando seus grupos…</p>
        ) : grupos.length ? (
          <select
            value={grupoId ?? ''}
            onChange={(e) => aoMudar('grupo', e.target.value || null)}
            aria-label="Grupo"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-100"
          >
            <option value="">Escolha o grupo…</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-zinc-500">Você ainda não participa de nenhum grupo.</p>
        )
      )}
    </div>
  );
}

/** Selo de quem vê, nos cartões. */
export function SeloDeVisibilidade({ valor, grupo }: { valor: Visibilidade; grupo: { nome: string } | null }) {
  const v = VISIBILIDADES.find((x) => x.id === valor) ?? VISIBILIDADES[0];
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500" title={v.explica}>
      <Icon name={v.icone} size={11} /> {valor === 'grupo' && grupo ? grupo.nome : v.rotulo}
    </span>
  );
}
