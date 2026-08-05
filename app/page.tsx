import React from 'react';
import HomeView from '@/components/HomeView';
import { fetchContents, fetchEvents } from '@/lib/repo';

// Revalida a cada 5 min quando há backend; em modo demonstração serve o seed.
export const revalidate = 300;

export default async function Home() {
  const [contents, events] = await Promise.all([fetchContents(), fetchEvents()]);
  return <HomeView contents={contents} events={events} />;
}
