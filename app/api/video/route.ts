import { NextResponse } from 'next/server';
import { explicarErroYoutube, isYoutubeConfigured, resolveChannelId, searchVideo } from '@/lib/youtube';
import { aoVivoDoCanal, canalPorHandle, videosDoCanal } from '@/lib/youtube-aberto';

export const revalidate = 3600;

/**
 * GET /api/video?q=<termo>      → vídeo para tocar embutido (sem chave; a API é reserva)
 * GET /api/video?canal=@handle  → transmissão ao vivo do canal, embutida; fora
 *                                 do ar, os vídeos recentes dele (sem chave)
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim();
  const canal = (params.get('canal') || '').trim();

  if (!q && !canal) {
    return NextResponse.json({ error: 'Informe q ou canal.' }, { status: 400 });
  }

  // Ao vivo de um canal: primeiro pela página pública (sem chave e sem cota);
  // a API só entra se a página não responder.
  if (canal) {
    const live = await aoVivoDoCanal(canal);
    if (live) {
      return NextResponse.json({
        configurado: true,
        encontrado: true,
        aoVivo: true,
        title: live.titulo,
        embedUrl: `https://www.youtube.com/embed/${live.id}?rel=0`,
      });
    }
    // Fora do ar agora: mostra o que o canal publicou por último.
    const channelId = (await canalPorHandle(canal)) ?? (isYoutubeConfigured() ? await resolveChannelId(canal).catch(() => null) : null);
    const recentes = channelId ? (await videosDoCanal(channelId, 'longos', 1800)).slice(0, 8) : [];
    return NextResponse.json({ configurado: true, encontrado: false, aoVivo: false, channelId, recentes });
  }

  // Termo → vídeo: página pública de resultados primeiro, API de reserva.
  try {
    const video = await searchVideo(q);
    if (!video) return NextResponse.json({ configurado: true, encontrado: false }, { status: 404 });
    return NextResponse.json({ configurado: true, encontrado: true, ...video });
  } catch (e: any) {
    const reason = String(e?.reason || '');
    const detalhe = String(e?.detalhe || e?.message || e);
    return NextResponse.json({ configurado: true, error: detalhe, reason, hint: explicarErroYoutube(reason, detalhe) }, { status: 502 });
  }
}
