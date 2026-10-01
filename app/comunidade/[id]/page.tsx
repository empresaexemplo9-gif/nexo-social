import React from 'react';
import Navbar from '@/components/Navbar';
import GrupoView from '@/components/comunidade/GrupoView';

export const metadata = {
  title: 'Grupo — Comunidade nexo.social',
};

export default function GrupoPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" data-aba="grupos" data-quadro="metro">
        <GrupoView id={params.id} />
      </main>
    </div>
  );
}
