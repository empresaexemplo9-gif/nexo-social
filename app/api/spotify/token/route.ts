import type { NextRequest } from 'next/server';
import { tokenDoPlayer } from '@/lib/spotify-conta';

export const dynamic = 'force-dynamic';

/** Token de acesso da pessoa para o player do navegador (Web Playback SDK). */
export function GET(req: NextRequest) {
  return tokenDoPlayer(req);
}
