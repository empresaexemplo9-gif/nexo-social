'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from './icons';
import InlinePlayer, { type PlayRequest } from './InlinePlayer';
import { usePreferences } from '@/lib/preferences';
import { temClipes } from '@/lib/clips';
import type { CategorySlug } from '@/lib/data';

interface Clip {
  id: string;
  title: string;
  channel: string;
  thumb: string | null;
  embedUrl: string;
}

/**
 * Estante de clipes do tema — vídeos curtos que tocam aqui dentro.
 * O termo de busca muda por dia; em música, os gêneros do questionário mandam.
 */
export default function ClipsShelf({ topic }: { topic: CategorySlug }) {
  const { prefs, ready } = usePreferences();
  const [clips, setClips] = useState<Clip[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'off' | 'erro'>('carregando');
  const [motivo, setMotivo] = useState('');
  const [termo, setTermo] = useState('');
  const [tocando, setTocando] = useState<PlayRequest | null>(null);

  const carregar = useCallback(async () => {
    setEstado('carregando');
    try {
      const generos = topic === 'musica' ? (prefs.musicGenres ?? []).join(',') : '';
      const res = await fetch(`/api/clips?tema=${topic}&generos=${encodeURIComponent(generos)}`);
      const json = await res.json().catch(() => ({}));
      setTermo(json.termo || '');

      if (res.status === 503) {
        setMotivo(json.hint || json.error || '');
        setEstado('off');
        return;
      }
      if (!res.ok) {
        setMotivo(json.hint || json.error || `HTTP ${res.status}`);
        setEstado('erro');
        return;
      }
      setClips(json.clips ?? []);
      setEstado('ok');
    } catch {
      setMotivo('Não foi possível carregar os clipes.');
      setEstado('erro');
    }
  }, [topic, prefs.musicGenres]);

  useEffect(() => {
    if (ready) carregar();
  }, [ready, carregar]);

  if (!temClipes(topic)) return null;
  if (estado === 'off') return null; // sem chave, a seção some em vez de estorvar

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-zinc-50">
            <span className="text-emerald-400">
              <Icon name="video" size={20} />
            </span>
            Clipes
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            {termo ? `Hoje: ${termo}.` : 'Vídeos curtos do tema.'} Toque para assistir aqui mesmo.
          </p>
        </div>
        <button
          onClick={carregar}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-200"
        >
          <Icon name="refresh" size={13} /> Atualizar
        </button>
      </div>

      <div id="player-clips" className="scroll-mt-24">
        {tocando && <InlinePlayer req={tocando} onClose={() => setTocando(null)} />}
      </div>

      {estado === 'carregando' && <p className="text-sm text-zinc-400">Buscando clipes…</p>}

      {estado === 'erro' && (
        <div className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-4 text-xs text-clay-200">
          <p className="font-semibold">Não foi possível carregar os clipes.</p>
          <p className="mt-1 leading-relaxed">{motivo}</p>
        </div>
      )}

      {estado === 'ok' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {clips.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setTocando({ titulo: c.title, url: c.embedUrl, externo: `https://www.youtube.com/watch?v=${c.id}` });
                document.getElementById('player-clips')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 text-left transition hover:border-emerald-800/60"
            >
              <span className="relative flex aspect-video items-center justify-center bg-zinc-950/70">
                {c.thumb && (
                  // Miniaturas vêm do domínio do YouTube — <img> evita configurar
                  // cada host no next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-zinc-100 transition group-hover:bg-black/15">
                  <Icon name="play" size={24} />
                </span>
              </span>
              <span className="block p-3">
                <span className="line-clamp-2 text-xs font-medium text-zinc-100 group-hover:text-emerald-300">
                  {c.title}
                </span>
                <span className="mt-1 block truncate text-[11px] text-zinc-500">{c.channel}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
