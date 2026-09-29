import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { sb, user } = await getSession();
  if (!sb || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const [{ data: balance, error: balanceError }, { data: invites, error: invitesError }] = await Promise.all([
    sb.from('platform_invite_balances').select('credits').eq('user_id', user.id).maybeSingle(),
    sb.from('platform_invites').select('id, token, status, created_at, used_at').eq('inviter_id', user.id).order('created_at', { ascending: false }),
  ]);
  if (balanceError || invitesError) return NextResponse.json({ error: 'Sistema de convites ainda não está disponível.' }, { status: 503 });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    credits: balance?.credits ?? 0,
    invites: (invites ?? []).map((i) => ({
      ...i,
      link: `${origin}/convite/${encodeURIComponent(i.token)}`,
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await sb.rpc('create_platform_invite');
  if (error) {
    const message = /não possui convites/i.test(error.message || '')
      ? 'Você usou seus convites disponíveis. O superadministrador pode liberar novos convites para sua conta.'
      : 'Não foi possível gerar o convite.';
    return NextResponse.json({ error: message }, { status: /não possui convites/i.test(error.message || '') ? 409 : 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.token) return NextResponse.json({ error: 'Não foi possível gerar o convite.' }, { status: 500 });
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    ok: true,
    credits: row.credits_remaining,
    token: row.token,
    link: `${origin}/convite/${encodeURIComponent(row.token)}`,
  });
}
