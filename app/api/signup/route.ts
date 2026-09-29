import { NextResponse } from 'next/server';
import { createAdminClient, createAnonServerClient, createServerSupabase } from '@/lib/supabase-server';
import { tenantSlug } from '@/lib/auth';
import { safeAuthDestination } from '@/lib/auth-redirect';
import { describeAuthError } from '@/lib/auth-errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return reply({ error: 'Origem inválida.' }, 403);
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 150) : '';
  const accountType = body?.accountType === 'organizacao' ? 'organizacao' : 'pessoal';
  const tenantName = accountType === 'organizacao' && typeof body?.tenantName === 'string' ? body.tenantName.trim().slice(0, 150) : fullName;
  const inviteToken = typeof body?.inviteToken === 'string' ? body.inviteToken.trim() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return reply({ error: 'E-mail inválido.' }, 400);
  if (password.length < 6 || password.length > 128) return reply({ error: 'Use uma senha com 6 a 128 caracteres.' }, 400);
  if (!fullName || !tenantName) return reply({ error: 'Preencha seu nome e o nome da organização, quando aplicável.' }, 400);
  if (!/^[0-9a-f]{64}$/i.test(inviteToken)) return reply({ error: 'Você precisa de um convite válido para criar uma conta.' }, 403);

  try {
    const anon = createAnonServerClient();
    const admin = createAdminClient();
    const sb = createServerSupabase();
    if (!anon || !admin || !sb) return reply({ error: 'Cadastro temporariamente indisponível.' }, 503);

    const { data: preview, error: previewError } = await anon.rpc('platform_invite_preview', { p_token: inviteToken });
    const valid = Boolean((Array.isArray(preview) ? preview[0] : preview)?.valid);
    if (previewError || !valid) return reply({ error: 'Este convite é inválido ou já foi utilizado.' }, 403);

    const callback = new URL('/auth/callback', origin);
    const next = safeAuthDestination(typeof body?.next === 'string' ? body.next : null);
    if (next) callback.searchParams.set('next', next);
    callback.searchParams.set('convite', inviteToken);

    const { data, error } = await sb.auth.signUp({ email, password, options: {
      emailRedirectTo: callback.toString(),
      data: { full_name: fullName, account_type: accountType, tenant_name: tenantName, tenant_slug: tenantSlug(tenantName) },
    } });
    if (error) return reply({ error: describeAuthError(error) }, error.status && error.status >= 400 && error.status < 500 ? error.status : 502);
    if (!data.user) return reply({ error: 'Não foi possível criar a conta.' }, 502);

    const { data: claimed, error: claimError } = await admin.rpc('claim_platform_invite', { p_token: inviteToken, p_user: data.user.id });
    if (claimError || claimed !== true) {
      await admin.auth.admin.deleteUser(data.user.id).catch(() => null);
      return reply({ error: 'Este convite acabou de ser utilizado. Peça um novo convite.' }, 409);
    }

    return reply({ ok: true, confirmacaoPendente: !data.session });
  } catch {
    return reply({ error: 'Não foi possível criar a conta agora. Tente novamente em instantes.' }, 502);
  }
}
