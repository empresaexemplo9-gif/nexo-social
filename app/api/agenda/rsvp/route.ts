import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * Resposta do convidado: positivo (`confirmado`, concordo) ou negativo
 * (`recusado`, não concordo). Pode mudar de ideia depois.
 *
 * O gatilho notify_appointment_answer do banco tira o convite de pendente
 * nas notificações e avisa quem criou o compromisso.
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

  return NextResponse.json({ ok: true, status });
}
