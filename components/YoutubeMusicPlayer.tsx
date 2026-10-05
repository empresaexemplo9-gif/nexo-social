'use client';

import React, { useEffect, useRef, useState } from 'react';
import { carregarApiDoYoutube } from '@/lib/youtube-iframe';

interface Player {
  loadVideoById(id: string): void;
  playVideo(): void;
  destroy(): void;
  getVideoUrl(): string;
}

interface Props {
  videoId: string;
  title: string;
  request: number;
  onEnded?: () => void;
  onError?: (code: number) => void;
}

/** Mantém o mesmo iframe e troca a música pela API, preservando a reprodução. */
export default function YoutubeMusicPlayer({ videoId, title, request, onEnded, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const ready = useRef(false);
  const playing = useRef(false);
  const latest = useRef({ videoId, request, onEnded, onError });
  latest.current = { videoId, request, onEnded, onError };
  const loaded = useRef({ videoId, request });
  const [blocked, setBlocked] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let alive = true;
    const initial = latest.current;
    loaded.current = { videoId: initial.videoId, request: initial.request };
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', enablejsapi: '1', origin: window.location.origin });
    iframe.src = `https://www.youtube-nocookie.com/embed/${initial.videoId}?${params}`;
    iframe.title = title;
    iframe.className = 'aspect-video min-h-[200px] h-full w-full';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    element.appendChild(iframe);

    const isCurrent = () => alive && player.current?.getVideoUrl().match(/[?&]v=([\w-]{11})/)?.[1] === latest.current.videoId;
    carregarApiDoYoutube().then(() => {
      if (!alive || !window.YT?.Player) return;
      player.current = new window.YT.Player(iframe, {
        events: {
          onReady: () => {
            if (!alive || !player.current) return;
            ready.current = true;
            const current = latest.current;
            if (loaded.current.videoId !== current.videoId || loaded.current.request !== current.request) {
              loaded.current = { videoId: current.videoId, request: current.request };
              player.current.loadVideoById(current.videoId);
            } else player.current.playVideo();
          },
          onStateChange: (event: { data: number }) => {
            if (!isCurrent()) return;
            if (event.data === 1) { playing.current = true; setBlocked(false); }
            if (event.data === 0 && playing.current) {
              playing.current = false;
              latest.current.onEnded?.();
            }
          },
          onError: (event: { data: number }) => {
            if (!alive || loaded.current.videoId !== latest.current.videoId) return;
            playing.current = false;
            latest.current.onError?.(event.data);
          },
          onAutoplayBlocked: () => { if (alive) setBlocked(true); },
        },
      });
    }).catch(() => { if (alive) setApiFailed(true); });

    return () => {
      alive = false;
      ready.current = false;
      playing.current = false;
      player.current?.destroy();
      player.current = null;
      element.replaceChildren();
    };
  }, []); // O player pertence a esta montagem; as props atualizadas ficam em latest.

  useEffect(() => {
    const iframe = container.current?.querySelector('iframe');
    if (iframe) iframe.title = title;
    if (loaded.current.videoId === videoId && loaded.current.request === request) return;
    playing.current = false;
    setBlocked(false);
    if (ready.current && player.current) {
      loaded.current = { videoId, request };
      player.current.loadVideoById(videoId);
    } else if (apiFailed && iframe) {
      loaded.current = { videoId, request };
      const url = new URL(iframe.src);
      url.pathname = `/embed/${videoId}`;
      iframe.src = url.toString();
    }
  }, [videoId, request, title, apiFailed]);

  return <div className="bg-zinc-900 text-zinc-100">
    <div ref={container} data-youtube-music-player className="h-full w-full" />
    {blocked && <button type="button" onClick={() => player.current?.playVideo()} className="action-collage m-3 rounded-lg border px-3 py-2 text-sm">Continuar reprodução</button>}
    {apiFailed && <p role="status" className="p-3 text-xs text-zinc-400">Não foi possível conectar a reprodução automática. Reabra o player para tentar novamente.</p>}
  </div>;
}
