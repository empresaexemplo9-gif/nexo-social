import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import HubDeTemas from '@/components/revista/HubDeTemas';

export const metadata = {
  title: 'Revista nexo — o que é notícia agora em cada tema',
  description:
    'As notícias do momento em moda, música, cinema, esporte e outros temas, dos veículos de referência — com a foto em alta, o contexto, as curiosidades e as fontes.',
};

export default function RevistaPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="w-full space-y-12 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        <header className="texture-grain relative overflow-hidden rounded-4xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-soft md:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-clay-500/15 blur-3xl motion-safe:animate-deriva" />
          <p className="rotulo-hud relative">Edição de agora</p>
          <h1 className="relative mt-3 font-display text-6xl font-extrabold leading-[0.9] tracking-tight text-zinc-50 md:text-7xl">
            Revista <span className="texto-degrade">nexo</span>
          </h1>
          <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
            O que é notícia agora em cada tema, no formato da casa. A pauta vem dos veículos de referência — g1, Folha, Estadão,
            Agência Brasil e as revistas de cada área —, com a foto em alta de cada matéria. A plataforma junta quem está falando do
            assunto, conta por que ele está em pauta e traz o contexto e as curiosidades da Wikipédia. Fontes no fim de cada matéria; a
            edição se renova ao longo do dia.
          </p>
          <Link
            href="/historicas"
            className="relative mt-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400"
          >
            Dossiês, perfis e curiosidades de antes: Matérias históricas →
          </Link>
        </header>
        <HubDeTemas tipo="revista" />
      </main>
    </div>
  );
}
