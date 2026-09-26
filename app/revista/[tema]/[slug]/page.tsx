import React, { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import Navbar from '@/components/Navbar';
import MateriaView from '@/components/revista/MateriaView';
import { montarMateria } from '@/lib/revista';
import { pautaPorSlug } from '@/lib/revista-pauta';
import { getTopic, type CategorySlug } from '@/lib/data';

export const revalidate = 86400;

// Nenhuma matéria no build: cada uma é gerada na primeira visita e guardada (ISR).
export async function generateStaticParams() {
  return [];
}

// Só assuntos da pauta viram matéria — nada de texto de origem desconhecida.
// `cache` junta a chamada do generateMetadata e a da página num pedido só.
const materia = cache(
  unstable_cache(
    async (tema: CategorySlug, slug: string) => {
      const pauta = pautaPorSlug(tema, slug);
      return pauta ? montarMateria(tema, pauta) : null;
    },
    ['revista-materia-v1'],
    { revalidate: 86400 },
  ),
);

type Params = { params: { tema: string; slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!getTopic(params.tema)) return {};
  const m = await materia(params.tema as CategorySlug, params.slug).catch(() => null);
  if (!m) return { title: 'Matéria não encontrada — nexo.social' };
  const titulo = `${m.titulo} — Revista nexo`;
  const descricao = (m.linhaFina ? `${m.linhaFina}. ` : '') + m.abertura.slice(0, 150);
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/revista/${m.tema}/${m.slug}` },
    openGraph: { type: 'article', title: titulo, description: descricao, images: m.capa ? [{ url: m.capa.url }] : undefined },
    twitter: { card: m.capa ? 'summary_large_image' : 'summary', title: titulo, description: descricao },
  };
}

export default async function MateriaPage({ params }: Params) {
  if (!getTopic(params.tema)) notFound();
  const m = await materia(params.tema as CategorySlug, params.slug).catch(() => null);
  if (!m) notFound();
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        <MateriaView m={m} />
      </main>
    </div>
  );
}
