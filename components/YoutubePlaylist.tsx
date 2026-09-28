'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import YoutubeAccount from './YoutubeAccount';
import { usePreferences } from '@/lib/preferences';
import { MUSIC_GENRES } from '@/lib/taxonomy';

interface Video { id: string; title: string; channel: string; thumb: string | null }

export default function YoutubePlaylist() {
  const { prefs, ready } = usePreferences();
  const genres = useMemo(() => MUSIC_GENRES.filter(g => prefs.musicGenres?.includes(g.id)), [prefs.musicGenres]);
  const [selected, setSelected] = useState('');
  const genre = genres.find(g => g.id === selected) ?? genres[0];
  const [round, setRound] = useState(0);
  const [retry, setRetry] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden && index === null) setRetry(r => r + 1); }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [index]);

  useEffect(() => {
    useEffect(() => {
    const refresh = () => setRetry(r => r + 1);
    window.addEventListener('nexo:youtube-changed', refresh);
    return () => window.removeEventListener('nexo:youtube-changed', refresh);
  }, []);

  if (!ready) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setVideos([]); setIndex(null);
    const params = new URLSearchParams({ genre: genre?.id || '', rodada: String(round), hits: prefs.musicHits ? '1' : '0', mix: prefs.musicMix ?? 'misturar' });
    fetch(`/api/musica?${params}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível montar sua trilha.');
        if (!controller.signal.aborted) setVideos(data.videos ?? []);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ready, genre?.id, round, retry, prefs.musicHits, prefs.musicMix]);

  if (!ready) return <p>Montando sua trilha…</p>;
  if (!genres.length && !videos.length) return <div className="card-soft space-y-3 p-6">
    <YoutubeAccount />
    <p>Escolha seus estilos musicais para montar sua trilha no YouTube.</p>
    <Link className="inline-block underline" href="/questionario#q-musica">Escolher meus estilos</Link>
  </div>;

  const current = index === null ? null : videos[index];
  const nextIds = index === null ? [] : videos.slice(index + 1).map(v => v.id);
  const embedParams = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', ...(nextIds.length ? { playlist: nextIds.join(',') } : {}) });
  return <div className="space-y-4" data-music-provider="youtube">
    <YoutubeAccount />
    <div>
      <p className="rotulo-hud">Sua trilha no YouTube</p>
      <p className="mt-1 text-xs text-zinc-400">Escolha uma música para assistir e ouvir aqui. A sequência continua pelo player do YouTube.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {genres.map(g => <button key={g.id} type="button" aria-pressed={genre?.id === g.id}
        onClick={() => { setSelected(g.id); setRound(0); }}
        className={`action-collage rounded-lg border px-3 py-2 text-xs ${genre?.id === g.id ? 'bg-emerald-400 text-zinc-950' : 'border-zinc-700'}`}>{g.label}</button>)}
      <button type="button" disabled={loading} onClick={() => setRound(r => (r + 1) % 5)} className="action-collage rounded-lg border px-3 py-2 text-xs disabled:opacity-50">Outras descobertas</button>
      <Link href="/questionario#q-musica" className="px-3 py-2 text-xs underline">Editar meus gostos</Link>
    </div>
    {loading && <p role="status" className="p-6">Buscando músicas no YouTube…</p>}
    {error && <div role="alert" className="card-soft space-y-3 p-5"><p>{error}</p><button type="button" onClick={() => setRetry(r => r + 1)} className="action-collage rounded-lg border px-3 py-2">Tentar novamente</button></div>}
    {current && <div className="overflow-hidden rounded-2xl border border-zinc-700">
      <iframe key={`${current.id}:${round}`} src={`https://www.youtube-nocookie.com/embed/${current.id}?${embedParams}`}
        title="Sua trilha musical no YouTube" className="aspect-video min-h-[200px] w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs">
        <span>Use os controles do YouTube para pausar, avançar ou escolher um vídeo da sequência.</span>
        <button type="button" onClick={() => setIndex(null)} className="underline">Fechar player</button>
      </div>
    </div>}
    {!loading && !error && videos.length > 0 && <>
      <button type="button" onClick={() => setIndex(0)} className="action-collage rounded-lg bg-emerald-400 px-4 py-2 text-sm text-zinc-950">Tocar seleção</button>
      <ul className="grid gap-3 sm:grid-cols-2">
        {videos.map((v, i) => <li key={v.id} className="rounded-xl border border-zinc-700 p-3">
          <button type="button" onClick={() => setIndex(i)} className="flex w-full items-center gap-3 text-left" aria-label={`Tocar ${v.title}`}>
            {v.thumb && <img src={v.thumb} alt="" className="h-16 w-24 rounded-lg object-cover" />}
            <span className="min-w-0"><span className="line-clamp-2 text-sm">{v.title}</span><span className="block text-xs text-zinc-400">{v.channel}</span></span>
          </button>
          <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs underline">Abrir no YouTube</a>
        </li>)}
      </ul>
      <p className="text-xs text-zinc-500">Alguns vídeos podem exigir login no YouTube ou não permitir reprodução incorporada. Nesse caso, use “Abrir no YouTube”.</p>
    </>}
  </div>;
}
