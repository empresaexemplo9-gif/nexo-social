import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import TopicView from '@/components/TopicView';
import { getTopic, TOPICS, type CategorySlug } from '@/lib/data';
import { fetchContents, fetchEvents } from '@/lib/repo';

export const revalidate = 300;

// Pré-gera as páginas dos temas conhecidos.
export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export default async function TopicPage({ params }: { params: { slug: string } }) {
  const topic = getTopic(params.slug);
  if (!topic) {
    // Tema inexistente — mensagem amigável.
    return (
      <div className="min-h-screen bg-grain text-zinc-100">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold text-zinc-50">Tema não encontrado</h1>
          <p className="mt-2 text-sm text-zinc-300">O assunto que você procura não existe ou foi movido.</p>
          <Link href="/#temas" className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950">
            Ver todos os temas
          </Link>
        </div>
      </div>
    );
  }

  const slug = topic.slug as CategorySlug;
  const [contents, events] = await Promise.all([fetchContents(slug), fetchEvents(slug)]);
  return <TopicView slug={slug} contents={contents} events={events} />;
}
