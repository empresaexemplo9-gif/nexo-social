import { NextResponse } from 'next/server';
import { chavePublica } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** GET — a chave pública VAPID para o aparelho se inscrever (null: avisos desligados no servidor). */
export async function GET() {
  return NextResponse.json({ chave: chavePublica() }, { headers: { 'Cache-Control': 'private, no-store' } });
}
