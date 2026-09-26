'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import { SectionHeader } from '../InterestsView';
import GradeGratis, { type AreaGratis } from '../descobrir/GradeGratis';
import RevistaDoTema from '../revista/RevistaDoTema';
import { getTopic, TOPICS, type CategorySlug } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { CHAVES_DE_PARTIDA, chavesDoPerfil } from '@/lib/interesses';
import { BOOK_GENRES, FILM_GENRES } from '@/lib/taxonomy';

interface Short {
  id: string;
  titulo: string;
  canal: string;
  capa: string;
}

/** Widget: uma fileira de Shorts dos seus interesses; toque abre o feed. */
export function ShortsWidget() {
  const { prefs } = usePreferences();
  const chaves = useMemo(() => {
    const c = chavesDoPerfil(prefs);
    return c.length ? c : CHAVES_DE_PARTIDA;
  }, [prefs]);
  const [itens, setItens] = useState<Short[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/shorts?chaves=${encodeURIComponent(chaves.join(','))}&rodada=0`)
      .then((r) => (r.ok ? r.json() : { itens: [] }))
      .then((j) => vivo && setItens(j.itens ?? []))
      .catch(() => vivo && setItens([]));
    return () => {
      vivo = false;
    };
  }, [chaves]);

  return (
    <section className="space-y-4">
      <SectionHeader
        label="Vídeo curto"
        title="Shorts para você"
        icon="shorts"
        subtitle="Dos seus temas e hobbies — sem sair da plataforma."
        action={
          <Link href="/shorts" className="shrink-0 font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">
            abrir o feed →
          </Link>
        }
      />
      {itens === null ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] w-36 shrink-0 animate-pulse rounded-2xl bg-zinc-800/70 sm:w-40" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">
          Nenhum short por enquanto —{' '}
          <Link href="/shorts" className="font-semibold text-emerald-400">
            tente o feed completo
          </Link>
          .
        </p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          {itens.slice(0, 12).map((s, i) => (
            <Link
              key={s.id}
              href={`/shorts?v=${s.id}`}
              className="group relative aspect-[9/16] w-36 shrink-0 overflow-hidden rounded-2xl bg-black shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-neon sm:w-40"
              style={{ transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.capa} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-110" />
              <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-clay-500 text-zinc-900">
                  <Icon name="play" size={18} />
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 text-left">
                <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">{s.titulo}</span>
                <span className="mt-0.5 block truncate text-[10px] text-white/70">{s.canal}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const MINI_ABAS: { id: AreaGratis; rotulo: string; icone: 'film' | 'book' | 'headphones' }[] = [
  { id: 'filmes', rotulo: 'Filmes', icone: 'film' },
  { id: 'livros', rotulo: 'Livros', icone: 'book' },
  { id: 'audiolivros', rotulo: 'Audiolivros', icone: 'headphones' },
];

/** Widget: o que dá para assistir, ler e ouvir de graça aqui dentro. */
export function GratisWidget() {
  const { prefs } = usePreferences();
  const [aba, setAba] = useState<AreaGratis>('filmes');
  const chave =
    aba === 'filmes'
      ? prefs.filmGenres?.find((g) => FILM_GENRES.some((x) => x.id === g)) ?? 'classicos'
      : prefs.bookGenres?.find((g) => BOOK_GENRES.some((x) => x.id === g)) ?? 'ficcao-lit';

  return (
    <section className="space-y-4">
      <SectionHeader
        label="De graça"
        title="Assistir, ler e ouvir aqui"
        icon="play"
        subtitle="Filmes, livros e audiolivros liberados, dos seus gêneros."
        action={
          <Link href={`/descobrir?aba=${aba}`} className="shrink-0 font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">
            ver tudo →
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2">
        {MINI_ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            aria-pressed={aba === a.id}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              aba === a.id ? 'bg-zinc-50 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-clay-500 hover:text-clay-300'
            }`}
          >
            <Icon name={a.icone} size={13} /> {a.rotulo}
          </button>
        ))}
      </div>
      <GradeGratis
        area={aba}
        chave={chave}
        estilo={prefs.estiloIndicacao ?? 'misturar'}
        idioma={prefs.idiomaIndicacao ?? 'pt'}
        limite={6}
        colunas="grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6"
      />
    </section>
  );
}

/** Widget: a revista do dia, com uma aba por tema seguido. */
export function RevistaWidget() {
  const { prefs } = usePreferences();
  const temas = (prefs.interests.length ? prefs.interests : (['moda', 'musica', 'cultura'] as CategorySlug[])).filter((t) => getTopic(t));
  const [tema, setTema] = useState<CategorySlug>(temas[0] ?? TOPICS[0].slug);
  const atual = temas.includes(tema) ? tema : temas[0] ?? TOPICS[0].slug;
  return (
    <section className="space-y-4">
      <SectionHeader
        label="Revista nexo"
        title="Revista do dia"
        icon="jornal"
        subtitle="Dossiês, perfis e curiosidades dos seus temas — com as fontes no fim."
        action={
          <Link href="/revista" className="shrink-0 font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">
            revista completa →
          </Link>
        }
      />
      {temas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {temas.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTema(t)}
              aria-pressed={atual === t}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                atual === t ? 'bg-zinc-50 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-clay-500 hover:text-clay-300'
              }`}
            >
              {getTopic(t)?.label}
            </button>
          ))}
        </div>
      )}
      <RevistaDoTema key={atual} tema={atual} compacta />
    </section>
  );
}
