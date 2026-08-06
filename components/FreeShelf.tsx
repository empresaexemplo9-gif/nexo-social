'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from './icons';
import { useReading } from '@/lib/reading';
import type { AudioBook, FreeBook, Shelf } from '@/lib/freebooks';

type Period = 'semana' | 'mes';

const FONTE_LABEL: Record<string, string> = {
  gutenberg: 'Projeto Gutenberg',
  librivox: 'LibriVox',
  openlibrary: 'Open Library',
  'dominio-publico': 'Domínio Público',
};

/** Contagem regressiva simples até a próxima troca da estante. */
function faltam(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'trocando agora';
  const dias = Math.floor(ms / 86400000);
  if (dias >= 1) return `troca em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  const horas = Math.max(1, Math.floor(ms / 3600000));
  return `troca em ${horas}h`;
}

function BookCard({ book }: { book: FreeBook }) {
  const { find, add } = useReading();
  const registrado = find(book.source, book.id);

  return (
    <article className="flex gap-4 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
        {book.cover ? (
          // Capas vêm de domínios variados (gutenberg.org, archive.org):
          // <img> evita configurar cada host no next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-zinc-700">
            <Icon name="book" size={24} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-50">{book.title}</h3>
        <p className="mt-0.5 truncate text-xs text-zinc-400">{book.author}</p>

        {book.subjects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {book.subjects.slice(0, 2).map((s) => (
              <span key={s} className="rounded-lg bg-zinc-800/70 px-2 py-0.5 text-[10px] text-zinc-400">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {book.formats.slice(0, 3).map((f) => (
            <a
              key={f.label}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              <Icon name="download" size={11} /> {f.label}
            </a>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-zinc-600">{FONTE_LABEL[book.source]}</span>
          <button
            onClick={() =>
              add({
                title: book.title,
                author: book.author,
                kind: 'livro',
                status: registrado ? 'lido' : 'quero-ler',
                source: book.source,
                externalId: book.id,
                url: book.url,
                coverUrl: book.cover,
              })
            }
            disabled={Boolean(registrado)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
              registrado
                ? 'cursor-default bg-emerald-950/50 text-emerald-400'
                : 'bg-zinc-800 text-zinc-100 hover:bg-emerald-500 hover:text-zinc-950'
            }`}
          >
            <Icon name={registrado ? 'check' : 'plus'} size={12} />
            {registrado ? 'Na estante' : 'Quero ler'}
          </button>
        </div>
      </div>
    </article>
  );
}

function AudioCard({ book }: { book: AudioBook }) {
  const { find, add } = useReading();
  const registrado = find(book.source, book.id);

  return (
    <article className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 text-clay-300">
          <Icon name="headphones" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-50">{book.title}</h3>
          <p className="mt-0.5 truncate text-xs text-zinc-400">{book.author}</p>
          {book.duration && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
              <Icon name="clock" size={11} /> {book.duration}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <a
          href={book.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
        >
          <Icon name="play" size={11} /> Ouvir
        </a>
        {book.feedUrl && (
          <a
            href={book.feedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            <Icon name="external" size={11} /> Feed MP3
          </a>
        )}
        <button
          onClick={() =>
            add({
              title: book.title,
              author: book.author,
              kind: 'audiolivro',
              status: 'quero-ler',
              source: book.source,
              externalId: book.id,
              url: book.url,
              coverUrl: book.cover,
            })
          }
          disabled={Boolean(registrado)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
            registrado
              ? 'cursor-default bg-emerald-950/50 text-emerald-400'
              : 'bg-zinc-800 text-zinc-100 hover:bg-emerald-500 hover:text-zinc-950'
          }`}
        >
          <Icon name={registrado ? 'check' : 'plus'} size={12} />
          {registrado ? 'Na estante' : 'Quero ouvir'}
        </button>
      </div>
    </article>
  );
}

/**
 * Estante de obras liberadas gratuitamente: alterna entre a seleção da
 * semana e a do mês. As duas são determinísticas — mudam sozinhas na virada
 * do período, sem ninguém precisar publicar nada.
 */
export default function FreeShelf() {
  const [periodo, setPeriodo] = useState<Period>('semana');
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [erro, setErro] = useState('');

  const load = useCallback(async (p: Period) => {
    setState('loading');
    setErro('');
    try {
      const res = await fetch(`/api/livros?periodo=${p}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setShelf(json);
      setState('ok');
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar a estante.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(periodo);
  }, [periodo, load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['semana', 'mes'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                periodo === p
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-zinc-50'
              }`}
            >
              {p === 'semana' ? 'Da semana' : 'Do mês'}
            </button>
          ))}
        </div>
        {shelf && (
          <p className="text-xs text-zinc-500">
            {shelf.rotulo} · {faltam(shelf.proximaTroca)}
          </p>
        )}
      </div>

      {state === 'loading' && <p className="text-sm text-zinc-400">Abrindo a estante…</p>}

      {state === 'error' && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/25 p-5 text-sm text-red-200">
          <p className="font-semibold">Não foi possível carregar a estante.</p>
          <p className="mt-1 text-xs">{erro}</p>
          <button onClick={() => load(periodo)} className="mt-3 rounded-xl border border-red-800 px-3 py-1.5 text-xs">
            Tentar de novo
          </button>
        </div>
      )}

      {state === 'ok' && shelf && (
        <>
          {shelf.avisos.length > 0 && (
            <div className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-4 text-xs text-clay-200">
              {shelf.avisos.map((a) => (
                <p key={a} className="flex items-start gap-2">
                  <Icon name="alert" size={13} className="mt-0.5 shrink-0" /> {a}
                </p>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Icon name="book" size={15} className="text-emerald-400" />
              Livros liberados ({shelf.livros.length})
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shelf.livros.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Icon name="headphones" size={15} className="text-clay-300" />
              Audiolivros ({shelf.audiolivros.length})
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shelf.audiolivros.map((b) => (
                <AudioCard key={b.id} book={b} />
              ))}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-500">
            Todas as obras estão em domínio público ou foram liberadas pelos próprios acervos — Projeto Gutenberg,
            LibriVox e Domínio Público. O download e a escuta são gratuitos e legais.
          </p>
        </>
      )}
    </div>
  );
}
