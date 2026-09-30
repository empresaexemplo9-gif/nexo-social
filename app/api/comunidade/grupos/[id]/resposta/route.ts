import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido } from '@/lib/comunidade';
import { despacharAgora } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** Resposta ao convite do grupo: positivo entra, negativo recusa. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  if (typeof b?.aceitar !== 'boolean') {
    return NextResponse.json({ error: 'Responda com aceitar: true ou false.' }, { status: 400 });
  }

  const { data, error } = await s.sb.rpc('respond_group_invite', { p_group: params.id, p_accept: b.aceitar });
  if (error) return falha(error, 'Falha ao responder o convite.');
  await despacharAgora();
  return NextResponse.json({ ok: true, status: data });
}
