import React from 'react';
import Link from 'next/link';
import { getTopic, type EventItem } from '@/lib/data';
import { formatDistance } from '@/lib/geo';
import { relativeLabel } from '@/lib/datetime';

interface Props {
  event: EventItem;
  /** Distância (km) até o usuário, quando disponível. */
  distanceKm?: number | null;
}

export default function EventCard({ event, distanceKm }: Props) {
  const topic = getTopic(event.topic);

  return (
    <Link
      href={`/evento/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700 sm:flex-row"
    >
      <img src={event.imageUrl} alt={event.title} className="h-48 w-full object-cover sm:w-48" />
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className={`rounded border px-2 py-0.5 font-mono text-xs ${topic?.accent.text ?? 'text-emerald-400'} ${topic?.accent.border ?? 'border-emerald-800/40'} ${topic?.accent.bg ?? 'bg-emerald-950/50'}`}
            >
              {event.date}
            </span>
            <span className="text-xs text-zinc-500">
              {event.startsAt ? relativeLabel(event.startsAt, event.endsAt) : (topic?.label ?? event.topic)}
            </span>
          </div>
          <h3 className="text-base font-semibold leading-snug text-white transition group-hover:text-emerald-400">
            {event.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            📍 {event.venue} — {event.city}
            {typeof distanceKm === 'number' && (
              <span className="ml-1 font-medium text-emerald-400">• a {formatDistance(distanceKm)}</span>
            )}
          </p>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{event.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{event.price}</span>
          <span className="text-xs font-medium text-emerald-400 transition group-hover:text-emerald-300">
            Ver detalhes do evento →
          </span>
        </div>
      </div>
    </Link>
  );
}
