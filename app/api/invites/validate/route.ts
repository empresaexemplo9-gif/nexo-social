import { NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const reply = (body: object, status = 200) => NextResponse.json(body, {
    status, headers: { 'Cache-Control': 'private, no-store' },
  });
  const unavailable = () => reply({ error: 'Não foi possível validar o convite agora. Tente novamente.' }, 503);
  const token = new URL(request.url).searchParams.get('token')?.trim().toLowerCase() || '';
  if (!/^[0-9a-f]{64}$/.test(token)) return reply({ valid: false });
  try {
    const sb = createAnonServerClient();
    if (!sb) return unavailable();
    const { data, error } = await sb.rpc('platform_invite_preview', { p_token: token });
    if (error) return unavailable();
    const row = Array.isArray(data) ? data[0] : data;
    if (typeof row?.valid !== 'boolean') return unavailable();
    return reply({ valid: row.valid });
  } catch {
    return unavailable();
  }
}
