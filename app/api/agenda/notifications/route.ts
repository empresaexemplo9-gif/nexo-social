import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { isUuid, listNotifications } from '@/lib/social';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    return NextResponse.json(await listNotifications(sb, user.id));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao carregar as notificações.' }, { status: 500 });
  }
}

/**
 * Marca como lidas — todas, ou só a do `id` enviado.
 *
 * Convite sem resposta NÃO é marcado: ele fica nas notificações até a pessoa
 * responder positivo ou negativo (a resposta é que o tira de pendente).
 */
export async function PATCH(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const b = await request.json().catch(() => null);
  const id = isUuid(b?.id) ? b.id : null;

  let pendentes: string[];
  try {
    pendentes = (await listNotifications(sb, user.id)).notifications.filter((n) => n.pending).map((n) => n.id);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao carregar as notificações.' }, { status: 500 });
  }
  if (id && pendentes.includes(id)) return NextResponse.json({ ok: true, pending: true });

  let q = sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  if (id) q = q.eq('id', id);
  else if (pendentes.length) q = q.not('id', 'in', `(${pendentes.join(',')})`);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
