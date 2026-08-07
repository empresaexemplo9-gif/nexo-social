'use client';

import React from 'react';
import Link from 'next/link';
import Icon from './icons';
import TopicGrid from './TopicGrid';
import ProfilePlaylist from './ProfilePlaylist';
import { usePreferences } from '@/lib/preferences';
import { bookPicks, filmPicks, type CulturePick } from '@/lib/culture';
import { HOBBIES, MUSIC_GENRES, genreLabel } from '@/lib/taxonomy';
import { getTopic, type EventItem } from '@/lib/data';

function PickList({ title, icon, picks }: { title: string; icon: 'film' | 'book'; picks: CulturePick[] }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <Icon name={icon} size={17} className="text-clay-300" /> {title}
      </h3>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {picks.map((p) => (
          <li key={p.genre} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3.5">
            <p className="text-xs font-semibold text-zinc-100">{p.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.links.map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-clay-500 hover:text-clay-300"
                >
                  {l.label} <Icon name="external" size={11} />
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InterestsView({ events }: { events: EventItem[] }) {
  const { prefs, ready, hasCompleted } = usePreferences();

  // A view é a home: em vez de sumir enquanto lê o perfil do aparelho,
  // mantém o espaço reservado para a página não "pular".
  if (!ready) {
    return (
      <div className="space-y-12" aria-busy="true">
        <div className="h-52 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/40" />
        <div className="h-40 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/30" />
      </div>
    );
  }

  const films = filmPicks(prefs.filmGenres ?? []);
  const books = bookPicks(prefs.bookGenres ?? []);
  const myHobbies = (prefs.hobbies ?? []).map((id) => HOBBIES.find((h) => h.id === id)).filter(Boolean);

  return (
    <div className="space-y-12">
      {/* Resumo do perfil */}
      <section className="card-soft texture-grain relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-400">
              <Icon name="sparkles" size={15} /> Seu perfil
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Interesses e hobbies
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">
              {hasCompleted
                ? 'Tudo o que a plataforma usa para escolher o que te mostrar — e você pode ajustar quando quiser.'
                : 'Responda ao questionário para a plataforma indicar música, filmes, livros e eventos com a sua cara.'}
            </p>
            {(prefs.interests.length > 0 || myHobbies.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {prefs.interests.map((slug) => {
                  const t = getTopic(slug);
                  if (!t) return null;
                  return (
                    <span key={slug} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ${t.accent.bg} ${t.accent.text}`}>
                      <Icon name={t.icon} size={12} /> {t.label}
                    </span>
                  );
                })}
                {myHobbies.map((h) => (
                  <span key={h!.id} className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300">
                    <Icon name={h!.icon} size={12} /> {h!.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/questionario"
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-400"
          >
            {hasCompleted ? 'Ajustar perfil' : 'Responder questionário'} <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </section>

      {/* Trilha do perfil (Spotify) */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-zinc-50">
            <Icon name="headphones" size={21} className="text-emerald-400" /> Sua trilha
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            {prefs.musicGenres?.length
              ? `Montada a partir de ${prefs.musicGenres.map((g) => genreLabel(MUSIC_GENRES, g)).join(', ')}.`
              : 'Escolha seus gêneros no questionário para personalizar.'}
          </p>
        </div>
        <ProfilePlaylist />
      </section>

      {/* Nichos com as indicações dentro */}
      <section id="nichos" className="scroll-mt-20 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">Seus nichos</h2>
          <p className="mt-1 text-sm text-zinc-300">Toque em um tema para ver as indicações dele.</p>
        </div>
        <TopicGrid events={events} />
      </section>

      {/* Filmes e livros */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">Para assistir e ler</h2>
          <p className="mt-1 text-sm text-zinc-300">Baseado nos gêneros que você escolheu.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <PickList title="Filmes e séries" icon="film" picks={films} />
          <PickList title="Livros" icon="book" picks={books} />
        </div>
      </section>

      {/* Áreas próprias */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[
          {
            href: '/livros',
            icon: 'library' as const,
            title: 'Livros que li esse ano',
            text: 'Seu registro de leitura, a estante liberada de graça toda semana e os audiolivros.',
          },
          {
            href: '/esporte',
            icon: 'trophy' as const,
            title: 'Esporte ao vivo',
            text: 'Placar, agenda e melhores momentos de futebol, NBA, tênis, vôlei, F1, MotoGP e esports.',
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-emerald-800/60 hover:bg-zinc-900"
          >
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 text-emerald-400">
              <Icon name={card.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-lg font-semibold text-zinc-50 group-hover:text-emerald-300">
                {card.title} <Icon name="arrowRight" size={15} className="opacity-0 transition group-hover:opacity-100" />
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-zinc-300">{card.text}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
