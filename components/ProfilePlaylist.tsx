'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from './icons';
import { usePreferences } from '@/lib/preferences';

interface Track {
  id: string; name: string; artist: string; album: string;
  image: string | null; previewUrl: string | null; url: string;
}
interface Playlist {
  id: string; name: string; owner: string; image: string | null;
  url: string; embedUrl: string; genre: string;
}

/**
 * Trilha do perfil: playlists do Spotify escolhidas pelos gêneros do
 * questionário. O player embutido toca de graça — com anúncios no plano
 * gratuito do Spotify.
 */
export default function ProfilePlaylist() {
  const { prefs, ready } = usePreferences();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<'loading' | 'ok' | 'off' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const qs = prefs.musicGenres?.length ? `?genres=${encodeURIComponent(prefs.musicGenres.join(','))}` : '';
      const res = await fetch(`/api/playlist${qs}`);
      const json = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setState('off');
        setError(json.hint || json.error || '');
        return;
      }
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setPlaylists(json.playlists || []);
      setTracks(json.tracks || []);
      setState('ok');
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar a trilha.');
      setState('error');
    }
  }, [prefs.musicGenres]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready || state === 'loading') {
    return <p className="text-sm text-zinc-400">Montando sua trilha…</p>;
  }

  if (state === 'off') {
    return (
      <div className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-5 text-sm text-clay-200">
        <p className="font-semibold">Spotify ainda não conectado.</p>
        <p className="mt-1 text-xs">{error}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/25 p-5 text-sm text-red-200">
        <p className="font-semibold">Não foi possível montar a trilha.</p>
        <p className="mt-1 text-xs">{error}</p>
        <button onClick={load} className="mt-3 rounded-xl border border-red-800 px-3 py-1.5 text-xs">Tentar de novo</button>
      </div>
    );
  }

  const current = playlists[active];

  return (
    <div className="space-y-4">
      {/* Seletor de playlist por gênero */}
      {playlists.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {playlists.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActive(i)}
              className={`rounded-2xl px-3.5 py-2 text-xs font-medium capitalize transition ${
                i === active ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-zinc-50'
              }`}
            >
              {p.genre}
            </button>
          ))}
        </div>
      )}

      {/* Player embutido — gratuito, com anúncios */}
      {current ? (
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
          <iframe
            key={current.id}
            src={`${current.embedUrl}?utm_source=nexo-social`}
            width="100%"
            height="380"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={current.name}
            className="block"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-400">
              <span className="text-zinc-200">{current.name}</span> · por {current.owner}
            </p>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Abrir no Spotify <Icon name="external" size={13} />
            </a>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-400">
          Nenhuma playlist encontrada para os seus gêneros.
        </p>
      )}

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
        <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
        Reprodução pelo player oficial do Spotify: no plano gratuito, toca com anúncios. Com Premium, sem anúncios.
      </p>

      {/* Faixas do perfil */}
      {tracks.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Faixas escolhidas para você</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tracks.slice(0, 10).map((t) => (
              <li key={t.id}>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-2.5 transition hover:border-zinc-700"
                >
                  {t.image ? (
                    <img src={t.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500">
                      <Icon name="music" size={18} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-zinc-100 group-hover:text-emerald-300">{t.name}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{t.artist}</span>
                  </span>
                  <Icon name="external" size={13} className="shrink-0 text-zinc-600" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
