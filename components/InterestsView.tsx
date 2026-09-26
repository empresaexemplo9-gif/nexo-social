'use client';

import React from 'react';
import Link from 'next/link';
import Icon, { type IconName } from './icons';
import TopicGrid from './TopicGrid';
import ProfilePlaylist from './ProfilePlaylist';
import { Selo } from './Logo';
import { usePreferences } from '@/lib/preferences';
import { bookPicks, filmPicks, type CulturePick } from '@/lib/culture';
import { HOBBIES, MUSIC_GENRES, genreLabel } from '@/lib/taxonomy';
import { getTopic, type EventItem } from '@/lib/data';

function PickList({ title, icon, picks }: { title: string; icon: 'film' | 'book'; picks: CulturePick[] }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <Icon name={icon} size={17} className="text-clay-400" /> {title}
      </h3>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {picks.map((p) => (
          <li
            key={p.genre}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-clay-500/40 hover:shadow-soft"
          >
            <p className="text-xs font-semibold text-zinc-100">{p.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.links.map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-clay-500 hover:bg-clay-950 hover:text-clay-300"
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

/** Cabeçalho de seção no padrão de painel: rótulo mono, título e apoio. */
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
    <div className="group/titulo flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="rotulo-hud">{label}</p>
        <h2 className="mt-2 flex items-center gap-2.5 text-3xl font-bold text-zinc-50 md:text-[2.1rem]">
          {icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400 transition duration-300 group-hover/titulo:-rotate-6 group-hover/titulo:bg-clay-950 group-hover/titulo:text-clay-400">
              <Icon name={icon} size={19} />
            </span>
          )}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Saudação pela hora do dia, como o "Bom dia" das referências. */
function saudacao(): { texto: string; icone: IconName } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { texto: 'Bom dia', icone: 'sunrise' };
  if (h >= 12 && h < 18) return { texto: 'Boa tarde', icone: 'sparkles' };
  return { texto: 'Boa noite', icone: 'star' };
}

/**
 * Etiqueta solta no mural do topo: flutua devagar e, quando o cursor passa,
 * endireita e levanta — como um papel que a gente pega na mão.
 */
function Etiqueta({
  children,
  giro,
  atraso = 0,
  className = '',
}: {
  children: React.ReactNode;
  giro: number;
  atraso?: number;
  className?: string;
}) {
  return (
    <div className={`absolute motion-safe:animate-flutuar ${className}`} style={{ animationDelay: `${atraso}s` }}>
      <div className="inclinado" style={{ '--giro': `${giro}deg` } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

function Contador({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 shadow-soft">
      <p className="max-w-[9rem] truncate font-display text-3xl font-bold leading-none text-emerald-400">{valor}</p>
      <p className="mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{rotulo}</p>
    </div>
  );
}

/**
 * Topo da home: saudação, o título com traço de caneta, os temas como
 * adesivos, e à direita um mural com o selo girando e etiquetas soltas.
 */
export function HeroDoPerfil({ onMontar, montando }: { onMontar: () => void; montando: boolean }) {
  const { prefs, ready, hasCompleted } = usePreferences();

  if (!ready) {
    return <div className="h-[26rem] animate-pulse rounded-4xl border border-zinc-800 bg-zinc-900/60" aria-busy="true" />;
  }

  const myHobbies = (prefs.hobbies ?? []).map((id) => HOBBIES.find((h) => h.id === id)).filter(Boolean);
  const totalGeneros = (prefs.musicGenres?.length ?? 0) + (prefs.filmGenres?.length ?? 0) + (prefs.bookGenres?.length ?? 0);
  const oi = saudacao();

  return (
    <section className="texture-grain relative overflow-hidden rounded-4xl border border-zinc-800 bg-zinc-900/95 shadow-soft">
      {/* Fundo: a colmeia de antes só à direita, bem leve, e manchas de cor que derivam */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-hexagonos bg-cover bg-right opacity-40 [mask-image:linear-gradient(to_left,black_5%,transparent_65%)]"
      />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-clay-500/15 blur-3xl motion-safe:animate-deriva" />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-[28rem] rounded-full bg-emerald-500/10 blur-3xl motion-safe:animate-deriva"
        style={{ animationDelay: '-11s' }}
      />

      <div className="relative grid gap-8 p-6 md:p-10 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] xl:items-center 2xl:p-12">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-950 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
            {oi.texto} <Icon name={oi.icone} size={14} className="text-clay-500" />
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.92] tracking-tight text-zinc-50 md:text-6xl 2xl:text-7xl">
            Interesses{' '}
            <span className="relative inline-block whitespace-nowrap text-emerald-400">
              e hobbies
              <svg aria-hidden viewBox="0 0 240 16" preserveAspectRatio="none" className="traco-caneta absolute -bottom-2 left-0 h-3 w-full">
                <path d="M3 11 C 55 3, 120 15, 180 7 S 230 6, 237 4" />
              </svg>
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
            {hasCompleted
              ? 'Tudo o que a plataforma usa para escolher o que te mostrar — e você pode ajustar quando quiser.'
              : 'Responda ao questionário para a plataforma indicar música, filmes, livros e eventos com a sua cara.'}
          </p>
          {(prefs.interests.length > 0 || myHobbies.length > 0) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {prefs.interests.map((slug, i) => {
                const t = getTopic(slug);
                if (!t) return null;
                return (
                  <span
                    key={slug}
                    className={`adesivo inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${t.accent.border} ${t.accent.bg} ${t.accent.text}`}
                    style={{ '--giro': `${i % 2 ? 1.5 : -1.5}deg` } as React.CSSProperties}
                  >
                    <Icon name={t.icon} size={13} /> {t.label}
                  </span>
                );
              })}
              {myHobbies.map((h, i) => (
                <span
                  key={h!.id}
                  className="adesivo inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300"
                  style={{ '--giro': `${i % 2 ? -1.5 : 1.5}deg` } as React.CSSProperties}
                >
                  <Icon name={h!.icon} size={13} /> {h!.label}
                </span>
              ))}
            </div>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/questionario"
              className="group inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              {hasCompleted ? 'Ajustar perfil' : 'Responder questionário'}
              <Icon name="arrowRight" size={15} className="transition group-hover:translate-x-1" />
            </Link>
            <button
              type="button"
              onClick={onMontar}
              aria-pressed={montando}
              className={`group inline-flex w-fit items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                montando
                  ? 'border-clay-500 bg-clay-950 text-clay-300'
                  : 'border-zinc-700 bg-zinc-900/80 text-zinc-100 hover:border-clay-500 hover:text-clay-300'
              }`}
            >
              <Icon name="palette" size={16} className="transition duration-500 group-hover:rotate-45" />
              {montando ? 'Montando a home…' : 'Montar minha home'}
            </button>
          </div>
        </div>

        {/* Mural: o selo girando no meio e as etiquetas soltas em volta */}
        <div className="relative mx-auto h-[21rem] w-full max-w-[30rem] sm:h-[23rem]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_18px_30px_rgba(22,24,29,0.18)]">
            <Selo size={232} girar textura />
          </div>

          <Etiqueta giro={-7} atraso={0} className="left-0 top-2">
            <div className="fita relative rounded-md bg-[#fff8dc] px-4 pb-2 pt-3 shadow-soft">
              <p className="font-mao text-2xl leading-none text-zinc-100">no seu ritmo</p>
              <svg aria-hidden viewBox="0 0 90 8" className="mt-1 h-2 w-20 text-clay-500">
                <path d="M2 5 C 25 1, 55 8, 88 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </Etiqueta>

          <Etiqueta giro={6} atraso={-2} className="right-0 top-6">
            <p className="rounded-md bg-emerald-400 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-950 shadow-glow">
              cultura • novidade
            </p>
          </Etiqueta>

          <Etiqueta giro={4} atraso={-1} className="left-0 top-[40%] hidden sm:block">
            <Contador valor={totalGeneros} rotulo="Gêneros" />
          </Etiqueta>
          <Etiqueta giro={-4} atraso={-3.5} className="bottom-1 left-3">
            <Contador valor={prefs.interests.length} rotulo="Temas" />
          </Etiqueta>
          <Etiqueta giro={-3} atraso={-2.5} className="right-0 top-[36%]">
            <Contador valor={myHobbies.length} rotulo="Hobbies" />
          </Etiqueta>
          <Etiqueta giro={5} atraso={-4.5} className="bottom-0 right-2">
            <Contador valor={prefs.city ?? '—'} rotulo={prefs.city ? `Raio ${prefs.radiusKm} km` : 'Região'} />
          </Etiqueta>

          {/* Asterisco laranja girando, o "carimbo" de destaque */}
          <span
            aria-hidden
            className="absolute bottom-3 left-[44%] flex h-10 w-10 items-center justify-center rounded-full bg-clay-500 font-display text-3xl font-black leading-none text-zinc-900 shadow-warm motion-safe:animate-girar-lento"
            style={{ animationDuration: "14s" }}
          >
            *
          </span>
        </div>
      </div>
    </section>
  );
}

/** Widget: trilha do Spotify. */
export function TrilhaWidget() {
  const { prefs } = usePreferences();
  return (
    <section id="trilha" className="space-y-4">
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
  );
}

/** Widget: filmes e livros, com os atalhos das áreas próprias. */
export function AssistirLerWidget() {
  const { prefs } = usePreferences();
  const films = filmPicks(prefs.filmGenres ?? []);
  const books = bookPicks(prefs.bookGenres ?? []);
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <SectionHeader label="Tela & papel" title="Para assistir e ler" icon="film" subtitle="Baseado nos gêneros que você escolheu." />
        <PickList title="Filmes e séries" icon="film" picks={films} />
        <PickList title="Livros" icon="book" picks={books} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Link key={card.href} href={card.href} className="card-soft group relative flex items-start gap-3 overflow-hidden p-5">
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-circuito bg-cover opacity-0 transition duration-500 group-hover:opacity-25" />
            <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400 transition duration-300 group-hover:-rotate-6 group-hover:bg-clay-500 group-hover:text-zinc-900">
              <Icon name={card.icon} size={20} />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-display text-xl font-bold text-zinc-50 group-hover:text-emerald-400">
                {card.title}
                <Icon name="arrowRight" size={15} className="-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-zinc-400">{card.text}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

/** Widget: nichos com as indicações dentro. */
export function NichosWidget({ events }: { events: EventItem[] }) {
  return (
    <section id="nichos" className="scroll-mt-20 space-y-4">
      <SectionHeader label="Radar" title="Seus nichos" icon="compass" subtitle="Toque em um tema para ver as indicações dele." />
      <TopicGrid events={events} />
    </section>
  );
}
