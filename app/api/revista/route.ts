import { NextResponse } from 'next/server';
import { edicaoAtual } from '@/lib/revista';
import { getTopic, type CategorySlug } from '@/lib/data';

export const dynamic = 'force-dynamic';
// A primeira montagem do dia busca as fotos nas páginas dos veículos e o
// contexto na Wikipédia; depois sai do cache.
export const maxDuration = 60;

/** GET /api/revista?tema=moda — a edição atual da Revista do tema. */
export async function GET(request: Request) {
  const tema = (new URL(request.url).searchParams.get('tema') || '').trim();
  if (!getTopic(tema)) return NextResponse.json({ error: 'Tema inválido.' }, { status: 400 });
  try {
    const r = await edicaoAtual(tema as CategorySlug);
    return NextResponse.json(r, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ error: 'A Revista deste tema não pôde ser montada agora.' }, { status: 503 });
  }
}
