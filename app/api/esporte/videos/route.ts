import { NextResponse } from 'next/server';
import { getSport, type SportId } from '@/lib/sports';
import { videosDoEsporte } from '@/lib/esporte-videos';

export const dynamic = 'force-dynamic';

/**
 * GET /api/esporte/videos?modalidade=futebol
 * Transmissões ao vivo agora nos canais oficiais gratuitos e os melhores
 * momentos recentes deles — sem depender da chave do YouTube.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('modalidade') ?? 'futebol';
  const sport = getSport(raw) ? (raw as SportId) : 'futebol';
  const r = await videosDoEsporte(sport);
  return NextResponse.json(r, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
