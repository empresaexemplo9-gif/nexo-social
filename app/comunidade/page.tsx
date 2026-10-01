import React from 'react';
import Navbar from '@/components/Navbar';
import ComunidadeHub from '@/components/comunidade/ComunidadeHub';

export const metadata = {
  title: 'Comunidade — nexo.social',
  description: 'Conversas, opiniões, resenhas e experiências; grupos para compartilhar fotos, livros, músicas e filmes e ouvir e assistir juntos.',
};

export default function ComunidadePage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Comunidade</h1>
          <p className="mt-1.5 text-sm text-zinc-300">
            Puxe conversa, peça e dê opiniões, conte experiências e resenhe filmes, livros, shows, jogos e esportes — você escolhe se
            todos veem, só seus contatos ou um grupo. E crie grupos para compartilhar fotos e ouvir e assistir junto, no mesmo segundo.
          </p>
        </div>
        <ComunidadeHub />
      </main>
    </div>
  );
}
