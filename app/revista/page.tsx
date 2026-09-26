import React from 'react';
import Navbar from '@/components/Navbar';
import RevistaHub from '@/components/revista/RevistaHub';

export const metadata = {
  title: 'Revista nexo — cultura e novidade de cada tema',
  description:
    'Dossiês, perfis, linhas do tempo e curiosidades de moda, música, cinema, esporte e outros temas — de fontes reais e abertas, com imagens creditadas e vídeos.',
};

export default function RevistaPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="w-full space-y-12 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        <header className="texture-grain relative overflow-hidden rounded-4xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-soft md:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-clay-500/15 blur-3xl motion-safe:animate-deriva" />
          <p className="rotulo-hud relative">Edição de hoje</p>
          <h1 className="relative mt-3 font-display text-6xl font-extrabold leading-[0.9] tracking-tight text-zinc-50 md:text-7xl">
            Revista <span className="texto-degrade">nexo</span>
          </h1>
          <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
            Dossiês, perfis, linhas do tempo e curiosidades de cada tema, no formato da casa. O texto vem da Wikipédia, as imagens do
            Wikimedia Commons e os vídeos dos canais oficiais — tudo aberto, gratuito e com as fontes no fim de cada matéria. A pauta
            muda todo dia.
          </p>
        </header>
        <RevistaHub />
      </main>
    </div>
  );
}
