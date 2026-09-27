import { preferenciasYoutube } from '@/lib/youtube-conta';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getSession } from '@/lib/api-helpers';
import { MUSIC_GENRES } from '@/lib/taxonomy';
import { searchVideos } from '@/lib/youtube';
import { diaDeHoje } from '@/lib/descoberta-musical';

export const dynamic = 'force-dynamic';
const buscar = unstable_cache(async (query: string, _dia: string) => {
  const videos = await searchVideos(query, 12);
  const unique = videos.filter((v, i) => /^[\w-]{11}$/.test(v.id) && videos.findIndex(x => x.id === v.id) === i);
  if (!unique.length) throw new Error('Nenhum vídeo encontrado.');
  return unique;
}, ['trilha-youtube-v1'], { revalidate: 21600 });

export async function GET(request: Request) {
  const { user } = await getSession();
  if (!user || user.is_anonymous) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const genre = MUSIC_GENRES.find(g => g.id === params.get('genre'));
  if (params.get('genre') && !genre) return NextResponse.json({ error: 'Gênero desconhecido.' }, { status: 400 });
  const n = Number(params.get('rodada'));
  const rodada = Number.isFinite(n) ? Math.abs(Math.trunc(n)) % 5 : 0;
  const mix = params.get('mix');
  const hits = params.get('hits') === '1';
  const estilo = mix === 'lancamentos' ? `lançamentos ${diaDeHoje().slice(0, 4)}`
    : mix === 'famosas' || hits ? 'sucessos músicas' : 'descobertas artistas independentes';
  const variacoes = ['clipe oficial', 'música ao vivo', 'official audio', 'sessão acústica', 'videoclipe'];
  const query = `${genre?.label || ''} ${estilo} ${variacoes[rodada]}`;
  try {
    const [personal, base] = await Promise.all([preferenciasYoutube(user.id, false, rodada), genre ? buscar(query, diaDeHoje()).catch(() => []) : Promise.resolve([])]);
    const merged = [...personal.videos, ...base];
    const videos = merged.filter((v, i) => merged.findIndex(x => x.id === v.id) === i).slice(0, 24);
    if (!videos.length && genre) throw new Error('Sem resultados');
    return NextResponse.json({ provider: 'youtube', videos, personalizado: personal.videos.length > 0, atualizadoEm: new Date().toISOString(), rodada, rodadas: 5 },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível buscar músicas no YouTube agora. Tente novamente.' }, { status: 502 });
  }
}
