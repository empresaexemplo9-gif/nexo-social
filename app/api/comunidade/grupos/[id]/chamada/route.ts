import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido } from '@/lib/comunidade';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

/**
 * POST { para?, video } — avisa que a chamada começou: sem `para`, todos os
 * membros do grupo; com `para`, só a pessoa chamada (chamada a dois). O aviso
 * chega na hora nas notificações e toca como telefone (AvisoDeChamada). O
 * banco não repete o mesmo toque antes de 2 minutos.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  if (b?.para !== undefined && b.para !== null && !isUuid(b.para)) {
    return NextResponse.json({ error: 'Pessoa inválida.' }, { status: 400 });
  }
  const { data, error } = await s.sb.rpc('start_group_call', {
    p_group: params.id,
    p_target: b?.para ?? null,
    p_video: b?.video !== false,
  });
  if (error) return falha(error, 'Não deu para avisar a chamada.');
  return NextResponse.json({ ok: true, avisados: data ?? 0 });
}
