'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import EventCard from '@/components/EventCard';
import { getTopic, type EventItem } from '@/lib/data';

interface Props {
  event: EventItem;
  related: EventItem[];
}

export default function EventView({ event, related }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const topic = getTopic(event.topic);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${event.coords.lat},${event.coords.lng}`;

  return (
    <div className="min-h-screen bg-grain font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <nav className="mb-4 text-xs text-zinc-400">
            <Link href="/" className="hover:text-zinc-100">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#agenda" className="hover:text-zinc-100">Agenda</Link>
            <span className="mx-2">/</span>
            <Link href={`/tema/${event.topic}`} className="hover:text-zinc-100">{topic?.label}</Link>
          </nav>

          <div className="texture-grain overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
            <img src={event.imageUrl} alt={event.title} className="h-64 w-full object-cover md:h-80" />
            <div className="space-y-5 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-lg border px-3 py-1 font-mono text-sm ${topic?.accent.text} ${topic?.accent.border} ${topic?.accent.bg}`}>
                  {event.date}
                </span>
                <Link href={`/tema/${event.topic}`} className="text-xs text-zinc-400 hover:text-zinc-100">
                  {topic?.icon} {topic?.label}
                </Link>
                <span className="text-xs text-zinc-500">{event.price}</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">{event.title}</h1>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Local</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{event.venue}</p>
                  <p className="text-sm text-zinc-400">{event.city}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Quando</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{event.date}</p>
                  <p className="text-sm text-zinc-400">Entrada: {event.price}</p>
                </div>
              </div>

              <p className="text-base leading-relaxed text-zinc-200">{event.description}</p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setConfirmed((v) => !v)}
                  className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition ${
                    confirmed ? 'border border-emerald-700 text-emerald-400' : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                  }`}
                >
                  {confirmed ? '✓ Presença confirmada' : 'Confirmar presença'}
                </button>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-clay-500 hover:text-clay-300"
                >
                  🗺️ Ver rota no mapa
                </a>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold text-zinc-50">Outros eventos de {topic?.label}</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {related.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">nexo-social / Agendrap — Agenda</footer>
    </div>
  );
}
