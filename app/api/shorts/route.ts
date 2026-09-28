import { getSession } from '@/lib/api-helpers';
import { preferenciasYoutube } from '@/lib/youtube-conta';
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
  ['shorts-v3'],
  { revalidate: 600 },
);

/**
 * GET /api/shorts?chaves=tema:musica,hobby:cozinhar,musica:rock&rodada=0
 * Feed de Shorts dos interesses da pessoa, para tocar no feed vertical.
 */
export async function GET(request: Request) {
  const { user } = await getSession();
  if (!user || user.is_anonymous) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
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
  if (!chaves.length) chaves.push('tema:musica');
  const rodada = Math.abs(Number.parseInt(p.get('rodada') || '0', 10) || 0) % 10000;
  const personalPromise = p.get('personalizado') === '0' ? Promise.resolve({ conectado: false, videos: [], indisponivel: false }) : preferenciasYoutube(user.id, true, rodada);
  const feed = await montar(chaves, rodada, new Date().toISOString().slice(0, 13)).catch((e) => {
    if (e instanceof FeedVazio) return e.feed;
    return { itens: [], fonte: 'busca' as const, avisos: ['Busca temporariamente indisponível.'] };
  });
  const personal = await personalPromise;
  const merged = [...personal.videos.map(v => ({ id: v.id, titulo: v.title, canal: v.channel, capa: v.thumb || '', de: 'youtube:conta' })), ...feed.itens];
  const itens = merged.filter((v,i) => merged.findIndex(x => x.id === v.id) === i);
  return NextResponse.json(
    { ...feed, itens, owner: user.id, notice: personal.indisponivel ? 'Não foi possível consultar suas inscrições e curtidas. Mostrando seus interesses.' : personal.videos.length ? 'Das suas curtidas e inscrições no YouTube, com novidades dos seus interesses.' : personal.conectado ? 'Sem Shorts novos disponíveis na sua conta. Mostrando seus interesses.' : '', personalizado: personal.videos.length > 0, atualizadoEm: new Date().toISOString(), rodada, rotulos: {...Object.fromEntries(chaves.map((c) => [c, descreverChave(c)!.rotulo])), 'youtube:conta': 'Sua conta do YouTube'} },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
