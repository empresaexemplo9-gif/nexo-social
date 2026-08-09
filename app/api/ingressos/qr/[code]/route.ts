import QRCode from 'qrcode';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ingressos/qr/<code> — o QR Code de entrada, em PNG.
 *
 * Gerado no servidor de propósito: o `qrcode` não vai para o pacote do
 * navegador, e a imagem só sai depois que a RLS confirma que quem pede é o dono
 * do ingresso (ou quem organiza o evento). Um código adivinhado não vira QR.
 */
export async function GET(_request: Request, { params }: { params: { code: string } }) {
  const { sb, user } = await getSession();
  if (!sb || !user) return new Response('Não autenticado.', { status: 401 });

  const code = (params.code || '').trim().toUpperCase().slice(0, 60);
  if (!/^[A-Z0-9]+$/.test(code)) return new Response('Código inválido.', { status: 400 });

  const { data: ingresso } = await sb.from('tickets').select('code').eq('code', code).maybeSingle();
  if (!ingresso) return new Response('Ingresso não encontrado.', { status: 404 });

  const png = await QRCode.toBuffer(code, {
    type: 'png',
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#09090b', light: '#ffffff' },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // Privado: é o ingresso de uma pessoa, não pode ficar em cache de CDN.
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
