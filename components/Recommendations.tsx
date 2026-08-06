'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import ContentCard from './ContentCard';
import { usePreferences } from '@/lib/preferences';
import { useGeolocation } from '@/lib/useGeolocation';
import { buildFeed, nearestCityName, type ScoredEvent } from '@/lib/recommendations';
import { citiesWithin, cityCoords, getTopic, type ContentItem, type EventItem } from '@/lib/data';
import { formatDistance } from '@/lib/geo';
import { relativeLabel } from '@/lib/datetime';
import { cityTicketSearch, eventPlatformLinks, KIND_LABEL, type PlatformLink } from '@/lib/platforms';

interface Props {
  events: EventItem[];
  contents: ContentItem[];
}

function PlatformChips({ links, max = 4 }: { links: PlatformLink[]; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.slice(0, max).map((l) => (
        <a
          key={l.label + l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-clay-500 hover:text-clay-300"
          title={`${KIND_LABEL[l.kind]} — ${l.label}`}
        >
          {l.icon} {l.label}
        </a>
      ))}
    </div>
  );
}

function RecCard({ rec }: { rec: ScoredEvent }) {
  const { event, distanceKm, reasons } = rec;
  const topic = getTopic(event.topic);
  const links = eventPlatformLinks(event);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700">
      <Link href={`/evento/${event.id}`} className="group block">
        <div className="relative h-36 overflow-hidden">
          <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          {event.startsAt && (
            <span className="absolute left-3 top-3 rounded-lg border border-clay-700/60 bg-zinc-950/85 px-2 py-0.5 text-[11px] font-semibold text-clay-300 backdrop-blur">
              {relativeLabel(event.startsAt, event.endsAt)}
            </span>
          )}
          <span className={`absolute right-3 top-3 rounded-lg border bg-zinc-950/85 px-2 py-0.5 text-[11px] backdrop-blur ${topic?.accent.text} ${topic?.accent.border}`}>
            {topic?.icon} {topic?.label}
          </span>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold leading-snug text-zinc-50 group-hover:text-emerald-400">{event.title}</h3>
          <p className="mt-1 text-[11px] text-zinc-400">
            📍 {event.venue} — {event.city}
            {typeof distanceKm === 'number' && <span className="ml-1 text-emerald-400">• {formatDistance(distanceKm)}</span>}
          </p>
          {reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {reasons.map((r) => (
                <span key={r} className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className="mt-auto border-t border-zinc-800/80 px-4 py-3">
        <PlatformChips links={links} />
      </div>
    </article>
  );
}

export default function Recommendations({ events, contents }: Props) {
  const { prefs, ready, hasCompleted } = usePreferences();
  const { coords, state, request } = useGeolocation();

  const origin = coords ?? cityCoords(prefs.city);
  const radiusKm = prefs.radiusKm || 50;

  const feed = useMemo(
    () => buildFeed({ interests: prefs.interests, origin, radiusKm, events, contents }),
    [prefs.interests, origin, radiusKm, events, contents],
  );

  const nearbyCities = useMemo(() => citiesWithin(origin, radiusKm * 4).slice(0, 8), [origin, radiusKm]);
  const localName = origin ? nearestCityName(origin) : null;

  if (!ready) return null;

  return (
    <section className="space-y-10">
      {/* Cabeçalho + estado da localização */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">Indicações para você</h2>
          <p className="mt-1 text-sm text-zinc-300">
            {prefs.interests.length
              ? `Seleção automática com base em ${prefs.interests.map((s) => getTopic(s)?.label).join(', ')}`
              : 'Seleção automática — responda ao questionário para afinar ainda mais'}
            {localName && <> • perto de <span className="text-emerald-400">{localName}</span></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state !== 'granted' ? (
            <button
              onClick={request}
              disabled={state === 'loading'}
              className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-950/70 disabled:opacity-60"
            >
              {state === 'loading' ? 'Localizando…' : '📍 Usar minha localização'}
            </button>
          ) : (
            <span className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-400">
              ✓ Localização ativa
            </span>
          )}
          {!hasCompleted && (
            <Link href="/questionario" className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400">
              Escolher meus temas
            </Link>
          )}
        </div>
      </div>

      {state === 'denied' && (
        <p className="text-xs text-clay-300">
          Sem acesso à localização — usando {prefs.city ? `${prefs.city} (do seu perfil)` : 'uma seleção nacional'}. Você pode definir a cidade no{' '}
          <Link href="/questionario" className="underline">questionário</Link>.
        </p>
      )}

      {/* Destaques */}
      {feed.destaques.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feed.destaques.map((rec) => (
            <RecCard key={rec.event.id} rec={rec} />
          ))}
        </div>
      )}

      {/* Seções automáticas */}
      {feed.sections.map((section) => (
        <div key={section.id} className="space-y-4">
          <div className="flex items-baseline justify-between gap-4 border-t border-zinc-800/80 pt-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-50">{section.title}</h3>
              <p className="text-xs text-zinc-400">{section.subtitle}</p>
            </div>
            <span className="text-xs text-zinc-500">{section.events.length} evento(s)</span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {section.events.slice(0, 6).map((rec) => (
              <RecCard key={section.id + rec.event.id} rec={rec} />
            ))}
          </div>
        </div>
      ))}

      {/* Cidades próximas */}
      {nearbyCities.length > 0 && (
        <div className="space-y-3 border-t border-zinc-800/80 pt-6">
          <h3 className="text-lg font-semibold text-zinc-50">Cidades próximas de você</h3>
          <p className="text-xs text-zinc-400">Busque também o que está rolando na vizinhança</p>
          <div className="flex flex-wrap gap-2">
            {nearbyCities.map((c) => (
              <a
                key={c.name}
                href={cityTicketSearch(c.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
              >
                {c.name} <span className="text-zinc-500">• {formatDistance(c.distanceKm)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdos indicados */}
      {feed.contents.length > 0 && (
        <div className="space-y-4 border-t border-zinc-800/80 pt-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-50">Para ler sobre os seus temas</h3>
            <p className="text-xs text-zinc-400">Selecionado automaticamente pelo seu perfil</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {feed.contents.slice(0, 4).map((rec) => (
              <ContentCard key={rec.content.id} item={rec.content} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
