'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../icons';
import { formatEventDateLong } from '@/lib/datetime';
import type { Album, Foto } from '@/lib/comunidade-tipos';

// Peças de foto da Comunidade: a grade de uma publicação, a grade de um álbum
// e o visualizador em tela cheia.

/** As fotos de uma publicação: uma grande, duas lado a lado, ou 2×2 com "+N". */
export function GradeDoPost({ fotos, onAbrir }: { fotos: Foto[]; onAbrir: (i: number) => void }) {
  const mostrar = fotos.slice(0, 4);
  const resto = fotos.length - mostrar.length;
  const uma = fotos.length === 1;
  return (
    <div className={`mt-2 grid gap-1.5 overflow-hidden rounded-2xl ${uma ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {mostrar.map((f, i) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onAbrir(i)}
          className={`relative block overflow-hidden bg-zinc-800 ${uma ? 'max-h-[28rem]' : 'aspect-square'} ${
            fotos.length === 3 && i === 0 ? 'col-span-2 aspect-[2/1]' : ''
          }`}
          aria-label={`Abrir foto ${i + 1} de ${fotos.length}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(uma ? f.url : f.thumbUrl) ?? f.url ?? ''}
            alt=""
            loading="lazy"
            className={`h-full w-full ${uma ? 'object-contain' : 'object-cover'} transition hover:scale-[1.02]`}
            style={uma && f.width && f.height ? { aspectRatio: `${f.width} / ${f.height}` } : undefined}
          />
          {resto > 0 && i === mostrar.length - 1 && (
            <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 text-2xl font-semibold text-zinc-50">
              +{resto}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Grade de miniaturas (álbum ou "todas as fotos"). */
export function GradeDeFotos({ fotos, onAbrir }: { fotos: Foto[]; onAbrir: (i: number) => void }) {
  return (
    <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {fotos.map((f, i) => (
        <li key={f.id}>
          <button
            type="button"
            onClick={() => onAbrir(i)}
            className="block aspect-square w-full overflow-hidden rounded-xl bg-zinc-800"
            aria-label={`Abrir foto de ${f.uploaderName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.thumbUrl ?? f.url ?? ''} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Foto em tela cheia: setas (e as do teclado), arrastar para o lado no
 * celular, Esc fecha. Quem enviou (ou o dono do grupo) move para um álbum e
 * apaga.
 */
export function Lightbox({
  fotos,
  inicio,
  albuns,
  onFechar,
  onApagar,
  onMover,
}: {
  fotos: Foto[];
  inicio: number;
  albuns?: Album[];
  onFechar: () => void;
  onApagar?: (f: Foto) => Promise<void>;
  onMover?: (f: Foto, albumId: string | null) => Promise<void>;
}) {
  const [i, setI] = useState(inicio);
  const [ocupado, setOcupado] = useState(false);
  // A miniatura (já em cache da grade) aparece na hora; a foto inteira entra
  // por cima quando termina de carregar.
  const [carregada, setCarregada] = useState<string | null>(null);
  const toque = useRef<number | null>(null);
  const f = fotos[Math.min(i, fotos.length - 1)];

  const ir = useCallback((d: number) => setI((x) => (x + d + fotos.length) % fotos.length), [fotos.length]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
      else if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
    };
    document.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = antes;
    };
  }, [ir, onFechar]);

  useEffect(() => {
    if (!fotos.length) onFechar();
  }, [fotos.length, onFechar]);
  if (!f) return null;

  // Direto no <body>: fora de qualquer espaçamento ou empilhamento da página.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0b0b0c] text-zinc-100" role="dialog" aria-modal="true" aria-label="Foto">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-[#f6f2ea]" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <p className="min-w-0 truncate text-xs opacity-80">
          {fotos.length > 1 && `${i + 1} de ${fotos.length} · `}
          {f.uploaderName} · {formatEventDateLong(f.createdAt)}
        </p>
        <button onClick={onFechar} className="action-collage action-collage--paper rounded-xl p-2 hover:bg-white/10" aria-label="Fechar">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2"
        onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toque.current === null) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
        }}
      >
        {f.thumbUrl && carregada !== f.id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.thumbUrl} alt="" aria-hidden className="absolute inset-0 m-auto h-full w-full select-none object-contain blur-[2px]" draggable={false} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={f.id}
          src={f.url ?? f.thumbUrl ?? ''}
          alt=""
          onLoad={() => setCarregada(f.id)}
          className={`relative max-h-full max-w-full select-none object-contain transition-opacity ${carregada === f.id ? 'opacity-100' : 'opacity-0'}`}
          draggable={false}
        />
        {fotos.length > 1 && (
          <>
            <button
              onClick={() => ir(-1)}
              className="action-collage action-collage--seal absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-[#f6f2ea] hover:bg-white/20 sm:block"
              aria-label="Foto anterior"
            >
              <Icon name="chevronRight" size={20} className="rotate-180" />
            </button>
            <button
              onClick={() => ir(1)}
              className="action-collage action-collage--seal absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-[#f6f2ea] hover:bg-white/20 sm:block"
              aria-label="Próxima foto"
            >
              <Icon name="chevronRight" size={20} />
            </button>
          </>
        )}
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 text-xs text-[#f6f2ea]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {f.url && (
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="action-collage inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20">
            <Icon name="external" size={14} /> Abrir original
          </a>
        )}
        {f.podeApagar && onMover && albuns && albuns.length > 0 && (
          <label className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2">
            <Icon name="library" size={14} />
            <select
              value={f.albumId ?? ''}
              disabled={ocupado}
              onChange={async (e) => {
                setOcupado(true);
                await onMover(f, e.target.value || null);
                setOcupado(false);
              }}
              className="bg-transparent text-xs focus:outline-none [&>option]:text-zinc-900"
              aria-label="Álbum da foto"
            >
              <option value="">Sem álbum</option>
              {albuns.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {f.podeApagar && onApagar && (
          <button
            disabled={ocupado}
            onClick={async () => {
              if (!window.confirm('Apagar esta foto do grupo? Não dá para desfazer.')) return;
              setOcupado(true);
              await onApagar(f);
              setOcupado(false);
              setI((x) => Math.max(0, Math.min(x, fotos.length - 2)));
            }}
            className="action-collage inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 hover:bg-red-500/30"
          >
            <Icon name="trash" size={14} /> Apagar
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
