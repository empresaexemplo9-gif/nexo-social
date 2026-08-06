import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { findUserByEmail, notify, profilesByIds } from '@/lib/social';

export const dynamic = 'force-dynamic';

/** Caixa de recados: recebidos e enviados. */
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await sb
    .from('messages')
    .select('*')
    .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const names = await profilesByIds(sb, rows.flatMap((r) => [r.from_user, r.to_user]));

  return NextResponse.json({
    messages: rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      readAt: r.read_at,
      direction: r.to_user === user.id ? 'recebido' : 'enviado',
      withName: names.get(r.to_user === user.id ? r.from_user : r.to_user)?.name ?? null,
      withEmail: names.get(r.to_user === user.id ? r.from_user : r.to_user)?.email ?? null,
    })),
    unread: rows.filter((r) => r.to_user === user.id && !r.read_at).length,
  });
}

/** Envia um recado por e-mail do destinatário. */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const b = await request.json().catch(() => null);
  const email = String(b?.email || '').trim().toLowerCase();
  const body = String(b?.body || '').trim();
  if (!email || !body) return NextResponse.json({ error: 'Informe o destinatário e a mensagem.' }, { status: 400 });

  const { user: found } = await findUserByEmail(sb, email);
  if (!found) return NextResponse.json({ error: `Ninguém cadastrado com ${email}.` }, { status: 404 });

  const { error } = await sb.from('messages').insert({
    from_user: user.id,
    to_user: found.id,
    body: body.slice(0, 2000),
    appointment_id: b?.appointmentId || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify([
    {
      userId: found.id,
      type: 'recado',
      title: 'Novo recado',
      body: `${user.email}: ${body.slice(0, 80)}`,
      link: '/agenda',
      actorId: user.id,
    },
  ]);

  return NextResponse.json({ ok: true });
}

/** Marca os recados recebidos como lidos. */
export async function PATCH() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { error } = await sb
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('to_user', user.id)
    .is('read_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
