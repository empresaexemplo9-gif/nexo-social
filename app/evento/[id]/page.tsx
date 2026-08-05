import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import EventView from '@/components/EventView';
import { fetchEventById, fetchEvents } from '@/lib/repo';

export const revalidate = 300;

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await fetchEventById(params.id);

  if (!event) {
    return (
      <div className="min-h-screen bg-grain text-zinc-100">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold text-zinc-50">Evento não encontrado</h1>
          <p className="mt-2 text-sm text-zinc-300">Este evento pode ter sido removido ou já aconteceu.</p>
          <Link href="/#agenda" className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950">
            Ver a agenda
          </Link>
        </div>
      </div>
    );
  }

  const sameTopic = await fetchEvents(event.topic);
  const related = sameTopic.filter((e) => e.id !== event.id).slice(0, 4);

  return <EventView event={event} related={related} />;
}
