import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { descreverChave, montarFeed, type Feed } from '@/lib/shorts';

export const dynamic = 'force-dynamic';

/** Feed vazio, ou só dos canais porque a busca falhou, não vai para o cache: a próxima visita tenta de novo. */
class FeedVazio extends Error {
  constructor(readonly feed: Feed) {
    super('Feed vazio');
  }
}

const montar = unstable_cache(
  async (chaves: string[], rodada: number, _dia: string) => {
    const feed = await montarFeed(chaves, rodada);
    if (!feed.itens.length || feed.fonte === 'canais') throw new FeedVazio(feed);
    return feed;
  },
  ['shorts-v2'],
  { revalidate: 43200 },
);

/**
 * GET /api/shorts?chaves=tema:musica,hobby:cozinhar,musica:rock&rodada=0
 * Feed de Shorts dos interesses da pessoa, para tocar no feed vertical.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const chaves = Array.from(
    new Set(
      (p.get('chaves') || '')
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c && descreverChave(c)),
    ),
  )
    .sort()
    .slice(0, 24);
  if (!chaves.length) return NextResponse.json({ error: 'Nenhum interesse válido.' }, { status: 400 });
  const rodada = Math.abs(Number.parseInt(p.get('rodada') || '0', 10) || 0) % 20;
  const feed = await montar(chaves, rodada, new Date().toISOString().slice(0, 10)).catch((e) => {
    if (e instanceof FeedVazio) return e.feed;
    throw e;
  });
  return NextResponse.json(
    { ...feed, rodada, rotulos: Object.fromEntries(chaves.map((c) => [c, descreverChave(c)!.rotulo])) },
    { headers: { 'Cache-Control': feed.itens.length && feed.fonte === 'busca' ? 'public, s-maxage=1800, stale-while-revalidate=43200' : 'no-store' } },
  );
}
