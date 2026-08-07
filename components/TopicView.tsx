'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import EventList from '@/components/EventList';
import SportsHub from '@/components/SportsHub';
import { usePreferences } from '@/lib/preferences';
import { getTopic, type CategorySlug, type ContentItem, type EventItem } from '@/lib/data';
import Icon from './icons';

interface Props {
  slug: CategorySlug;
  contents: ContentItem[];
  events: EventItem[];
}

export default function TopicView({ slug, contents, events }: Props) {
  const topic = getTopic(slug);
  const { prefs, save } = usePreferences();

  if (!topic) return null;

  const following = prefs.interests.includes(slug);
  const toggleFollow = () => {
    const next = following ? prefs.interests.filter((s) => s !== slug) : [...prefs.interests, slug];
    save({ interests: next });
  };

  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero do tema */}
        <section className={`texture-grain relative overflow-hidden rounded-3xl border bg-gradient-to-br p-8 md:p-12 ${topic.accent.border} ${topic.accent.gradient}`}>
          <nav className="mb-4 text-xs text-zinc-400">
            <Link href="/" className="hover:text-zinc-100">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#temas" className="hover:text-zinc-100">Temas</Link>
            <span className="mx-2">/</span>
            <span className={topic.accent.text}>{topic.label}</span>
          </nav>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className={topic.accent.text}><Icon name={topic.icon} size={44} /></div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">{topic.label}</h1>
              <p className={`mt-1 text-sm font-medium ${topic.accent.text}`}>{topic.tagline}</p>
              <p className="mt-3 text-base leading-relaxed text-zinc-200">{topic.description}</p>
            </div>
            <button
              onClick={toggleFollow}
              className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                following ? 'border border-zinc-700 text-zinc-100 hover:border-zinc-500' : `${topic.accent.solid} text-zinc-950 hover:opacity-90`
              }`}
            >
              {following ? '✓ Seguindo este tema' : '+ Seguir este tema'}
            </button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {topic.subtopics.map((sub) => (
              <span key={sub} className={`rounded-full border px-3 py-1 text-xs font-medium ${topic.accent.border} ${topic.accent.bg} ${topic.accent.text}`}>
                {sub}
              </span>
            ))}
          </div>
        </section>

        {/* Esporte tem quadro próprio: placar ao vivo, transmissões e replays. */}
        {slug === 'esporte' && (
          <section id="ao-vivo" className="scroll-mt-20 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">Ao vivo, resultados e melhores momentos</h2>
              <p className="text-sm text-zinc-300">
                Futebol, NBA, tênis, vôlei, Fórmula 1, MotoGP e jogos eletrônicos — atualizado o dia todo.
              </p>
            </div>
            <SportsHub />
          </section>
        )}

        {/* Conteúdos */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-zinc-50">Conteúdos sobre {topic.label}</h2>
            <span className="text-xs text-zinc-500">{contents.length} artigos</span>
          </div>
          <div className="space-y-6">
            {contents.map((item) => (
              <article key={item.id} id={item.id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 md:flex">
                <img src={item.imageUrl} alt={item.title} className="h-52 w-full object-cover md:h-auto md:w-64" />
                <div className="flex-1 p-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span className={`rounded-full border px-2 py-0.5 ${topic.accent.border} ${topic.accent.bg} ${topic.accent.text}`}>{item.subtopic || topic.label}</span>
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.readTime}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-zinc-50">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-200">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Agenda do tema */}
        <section id="agenda" className="scroll-mt-20 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-50">Agenda de {topic.label}</h2>
            <p className="text-sm text-zinc-300">Eventos deste tema ordenados por proximidade da sua localização.</p>
          </div>
          <EventList events={events} emptyLabel={`Ainda não há eventos de ${topic.label} cadastrados. Volte em breve!`} />
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-zinc-50">Quer mais assuntos como {topic.label}?</h2>
          <p className="mt-1 text-sm text-zinc-300">Responda ao questionário e receba uma home totalmente personalizada.</p>
          <Link href="/questionario" className="mt-5 inline-block rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">
            Personalizar meus interesses →
          </Link>
        </section>
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">nexo.social — {topic.label}</footer>
    </div>
  );
}
