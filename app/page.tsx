import React from 'react';
import HomeView from '@/components/HomeView';
import { fetchContents, fetchEvents } from '@/lib/repo';

// Revalida a cada 5 min quando há backend; em modo demonstração serve o seed.
export const revalidate = 300;

export const metadata = {
  title: 'Interesses e hobbies — nexo.social',
  description:
    'Sua trilha no Spotify, seus nichos, indicações de filmes e livros, a agenda dos seus temas e o esporte do dia.',
};

export default async function Home() {
  const [contents, events] = await Promise.all([fetchContents(), fetchEvents()]);
  return <HomeView contents={contents} events={events} />;
}
