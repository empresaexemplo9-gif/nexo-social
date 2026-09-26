'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon, { type IconName } from '../icons';
import GradeGratis, { type AreaGratis } from './GradeGratis';
import { usePreferences, type EstiloIndicacao, type IdiomaIndicacao } from '@/lib/preferences';
import { BOOK_GENRES, FILM_GENRES, HOBBIES } from '@/lib/taxonomy';

interface Aba {
  id: AreaGratis;
  rotulo: string;
  icone: IconName;
  apoio: string;
}

const ABAS: Aba[] = [
  { id: 'filmes', rotulo: 'Filmes & séries', icone: 'film', apoio: 'Domínio público do Internet Archive e, quando falta, filmes completos do YouTube.' },
  { id: 'livros', rotulo: 'Livros', icone: 'book', apoio: 'Obras livres do Projeto Gutenberg, lidas no leitor da plataforma.' },
  { id: 'audiolivros', rotulo: 'Audiolivros', icone: 'headphones', apoio: 'LibriVox pelo Internet Archive e audiolivros completos do YouTube.' },
  { id: 'hobbies', rotulo: 'Hobbies', icone: 'palette', apoio: 'Tutoriais para praticar o que você gosta de fazer.' },
];

const ESTILOS: { value: EstiloIndicacao; label: string }[] = [
  { value: 'misturar', label: 'Misturar' },
  { value: 'classicos', label: 'Mais vistos' },
  { value: 'descobertas', label: 'Descobertas' },
];

/** Atalhos: tudo o que a plataforma tem, a um toque. */
const ATALHOS: { href: string; rotulo: string; apoio: string; icone: IconName }[] = [
  { href: '/shorts', rotulo: 'Shorts', apoio: 'Vídeos curtos dos seus temas', icone: 'shorts' },
  { href: '/revista', rotulo: 'Revista', apoio: 'Matérias dos seus temas', icone: 'jornal' },
  { href: '/#trilha', rotulo: 'Sua trilha', apoio: 'Música no Spotify', icone: 'headphones' },
  { href: '/esporte', rotulo: 'Esporte ao vivo', apoio: 'Placar e transmissões', icone: 'trophy' },
  { href: '/livros', rotulo: 'Livros que li', apoio: 'Registro e estante liberada', icone: 'library' },
  { href: '/agenda', rotulo: 'Compromissos', apoio: 'Sua agenda de eventos', icone: 'calendarCheck' },
  { href: '/#nichos', rotulo: 'Seus nichos', apoio: 'Indicações por tema', icone: 'compass' },
];

export default function Descobrir() {
  const { prefs, ready, save } = usePreferences();
  const [aba, setAba] = useState<AreaGratis>('filmes');
  const [chave, setChave] = useState<string | null>(null);
  const [todos, setTodos] = useState(false);

  // Abre direto numa aba pelo link (/descobrir?aba=livros).
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get('aba') as AreaGratis | null;
    if (pedida && ABAS.some((a) => a.id === pedida)) setAba(pedida);
  }, []);

  const lista = aba === 'filmes' ? FILM_GENRES : aba === 'hobbies' ? HOBBIES : BOOK_GENRES;
  const meus = useMemo(() => {
    const ids = aba === 'filmes' ? prefs.filmGenres : aba === 'hobbies' ? prefs.hobbies : prefs.bookGenres;
    return (ids ?? []).filter((id) => lista.some((g) => g.id === id));
  }, [aba, lista, prefs.bookGenres, prefs.filmGenres, prefs.hobbies]);
  const outros = lista.filter((g) => !meus.includes(g.id));

  // Gênero ativo: o primeiro dos seus; sem nenhum escolhido, o primeiro da
  // lista. Só depois do perfil carregar — senão abriria no gênero errado e
  // ficaria nele. Uma escolha feita à mão na aba é respeitada.
  const escolhaManual = useRef(false);
  useEffect(() => {
    escolhaManual.current = false;
    setTodos(false);
  }, [aba]);
  useEffect(() => {
    if (!ready) return;
    setChave((c) => (escolhaManual.current && c && lista.some((g) => g.id === c) ? c : meus[0] ?? lista[0].id));
  }, [aba, ready, lista, meus]);

  const estilo = prefs.estiloIndicacao ?? 'misturar';
  const idioma = prefs.idiomaIndicacao ?? 'pt';
  const abaAtual = ABAS.find((a) => a.id === aba)!;

  const chip = (id: string, label: string, meu: boolean) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        escolhaManual.current = true;
        setChave(id);
      }}
      aria-pressed={chave === id}
      className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
        chave === id
          ? 'bg-emerald-400 text-zinc-950 shadow-glow'
          : meu
            ? 'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-emerald-400/50 hover:text-emerald-400'
            : 'border border-dashed border-zinc-700 text-zinc-400 hover:border-clay-500 hover:text-clay-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-10">
      {/* Topo e atalhos */}
      <header className="texture-grain relative overflow-hidden rounded-4xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-soft md:p-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-circuito bg-cover opacity-20 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-clay-500/15 blur-3xl motion-safe:animate-deriva" />
        <div className="relative">
          <p className="rotulo-hud">Assistir, ler e ouvir</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-zinc-50 md:text-6xl">
            Descobrir, <span className="texto-degrade">de graça</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
            Filmes, livros, audiolivros e tutoriais que estão liberados — tocando e abrindo aqui dentro, filtrados pelos seus gostos.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {ATALHOS.map((a) => (
              <Link key={a.href} href={a.href} className="card-soft levanta group flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400 transition duration-300 group-hover:-rotate-6 group-hover:bg-clay-500 group-hover:text-zinc-900">
                  <Icon name={a.icone} size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-50">{a.rotulo}</span>
                  <span className="block truncate text-[11px] text-zinc-500">{a.apoio}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Abas por área */}
      <section className="space-y-5">
        <div role="tablist" aria-label="O que descobrir" className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              type="button"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className={`group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                aba === a.id ? 'bg-zinc-50 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
              }`}
            >
              <Icon name={a.icone} size={16} className="transition group-hover:-rotate-6" /> {a.rotulo}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-2xl text-sm text-zinc-400">{abaAtual.apoio}</p>
          {aba !== 'hobbies' && (
            <div className="flex flex-wrap items-center gap-2">
              {/* O filtro vai para o perfil — é o mesmo do questionário. */}
              <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-1" role="group" aria-label="Estilo das indicações">
                {ESTILOS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    aria-pressed={estilo === e.value}
                    onClick={() => void save({ estiloIndicacao: e.value })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      estilo === e.value ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-50'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void save({ idiomaIndicacao: (idioma === 'pt' ? 'todos' : 'pt') as IdiomaIndicacao })}
                aria-pressed={idioma === 'pt'}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-emerald-400/50"
              >
                {idioma === 'pt' ? 'Português primeiro' : 'Qualquer idioma'}
              </button>
            </div>
          )}
        </div>

        {/* Só os gêneros da pessoa; os outros ficam a um toque, tracejados */}
        <div className="flex flex-wrap items-center gap-2">
          {meus.map((id) => chip(id, lista.find((g) => g.id === id)!.label, true))}
          {meus.length === 0 && (
            <span className="text-xs text-zinc-400">
              Você ainda não escolheu {aba === 'hobbies' ? 'hobbies' : 'gêneros'} aqui —{' '}
              <Link href={`/questionario#q-${aba === 'filmes' ? 'cinema' : aba === 'hobbies' ? 'hobbies' : 'livros'}`} className="font-semibold text-emerald-400 hover:text-clay-400">
                escolher no questionário
              </Link>
              . Enquanto isso:
            </span>
          )}
          {(todos || meus.length === 0) && outros.map((g) => chip(g.id, g.label, false))}
          {meus.length > 0 && outros.length > 0 && (
            <button
              type="button"
              onClick={() => setTodos((t) => !t)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-500 transition hover:text-clay-400"
            >
              <Icon name={todos ? 'close' : 'plus'} size={13} /> {todos ? 'Só os meus' : `Explorar outros (${outros.length})`}
            </button>
          )}
        </div>

        {ready && chave && <GradeGratis area={aba} chave={chave} estilo={estilo} idioma={idioma} />}
      </section>
    </div>
  );
}
