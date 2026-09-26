'use client';

import React from 'react';
import Link from 'next/link';
import Icon, { type IconName } from './icons';
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
          <li key={p.genre} className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 transition hover:border-clay-500/40">
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

/** Cabeçalho de seção no padrão de painel: rótulo de HUD, título e apoio. */
export function SectionHeader({
  label,
  title,
  subtitle,
  icon,
  action,
}: {
  label: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="rotulo-hud">{label}</p>
        <h2 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold text-zinc-50 md:text-[1.7rem]">
          {icon && <Icon name={icon} size={22} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(31,208,242,0.6)]" />}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-300">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Contador do perfil em forma de mostrador de painel. */
function Stat({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div className="cantos-hud rounded-xl border border-emerald-400/15 bg-zinc-950/60 px-4 py-3 backdrop-blur">
      <p className="font-mono text-2xl font-semibold text-emerald-300 texto-neon">{valor}</p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">{rotulo}</p>
    </div>
  );
}

export default function InterestsView({ events }: { events: EventItem[] }) {
  const { prefs, ready, hasCompleted } = usePreferences();

  // A view é a home: em vez de sumir enquanto lê o perfil do aparelho,
  // mantém o espaço reservado para a página não "pular".
  if (!ready) {
    return (
      <div className="space-y-10" aria-busy="true">
        <div className="h-80 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/40" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="h-96 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/30 xl:col-span-7" />
          <div className="h-96 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/30 xl:col-span-5" />
        </div>
      </div>
    );
  }

  const films = filmPicks(prefs.filmGenres ?? []);
  const books = bookPicks(prefs.bookGenres ?? []);
  const myHobbies = (prefs.hobbies ?? []).map((id) => HOBBIES.find((h) => h.id === id)).filter(Boolean);
  const totalGeneros = (prefs.musicGenres?.length ?? 0) + (prefs.filmGenres?.length ?? 0) + (prefs.bookGenres?.length ?? 0);

  return (
    <div className="space-y-12">
      {/* Resumo do perfil — painel de destaque com a grade hexagonal e o HUD */}
      <section className="card-soft texture-grain cantos-hud relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-hexagonos bg-cover bg-right opacity-90" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 hidden aspect-square h-[150%] -translate-y-1/2 bg-hud bg-contain bg-center bg-no-repeat opacity-70 md:block motion-safe:animate-girar-lento"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-transparent" />

        <div className="relative grid gap-8 p-6 md:p-10 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end 2xl:p-12">
          <div className="max-w-3xl">
            <p className="rotulo-hud">
              <Icon name="sparkles" size={14} /> Seu perfil
            </p>
            <h1 className="mt-3 text-4xl font-bold uppercase tracking-tight text-zinc-50 md:text-5xl 2xl:text-6xl">
              Interesses <span className="texto-degrade">e hobbies</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">
              {hasCompleted
                ? 'Tudo o que a plataforma usa para escolher o que te mostrar — e você pode ajustar quando quiser.'
                : 'Responda ao questionário para a plataforma indicar música, filmes, livros e eventos com a sua cara.'}
            </p>
            {(prefs.interests.length > 0 || myHobbies.length > 0) && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {prefs.interests.map((slug) => {
                  const t = getTopic(slug);
                  if (!t) return null;
                  return (
                    <span
                      key={slug}
                      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium ${t.accent.border} ${t.accent.bg} ${t.accent.text}`}
                    >
                      <Icon name={t.icon} size={12} /> {t.label}
                    </span>
                  );
                })}
                {myHobbies.map((h) => (
                  <span
                    key={h!.id}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-700/70 bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-300"
                  >
                    <Icon name={h!.icon} size={12} /> {h!.label}
                  </span>
                ))}
              </div>
            )}
            <Link
              href="/questionario"
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-300"
            >
              {hasCompleted ? 'Ajustar perfil' : 'Responder questionário'} <Icon name="arrowRight" size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[26rem] xl:grid-cols-2">
            <Stat valor={prefs.interests.length} rotulo="Temas" />
            <Stat valor={myHobbies.length} rotulo="Hobbies" />
            <Stat valor={totalGeneros} rotulo="Gêneros" />
            <Stat valor={prefs.city ?? '—'} rotulo={prefs.city ? `Raio ${prefs.radiusKm} km` : 'Região'} />
          </div>
        </div>
      </section>

      {/* Trilha (Spotify) ao lado de filmes e livros — a largura toda trabalha */}
      <div className="grid grid-cols-1 gap-10 xl:grid-cols-12 xl:gap-8">
        <section id="trilha" className="space-y-4 xl:col-span-7">
          <SectionHeader
            label="Áudio"
            title="Sua trilha"
            icon="headphones"
            subtitle={
              prefs.musicGenres?.length
                ? `Montada a partir de ${prefs.musicGenres.map((g) => genreLabel(MUSIC_GENRES, g)).join(', ')}.`
                : 'Escolha seus gêneros no questionário para personalizar.'
            }
          />
          <ProfilePlaylist />
        </section>

        <div className="space-y-10 xl:col-span-5">
          <section className="space-y-6">
            <SectionHeader label="Tela & papel" title="Para assistir e ler" icon="film" subtitle="Baseado nos gêneros que você escolheu." />
            <PickList title="Filmes e séries" icon="film" picks={films} />
            <PickList title="Livros" icon="book" picks={books} />
          </section>

          {/* Áreas próprias */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
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
                className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-emerald-500/50 hover:shadow-neon"
              >
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-circuito bg-cover opacity-0 transition group-hover:opacity-40" />
                <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-zinc-950/70 text-emerald-300">
                  <Icon name={card.icon} size={20} />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-display text-lg font-semibold text-zinc-50 group-hover:text-emerald-300">
                    {card.title} <Icon name="arrowRight" size={15} className="opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-zinc-300">{card.text}</span>
                </span>
              </Link>
            ))}
          </section>
        </div>
      </div>

      {/* Nichos com as indicações dentro */}
      <section id="nichos" className="scroll-mt-20 space-y-4">
        <SectionHeader label="Radar" title="Seus nichos" icon="compass" subtitle="Toque em um tema para ver as indicações dele." />
        <TopicGrid events={events} />
      </section>
    </div>
  );
}
