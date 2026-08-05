'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EventCard from '@/components/EventCard';
import { eventsByTopic, getEvent, getTopic } from '@/lib/data';

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const event = getEvent(id);
  const [confirmed, setConfirmed] = useState(false);

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-white">Evento não encontrado</h1>
          <p className="mt-2 text-sm text-zinc-400">Este evento pode ter sido removido ou já aconteceu.</p>
          <Link href="/#agenda" className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950">
            Ver a agenda
          </Link>
        </div>
      </div>
    );
  }

  const topic = getTopic(event.topic);
  const related = eventsByTopic(event.topic).filter((e) => e.id !== event.id);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${event.coords.lat},${event.coords.lng}`;

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Navbar />

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <nav className="mb-4 text-xs text-zinc-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#agenda" className="hover:text-white">Agenda</Link>
            <span className="mx-2">/</span>
            <Link href={`/tema/${event.topic}`} className="hover:text-white">{topic?.label}</Link>
          </nav>

          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
            <img src={event.imageUrl} alt={event.title} className="h-64 w-full object-cover md:h-80" />
            <div className="space-y-5 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-lg border px-3 py-1 font-mono text-sm ${topic?.accent.text} ${topic?.accent.border} ${topic?.accent.bg}`}>
                  {event.date}
                </span>
                <Link href={`/tema/${event.topic}`} className="text-xs text-zinc-400 hover:text-white">
                  {topic?.icon} {topic?.label}
                </Link>
                <span className="text-xs text-zinc-500">{event.price}</span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white">{event.title}</h1>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Local</p>
                  <p className="mt-1 text-sm font-medium text-white">{event.venue}</p>
                  <p className="text-sm text-zinc-400">{event.city}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Quando</p>
                  <p className="mt-1 text-sm font-medium text-white">{event.date}</p>
                  <p className="text-sm text-zinc-400">Entrada: {event.price}</p>
                </div>
              </div>

              <p className="text-base leading-relaxed text-zinc-300">{event.description}</p>

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
                  className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-500 hover:text-emerald-400"
                >
                  🗺️ Ver rota no mapa
                </a>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Outros eventos de {topic?.label}</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {related.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        nexo-social / Agendrap — Agenda
      </footer>
    </div>
  );
}
