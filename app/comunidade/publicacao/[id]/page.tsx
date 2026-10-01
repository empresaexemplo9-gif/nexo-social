import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PublicacaoView from '@/components/social/PublicacaoView';

export const metadata = { title: 'Publicação — Comunidade nexo.social' };

export default function PublicacaoPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/comunidade" className="font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">← Mural da comunidade</Link>
        <PublicacaoView id={params.id} />
      </main>
    </div>
  );
}
