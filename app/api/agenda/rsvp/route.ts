import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { notify } from '@/lib/social';

export const dynamic = 'force-dynamic';

/**
 * Resposta do convidado: a única ação dele é CONFIRMAR ou DESMARCAR.
 */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const b = await request.json().catch(() => null);
  const appointmentId = String(b?.appointmentId || '');
  const status = String(b?.status || '');

  if (!appointmentId) return NextResponse.json({ error: 'Compromisso não informado.' }, { status: 400 });
  if (!['confirmado', 'recusado'].includes(status)) {
    return NextResponse.json({ error: 'Resposta inválida: use "confirmado" ou "recusado".' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('appointment_participants')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('appointment_id', appointmentId)
    .eq('user_id', user.id)
    .select('appointment_id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Você não está marcado neste compromisso.' }, { status: 404 });

  // Avisa quem criou o compromisso.
  const { data: appt } = await sb.from('appointments').select('owner_id, title').eq('id', appointmentId).maybeSingle();
  if (appt?.owner_id && appt.owner_id !== user.id) {
    await notify([
      {
        userId: appt.owner_id,
        type: 'resposta',
        title: status === 'confirmado' ? 'Presença confirmada' : 'Compromisso desmarcado',
        body: `${user.email} ${status === 'confirmado' ? 'confirmou' : 'desmarcou'} "${appt.title}".`,
        link: '/agenda',
        appointmentId,
        actorId: user.id,
      },
    ]);
  }

  return NextResponse.json({ ok: true, status });
}
