'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EventList from '@/components/EventList';
import { usePreferences } from '@/lib/preferences';
import { contentsByTopic, eventsByTopic, getTopic, type CategorySlug } from '@/lib/data';

export default function TopicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const topic = getTopic(slug);
  const { prefs, save } = usePreferences();

  if (!topic) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-white">Tema não encontrado</h1>
          <p className="mt-2 text-sm text-zinc-400">O assunto que você procura não existe ou foi movido.</p>
          <Link href="/#temas" className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950">
            Ver todos os temas
          </Link>
        </div>
      </div>
    );
  }

  const contents = contentsByTopic(topic.slug);
  const events = eventsByTopic(topic.slug);
  const following = prefs.interests.includes(topic.slug as CategorySlug);

  const toggleFollow = () => {
    const next = following
      ? prefs.interests.filter((s) => s !== topic.slug)
      : [...prefs.interests, topic.slug as CategorySlug];
    save({ interests: next });
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero do tema */}
        <section className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-8 md:p-12 ${topic.accent.border} ${topic.accent.gradient}`}>
          <nav className="mb-4 text-xs text-zinc-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#temas" className="hover:text-white">Temas</Link>
            <span className="mx-2">/</span>
            <span className={topic.accent.text}>{topic.label}</span>
          </nav>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="text-5xl">{topic.icon}</div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">{topic.label}</h1>
              <p className={`mt-1 text-sm font-medium ${topic.accent.text}`}>{topic.tagline}</p>
              <p className="mt-3 text-base leading-relaxed text-zinc-300">{topic.description}</p>
            </div>
            <button
              onClick={toggleFollow}
              className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                following ? 'border border-zinc-700 text-white hover:border-zinc-500' : `${topic.accent.solid} text-zinc-950 hover:opacity-90`
              }`}
            >
              {following ? '✓ Seguindo este tema' : '+ Seguir este tema'}
            </button>
          </div>

          {/* Subtópicos */}
          <div className="mt-8 flex flex-wrap gap-2">
            {topic.subtopics.map((sub) => (
              <span
                key={sub}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${topic.accent.border} ${topic.accent.bg} ${topic.accent.text}`}
              >
                {sub}
              </span>
            ))}
          </div>
        </section>

        {/* Conteúdos aprofundados */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Conteúdos sobre {topic.label}</h2>
            <span className="text-xs text-zinc-500">{contents.length} artigos</span>
          </div>

          <div className="space-y-6">
            {contents.map((item) => (
              <article
                key={item.id}
                id={item.id}
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 md:flex"
              >
                <img src={item.imageUrl} alt={item.title} className="h-52 w-full object-cover md:h-auto md:w-64" />
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className={`rounded-full border px-2 py-0.5 ${topic.accent.border} ${topic.accent.bg} ${topic.accent.text}`}>
                      {item.subtopic}
                    </span>
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.readTime}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Agenda do tema */}
        <section id="agenda" className="scroll-mt-20 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Agenda de {topic.label}</h2>
            <p className="text-sm text-zinc-400">Eventos deste tema ordenados por proximidade da sua localização.</p>
          </div>
          <EventList
            events={events}
            emptyLabel={`Ainda não há eventos de ${topic.label} cadastrados. Volte em breve!`}
          />
        </section>

        {/* CTA */}
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-xl font-bold text-white">Quer mais assuntos como {topic.label}?</h2>
          <p className="mt-1 text-sm text-zinc-400">Responda ao questionário e receba uma home totalmente personalizada.</p>
          <Link
            href="/questionario"
            className="mt-5 inline-block rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Personalizar meus interesses →
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        nexo-social / Agendrap — {topic.label}
      </footer>
    </div>
  );
}
