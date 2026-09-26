'use client';

import React, { useEffect, useState } from 'react';
import Icon from '../icons';
import { useSpotify } from './SpotifyProvider';

function tempo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Barra fixa embaixo com o que está tocando pelo Spotify (Premium, dentro da
 * plataforma). Fica acima da barra de abas no celular e ao lado da barra
 * lateral no desktop — ver `.barra-player` em globals.css.
 */
export default function BarraDoPlayer() {
  const { reproducao, alternar, proxima, anterior, buscar, fechar } = useSpotify();
  const [agora, setAgora] = useState(() => Date.now());
  // Enquanto arrasta a barra de progresso, mostra onde o dedo está.
  const [arrasto, setArrasto] = useState<number | null>(null);

  const pausado = reproducao?.pausado ?? true;
  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(t);
  }, [pausado]);

  if (!reproducao) return null;
  const { faixa } = reproducao;
  const posicao = Math.min(
    faixa.duracao,
    reproducao.posicao + (reproducao.pausado ? 0 : Math.max(0, agora - reproducao.em)),
  );
  const mostrada = arrasto ?? posicao;

  const soltar = () => {
    if (arrasto === null) return;
    buscar(arrasto);
    setArrasto(null);
  };

  return (
    <div
      role="region"
      aria-label="Player do Spotify"
      className="barra-player fixed inset-x-0 z-40 border-t border-emerald-400/25 bg-zinc-950/90 shadow-[0_-12px_30px_-18px_rgba(43,82,136,0.33)] backdrop-blur-xl"
    >
      <input
        type="range"
        min={0}
        max={Math.max(1, faixa.duracao)}
        step={1000}
        value={mostrada}
        onChange={(e) => setArrasto(Number(e.target.value))}
        onPointerUp={soltar}
        onKeyUp={soltar}
        onBlur={soltar}
        aria-label="Posição da faixa"
        aria-valuetext={`${tempo(mostrada)} de ${tempo(faixa.duracao)}`}
        style={{
          background: `linear-gradient(to right, #2b5288 ${(mostrada / Math.max(1, faixa.duracao)) * 100}%, rgba(22,24,29,0.12) 0)`,
        }}
        className="progresso absolute inset-x-0 -top-0.5 w-full cursor-pointer"
      />
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {faixa.imagem ? (
            <img src={faixa.imagem} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-zinc-500">
              <Icon name="music" size={18} />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-50">{faixa.nome}</p>
          <p className="truncate text-xs text-zinc-400">
            {faixa.artista}
            <span className="hidden sm:inline">
              {' '}
              · {tempo(mostrada)} / {tempo(faixa.duracao)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={anterior}
            disabled={!reproducao.temAnterior && posicao < 3000}
            aria-label="Faixa anterior"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:text-emerald-300 disabled:opacity-40 sm:flex"
          >
            <Icon name="skipPrev" size={18} />
          </button>
          <button
            type="button"
            onClick={alternar}
            aria-label={reproducao.pausado ? 'Tocar' : 'Pausar'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 shadow-glow transition hover:bg-emerald-300"
          >
            <Icon name={reproducao.pausado ? 'play' : 'pause'} size={18} />
          </button>
          <button
            type="button"
            onClick={proxima}
            disabled={!reproducao.temProxima}
            aria-label="Próxima faixa"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:text-emerald-300 disabled:opacity-40"
          >
            <Icon name="skipNext" size={18} />
          </button>
        </div>

        {/* Atribuição e caminho de volta ao Spotify, como pedem as regras da
            plataforma deles. */}
        {faixa.id && (
          <a
            href={`https://open.spotify.com/track/${faixa.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-emerald-400/40 hover:text-emerald-300 md:inline-flex"
          >
            <Icon name="headphones" size={13} /> Spotify
          </a>
        )}
        <button
          type="button"
          onClick={fechar}
          aria-label="Parar e fechar o player"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-200"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
