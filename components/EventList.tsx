'use client';

import React, { useMemo, useState } from 'react';
import EventCard from './EventCard';
import { usePreferences } from '@/lib/preferences';
import { cityCoords, TOPICS, type CategorySlug, type EventItem } from '@/lib/data';
import { haversineKm, type LatLng } from '@/lib/geo';
import Icon from './icons';

type GeoState = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

interface Props {
  events: EventItem[];
  /** Exibe o filtro por tema acima da lista. */
  showFilters?: boolean;
  /** Mensagem quando não há eventos após o filtro. */
  emptyLabel?: string;
}

export default function EventList({ events, showFilters = false, emptyLabel }: Props) {
  const { prefs } = usePreferences();
  const [gps, setGps] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [filter, setFilter] = useState<CategorySlug | 'todos'>('todos');

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('unsupported');
      return;
    }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('granted');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const origin: LatLng | null = gps ?? cityCoords(prefs.city);
  const interests = prefs.interests;

  const decorated = useMemo(() => {
    const base = filter === 'todos' ? events : events.filter((e) => e.topic === filter);

    return base
      .map((event) => ({
        event,
        distanceKm: origin ? haversineKm(origin, event.coords) : null,
        matchesInterest: interests.includes(event.topic),
      }))
      .sort((a, b) => {
        // 1) Perfil do usuário: eventos dos temas de interesse vêm primeiro.
        if (interests.length) {
          if (a.matchesInterest !== b.matchesInterest) return a.matchesInterest ? -1 : 1;
        }
        // 2) Proximidade: mais perto primeiro (quando há origem conhecida).
        if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
        return 0;
      });
  }, [events, filter, origin, interests]);

  const topicsInEvents = TOPICS.filter((t) => events.some((e) => e.topic === t.slug));

  let statusLabel = 'Ordenado por relevância';
  if (gps) statusLabel = 'Ordenado pela sua localização atual';
  else if (origin && prefs.city) statusLabel = `Ordenado por proximidade de ${prefs.city}`;
  else if (interests.length) statusLabel = 'Ordenado pelos seus interesses';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-400">{statusLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          {geoState !== 'granted' && (
            <button
              onClick={requestLocation}
              disabled={geoState === 'loading'}
              className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-950/70 disabled:opacity-60"
            >
              {geoState === 'loading' ? 'Localizando…' : 'Usar minha localização'}
            </button>
          )}
          {geoState === 'granted' && (
            <span className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-400">
              Localização ativa
            </span>
          )}
        </div>
      </div>

      {geoState === 'denied' && (
        <p className="text-xs text-amber-300/80">
          Não foi possível acessar sua localização. Usando a cidade do seu perfil como referência. Você pode ajustar no{' '}
          <a href="/questionario" className="underline">questionário</a>.
        </p>
      )}
      {geoState === 'unsupported' && (
        <p className="text-xs text-amber-300/80">Seu dispositivo não oferece geolocalização. Defina sua cidade no questionário.</p>
      )}

      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('todos')}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              filter === 'todos' ? 'bg-emerald-500 font-semibold text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {topicsInEvents.map((t) => (
            <button
              key={t.slug}
              onClick={() => setFilter(t.slug)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                filter === t.slug ? 'bg-emerald-500 font-semibold text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><Icon name={t.icon} size={14} /> {t.label}</span>
            </button>
          ))}
        </div>
      )}

      {decorated.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
          {emptyLabel ?? 'Nenhum evento encontrado para este filtro.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {decorated.map(({ event, distanceKm }) => (
            <EventCard key={event.id} event={event} distanceKm={distanceKm} />
          ))}
        </div>
      )}
    </div>
  );
}
