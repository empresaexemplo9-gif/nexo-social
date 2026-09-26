import type { NextRequest } from 'next/server';
import { encerrar } from '@/lib/spotify-conta';

export const dynamic = 'force-dynamic';

/** Desliga a conta do Spotify neste navegador. */
export function POST(req: NextRequest) {
  return encerrar(req);
}
