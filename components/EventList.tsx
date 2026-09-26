'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  /** Tema da lista: com ele, a lista também busca eventos reais perto da pessoa. */
  topic?: CategorySlug;
}

const POR_PAGINA = 12;

export default function EventList({ events: iniciais, showFilters = false, emptyLabel, topic }: Props) {
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
  const [perto, setPerto] = useState<EventItem[]>([]);
  const [mostrar, setMostrar] = useState(POR_PAGINA);

  // Com tema e origem conhecidos, pede os eventos reais num raio de 200 km —
  // a lista nacional vem por data e pode não ter nada da cidade da pessoa.
  const oLat = origin ? origin.lat.toFixed(2) : null;
  const oLng = origin ? origin.lng.toFixed(2) : null;
  useEffect(() => {
    if (!topic || !oLat || !oLng) return;
    let vivo = true;
    fetch(`/api/events?topic=${topic}&lat=${oLat}&lng=${oLng}&perto=1`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((j) => vivo && setPerto(Array.isArray(j.events) ? j.events : []))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [topic, oLat, oLng]);

  // Junta os de perto com os da página; exemplo sai quando chega evento real.
  const events = useMemo(() => {
    const ids = new Set(iniciais.map((e) => e.id));
    const novos = perto.filter((e) => !ids.has(e.id));
    const todos = [...iniciais, ...novos];
    const temReal = new Set(todos.filter((e) => !e.exemplo).map((e) => e.topic));
    return todos.filter((e) => !e.exemplo || !temReal.has(e.topic));
  }, [iniciais, perto]);

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
              filter === 'todos' ? 'bg-emerald-500 font-semibold text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-50'
            }`}
          >
            Todos
          </button>
          {topicsInEvents.map((t) => (
            <button
              key={t.slug}
              onClick={() => setFilter(t.slug)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                filter === t.slug ? 'bg-emerald-500 font-semibold text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-50'
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
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {decorated.slice(0, mostrar).map(({ event, distanceKm }) => (
              <EventCard key={event.id} event={event} distanceKm={distanceKm} />
            ))}
          </div>
          {decorated.length > mostrar && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setMostrar((n) => n + POR_PAGINA)}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-clay-500 hover:text-clay-400"
              >
                Mostrar mais eventos ({decorated.length - mostrar})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
