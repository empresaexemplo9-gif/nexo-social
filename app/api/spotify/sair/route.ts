import { requireAdmin } from '@/lib/api-helpers';
import type { NextRequest } from 'next/server';
import { encerrar } from '@/lib/spotify-conta';

export const dynamic = 'force-dynamic';

/** Desliga a conta do Spotify neste navegador. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return encerrar(req);
}
