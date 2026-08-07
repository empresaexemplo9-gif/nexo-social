'use client';

import React, { useMemo, useState } from 'react';
import Icon from './icons';
import InlinePlayer, { type PlayRequest } from './InlinePlayer';
import { heritageDoDia, heritageParaPerfil, type HeritageItem } from '@/lib/heritage';
import { usePreferences } from '@/lib/preferences';
import { getTopic, type CategorySlug } from '@/lib/data';

function buscaExterna(q: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/**
 * Acervo histórico: marcos do tema para assistir DENTRO da plataforma.
 * A seleção muda sozinha todo dia.
 *
 * Sem `topic`, monta a partir dos temas que a pessoa segue.
 */
export default function HeritageShelf({ topic, titulo }: { topic?: CategorySlug; titulo?: string }) {
  const { prefs, ready } = usePreferences();
  const [tocando, setTocando] = useState<PlayRequest | null>(null);

  const itens: HeritageItem[] = useMemo(() => {
    if (topic) return heritageDoDia(topic, 4);
    return heritageParaPerfil(prefs.interests ?? [], 6);
  }, [topic, prefs.interests]);

  if (!topic && !ready) return null;
  if (itens.length === 0) return null;

  const tocar = (h: HeritageItem) =>
    setTocando({ titulo: h.nome, busca: h.query, externo: buscaExterna(h.query) });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-zinc-50">
          <span className="text-clay-300">
            <Icon name="film" size={20} />
          </span>
          {titulo ?? 'Marcos históricos'}
        </h2>
        <p className="mt-1 text-sm text-zinc-300">
          A seleção muda todo dia. Toque para assistir aqui mesmo.
        </p>
      </div>

      <div id="player-acervo" className="scroll-mt-24">
        {tocando && <InlinePlayer req={tocando} onClose={() => setTocando(null)} />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((h) => {
          const t = getTopic(h.topic);
          return (
            <button
              key={h.id}
              onClick={() => {
                tocar(h);
                document.getElementById('player-acervo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-left transition hover:border-clay-700/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-zinc-50 group-hover:text-clay-300">{h.nome}</h3>
                  <p className="truncate text-[11px] text-zinc-500">{h.epoca}</p>
                </div>
                <Icon name="play" size={14} className="shrink-0 text-zinc-600 group-hover:text-clay-300" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{h.nota}</p>
              {!topic && t && (
                <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${t.accent.bg} ${t.accent.text}`}>
                  <Icon name={t.icon} size={10} /> {t.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
