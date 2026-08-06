import React from 'react';
import Navbar from '@/components/Navbar';
import AgendaWorkspace from '@/components/AgendaWorkspace';

export const metadata = {
  title: 'Minha agenda — nexo.social',
  description: 'Compromissos, convites em grupo, recados e contatos.',
};

export default function AgendaPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Minha agenda</h1>
          <p className="mt-1.5 text-sm text-zinc-300">
            Marque compromissos, convide pessoas e acompanhe quem confirmou.
          </p>
        </div>
        <AgendaWorkspace />
      </main>
    </div>
  );
}
