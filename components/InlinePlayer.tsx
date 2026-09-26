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
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'sem-embed' | 'fora-do-ar'>('carregando');
  // Canal fora do ar: os vídeos que ele publicou por último.
  const [recentes, setRecentes] = useState<{ id: string; titulo: string; capa: string; publicado: string | null }[]>([]);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const [externo, setExterno] = useState(req.externo);

  const resolver = useCallback(async () => {
    setEstado('carregando');
    setMotivo('');
    setDetalhe('');

    // Caminho direto: já temos o vídeo.
    if (req.url) {
      const id = youtubeId(req.url);
      if (id) {
        setEmbed(`https://www.youtube.com/embed/${id}?rel=0&autoplay=1`);
        setVideoId(id);
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
        setVideoId(youtubeId(json.embedUrl));
        if (json.title) setTitulo(json.title);
        setEstado('ok');
        return;
      }

      // Canal que não está transmitindo agora: não é erro — mostra o que ele
      // publicou por último para assistir aqui.
      if (res.ok && req.canal && json.aoVivo === false) {
        setRecentes(json.recentes ?? []);
        setEstado('fora-do-ar');
        return;
      }

      setMotivo(
        json.hint ||
          (res.status === 404 ? 'Nenhum vídeo que possa ser embutido foi encontrado.' : json.error || 'Falha ao resolver o vídeo.'),
      );
      // A mensagem original do Google é o que realmente resolve o problema —
      // ela traz o número do projeto e o link de ativação. Antes eu mostrava
      // só a minha dica genérica e escondia justamente isso.
      setDetalhe(json.hint && json.error ? String(json.error) : '');
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

      {estado === 'fora-do-ar' && (
        <div className="space-y-4 p-5">
          <p className="text-center text-sm text-zinc-300">
            <span className="font-semibold text-zinc-50">O canal não está ao vivo agora.</span>{' '}
            {recentes.length ? 'Veja o que ele publicou por último:' : 'Volte na hora do jogo.'}
          </p>
          {recentes.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recentes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setEmbed(`https://www.youtube.com/embed/${v.id}?rel=0&autoplay=1`);
                    setVideoId(v.id);
                    setTitulo(v.titulo);
                    setEstado('ok');
                  }}
                  className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/50"
                >
                  <span className="relative block aspect-video bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.capa} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-80 transition group-hover:opacity-100">
                      <Icon name="play" size={20} />
                    </span>
                  </span>
                  <span className="line-clamp-2 p-2 text-[11px] font-medium text-zinc-200">{v.titulo}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {estado === 'sem-embed' && (
        <div className="space-y-3 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-100">Não dá para tocar aqui dentro ainda</p>
          <p className="mx-auto max-w-lg text-xs leading-relaxed text-zinc-400">{motivo}</p>
          {detalhe && (
            <p className="mx-auto max-w-lg break-words rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-left font-mono text-[10px] leading-relaxed text-zinc-500">
              {detalhe}
            </p>
          )}
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
        <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">{titulo}</p>
        {/* Alguns donos bloqueiam o vídeo fora do YouTube — o link fica sempre à mão. */}
        {estado === 'ok' && videoId && (
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-zinc-500 transition hover:text-emerald-400"
          >
            Abrir no YouTube <Icon name="external" size={11} />
          </a>
        )}
        <button onClick={onClose} className="shrink-0 text-xs text-zinc-500 transition hover:text-zinc-200">
          Fechar
        </button>
      </div>
    </div>
  );
}
