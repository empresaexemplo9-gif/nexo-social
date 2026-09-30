import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { despacharPush, segredoDoDespacho } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function segredoConfere(recebido: string | null): boolean {
  const esperado = segredoDoDespacho();
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST — chamado pelo banco a cada minuto (pg_cron + pg_net, db/push.sql):
 * entrega os avisos que ficaram pendentes e os lembretes da agenda.
 * Não usa sessão: vale só com o segredo que o próprio app gravou no banco.
 */
export async function POST(request: Request) {
  if (!segredoConfere(request.headers.get('x-push-segredo'))) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const r = await despacharPush();
  return NextResponse.json({ ok: true, ...r });
}
