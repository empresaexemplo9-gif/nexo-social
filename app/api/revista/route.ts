import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { edicaoDoTema } from '@/lib/revista';
import { getTopic, type CategorySlug } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Uma edição por tema por dia, compartilhada por todo mundo.
const edicao = unstable_cache(async (tema: CategorySlug, _dia: string) => edicaoDoTema(tema), ['revista-edicao-v1'], {
  revalidate: 21600,
});

/** GET /api/revista?tema=moda — a edição do dia da revista do tema. */
export async function GET(request: Request) {
  const tema = (new URL(request.url).searchParams.get('tema') || '').trim();
  if (!getTopic(tema)) return NextResponse.json({ error: 'Tema inválido.' }, { status: 400 });
  const dia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const r = await edicao(tema as CategorySlug, dia);
  return NextResponse.json(r, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
