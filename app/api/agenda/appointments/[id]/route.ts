import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { notify } from '@/lib/social';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data: appt } = await sb.from('appointments').select('owner_id, title').eq('id', params.id).maybeSingle();
  if (!appt) return NextResponse.json({ error: 'Compromisso não encontrado.' }, { status: 404 });
  if (appt.owner_id !== user.id) {
    return NextResponse.json({ error: 'Só quem criou pode excluir o compromisso.' }, { status: 403 });
  }

  const { data: parts } = await sb.from('appointment_participants').select('user_id').eq('appointment_id', params.id);

  const { error } = await sb.from('appointments').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(
    (parts ?? [])
      .filter((p: { user_id: string }) => p.user_id !== user.id)
      .map((p: { user_id: string }) => ({
        userId: p.user_id,
        type: 'cancelado',
        title: 'Compromisso cancelado',
        body: `"${appt.title}" foi cancelado por quem criou.`,
        link: '/agenda',
        actorId: user.id,
      })),
  );

  return NextResponse.json({ ok: true });
}
