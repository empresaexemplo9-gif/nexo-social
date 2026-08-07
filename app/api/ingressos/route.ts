import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { createAnonServerClient } from '@/lib/supabase-server';
import { criarPix, pagamentoConfigurado } from '@/lib/pagamento';
import type { TipoIngresso } from '@/lib/bilheteria';

export const dynamic = 'force-dynamic';

const MAX_ITENS = 6;

/** GET /api/ingressos?event=<id> — tipos de ingresso à venda no evento. */
export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get('event');
  if (!eventId) return NextResponse.json({ error: 'Informe o evento.' }, { status: 400 });

  const sb = createAnonServerClient();
  if (!sb) return NextResponse.json({ tipos: [] });

  const { data, error } = await sb
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('price_cents', { ascending: true });

  if (error) {
    // Rota pública: a mensagem do banco fica no log do servidor, não na tela.
    // E devolvemos lista vazia em vez de 500 para a página do evento continuar
    // de pé — sem venda aqui dentro, ela mostra a bilheteria de origem.
    console.error('[ingressos] Falha ao listar os lotes:', error.message);
    return NextResponse.json({ tipos: [], indisponivel: true });
  }
  return NextResponse.json({ tipos: (data ?? []) as TipoIngresso[], pagamento: pagamentoConfigurado() });
}

/**
 * POST /api/ingressos — compra.
 *
 * O pedido nasce no banco, dentro de `criar_pedido_ingresso`, que trava a linha
 * do tipo de ingresso e baixa o estoque na mesma transação. Só depois disso,
 * com a reserva já garantida, é que pedimos o PIX ao Mercado Pago. A ordem
 * importa: se cobrássemos primeiro, dava para pagar por um ingresso que acabou.
 */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Entre na sua conta para comprar.' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const eventId = typeof body?.eventId === 'string' ? body.eventId : '';
  if (!eventId) return NextResponse.json({ error: 'Informe o evento.' }, { status: 400 });

  const itens = (Array.isArray(body?.itens) ? body.itens : [])
    .map((i: any) => ({
      ticket_type_id: typeof i?.ticketTypeId === 'string' ? i.ticketTypeId : '',
      quantity: Math.max(1, Math.min(20, Math.round(Number(i?.quantity) || 0))),
    }))
    .filter((i: any) => i.ticket_type_id && i.quantity > 0)
    .slice(0, MAX_ITENS);

  if (!itens.length) return NextResponse.json({ error: 'Escolha ao menos um ingresso.' }, { status: 400 });

  const nome = (typeof body?.nome === 'string' ? body.nome : '').trim().slice(0, 120);
  const email = (typeof body?.email === 'string' ? body.email : user.email || '').trim().slice(0, 200);
  if (!nome) return NextResponse.json({ error: 'Informe o nome de quem vai usar o ingresso.' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Informe um e-mail válido para receber o ingresso.' }, { status: 400 });
  }

  // A reserva acontece aqui. Estoque, limite por pedido e janela de vendas são
  // verificados dentro da função — o cliente não tem como contornar.
  const { data, error } = await sb.rpc('criar_pedido_ingresso', {
    p_event: eventId,
    p_itens: itens,
    p_nome: nome,
    p_email: email,
  });

  if (error) {
    // As mensagens da função já são escritas para o comprador ler.
    return NextResponse.json({ error: limparErroPg(error.message) }, { status: 409 });
  }

  const orderId = (data as any)?.order_id as string;
  const totalCents = Number((data as any)?.total_cents ?? 0);
  const gratuito = Boolean((data as any)?.gratuito);

  if (gratuito) {
    return NextResponse.json({ orderId, totalCents: 0, status: 'pago', gratuito: true }, { status: 201 });
  }

  if (!pagamentoConfigurado()) {
    // Sem provedor não dá para cobrar. Devolver o estoque é obrigatório: senão o
    // ingresso fica preso num pedido que nunca vai ser pago.
    await sb.rpc('cancelar_meu_pedido', { p_order: orderId });
    return NextResponse.json(
      { error: 'A venda de ingressos pagos ainda não está habilitada nesta instalação.' },
      { status: 503 },
    );
  }

  const { data: evento } = await sb.from('events').select('title').eq('id', eventId).maybeSingle();
  const { cobranca, erro } = await criarPix({
    orderId,
    totalCents,
    descricao: `Ingresso — ${evento?.title ?? 'evento'}`,
    email,
    nome,
    notificationUrl: urlWebhook(request),
    expiraEm: new Date(Date.now() + 15 * 60 * 1000),
  });

  if (!cobranca) {
    await sb.rpc('cancelar_meu_pedido', { p_order: orderId });
    return NextResponse.json({ error: erro ?? 'Não foi possível gerar o PIX.' }, { status: 502 });
  }

  await sb
    .from('ticket_orders')
    .update({ payment_provider: 'mercadopago', payment_ref: cobranca.paymentId })
    .eq('id', orderId);

  return NextResponse.json(
    {
      orderId,
      totalCents,
      status: 'pendente',
      gratuito: false,
      pix: {
        copiaECola: cobranca.copiaECola,
        qrBase64: cobranca.qrBase64,
        expiraEm: cobranca.expiraEm,
      },
    },
    { status: 201 },
  );
}

/** O webhook precisa de URL pública; em desenvolvimento simplesmente não vai. */
function urlWebhook(request: Request): string | undefined {
  const base =
    (process.env.NEXT_PUBLIC_SITE_URL || '').trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    new URL(request.url).origin;
  if (!/^https:\/\//.test(base) || /localhost|127\.0\.0\.1/.test(base)) return undefined;
  return `${base.replace(/\/$/, '')}/api/ingressos/webhook`;
}

/** Tira o ruído do Postgres e deixa só a frase escrita para o comprador. */
function limparErroPg(msg: string): string {
  return msg.replace(/^.*?(?:ERROR|ERRO):\s*/i, '').split('\nCONTEXT')[0].trim() || 'Não foi possível concluir a compra.';
}
