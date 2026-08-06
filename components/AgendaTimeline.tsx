'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { useAgenda } from '@/lib/agenda';
import { usePreferences } from '@/lib/preferences';
import { useGeolocation } from '@/lib/useGeolocation';
import { cityCoords, getTopic, type EventItem } from '@/lib/data';
import { formatDistance, haversineKm } from '@/lib/geo';
import { daysUntil, isHappeningNow, relativeLabel } from '@/lib/datetime';
import { scoreEvents } from '@/lib/recommendations';

interface Props {
  events: EventItem[];
}

interface Bucket {
  id: string;
  label: string;
  events: (EventItem & { distanceKm: number | null; saved: boolean })[];
}

/** Agrupa por horizonte de tempo: hoje, amanhã, esta semana, depois. */
function bucketize(items: (EventItem & { distanceKm: number | null; saved: boolean })[], now: Date): Bucket[] {
  const groups: Record<string, typeof items> = { hoje: [], amanha: [], semana: [], depois: [] };
  for (const e of items) {
    if (!e.startsAt) {
      groups.depois.push(e);
      continue;
    }
    const d = daysUntil(e.startsAt, now);
    if (isHappeningNow(e.startsAt, e.endsAt, now) || d === 0) groups.hoje.push(e);
    else if (d === 1) groups.amanha.push(e);
    else if (d <= 7) groups.semana.push(e);
    else groups.depois.push(e);
  }
  return [
    { id: 'hoje', label: 'Hoje', events: groups.hoje },
    { id: 'amanha', label: 'Amanhã', events: groups.amanha },
    { id: 'semana', label: 'Esta semana', events: groups.semana },
    { id: 'depois', label: 'Em breve', events: groups.depois },
  ].filter((b) => b.events.length > 0);
}

function AgendaRow({ event, distanceKm, saved }: { event: EventItem; distanceKm: number | null; saved: boolean }) {
  const topic = getTopic(event.topic);
  const { toggle } = useAgenda();
  const now = isHappeningNow(event.startsAt ?? '', event.endsAt);

  return (
    <li className="group relative flex gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
      {/* Marcador do tema */}
      <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${topic?.accent.border} ${topic?.accent.bg} ${topic?.accent.text}`}>
        <Icon name={topic?.icon ?? 'calendar'} size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`inline-flex items-center gap-1 font-medium ${now ? 'text-clay-300' : 'text-emerald-400'}`}>
            <Icon name="clock" size={13} />
            {event.startsAt ? relativeLabel(event.startsAt, event.endsAt) : event.date}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">{event.date}</span>
          {saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-emerald-400">
              <Icon name="check" size={11} /> na sua agenda
            </span>
          )}
        </div>

        <Link href={`/evento/${event.id}`} className="mt-1 block">
          <h4 className="truncate text-sm font-semibold text-zinc-50 transition group-hover:text-emerald-300">{event.title}</h4>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-400">
            <Icon name="mapPin" size={13} className="shrink-0" />
            {event.venue} — {event.city}
            {typeof distanceKm === 'number' && <span className="text-emerald-400">• {formatDistance(distanceKm)}</span>}
          </p>
        </Link>
      </div>

      <button
        onClick={() => toggle(event.id)}
        aria-label={saved ? 'Remover da agenda' : 'Salvar na agenda'}
        title={saved ? 'Remover da agenda' : 'Salvar na agenda'}
        className={`self-start rounded-lg p-2 transition ${
          saved ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-200'
        }`}
      >
        <Icon name={saved ? 'bookmarkFilled' : 'bookmark'} size={18} />
      </button>
    </li>
  );
}

export default function AgendaTimeline({ events }: Props) {
  const { saved, ready } = useAgenda();
  const { prefs } = usePreferences();
  const { coords } = useGeolocation();

  const origin = coords ?? cityCoords(prefs.city);

  const { buckets, savedCount, suggestionCount } = useMemo(() => {
    const now = new Date();
    // Sugestões pontuadas pelo algoritmo (perfil + proximidade + tempo).
    const ranked = scoreEvents({
      interests: prefs.interests,
      origin,
      radiusKm: prefs.radiusKm || 50,
      events,
      contents: [],
      now,
    });

    const savedSet = new Set(saved);
    const decorated = ranked.map((r) => ({
      ...r.event,
      distanceKm: r.distanceKm,
      saved: savedSet.has(r.event.id),
    }));

    // Agenda = o que o usuário salvou primeiro; depois as melhores sugestões.
    const mine = decorated.filter((e) => e.saved);
    const suggestions = decorated.filter((e) => !e.saved).slice(0, 8);
    const merged = [...mine, ...suggestions].sort((a, b) => {
      const ta = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

    return { buckets: bucketize(merged, now), savedCount: mine.length, suggestionCount: suggestions.length };
  }, [events, prefs.interests, prefs.radiusKm, origin, saved]);

  if (!ready) return null;

  const nextEvent = buckets[0]?.events[0];

  return (
    <div className="space-y-6">
      {/* Resumo do dia */}
      <div className="card-soft texture-grain relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-400">
              <Icon name="calendarCheck" size={15} /> Sua agenda
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-zinc-50 md:text-4xl">
              {nextEvent ? (
                <>
                  A seguir: <span className="italic text-clay-300">{nextEvent.title}</span>
                </>
              ) : (
                'Sua agenda está livre'
              )}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">
              {savedCount > 0
                ? `${savedCount} evento(s) salvos e ${suggestionCount} sugestões escolhidas para você.`
                : 'Salve os eventos que te interessam — abaixo já separamos sugestões perto de você.'}
            </p>
          </div>
          <Link
            href="/questionario"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:border-emerald-600 hover:text-emerald-300"
          >
            <Icon name="sparkles" size={15} /> Ajustar meus temas
          </Link>
        </div>
      </div>

      {/* Linha do tempo */}
      {buckets.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
          Nenhum evento por enquanto. Escolha seus temas no questionário para receber sugestões.
        </p>
      ) : (
        <div className="space-y-7">
          {buckets.map((bucket) => (
            <section key={bucket.id}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">{bucket.label}</h3>
                <span className="h-px flex-1 bg-zinc-800" />
                <span className="text-xs text-zinc-500">{bucket.events.length}</span>
              </div>
              <ul className="space-y-3">
                {bucket.events.map((e) => (
                  <AgendaRow key={e.id} event={e} distanceKm={e.distanceKm} saved={e.saved} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
