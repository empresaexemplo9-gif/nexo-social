'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import ListaCard from './ListaCard';
import type { ListaResumo } from '@/lib/listas-tipos';

/**
 * Sugestões: as listas que outras pessoas abriram para todos (playlists,
 * livros, filmes…). Sem nenhuma, a faixa não aparece.
 */
export default function SugestoesDeListas({ titulo = 'Listas da comunidade para você' }: { titulo?: string }) {
  const [listas, setListas] = useState<ListaResumo[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/listas?escopo=sugestoes&limite=12', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { listas: [] }))
      .then((j) => vivo && setListas(j.listas || []))
      .catch(() => vivo && setListas([]));
    return () => {
      vivo = false;
    };
  }, []);

  if (!listas?.length) return null;

  return (
    <section className="space-y-3" aria-labelledby="sugestoes-de-listas">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="rotulo-hud">Sugestões de quem está aqui</p>
          <h2 id="sugestoes-de-listas" className="flex items-center gap-2 font-display text-2xl font-bold text-zinc-50">
            <Icon name="music" size={20} className="text-emerald-400" /> {titulo}
          </h2>
        </div>
        <Link href="/comunidade?aba=listas" className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-clay-400">Ver todas ↗</Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {listas.map((l) => (
          <li key={l.id} className="snap-start">
            <ListaCard lista={l} compacta />
          </li>
        ))}
      </ul>
    </section>
  );
}
