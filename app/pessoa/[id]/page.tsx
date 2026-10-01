import React from 'react';
import Navbar from '@/components/Navbar';
import PerfilView from '@/components/social/PerfilView';

export const metadata = { title: 'Página pessoal — nexo.social' };

export default function PessoaPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PerfilView id={params.id} />
      </main>
    </div>
  );
}
