import React, { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MateriaAtualView from '@/components/revista/MateriaAtualView';
import { edicaoAtual, materiaAtual } from '@/lib/revista';
import { pautaPorSlug } from '@/lib/historicas-pauta';
import { getTopic, type CategorySlug } from '@/lib/data';

export const revalidate = 3600;
export const maxDuration = 60;

export async function generateStaticParams() {
  return [];
}

type Params = { params: { tema: string; id: string } };

/** O endereço de uma matéria é o identificador da notícia principal (letras e números). */
const ID = /^[0-9a-z]{4,16}$/;

// `cache` junta a chamada do generateMetadata e a da página num pedido só.
const materia = cache(async (tema: string, id: string) => {
  if (!getTopic(tema) || !ID.test(id)) return null;
  return materiaAtual(tema as CategorySlug, id).catch(() => null);
});

/** Os endereços antigos (/revista/moda/coco-chanel) agora são das Matérias históricas. */
function redirecionarSeHistorica({ tema, id }: Params['params']) {
  if (getTopic(tema) && pautaPorSlug(tema as CategorySlug, id)) permanentRedirect(`/historicas/${tema}/${id}`);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  redirecionarSeHistorica(params);
  const m = await materia(params.tema, params.id);
  if (!m) return { title: 'Matéria não encontrada — nexo.social' };
  const titulo = `${m.titulo} — Revista nexo`;
  const descricao = m.linhaFina ?? m.abertura.slice(0, 160);
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/revista/${m.tema}/${m.id}` },
    openGraph: { type: 'article', title: titulo, description: descricao, images: m.capa ? [{ url: m.capa.url }] : undefined },
    twitter: { card: m.capa ? 'summary_large_image' : 'summary', title: titulo, description: descricao },
  };
}

export default async function MateriaAtualPage({ params }: Params) {
  redirecionarSeHistorica(params);
  const m = await materia(params.tema, params.id);
  if (!m) notFound();
  const edicao = await edicaoAtual(m.tema).catch(() => null);
  const mais = edicao ? [edicao.capa, ...edicao.chamadas].filter((c) => c && c.id !== m.id).slice(0, 5) : [];
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        <MateriaAtualView m={m} mais={mais.filter((c): c is NonNullable<typeof c> => Boolean(c))} />
      </main>
    </div>
  );
}
