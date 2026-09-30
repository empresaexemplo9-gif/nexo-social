import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { isUuid, listAppointments } from '@/lib/social';
import { despacharAgora } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** Compromissos do usuário: criados por ele + aqueles em que foi marcado. */
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    return NextResponse.json({ appointments: await listAppointments(sb, user.id) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao carregar compromissos.' }, { status: 500 });
  }
}

/**
 * Cria um compromisso e convida pessoas DA PLATAFORMA (pelo id da conta,
 * escolhida pelo nome no seletor). Nada sai por e-mail: o convite vai para a
 * agenda e para as notificações de cada convidado — o gatilho
 * notify_appointment_invite do banco cria a notificação — e fica pendente
 * até ele responder positivo (concordo) ou negativo (não concordo).
 */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const b = await request.json().catch(() => null);
  const title = String(b?.title || '').trim();
  const startsAt = String(b?.startsAt || '').trim();
  const ids: string[] = Array.from(
    new Set<string>((Array.isArray(b?.participantIds) ? b.participantIds : []).filter(isUuid)),
  )
    .filter((id) => id !== user.id)
    .slice(0, 50);

  if (!title) return NextResponse.json({ error: 'Informe o título do compromisso.' }, { status: 400 });
  if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) {
    return NextResponse.json({ error: 'Informe uma data e hora válidas.' }, { status: 400 });
  }

  const { data: appt, error } = await sb
    .from('appointments')
    .insert({
      owner_id: user.id,
      title,
      description: b?.description || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: b?.endsAt ? new Date(b.endsAt).toISOString() : null,
      location: b?.location || null,
      city: b?.city || null,
      is_group: ids.length > 0,
    })
    .select()
    .maybeSingle();

  if (error || !appt) {
    return NextResponse.json({ error: error?.message || 'Falha ao criar o compromisso.' }, { status: 500 });
  }

  if (ids.length) {
    const { error: pErr } = await sb
      .from('appointment_participants')
      .insert(ids.map((id) => ({ appointment_id: appt.id, user_id: id, status: 'pendente' })));
    if (pErr) {
      return NextResponse.json(
        { error: `Compromisso criado, mas falhou ao convidar as pessoas: ${pErr.message}`, appointment: appt },
        { status: 207 },
      );
    }
  }

  if (ids.length) await despacharAgora();
  return NextResponse.json({ ok: true, appointment: appt, invited: ids.length });
}
