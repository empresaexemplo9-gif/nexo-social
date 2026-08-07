'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from './icons';
import InlinePlayer, { type PlayRequest } from './InlinePlayer';
import { rotuloDoTipo, sugestoes, type SearchResult } from '@/lib/search';
import { getTopic } from '@/lib/data';

interface Video {
  id: string;
  title: string;
  channel: string;
  thumb: string | null;
  embedUrl: string;
}

export default function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const inicial = params.get('q') ?? '';

  const [termo, setTermo] = useState(inicial);
  const [resultados, setResultados] = useState<SearchResult[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoDisponivel, setVideoDisponivel] = useState(false);
  const [videoAviso, setVideoAviso] = useState('');
  const [buscandoVideo, setBuscandoVideo] = useState(false);
  const [tocando, setTocando] = useState<PlayRequest | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  // Busca no catálogo enquanto digita — é local, não custa requisição externa.
  const buscarCatalogo = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResultados([]);
      return;
    }
    const res = await fetch(`/api/busca?q=${encodeURIComponent(q)}`);
    const json = await res.json().catch(() => ({}));
    setResultados(json.resultados ?? []);
    setVideoDisponivel(Boolean(json.videoDisponivel));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscarCatalogo(termo), 200);
    return () => clearTimeout(t);
  }, [termo, buscarCatalogo]);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  // A busca por vídeo é sob demanda: 100 unidades da cota por clique.
  const buscarVideos = async () => {
    if (termo.trim().length < 2) return;
    setBuscandoVideo(true);
    setVideoAviso('');
    try {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(termo)}&video=1`);
      const json = await res.json().catch(() => ({}));
      setVideos(json.videos ?? []);
      if (json.videoAviso) setVideoAviso(json.videoAviso);
    } finally {
      setBuscandoVideo(false);
    }
  };

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    router.replace(`/busca?q=${encodeURIComponent(termo)}`);
    buscarVideos();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submeter} className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <Icon name="search" size={18} />
          </span>
          <input
            ref={campo}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Buscar temas, eventos, craques, clipes…"
            aria-label="Buscar"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 py-3.5 pl-12 pr-4 text-base text-zinc-100 placeholder-zinc-600 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {termo.trim().length < 2 && (
          <div className="flex flex-wrap gap-2">
            {sugestoes().map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTermo(s)}
                className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      <div id="player-busca" className="scroll-mt-24">
        {tocando && <InlinePlayer req={tocando} onClose={() => setTocando(null)} />}
      </div>

      {/* Catálogo da plataforma */}
      {termo.trim().length >= 2 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Na plataforma {resultados.length > 0 && <span className="text-zinc-500">({resultados.length})</span>}
          </h2>
          {resultados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
              Nada encontrado no catálogo para “{termo}”.
            </p>
          ) : (
            <ul className="space-y-2">
              {resultados.map((r) => {
                const t = r.topic ? getTopic(r.topic) : null;
                return (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          t ? `${t.accent.bg} ${t.accent.text}` : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <Icon name={t?.icon ?? 'search'} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-50">{r.titulo}</span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {rotuloDoTipo(r.kind)}
                          {r.descricao && ` · ${r.descricao}`}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={15} className="shrink-0 text-zinc-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Vídeos — sob demanda, porque consome cota */}
      {termo.trim().length >= 2 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-100">Vídeos e clipes</h2>
            <button
              onClick={buscarVideos}
              disabled={buscandoVideo}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-emerald-500 hover:text-zinc-950 disabled:opacity-60"
            >
              <Icon name="video" size={13} /> {buscandoVideo ? 'Buscando…' : 'Buscar vídeos'}
            </button>
          </div>

          {videoAviso && (
            <p className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-3 text-[11px] leading-relaxed text-clay-200">
              {videoAviso}
            </p>
          )}

          {videos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {videos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setTocando({ titulo: v.title, url: v.embedUrl, externo: `https://www.youtube.com/watch?v=${v.id}` });
                    document.getElementById('player-busca')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 text-left transition hover:border-emerald-800/60"
                >
                  <span className="relative flex aspect-video items-center justify-center bg-zinc-950/70">
                    {v.thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-zinc-100 transition group-hover:bg-black/15">
                      <Icon name="play" size={22} />
                    </span>
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 text-xs font-medium text-zinc-100 group-hover:text-emerald-300">
                      {v.title}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-zinc-500">{v.channel}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {videos.length === 0 && !videoAviso && !buscandoVideo && (
            <p className="text-xs leading-relaxed text-zinc-500">
              A busca no catálogo é instantânea. A de vídeos consome cota do YouTube, então acontece só quando você
              pede.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
