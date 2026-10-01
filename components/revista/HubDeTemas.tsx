'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import RevistaDoTema from './RevistaDoTema';
import HistoricasDoTema from '../historicas/HistoricasDoTema';
import { usePreferences } from '@/lib/preferences';
import { TOPICS } from '@/lib/data';

/**
 * A Revista (o que é notícia agora) ou as Matérias históricas, tema a tema:
 * os temas que a pessoa segue primeiro, depois os outros.
 */
export default function HubDeTemas({ tipo }: { tipo: 'revista' | 'historicas' }) {
  const { prefs, ready } = usePreferences();
  const ordem = useMemo(
    () => [...TOPICS].sort((a, b) => Number(!prefs.interests.includes(a.slug)) - Number(!prefs.interests.includes(b.slug))),
    [prefs.interests],
  );
  if (!ready) return null;
  return (
    <div className="space-y-16">
      <nav aria-label="Ir para o tema" className="-mt-4 flex flex-wrap gap-2">
        {ordem.map((t) => (
          <a
            key={t.slug}
            href={`#${t.slug}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 ${t.accent.border} ${t.accent.bg} ${t.accent.text}`}
          >
            <Icon name={t.icon} size={13} />
            {t.label}
          </a>
        ))}
      </nav>
      {ordem.map((t) => (
        <section key={t.slug} id={t.slug} className="scroll-mt-20 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-3">
            <h2 className="flex items-center gap-3 font-display text-4xl font-extrabold text-zinc-50">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${t.accent.border} ${t.accent.bg} ${t.accent.text}`}>
                <Icon name={t.icon} size={22} />
              </span>
              {t.label}
              {prefs.interests.includes(t.slug) && (
                <span className="rounded-full bg-emerald-950 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  seu tema
                </span>
              )}
            </h2>
            <Link href={`/tema/${t.slug}`} className="font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">
              tudo de {t.label} →
            </Link>
          </div>
          {tipo === 'revista' ? <RevistaDoTema tema={t.slug} /> : <HistoricasDoTema tema={t.slug} acervo />}
        </section>
      ))}
    </div>
  );
}
