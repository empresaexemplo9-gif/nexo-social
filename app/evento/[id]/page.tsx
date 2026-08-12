import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import EventView from '@/components/EventView';
import { fetchEventById, fetchEvents } from '@/lib/repo';
import { getTopic } from '@/lib/data';

export const revalidate = 300;

/**
 * Prévia do link — é o que aparece quando alguém manda o evento no WhatsApp,
 * no Instagram ou no Twitter.
 *
 * A divulgação acontece aqui: mesmo um evento importado de outra bilheteria é
 * compartilhado com a URL, o cartão e o nome da nexo.social. Sem estas tags o
 * link chega cru, sem imagem e sem título, e a divulgação some.
 */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await fetchEventById(params.id);
  if (!event) return { title: 'Evento não encontrado — nexo.social' };

  const tema = getTopic(event.topic)?.label;
  const onde = [event.venue, event.city].filter(Boolean).join(', ');
  const titulo = `${event.title} — nexo.social`;
  const descricao =
    [event.date, onde].filter(Boolean).join(' · ') ||
    (event.description ?? '').slice(0, 160) ||
    `${event.title} na agenda da nexo.social.`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/evento/${event.id}` },
    openGraph: {
      type: 'article',
      siteName: 'nexo.social',
      locale: 'pt_BR',
      url: `/evento/${event.id}`,
      title: titulo,
      description: descricao,
      // A imagem do evento é o que dá corpo ao cartão compartilhado.
      images: event.imageUrl ? [{ url: event.imageUrl, alt: event.title }] : undefined,
    },
    twitter: {
      card: event.imageUrl ? 'summary_large_image' : 'summary',
      title: titulo,
      description: descricao,
      images: event.imageUrl ? [event.imageUrl] : undefined,
    },
    other: tema ? { 'article:section': tema } : undefined,
  };
}

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
