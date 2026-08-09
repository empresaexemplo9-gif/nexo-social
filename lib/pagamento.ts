import 'server-only';
import crypto from 'crypto';

// Pagamento do ingresso DENTRO da plataforma.
//
// A decisão que molda este arquivo: usamos a API de Pagamentos do Mercado Pago
// (Checkout Transparente), não o Checkout Pro. O Checkout Pro devolve um link
// `init_point` e manda o comprador para o site do Mercado Pago — exatamente o
// redirecionamento que não queremos. A API de Pagamentos devolve o PIX pronto
// (copia-e-cola + QR em base64), que a nexo.social desenha na própria tela.
//
// Cartão não entra aqui de propósito: tokenizar cartão exige o SDK do Mercado
// Pago rodando no navegador e responsabilidade de PCI. PIX resolve o caso
// brasileiro inteiro sem sair da plataforma, e é aprovado em segundos.
//
// Sem MERCADOPAGO_ACCESS_TOKEN nada disso é necessário: ingresso gratuito é
// confirmado direto no banco, sem provedor de pagamento nenhum.

const MP_BASE = 'https://api.mercadopago.com';
const TIMEOUT_MS = 15000;

export interface CobrancaPix {
  /** id do pagamento no Mercado Pago — é o que o webhook manda de volta. */
  paymentId: string;
  status: string;
  /** Código copia-e-cola. */
  copiaECola: string;
  /** PNG do QR em base64, sem o prefixo data:. */
  qrBase64: string;
  expiraEm: string | null;
}

function token(): string {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
}

export function pagamentoConfigurado(): boolean {
  return Boolean(token());
}

/** Diagnóstico para /api/health e a aba de integrações. */
export function statusPagamento(): { ok: boolean; motivo: string } {
  const t = token();
  if (!t) {
    return {
      ok: false,
      motivo:
        'MERCADOPAGO_ACCESS_TOKEN não configurada. Ingressos gratuitos funcionam normalmente; ingressos pagos ficam indisponíveis.',
    };
  }
  if (t.startsWith('TEST-')) {
    return { ok: true, motivo: 'Credencial de TESTE do Mercado Pago — os pagamentos não são reais.' };
  }
  if (!t.startsWith('APP_USR-')) {
    return {
      ok: false,
      motivo:
        'MERCADOPAGO_ACCESS_TOKEN com formato inesperado. Copie o Access Token em Mercado Pago → Suas integrações → Credenciais.',
    };
  }
  return { ok: true, motivo: 'Credencial de produção do Mercado Pago presente.' };
}

async function chamar(caminho: string, init: RequestInit = {}): Promise<{ res: Response; corpo: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${MP_BASE}${caminho}`, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    const texto = await res.text();
    let corpo: any = null;
    try {
      corpo = texto ? JSON.parse(texto) : null;
    } catch {
      corpo = { message: texto.slice(0, 300) };
    }
    return { res, corpo };
  } finally {
    clearTimeout(timer);
  }
}

function mensagemErro(corpo: any, status: number): string {
  const causa = Array.isArray(corpo?.cause) && corpo.cause[0]?.description;
  return causa || corpo?.message || corpo?.error || `Mercado Pago respondeu ${status}.`;
}

/**
 * Cria a cobrança PIX de um pedido.
 *
 * `external_reference` leva o id do pedido: é assim que o webhook sabe qual
 * pedido confirmar sem confiar em nada que venha do navegador.
 */
export async function criarPix(params: {
  orderId: string;
  totalCents: number;
  descricao: string;
  email: string;
  nome: string;
  notificationUrl?: string;
  expiraEm?: Date;
}): Promise<{ cobranca?: CobrancaPix; erro?: string }> {
  if (!token()) {
    return { erro: 'Pagamento não configurado nesta instalação (falta MERCADOPAGO_ACCESS_TOKEN).' };
  }

  const [primeiro, ...resto] = (params.nome || 'Comprador').trim().split(/\s+/);
  const corpoReq: Record<string, unknown> = {
    // O Mercado Pago cobra em reais decimais, não em centavos.
    transaction_amount: Number((params.totalCents / 100).toFixed(2)),
    description: params.descricao.slice(0, 250),
    payment_method_id: 'pix',
    external_reference: params.orderId,
    payer: {
      email: params.email,
      first_name: primeiro,
      last_name: resto.join(' ') || primeiro,
    },
  };
  if (params.notificationUrl) corpoReq.notification_url = params.notificationUrl;
  if (params.expiraEm) corpoReq.date_of_expiration = comOffset(params.expiraEm);

  const { res, corpo } = await chamar('/v1/payments', {
    method: 'POST',
    // Repetir a chamada do mesmo pedido não gera duas cobranças.
    headers: { 'X-Idempotency-Key': params.orderId },
    body: JSON.stringify(corpoReq),
  });

  if (!res.ok) return { erro: mensagemErro(corpo, res.status) };

  const dados = corpo?.point_of_interaction?.transaction_data;
  if (!dados?.qr_code) {
    return { erro: 'O Mercado Pago não devolveu o código PIX. Verifique se a conta tem chave PIX cadastrada.' };
  }

  return {
    cobranca: {
      paymentId: String(corpo.id),
      status: String(corpo.status ?? 'pending'),
      copiaECola: dados.qr_code,
      qrBase64: dados.qr_code_base64 ?? '',
      expiraEm: corpo?.date_of_expiration ?? null,
    },
  };
}

/** Consulta a situação de um pagamento direto na fonte. */
export async function consultarPagamento(
  paymentId: string,
): Promise<{ status?: string; orderId?: string; erro?: string }> {
  if (!token()) return { erro: 'Pagamento não configurado.' };
  const { res, corpo } = await chamar(`/v1/payments/${encodeURIComponent(paymentId)}`);
  if (!res.ok) return { erro: mensagemErro(corpo, res.status) };
  return { status: String(corpo?.status ?? ''), orderId: corpo?.external_reference ?? undefined };
}

/**
 * Confere a assinatura do webhook.
 *
 * O Mercado Pago manda `x-signature: ts=...,v1=...`, onde v1 é o HMAC-SHA256 de
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 *
 * Devolve `false` só quando a assinatura existe e está ERRADA. Sem segredo
 * configurado devolve `true` — e aí a segurança fica por conta de
 * `consultarPagamento`, que pergunta a situação real ao Mercado Pago em vez de
 * acreditar no corpo da requisição.
 */
export function assinaturaValida(headers: Headers, dataId: string): boolean {
  const segredo = (process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim();
  const assinatura = headers.get('x-signature') || '';
  if (!segredo || !assinatura) return true;

  const partes = Object.fromEntries(
    assinatura.split(',').map((p) => {
      const [k, ...v] = p.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const requestId = headers.get('x-request-id') || '';
  // O manifesto usa o id em minúsculas quando ele é alfanumérico.
  const id = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifesto = `id:${id};request-id:${requestId};ts:${ts};`;
  const esperado = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');

  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** `2026-08-07T15:04:05.000-03:00` — o formato que o Mercado Pago exige. */
function comOffset(d: Date): string {
  const pad = (n: number, casas = 2) => String(Math.abs(Math.floor(n))).padStart(casas, '0');
  const off = -d.getTimezoneOffset();
  const sinal = off >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `.${pad(d.getMilliseconds(), 3)}${sinal}${pad(off / 60)}:${pad(off % 60)}`
  );
}
