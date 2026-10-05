'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import YoutubeAccount from './YoutubeAccount';
import { usePreferences } from '@/lib/preferences';
import { MUSIC_GENRES } from '@/lib/taxonomy';
import YoutubeMusicPlayer from './YoutubeMusicPlayer';
import { nextPlayable } from '@/lib/music-queue';

interface Video { id: string; title: string; channel: string; thumb: string | null }

// Erros do player do YouTube: 2 id inválido, 5 HTML5, 100 removido/privado,
// 101 e 150 o dono não deixa tocar fora do YouTube.
const MOTIVO: Record<number, string> = {
  100: 'Este vídeo foi removido ou está privado.',
  101: 'O dono deste vídeo não permite que ele toque fora do YouTube.',
  150: 'O dono deste vídeo não permite que ele toque fora do YouTube.',
};

export default function YoutubePlaylist({ variation = 0, fallbackGenre = '' }: { variation?: number; fallbackGenre?: string } = {}) {
  const { prefs, ready } = usePreferences();
  const genres = useMemo(() => MUSIC_GENRES.filter(g => prefs.musicGenres?.includes(g.id)), [prefs.musicGenres]);
  const [selected, setSelected] = useState('');
  const genre = genres.find(g => g.id === selected) ?? genres[0] ?? MUSIC_GENRES.find(g => g.id === fallbackGenre);
  const [round, setRound] = useState(0);
  const [retry, setRetry] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [request, setRequest] = useState(0);
  const [falhas, setFalhas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const estado = useRef({ videos, index, falhas });
  estado.current = { videos, index, falhas };

  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden && index === null) setRetry(r => r + 1); }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [index]);

  useEffect(() => {
    const refresh = () => setRetry(r => r + 1);
    window.addEventListener('nexo:youtube-changed', refresh);
    return () => window.removeEventListener('nexo:youtube-changed', refresh);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setVideos([]); setIndex(null); setFalhas({});
    const params = new URLSearchParams({ genre: genre?.id || '', rodada: String((round + variation) % 5), hits: prefs.musicHits ? '1' : '0', mix: prefs.musicMix ?? 'misturar' });
    fetch(`/api/musica?${params}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível montar sua trilha.');
        if (!controller.signal.aborted) setVideos(data.videos ?? []);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ready, genre?.id, round, retry, variation, prefs.musicHits, prefs.musicMix]);

  /** Toca exatamente a música escolhida (sem pular para outra). */
  const tocar = useCallback((i: number, como: 'escolha' | 'sequencia') => {
    if (como === 'escolha') setFalhas(f => { const next = { ...f }; delete next[estado.current.videos[i]?.id]; return next; });
    setIndex(i);
    setRequest(n => n + 1);
  }, []);

  /** Segue a lista e recomeça quando todas as músicas disponíveis tocaram. */
  const proximaDe = useCallback((i: number) => {
    const { videos: lista, falhas: ruins } = estado.current;
    return nextPlayable(lista.map(v => v.id), i, ruins);
  }, []);

  // O player avisa quando a música termina (segue a sequência) e quando falha.
  const atual = index === null ? null : videos[index] ?? null;
  // Vídeos indisponíveis são pulados; se todos falharem, a sequência para.
  const falhaAtual = atual ? falhas[atual.id] : undefined;
  useEffect(() => {
    if (!falhaAtual || index === null) return;
    const k = proximaDe(index);
    if (k === null) return;
    const t = setTimeout(() => tocar(k, 'sequencia'), 2500);
    return () => clearTimeout(t);
  }, [falhaAtual, index, proximaDe, tocar]);

  if (!ready) return <p>Montando sua trilha…</p>;
  if (!genre && !videos.length) return <div className="card-soft space-y-3 p-6">
    <YoutubeAccount />
    <p>Escolha seus estilos musicais para montar sua trilha no YouTube.</p>
    <Link className="inline-block underline" href="/questionario#q-musica">Escolher meus estilos</Link>
  </div>;

  const proxima = index === null ? null : proximaDe(index);
  const anterior = index === null ? null : (() => { for (let k = index - 1; k >= 0; k--) if (!falhas[videos[k].id]) return k; return null; })();

  return <div className="space-y-4" data-music-provider="youtube">
    <YoutubeAccount />
    <div>
      <p className="rotulo-hud">Sua trilha no YouTube</p>
      <p className="mt-1 text-xs text-zinc-400">Escolha uma música para ouvir aqui. A próxima toca automaticamente e, no fim da lista, a trilha recomeça.</p>
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
    {atual && <div className="overflow-hidden rounded-2xl border border-zinc-700">
      <YoutubeMusicPlayer videoId={atual.id} title={`Tocando: ${atual.title}`} request={request}
        onEnded={() => { const i = estado.current.index; const k = i === null ? null : proximaDe(i); if (k !== null) tocar(k, 'sequencia'); }}
        onError={code => setFalhas(f => ({ ...f, [atual.id]: MOTIVO[code] ?? 'Este vídeo não pode ser reproduzido aqui agora.' }))} />
      {falhaAtual && <div role="alert" className="space-y-2 border-t border-zinc-700 p-3 text-xs">
        <p className="font-semibold text-zinc-100">{falhaAtual}</p>
        {proxima !== null
          ? <p className="text-zinc-400">Pulando para a próxima da trilha…</p>
          : <div className="flex flex-wrap gap-2">
            <a href={`https://www.youtube.com/watch?v=${atual.id}`} target="_blank" rel="noopener noreferrer" className="action-collage rounded-lg border px-3 py-1.5">Abrir no YouTube</a>
            <p className="text-zinc-400">Nenhuma música desta seleção está disponível para tocar aqui. Tente outras descobertas.</p>
          </div>}
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs">
        <span className="min-w-0 flex-1 truncate">Tocando agora: <b>{atual.title}</b></span>
        <span className="flex flex-wrap gap-3">
          <button type="button" disabled={anterior === null} onClick={() => anterior !== null && tocar(anterior, 'escolha')} className="underline disabled:opacity-40">Anterior</button>
          <button type="button" disabled={proxima === null} onClick={() => proxima !== null && tocar(proxima, 'escolha')} className="underline disabled:opacity-40">Próxima</button>
          <button type="button" onClick={() => setIndex(null)} className="underline">Fechar player</button>
        </span>
      </div>
    </div>}
    {!loading && !error && videos.length > 0 && <>
      <button type="button" onClick={() => { const k = proximaDe(-1); if (k !== null) tocar(k, 'sequencia'); }} className="action-collage rounded-lg bg-emerald-400 px-4 py-2 text-sm text-zinc-950">Tocar seleção</button>
      <ul className="grid gap-3 sm:grid-cols-2">
        {videos.map((v, i) => <li key={v.id} className={`rounded-xl border p-3 ${index === i ? 'border-emerald-400' : 'border-zinc-700'}`}>
          <button type="button" onClick={() => tocar(i, 'escolha')} className="flex w-full items-center gap-3 text-left" aria-label={`Tocar ${v.title}`} aria-current={index === i ? 'true' : undefined}>
            {v.thumb && <img src={v.thumb} alt="" className="h-16 w-24 rounded-lg object-cover" />}
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm">{v.title}</span>
              <span className="block text-xs text-zinc-400">{v.channel}</span>
              {index === i && <span className="mt-0.5 block text-[11px] font-semibold text-emerald-400">Tocando agora</span>}
              {falhas[v.id] && <span className="mt-0.5 block text-[11px] text-zinc-500">Só toca no YouTube</span>}
            </span>
          </button>
          <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs underline">Abrir no YouTube</a>
        </li>)}
      </ul>
      <p className="text-xs text-zinc-500">Alguns vídeos podem exigir login no YouTube ou não permitir reprodução incorporada. Nesse caso, use “Abrir no YouTube”.</p>
    </>}
  </div>;
}
