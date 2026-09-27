import { requireAdmin } from '@/lib/api-helpers';
import type { NextRequest } from 'next/server';
import { tokenDoPlayer } from '@/lib/spotify-conta';

export const dynamic = 'force-dynamic';

/** Token de acesso da pessoa para o player do navegador (Web Playback SDK). */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return tokenDoPlayer(req);
}
