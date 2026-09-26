import type { NextRequest } from 'next/server';
import { iniciarLogin } from '@/lib/spotify-conta';

export const dynamic = 'force-dynamic';

/** Leva a pessoa ao login do Spotify. `?volta=/caminho` diz para onde voltar. */
export function GET(req: NextRequest) {
  return iniciarLogin(req);
}
