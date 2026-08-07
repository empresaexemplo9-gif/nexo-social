'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from './icons';

export interface PlayRequest {
  /** Título mostrado abaixo do player. */
  titulo: string;
  /** Link direto de um vídeo (melhores momentos de uma partida, por exemplo). */
  url?: string;
  /** Termo a resolver via /api/video (craques históricos). */
  busca?: string;
  /** @handle de canal, para embutir a transmissão ao vivo. */
  canal?: string;
  /** Para onde mandar a pessoa se não der para embutir. */
  externo?: string;
}

/** Extrai o id de um vídeo do YouTube de qualquer formato de link. */
function youtubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/embed\/([\w-]{11})/) ||
    url.match(/\/shorts\/([\w-]{11})/);
  return m ? m[1] : null;
}

/**
 * Toca vídeo DENTRO da plataforma.
 *
 * Um link direto vira embed na hora. Um termo de busca ou um canal precisam da
 * YOUTUBE_API_KEY para virar id — sem ela não existe embed possível, e aí o
 * componente é honesto: explica e oferece o link externo, em vez de fingir.
 */
export default function InlinePlayer({ req, onClose }: { req: PlayRequest; onClose: () => void }) {
  const [embed, setEmbed] = useState<string | null>(null);
  const [titulo, setTitulo] = useState(req.titulo);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'sem-embed'>('carregando');
  const [motivo, setMotivo] = useState('');
  const [externo, setExterno] = useState(req.externo);

  const resolver = useCallback(async () => {
    setEstado('carregando');
    setMotivo('');

    // Caminho direto: já temos o vídeo.
    if (req.url) {
      const id = youtubeId(req.url);
      if (id) {
        setEmbed(`https://www.youtube.com/embed/${id}?rel=0&autoplay=1`);
        setEstado('ok');
        return;
      }
      setExterno(req.url);
    }

    const qs = req.canal ? `canal=${encodeURIComponent(req.canal)}` : `q=${encodeURIComponent(req.busca || req.titulo)}`;
    try {
      const res = await fetch(`/api/video?${qs}`);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.encontrado) {
        setEmbed(`${json.embedUrl}${json.embedUrl.includes('?') ? '&' : '?'}autoplay=1`);
        if (json.title) setTitulo(json.title);
        setEstado('ok');
        return;
      }

      setMotivo(
        json.hint ||
          (res.status === 404 ? 'Nenhum vídeo que possa ser embutido foi encontrado.' : json.error || 'Falha ao resolver o vídeo.'),
      );
      setEstado('sem-embed');
    } catch {
      setMotivo('Não foi possível falar com o resolvedor de vídeo.');
      setEstado('sem-embed');
    }
  }, [req]);

  useEffect(() => {
    resolver();
  }, [resolver]);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70">
      {estado === 'carregando' && (
        <div className="flex aspect-video w-full items-center justify-center bg-black/60 text-sm text-zinc-400">
          Procurando o vídeo…
        </div>
      )}

      {estado === 'ok' && embed && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embed}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {estado === 'sem-embed' && (
        <div className="space-y-3 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-100">Não dá para tocar aqui dentro ainda</p>
          <p className="mx-auto max-w-lg text-xs leading-relaxed text-zinc-400">{motivo}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={resolver} className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200">
              Tentar de novo
            </button>
            {externo && (
              <a
                href={externo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100"
              >
                Abrir no YouTube <Icon name="external" size={12} />
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3">
        <p className="truncate text-xs text-zinc-300">{titulo}</p>
        <button onClick={onClose} className="shrink-0 text-xs text-zinc-500 transition hover:text-zinc-200">
          Fechar
        </button>
      </div>
    </div>
  );
}
