import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { ehReacao, type Reacao } from '@/lib/mural-tipos';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/**
 * POST /api/listas/<id>/reacao { itemId?, reacao } — reação à lista inteira
 * (sem itemId) ou a um item; uma por pessoa em cada um. `null` tira.
 */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Lista inválida.' }, { status: 400 });
  const b = await request.json().catch(() => null);
  const itemId = b?.itemId ? String(b.itemId) : null;
  if (itemId && !isUuid(itemId)) return NextResponse.json({ error: 'Item inválido.' }, { status: 400 });
  const reacao = b?.reacao ?? null;
  if (reacao !== null && !ehReacao(reacao)) return NextResponse.json({ error: 'Reação inválida.' }, { status: 400 });

  // A reação antiga sai (o índice único é parcial: um para a lista, outro por item).
  let apagar = s.sb.from('lista_reacoes').delete().eq('lista_id', params.id).eq('user_id', s.user.id);
  apagar = itemId ? apagar.eq('item_id', itemId) : apagar.is('item_id', null);
  const { error: e1 } = await apagar;
  if (e1) return NextResponse.json({ error: 'Não foi possível reagir agora.' }, { status: 500 });
  if (reacao) {
    const { error } = await s.sb.from('lista_reacoes').insert({ lista_id: params.id, item_id: itemId, user_id: s.user.id, reacao });
    if (error?.code === '42501') return NextResponse.json({ error: 'Esta lista não está visível para você.' }, { status: 403 });
    if (error && error.code !== '23505') return NextResponse.json({ error: 'Não foi possível reagir agora.' }, { status: 500 });
  }

  let contar = s.sb.from('lista_reacoes').select('reacao').eq('lista_id', params.id).limit(5000);
  contar = itemId ? contar.eq('item_id', itemId) : contar.is('item_id', null);
  const { data } = await contar;
  const reacoes: Partial<Record<Reacao, number>> = {};
  for (const r of (data ?? []) as { reacao: Reacao }[]) reacoes[r.reacao] = (reacoes[r.reacao] ?? 0) + 1;
  return NextResponse.json({ reacoes, minhaReacao: reacao });
}
