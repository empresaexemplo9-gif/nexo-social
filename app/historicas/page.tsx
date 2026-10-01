import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import HubDeTemas from '@/components/revista/HubDeTemas';

export const metadata = {
  title: 'Matérias históricas e curiosidades — nexo',
  description:
    'Dossiês, perfis, linhas do tempo e curiosidades de moda, música, cinema, esporte e outros temas — com imagens da época, de fontes abertas e creditadas.',
};

export default function HistoricasPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="w-full space-y-12 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        <header className="texture-grain relative overflow-hidden rounded-4xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-soft md:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-clay-500/15 blur-3xl motion-safe:animate-deriva" />
          <p className="rotulo-hud relative">Acervo nexo</p>
          <h1 className="relative mt-3 font-display text-5xl font-extrabold leading-[0.9] tracking-tight text-zinc-50 md:text-7xl">
            Matérias históricas <span className="texto-degrade">e curiosidades</span>
          </h1>
          <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
            O que já tem história: dossiês, perfis, linhas do tempo e curiosidades de cada tema, com as imagens da época. O texto vem da
            Wikipédia e as imagens do Wikimedia Commons — tudo aberto, gratuito e com as fontes no fim de cada matéria. A capa muda todo
            dia, e o acervo inteiro fica no fim de cada tema.
          </p>
          <Link
            href="/revista"
            className="relative mt-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400"
          >
            O que é notícia agora está na Revista →
          </Link>
        </header>
        <HubDeTemas tipo="historicas" />
      </main>
    </div>
  );
}
