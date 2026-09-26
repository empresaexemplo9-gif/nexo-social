import React from 'react';
import Navbar from '@/components/Navbar';
import ComunidadeHub from '@/components/comunidade/ComunidadeHub';

export const metadata = {
  title: 'Comunidade — nexo.social',
  description: 'Grupos para compartilhar fotos, livros, músicas e filmes, montar álbuns e ouvir e assistir juntos.',
};

export default function ComunidadePage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Comunidade</h1>
          <p className="mt-1.5 text-sm text-zinc-300">
            Crie quantos grupos quiser, convide amigos, compartilhe fotos, livros, músicas, clipes e filmes, monte álbuns — e ouça e
            assista junto, no mesmo segundo.
          </p>
        </div>
        <ComunidadeHub />
      </main>
    </div>
  );
}
