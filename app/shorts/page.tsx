import React from 'react';
import Navbar from '@/components/Navbar';
import FeedShorts from '@/components/shorts/FeedShorts';

export const metadata = {
  title: 'Shorts — nexo.social',
  description: 'Vídeos curtos do YouTube com os seus temas, hobbies e estilos — um por tela, rolando como nos Shorts.',
};

export default function ShortsPage() {
  return (
    // Sem min-h-screen: o feed mede a própria altura, e a página não deve rolar por fora dele.
    <div className="font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-3 pt-3 sm:px-6 lg:pt-6">
        <FeedShorts />
      </main>
    </div>
  );
}
