import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// Cadastro dos lotes de ingresso de um evento — quem organiza usa isto para
// abrir a venda na plataforma. Não há verificação de dono aqui: a policy
// `ticket_types_write` (is_platform_admin OR owns_event) resolve no banco, e
// duplicar a regra no código só criaria dois lugares para ela divergir.

function sanitizar(body: any) {
  const centavos = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
  return {
    name: String(body?.name ?? '').trim().slice(0, 120),
    description: body?.description ? String(body.description).trim().slice(0, 500) : null,
    price_cents: centavos(body?.priceCents),
    quantity: Math.max(0, Math.round(Number(body?.quantity) || 0)),
    max_per_order: Math.min(20, Math.max(1, Math.round(Number(body?.maxPerOrder) || 5))),
    sales_start: body?.salesStart ? new Date(body.salesStart).toISOString() : null,
    sales_end: body?.salesEnd ? new Date(body.salesEnd).toISOString() : null,
    active: body?.active !== false,
  };
}

/** GET /api/ingressos/tipos?event=<id> — lotes do evento, com o quanto vendeu. */
export async function GET(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const eventId = new URL(request.url).searchParams.get('event');
  if (!eventId) return NextResponse.json({ error: 'Informe o evento.' }, { status: 400 });

  const { data, error } = await sb
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('price_cents', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tipos: data ?? [] });
}

/** POST /api/ingressos/tipos — cria um lote. */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const eventId = typeof body?.eventId === 'string' ? body.eventId : '';
  if (!eventId) return NextResponse.json({ error: 'Informe o evento.' }, { status: 400 });

  const row = sanitizar(body);
  if (!row.name) return NextResponse.json({ error: 'Dê um nome ao lote (ex.: Pista, Inteira).' }, { status: 400 });

  // O tenant vem do evento: assim o lote pertence a quem é dono do evento,
  // e não a quem por acaso está logado.
  const { data: evento } = await sb.from('events').select('tenant_id').eq('id', eventId).maybeSingle();

  const { data, error } = await sb
    .from('ticket_types')
    .insert({ ...row, event_id: eventId, tenant_id: evento?.tenant_id ?? null })
    .select()
    .single();

  if (error) {
    const negado = /row-level security/i.test(error.message);
    return NextResponse.json(
      { error: negado ? 'Você não organiza este evento.' : error.message },
      { status: negado ? 403 : 500 },
    );
  }
  return NextResponse.json({ tipo: data }, { status: 201 });
}

/** PATCH /api/ingressos/tipos — altera preço, estoque ou disponibilidade. */
export async function PATCH(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }
  if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Informe o id.' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  const row = sanitizar(body);
  if (body.name !== undefined) patch.name = row.name;
  if (body.description !== undefined) patch.description = row.description;
  if (body.priceCents !== undefined) patch.price_cents = row.price_cents;
  if (body.quantity !== undefined) patch.quantity = row.quantity;
  if (body.maxPerOrder !== undefined) patch.max_per_order = row.max_per_order;
  if (body.salesStart !== undefined) patch.sales_start = row.sales_start;
  if (body.salesEnd !== undefined) patch.sales_end = row.sales_end;
  if (body.active !== undefined) patch.active = row.active;

  const { data, error } = await sb.from('ticket_types').update(patch).eq('id', body.id).select().single();
  if (error) {
    // O CHECK (sold <= quantity) do banco pega a redução de estoque abaixo do
    // que já foi vendido — que é justamente o erro que não pode passar.
    const conflito = /check constraint|violates check/i.test(error.message);
    return NextResponse.json(
      { error: conflito ? 'O estoque não pode ficar abaixo do que já foi vendido.' : error.message },
      { status: conflito ? 409 : 500 },
    );
  }
  return NextResponse.json({ tipo: data });
}

/** DELETE /api/ingressos/tipos?id=... — só enquanto nada foi vendido. */
export async function DELETE(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o id.' }, { status: 400 });

  const { data: tipo } = await sb.from('ticket_types').select('sold').eq('id', id).maybeSingle();
  if (tipo && tipo.sold > 0) {
    return NextResponse.json(
      { error: 'Este lote já tem ingressos vendidos. Desative-o em vez de apagar.' },
      { status: 409 },
    );
  }

  const { error } = await sb.from('ticket_types').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
