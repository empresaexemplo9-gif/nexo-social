import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { getBomDiaSources } from '@/lib/bom-dia-sources';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { user } = await getSession();
    if (!user || user.is_anonymous) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
    const requestedRound = Number(new URL(request.url).searchParams.get('rodada'));
    const round = Number.isFinite(requestedRound) ? Math.abs(Math.trunc(requestedRound)) % 10000 : 0;
    return NextResponse.json(await getBomDiaSources(round), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar as fontes agora.' }, { status: 503 });
  }
}
