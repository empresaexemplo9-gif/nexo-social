import { requireAdmin } from '@/lib/api-helpers';
import type { NextRequest } from 'next/server';
import { iniciarLogin } from '@/lib/spotify-conta';

export const dynamic = 'force-dynamic';

/** Leva a pessoa ao login do Spotify. `?volta=/caminho` diz para onde voltar. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return iniciarLogin(req);
}
