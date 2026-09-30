import { NextResponse } from 'next/server';
import { noticiasDoTema } from '@/lib/noticias';
import { TOPICS, type CategorySlug } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** GET /api/noticias?tema=moda — as notícias ao vivo do tema, dos feeds dos veículos. */
export async function GET(request: Request) {
  const tema = (new URL(request.url).searchParams.get('tema') || '').trim();
  if (!TOPICS.some((t) => t.slug === tema)) return NextResponse.json({ error: 'Tema inválido.' }, { status: 400 });
  try {
    const r = await noticiasDoTema(tema as CategorySlug);
    return NextResponse.json(r, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar as notícias agora.' }, { status: 503 });
  }
}
