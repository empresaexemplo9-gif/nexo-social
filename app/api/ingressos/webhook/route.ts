import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { assinaturaValida, consultarPagamento, pagamentoConfigurado } from '@/lib/pagamento';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ingressos/webhook — aviso de pagamento do Mercado Pago.
 *
 * Duas regras que definem este arquivo:
 *
 * 1. NADA do corpo da requisição é levado a sério além do id do pagamento.
 *    A rota é pública — qualquer um pode inventar um POST dizendo "pago". Por
 *    isso perguntamos a situação ao Mercado Pago com o nosso access token, e é
 *    essa resposta que decide. Mesmo que a assinatura passe, a confirmação vem
 *    da consulta autenticada.
 *
 * 2. Qual pedido confirmar sai do `external_reference` que o Mercado Pago
 *    devolve — não de um id que o chamador mandou.
 *
 * Responder 200 mesmo em caso ignorado é proposital: o Mercado Pago reenvia o
 * aviso enquanto não receber 2xx, e reprocessar não faz mal (a emissão é
 * idempotente), mas repetir à toa só enche o log.
 */
export async function POST(request: Request) {
  if (!pagamentoConfigurado()) {
    return NextResponse.json({ ok: true, ignorado: 'pagamento não configurado' });
  }

  let corpo: any;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: true, ignorado: 'corpo inválido' });
  }

  const tipo = corpo?.type ?? corpo?.topic;
  if (tipo && tipo !== 'payment') {
    return NextResponse.json({ ok: true, ignorado: `evento ${tipo}` });
  }

  const paymentId = String(corpo?.data?.id ?? corpo?.resource ?? '').split('/').pop() ?? '';
  if (!paymentId) return NextResponse.json({ ok: true, ignorado: 'sem id de pagamento' });

  if (!assinaturaValida(request.headers, paymentId)) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
  }

  // A fonte da verdade. O corpo do POST só disse em qual pagamento olhar.
  const { status, orderId, erro } = await consultarPagamento(paymentId);
  if (erro) {
    console.error('[webhook] Falha ao consultar o pagamento:', erro);
    return NextResponse.json({ error: 'Falha ao consultar o pagamento.' }, { status: 502 });
  }
  if (!orderId) return NextResponse.json({ ok: true, ignorado: 'pagamento sem pedido associado' });

  const admin = createAdminClient();
  if (!admin) {
    console.error('[webhook] Falta SUPABASE_SERVICE_ROLE_KEY — não dá para emitir o ingresso.');
    return NextResponse.json({ error: 'Servidor sem credencial para emitir.' }, { status: 500 });
  }

  if (status === 'approved') {
    // Idempotente no banco: reenvio do mesmo aviso não duplica ingresso.
    const { error } = await admin.rpc('confirmar_pedido_ingresso', { p_order: orderId, p_ref: paymentId });
    if (error) {
      console.error('[webhook] Falha ao confirmar:', error.message);
      return NextResponse.json({ error: 'Falha ao confirmar o pedido.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pedido: orderId, acao: 'confirmado' });
  }

  if (status === 'cancelled' || status === 'rejected' || status === 'refunded') {
    const { error } = await admin.rpc('cancelar_pedido_ingresso', { p_order: orderId, p_motivo: 'cancelado' });
    if (error) console.error('[webhook] Falha ao cancelar:', error.message);
    return NextResponse.json({ ok: true, pedido: orderId, acao: 'cancelado' });
  }

  return NextResponse.json({ ok: true, pedido: orderId, acao: `ignorado (${status})` });
}

// O Mercado Pago faz uma checagem GET na URL ao cadastrá-la no painel.
export async function GET() {
  return NextResponse.json({ ok: true, servico: 'webhook de ingressos da nexo.social' });
}
