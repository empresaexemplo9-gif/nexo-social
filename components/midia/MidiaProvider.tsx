'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Icon from '../icons';
import Leitor from './Leitor';
import LivroArquivo from './LivroArquivo';
import YoutubeMusicQueue from './YoutubeMusicQueue';
import type { ItemDeMidia } from '@/lib/midia';

/*
 * Reprodutor da plataforma: qualquer tela chama `abrir(item)` e o conteúdo
 * gratuito abre por cima, aqui dentro — vídeo do YouTube, filme ou audiolivro
 * do Internet Archive, livro no leitor, audiolivro do LibriVox por capítulos.
 */

interface Contexto {
  abrir: (item: ItemDeMidia) => void;
  fechar: () => void;
}

const MidiaCtx = createContext<Contexto | null>(null);

export function useMidia(): Contexto {
  const ctx = useContext(MidiaCtx);
  if (!ctx) throw new Error('useMidia precisa do <MidiaProvider>.');
  return ctx;
}

interface Capitulo {
  titulo: string;
  mp3: string;
  duracao: string | null;
}

/** Audiolivro do LibriVox: capítulos em MP3, um depois do outro. */
function AudioCapitulos({ feed }: { feed: string }) {
  const [caps, setCaps] = useState<Capitulo[] | null>(null);
  const [erro, setErro] = useState('');
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    fetch(`/api/audiolivro?feed=${encodeURIComponent(feed)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        setCaps(j.capitulos);
      })
      .catch((e) => setErro(e.message || 'Não foi possível carregar os capítulos.'));
  }, [feed]);

  if (erro) return <p className="p-8 text-center text-sm text-zinc-400">{erro}</p>;
  if (!caps) return <div className="m-6 h-40 animate-pulse rounded-2xl bg-zinc-800/60" aria-busy="true" />;

  return (
    <div className="space-y-4 p-5">
      <audio
        key={caps[atual]?.mp3}
        src={caps[atual]?.mp3}
        controls
        autoPlay
        onEnded={() => setAtual((a) => Math.min(caps.length - 1, a + 1))}
        className="w-full"
      />
      <ol className="max-h-[50vh] space-y-1 overflow-y-auto">
        {caps.map((c, i) => (
          <li key={c.mp3}>
            <button
              type="button"
              onClick={() => setAtual(i)}
              className={"action-collage " + (`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                i === atual ? 'bg-emerald-950 font-semibold text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800/60'
              }`)}
            >
              <span className="font-mono text-[11px] text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
              {c.duracao && <span className="font-mono text-[11px] text-zinc-500">{c.duracao}</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Reprodutor({ item, onFechar, compacto, onAlternar }: { item: ItemDeMidia; onFechar: () => void; compacto: boolean; onAlternar: () => void }) {
  const m = item.midia;
  const alto = m.tipo === 'livro' || (m.tipo === 'archive' && m.formato === 'texto');
  const musica = m.tipo === 'youtube' && !!m.fila;

  return (
    <div
      role={compacto ? 'region' : 'dialog'}
      aria-modal={compacto ? undefined : true}
      aria-label={item.titulo}
      onClick={compacto ? undefined : onFechar}
      className={compacto ? 'player-musica-compacto fixed z-[70]' : 'player-midia-aberto fixed inset-0 z-[80] flex items-center justify-center bg-zinc-50/55 backdrop-blur-sm sm:p-6'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`widget-entra relative flex w-full max-w-5xl flex-col overflow-hidden bg-zinc-900 shadow-2xl sm:rounded-3xl ${
          alto ? 'h-full sm:h-[90dvh]' : 'max-h-full'
        }`}
      >
        <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          {item.capa && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.capa} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold leading-tight text-zinc-50">{item.titulo}</p>
            <p className="truncate text-xs text-zinc-500">
              {[item.autor, item.fonte].filter(Boolean).join(' · ')}
            </p>
          </div>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="action-collage action-collage--paper hidden items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-emerald-400/50 hover:text-emerald-400 sm:inline-flex"
            >
              Abrir na fonte <Icon name="external" size={12} />
            </a>
          )}
          {musica && <button type="button" onClick={onAlternar} aria-label={compacto ? 'Ampliar player' : 'Recolher player'} className="action-collage min-h-11 rounded-lg px-3 text-xs text-zinc-100">{compacto ? 'Ampliar' : 'Recolher'}</button>}
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="action-collage action-collage--paper action-collage--seal flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-50"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {m.tipo === 'youtube' && (
            <div className={m.vertical ? 'mx-auto aspect-[9/16] max-h-[80dvh] bg-black' : 'w-full bg-black'}>
              {m.fila ? <YoutubeMusicQueue key={`${m.id}:${m.fila.join(',')}`} ids={[m.id, ...m.fila].filter(v => /^[\w-]{11}$/.test(v))} title={item.titulo} /> : <iframe
                src={`https://www.youtube-nocookie.com/embed/${m.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
                title={item.titulo}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="aspect-video min-h-[200px] w-full"
              />}
            </div>
          )}
          {m.tipo === 'archive' && m.formato === 'texto' && <LivroArquivo key={m.id} id={m.id} titulo={item.titulo} />}
          {m.tipo === 'archive' && m.formato !== 'texto' && (
            <div
              className={
                m.formato === 'video' ? 'aspect-video w-full bg-black' : 'h-[420px] w-full'
              }
            >
              <iframe
                src={`https://archive.org/embed/${encodeURIComponent(m.id)}`}
                title={item.titulo}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
          {m.tipo === 'livro' && <Leitor id={m.gutenberg} capa={item.capa} />}
          {m.tipo === 'audiolivro' && <AudioCapitulos feed={m.feed} />}
        </div>
      </div>
    </div>
  );
}

export function MidiaProvider({ children }: { children: React.ReactNode }) {
  const [aberta, setAberta] = useState<ItemDeMidia | null>(null);
  const [compacto, setCompacto] = useState(false);
  const fechar = useCallback(() => setAberta(null), []);
  const abrir = useCallback((item: ItemDeMidia) => { setCompacto(false); setAberta(item); }, []);

  // Esc fecha; a página por trás não rola enquanto o reprodutor está aberto.
  useEffect(() => {
    if (!aberta || compacto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', tecla);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener('keydown', tecla);
    };
  }, [aberta, compacto, fechar]);

  const valor = useMemo(() => ({ abrir, fechar }), [abrir, fechar]);
  return (
    <MidiaCtx.Provider value={valor}>
      {children}
      {aberta && <Reprodutor item={aberta} onFechar={fechar} compacto={compacto} onAlternar={() => setCompacto(c => !c)} />}
    </MidiaCtx.Provider>
  );
}
