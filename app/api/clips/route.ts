import { NextResponse } from 'next/server';
import { clipQuery, temClipes } from '@/lib/clips';
import { explicarErroYoutube, isYoutubeConfigured, searchVideos } from '@/lib/youtube';
import { getTopic, type CategorySlug } from '@/lib/data';

export const revalidate = 21600;

/**
 * GET /api/clips?tema=musica&generos=mpb,jazz
 *
 * Clipes do tema para tocar dentro da plataforma. Uma única busca (100
 * unidades) traz todos os resultados — o preço do YouTube é por chamada, não
 * por vídeo —, e o cache de 6h somado ao termo que só muda por dia mantém o
 * consumo baixo.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tema = (params.get('tema') || 'musica') as CategorySlug;
  const generos = (params.get('generos') || '').split(',').map((g) => g.trim()).filter(Boolean);

  if (!getTopic(tema) || !temClipes(tema)) {
    return NextResponse.json({ error: 'Tema sem clipes.' }, { status: 404 });
  }

  const termo = clipQuery(tema, generos);

  if (!isYoutubeConfigured()) {
    return NextResponse.json(
      {
        configurado: false,
        termo,
        clips: [],
        error: 'YouTube não configurado.',
        hint: 'Adicione YOUTUBE_API_KEY na Vercel para os clipes tocarem aqui dentro.',
      },
      { status: 503 },
    );
  }

  try {
    const clips = await searchVideos(termo, 8);
    return NextResponse.json({ configurado: true, tema, termo, clips, custoUnidades: 100 });
  } catch (e: any) {
    return NextResponse.json(
      {
        configurado: true,
        termo,
        clips: [],
        error: String(e?.detalhe || e?.message || e),
        hint: explicarErroYoutube(String(e?.reason || ''), String(e?.detalhe || e?.message || '')),
      },
      { status: 502 },
    );
  }
}
