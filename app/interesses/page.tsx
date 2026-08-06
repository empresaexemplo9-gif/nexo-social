import React from 'react';
import Navbar from '@/components/Navbar';
import InterestsView from '@/components/InterestsView';
import { fetchEvents } from '@/lib/repo';

export const revalidate = 300;

export const metadata = {
  title: 'Interesses e hobbies — nexo.social',
  description: 'Sua trilha, seus nichos e indicações de filmes e livros.',
};

export default async function InteressesPage() {
  const events = await fetchEvents();
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <InterestsView events={events} />
      </main>
    </div>
  );
}
