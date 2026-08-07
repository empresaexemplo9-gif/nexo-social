import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MeusIngressos from '@/components/MeusIngressos';

export const metadata: Metadata = {
  title: 'Meus ingressos — nexo.social',
  description: 'Seus ingressos comprados na nexo.social, com o QR Code de entrada.',
};

export default function MeusIngressosPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Meus ingressos</h1>
          <p className="text-sm text-zinc-400">
            Comprados aqui na plataforma. O QR Code funciona offline depois de aberto uma vez.
          </p>
        </header>

        <MeusIngressos />

        <p className="pt-4 text-center text-xs text-zinc-500">
          Organiza um evento?{' '}
          <Link href="/ingressos/checkin" className="text-clay-300 hover:underline">
            Validar ingressos na entrada
          </Link>
        </p>
      </main>
      <div id="espacador-barra" />
    </div>
  );
}
