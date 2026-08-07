import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import SportsHub from '@/components/SportsHub';
import Icon from '@/components/icons';

export const metadata = {
  title: 'Esporte ao vivo, resultados e melhores momentos — nexo.social',
  description:
    'Partidas, placares ao vivo, agenda e replays de futebol, NBA, tênis, vôlei, Fórmula 1, MotoGP e esports — com as transmissões gratuitas de cada modalidade.',
};

export default function EsportePage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="card-soft texture-grain relative overflow-hidden p-7 md:p-9">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-400">
            <Icon name="trophy" size={14} /> Esporte
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-zinc-50 md:text-4xl">
            O dia inteiro de esporte, num lugar só
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Placar ao vivo, agenda, resultados e melhores momentos de futebol, NBA, tênis, vôlei, Fórmula 1, MotoGP e
            jogos eletrônicos — com as transmissões gratuitas oficiais de cada modalidade e um acervo de craques
            históricos que muda todo dia.
          </p>
          <Link
            href="/tema/esporte"
            className="mt-5 inline-flex items-center gap-2 text-sm text-emerald-400 transition hover:text-emerald-300"
          >
            Ver também as matérias e eventos de esporte <Icon name="arrowRight" size={15} />
          </Link>
        </header>

        <SportsHub />
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">nexo.social — esporte</footer>
    </div>
  );
}
