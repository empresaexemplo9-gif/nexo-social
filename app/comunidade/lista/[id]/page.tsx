import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ListaView from '@/components/social/ListaView';

export const metadata = { title: 'Lista — Comunidade nexo.social' };

export default function ListaPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6 lg:px-8" data-aba="listas" data-quadro="holo">
        <Link href="/comunidade?aba=listas" className="font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">← Listas da comunidade</Link>
        <ListaView id={params.id} />
      </main>
    </div>
  );
}
