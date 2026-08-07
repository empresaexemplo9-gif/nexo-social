import React, { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import SearchView from '@/components/SearchView';
import Icon from '@/components/icons';

export const metadata = {
  title: 'Buscar — nexo.social',
  description: 'Encontre temas, eventos, craques, marcos históricos, clipes e vídeos.',
};

export default function BuscaPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-zinc-50">
          <span className="text-emerald-400">
            <Icon name="search" size={24} />
          </span>
          Buscar
        </h1>
        {/* useSearchParams exige Suspense na renderização estática. */}
        <Suspense fallback={<p className="text-sm text-zinc-400">Carregando…</p>}>
          <SearchView />
        </Suspense>
      </main>
    </div>
  );
}
