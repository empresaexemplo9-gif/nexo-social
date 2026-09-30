'use client';
import React, { useEffect, useRef, useState } from 'react';
import { carregarApiDoYoutube as loadApi } from '@/lib/youtube-iframe';
export default function YoutubeLivePlayer({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Carregando player…');
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let player: { destroy: () => void } | undefined;
    setError(''); setStatus('Carregando player…');
    loadApi().then(() => {
      if (disposed || !container.current) return;
      const child = document.createElement('div'); container.current.replaceChildren(child);
      player = new window.YT.Player(child, { videoId: id, width: '100%', height: '100%', playerVars: { origin: window.location.origin, autoplay: 1, playsinline: 1, rel: 0 }, events: {
        onReady: () => { if (!disposed) { setStatus('Player pronto. Toque em reproduzir se necessário.'); container.current?.querySelector('iframe')?.setAttribute('title', title); } },
        onStateChange: (e: { data: number }) => { if (!disposed) setStatus(({ 1: 'Reproduzindo', 2: 'Pausado', 3: 'Carregando vídeo…', 0: 'Transmissão encerrada' } as Record<number, string>)[e.data] || 'Player pronto'); },
        onError: (e: { data: number }) => { if (!disposed) setError([101, 150].includes(e.data) ? 'Este canal não permite reproduzir esta transmissão em outros sites.' : e.data === 153 ? 'O YouTube não conseguiu validar este player. Abra a transmissão no canal oficial.' : 'A transmissão está indisponível, terminou ou tem restrição de acesso. Escolha outra opção.'); },
      } });
    }).catch(() => { if (!disposed) setError('O player do YouTube não carregou. Verifique a conexão ou abra o canal oficial.'); });
    return () => { disposed = true; player?.destroy(); };
  }, [id, title]);
  return <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
    <div ref={container} className="aspect-video min-h-[200px] w-full bg-black" />
    <div className="space-y-2 p-4">
      <p className="font-semibold text-zinc-50">{title}</p>
      <p role={error ? 'alert' : 'status'} className="text-sm text-zinc-400">{error || status}</p>
      <div className="flex flex-wrap gap-3"><a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer" className="action-collage rounded-lg px-3 py-2 text-xs">Abrir no canal oficial</a><button onClick={onClose} className="action-collage rounded-lg px-3 py-2 text-xs">Fechar transmissão</button></div>
    </div>
  </div>;
}
