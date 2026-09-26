import { NextResponse } from 'next/server';
import { buscar } from '@/lib/search';
import { explicarErroYoutube, searchVideos } from '@/lib/youtube';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * GET /api/busca?q=termo[&video=1]
 *
 * A busca no catálogo da plataforma é instantânea e não custa nada. A do
 * YouTube custa 100 unidades por chamada, então só acontece quando pedida —
 * `video=1` — e nunca junto da digitação.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim();
  const querVideo = params.get('video') === '1';

  if (q.length < 2) {
    return NextResponse.json({ q, resultados: [], videos: [] });
  }

  const resultados = buscar(q, 30);

  if (!querVideo) {
    return NextResponse.json({ q, resultados, videos: [], videoDisponivel: true });
  }

  try {
    const videos = await searchVideos(q, 8);
    return NextResponse.json({ q, resultados, videos, videoDisponivel: true });
  } catch (e: any) {
    return NextResponse.json({
      q,
      resultados,
      videos: [],
      videoDisponivel: true,
      videoAviso: explicarErroYoutube(String(e?.reason || ''), String(e?.detalhe || e?.message || '')),
    });
  }
}
