import React from 'react';
import Navbar from '@/components/Navbar';
import Descobrir from '@/components/descobrir/Descobrir';

export const metadata = {
  title: 'Descobrir — nexo.social',
  description: 'Filmes, livros, audiolivros e tutoriais liberados de graça, tocando dentro da plataforma e filtrados pelos seus gostos.',
};

export default function DescobrirPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        <Descobrir />
      </main>
    </div>
  );
}
