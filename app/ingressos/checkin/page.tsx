import React from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import CheckinScanner from '@/components/CheckinScanner';

export const metadata: Metadata = {
  title: 'Check-in de ingressos — nexo.social',
  description: 'Validação de ingressos na entrada do evento.',
};

export default function CheckinPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Check-in na entrada</h1>
          <p className="text-sm text-zinc-400">
            Só quem organiza o evento consegue dar baixa. Cada ingresso passa uma vez.
          </p>
        </header>

        <CheckinScanner />
      </main>
      <div id="espacador-barra" />
    </div>
  );
}
