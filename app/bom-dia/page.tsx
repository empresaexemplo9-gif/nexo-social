import React from 'react';
import Navbar from '@/components/Navbar';
import BomDiaView from '@/components/bom-dia/BomDiaView';
import { dayKey } from '@/lib/bom-dia';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Bom Dia — Nexo Social',
  description: 'Receitas, movimento, música e novas ideias para sua rotina, todos os dias.',
};

export default function BomDiaPage({ searchParams }: { searchParams: { rodada?: string } }) {
  const requestedRound = Number(searchParams.rodada);
  const initialRound = Number.isFinite(requestedRound) ? Math.abs(Math.trunc(requestedRound)) % 10000 : 0;
  return <div className="min-h-screen font-sans text-zinc-100 antialiased">
    <Navbar />
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:px-8"><BomDiaView initialDay={dayKey()} initialRound={initialRound} /></main>
    <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-500">nexo.social — Bom Dia</footer>
  </div>;
}
