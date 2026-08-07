import { NextResponse } from 'next/server';
import { explicarErroYoutube, isYoutubeConfigured, liveEmbedUrl, resolveChannelId, searchVideo } from '@/lib/youtube';

export const revalidate = 3600;

/**
 * GET /api/video?q=<termo>      → vídeo para tocar embutido
 * GET /api/video?canal=@handle  → transmissão ao vivo do canal, embutida
 *
 * Sem YOUTUBE_API_KEY responde 503 com `configurado: false`; a interface então
 * mostra o link externo em vez do player.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim();
  const canal = (params.get('canal') || '').trim();

  if (!q && !canal) {
    return NextResponse.json({ error: 'Informe q ou canal.' }, { status: 400 });
  }

  if (!isYoutubeConfigured()) {
    return NextResponse.json(
      {
        configurado: false,
        error: 'YouTube não configurado.',
        hint: 'Crie uma chave gratuita no Google Cloud (YouTube Data API v3) e adicione YOUTUBE_API_KEY na Vercel. Sem ela, os vídeos abrem no YouTube em vez de tocar aqui.',
      },
      { status: 503 },
    );
  }

  try {
    if (canal) {
      const channelId = await resolveChannelId(canal);
      if (!channelId) return NextResponse.json({ configurado: true, encontrado: false }, { status: 404 });
      return NextResponse.json({ configurado: true, encontrado: true, channelId, embedUrl: liveEmbedUrl(channelId) });
    }

    const video = await searchVideo(q);
    if (!video) return NextResponse.json({ configurado: true, encontrado: false }, { status: 404 });
    return NextResponse.json({ configurado: true, encontrado: true, ...video });
  } catch (e: any) {
    const reason = String(e?.reason || '');
    const detalhe = String(e?.detalhe || e?.message || e);
    return NextResponse.json({ configurado: true, error: detalhe, reason, hint: explicarErroYoutube(reason, detalhe) }, { status: 502 });
  }
}
