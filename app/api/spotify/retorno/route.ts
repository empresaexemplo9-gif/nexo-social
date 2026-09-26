import type { NextRequest } from 'next/server';
import { concluirLogin } from '@/lib/spotify-conta';

export const dynamic = 'force-dynamic';

/**
 * Redirect URI do app no Spotify: cadastre `https://SEU-DOMINIO/api/spotify/retorno`
 * no painel (developer.spotify.com/dashboard → app → Settings).
 */
export function GET(req: NextRequest) {
  return concluirLogin(req);
}
