import { NextResponse } from 'next/server';
import { createAdminClient, createAnonServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET ?token= — o convite pode ser usado? `retomada`: ele já criou uma conta
 * que nunca foi confirmada; o cadastro com o mesmo e-mail ativa essa conta.
 */
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
    if (row.valid) return reply({ valid: true });
    return reply((await contaPendente(token)) ? { valid: true, retomada: true } : { valid: false });
  } catch {
    return unavailable();
  }
}

/** O convite foi usado por uma conta que ainda não confirmou o e-mail? */
async function contaPendente(token: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    if (!admin) return false;
    const { data: convite } = await admin.from('platform_invites').select('status, used_by').eq('token', token).maybeSingle();
    if (convite?.status !== 'used' || !convite.used_by) return false;
    const { data } = await admin.auth.admin.getUserById(convite.used_by);
    return Boolean(data?.user && !data.user.email_confirmed_at);
  } catch {
    return false;
  }
}
