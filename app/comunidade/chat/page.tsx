import React from 'react';
import Navbar from '@/components/Navbar';
import ChatContatos from '@/components/comunidade/ChatContatos';

export const metadata = {
  title: 'Chat e contatos — nexo.social',
  description: 'Seus contatos e conversas privadas na Comunidade.',
};

export default function ComunidadeChatPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Chat e contatos</h1>
          <p className="mt-1.5 text-sm text-zinc-300">Seus contatos são privados. Só você vê sua lista e a quantidade total.</p>
        </div>
        <ChatContatos />
      </main>
    </div>
  );
}
