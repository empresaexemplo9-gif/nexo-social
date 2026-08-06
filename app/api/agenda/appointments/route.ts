import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { findUserByEmail, listAppointments, notify } from '@/lib/social';

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

/** Cria um compromisso, marcando participantes por e-mail. */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const b = await request.json().catch(() => null);
  const title = String(b?.title || '').trim();
  const startsAt = String(b?.startsAt || '').trim();
  const emails: string[] = Array.isArray(b?.participants) ? b.participants : [];

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
      is_group: emails.length > 0,
    })
    .select()
    .maybeSingle();

  if (error || !appt) {
    return NextResponse.json({ error: error?.message || 'Falha ao criar o compromisso.' }, { status: 500 });
  }

  // Resolve os convidados e registra a participação como "pendente".
  const invited: { id: string; email: string }[] = [];
  const notFound: string[] = [];
  for (const raw of emails.slice(0, 25)) {
    const email = String(raw || '').trim().toLowerCase();
    if (!email || email === user.email?.toLowerCase()) continue;
    const { user: found } = await findUserByEmail(sb, email);
    if (found) invited.push({ id: found.id, email: found.email });
    else notFound.push(email);
  }

  if (invited.length) {
    const { error: pErr } = await sb
      .from('appointment_participants')
      .insert(invited.map((i) => ({ appointment_id: appt.id, user_id: i.id, status: 'pendente' })));
    if (pErr) {
      return NextResponse.json(
        { error: `Compromisso criado, mas falhou ao marcar participantes: ${pErr.message}`, appointment: appt },
        { status: 207 },
      );
    }

    await notify(
      invited.map((i) => ({
        userId: i.id,
        type: 'convite',
        title: 'Você foi marcado em um compromisso',
        body: `${user.email} marcou você em "${title}".`,
        link: '/agenda',
        appointmentId: appt.id,
        actorId: user.id,
      })),
    );
  }

  return NextResponse.json({
    ok: true,
    appointment: appt,
    invited: invited.map((i) => i.email),
    // Aponta claramente quem não pôde ser marcado e por quê.
    notFound,
    warning: notFound.length
      ? `Sem conta na plataforma: ${notFound.join(', ')}. Peça para se cadastrarem e marque novamente.`
      : undefined,
  });
}
