import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import RodaView from '@/components/social/RodaView';

export const metadata = { title: 'Roda de conversa — Comunidade nexo.social' };

export default function RodaPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8" data-aba="rodas" data-quadro="grafite">
        <Link href="/comunidade?aba=rodas" className="font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">← Rodas de conversa</Link>
        <RodaView id={params.id} />
      </main>
    </div>
  );
}
