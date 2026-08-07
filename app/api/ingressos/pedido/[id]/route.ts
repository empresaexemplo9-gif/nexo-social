import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import { consultarPagamento, pagamentoConfigurado } from '@/lib/pagamento';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ingressos/pedido/<id> — situação do pedido e ingressos emitidos.
 *
 * A tela do PIX chama isto de tempos em tempos. Quando o pedido ainda está
 * pendente, perguntamos ao Mercado Pago em vez de só esperar o webhook: em
 * ambiente sem URL pública o webhook nunca chega, e mesmo em produção ele pode
 * atrasar. Assim o comprador vê o ingresso liberar assim que o PIX cai.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  // A RLS já limita ao próprio pedido (ou ao organizador do evento).
  const { data: pedido, error } = await sb
    .from('ticket_orders')
    .select('id, status, total_cents, event_id, payment_ref, expires_at, paid_at')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  let status = pedido.status as string;

  if (status === 'pendente' && pedido.payment_ref && pagamentoConfigurado()) {
    status = await reconciliar(pedido.id, pedido.payment_ref, status);
  }

  const { data: ingressos } = await sb
    .from('tickets')
    .select('id, code, status, holder_name')
    .eq('order_id', params.id)
    .order('code');

  return NextResponse.json({
    pedido: { ...pedido, status },
    ingressos: ingressos ?? [],
  });
}

/**
 * Pergunta a situação real ao Mercado Pago e, se estiver pago, confirma.
 *
 * A confirmação usa o cliente de service role de propósito: emitir ingresso é
 * operação interna, revogada para `authenticated` no schema. Nada aqui confia
 * no navegador — o que decide é a resposta autenticada do Mercado Pago.
 */
async function reconciliar(orderId: string, paymentRef: string, atual: string): Promise<string> {
  const { status: statusMp } = await consultarPagamento(paymentRef);
  if (statusMp !== 'approved') {
    return statusMp === 'cancelled' || statusMp === 'rejected' ? atual : atual;
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error('[ingressos] PIX aprovado mas falta SUPABASE_SERVICE_ROLE_KEY para emitir.');
    return atual;
  }

  const { error } = await admin.rpc('confirmar_pedido_ingresso', { p_order: orderId, p_ref: paymentRef });
  if (error) {
    console.error('[ingressos] Falha ao confirmar o pedido:', error.message);
    return atual;
  }
  return 'pago';
}
