import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    unread: rows.filter((n) => !n.read_at).length,
  });
}

/** Marca todas como lidas. */
export async function PATCH() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { error } = await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
