import { NextResponse } from 'next/server';
import { createAdminClient, createAnonServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET ?token= — o convite pode ser usado? `retomada`: ele já criou uma conta
 * que nunca foi confirmada; o cadastro com o mesmo e-mail ativa essa conta.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim().toLowerCase() || '';
  if (!/^[0-9a-f]{64}$/.test(token)) return NextResponse.json({ valid: false });
  const sb = createAnonServerClient();
  if (!sb) return NextResponse.json({ valid: false }, { status: 503 });
  const { data, error } = await sb.rpc('platform_invite_preview', { p_token: token });
  if (error) return NextResponse.json({ valid: false }, { status: 503 });
  const row = Array.isArray(data) ? data[0] : data;
  const headers = { 'Cache-Control': 'no-store' };
  if (row?.valid) return NextResponse.json({ valid: true }, { headers });
  return NextResponse.json((await contaPendente(token)) ? { valid: true, retomada: true } : { valid: false }, { headers });
}

/** O convite foi usado por uma conta que ainda não confirmou o e-mail? */
async function contaPendente(token: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const { data: convite } = await admin.from('platform_invites').select('status, used_by').eq('token', token).maybeSingle();
    if (convite?.status !== 'used' || !convite.used_by) return false;
    const { data } = await admin.auth.admin.getUserById(convite.used_by);
    return Boolean(data?.user && !data.user.email_confirmed_at);
  } catch {
    return false;
  }
}
