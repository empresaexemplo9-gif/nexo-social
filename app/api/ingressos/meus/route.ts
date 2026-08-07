import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ingressos/meus — os ingressos de quem está logado.
 *
 * Sem filtro por usuário na consulta: a policy `tickets_select` já limita ao
 * dono. Filtrar de novo aqui daria a impressão de que a segurança está no
 * código da rota, quando ela está no banco.
 */
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await sb
    .from('tickets')
    .select(
      'id, code, status, holder_name, checked_in_at, created_at, event_id, ticket_type_id, ' +
        'events(title, event_date, location, city, image_url, category, starts_at), ' +
        'ticket_types(name, price_cents)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ingressos = (data ?? []).map((t: any) => ({
    id: t.id,
    code: t.code,
    status: t.status,
    holder: t.holder_name,
    checkedInAt: t.checked_in_at,
    eventId: t.event_id,
    evento: t.events
      ? {
          titulo: t.events.title,
          data: t.events.event_date,
          startsAt: t.events.starts_at,
          local: t.events.location,
          cidade: t.events.city,
          imagem: t.events.image_url,
          tema: t.events.category,
        }
      : null,
    tipo: t.ticket_types ? { nome: t.ticket_types.name, precoCents: t.ticket_types.price_cents } : null,
  }));

  return NextResponse.json({ ingressos });
}
