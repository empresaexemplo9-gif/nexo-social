import { NextResponse } from 'next/server';
import { buildSportsBoard, getSport, SPORTS, type SportId } from '@/lib/sports';
import { broadcastersOf, daily, legendsOf } from '@/lib/sports-media';

// Placar ao vivo pede janela curta; o resto do quadro é cacheado pelas
// próprias chamadas às fontes.
export const revalidate = 120;

/**
 * GET /api/esporte?modalidade=futebol
 * Quadro completo da modalidade: partidas, transmissões gratuitas, replays e
 * as lendas indicadas do dia.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('modalidade') ?? 'futebol';
  const sport = getSport(raw) ? (raw as SportId) : 'futebol';

  try {
    const board = await buildSportsBoard(sport);
    return NextResponse.json({
      ...board,
      modalidades: SPORTS,
      transmissoes: broadcastersOf(sport),
      // Rotação diária: as lendas em destaque mudam à meia-noite.
      lendas: daily(legendsOf(sport), 6, SPORTS.findIndex((s) => s.id === sport)),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao montar o quadro esportivo.' }, { status: 500 });
  }
}
