import React from 'react';
import Navbar from '@/components/Navbar';
import LibraryView from '@/components/LibraryView';

export const metadata = {
  title: 'Livros que li esse ano — nexo.social',
  description: 'Seu registro de leitura, livros liberados de graça e audiolivros em domínio público.',
};

export default function LivrosPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <LibraryView />
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        nexo.social — biblioteca
      </footer>
    </div>
  );
}
