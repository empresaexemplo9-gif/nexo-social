import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { ehReacao, type Reacao } from '@/lib/mural-tipos';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** POST /api/mural/<id>/reacao { reacao } — uma reação por pessoa; `null` tira a reação. */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Publicação inválida.' }, { status: 400 });
  const b = await request.json().catch(() => null);
  const reacao = b?.reacao ?? null;
  if (reacao !== null && !ehReacao(reacao)) return NextResponse.json({ error: 'Reação inválida.' }, { status: 400 });

  const { error } = reacao
    ? await s.sb.from('publicacao_reacoes').upsert({ publicacao_id: params.id, user_id: s.user.id, reacao }, { onConflict: 'publicacao_id,user_id' })
    : await s.sb.from('publicacao_reacoes').delete().eq('publicacao_id', params.id).eq('user_id', s.user.id);
  if (error?.code === '42501') return NextResponse.json({ error: 'Esta publicação não está visível para você.' }, { status: 403 });
  if (error) return NextResponse.json({ error: 'Não foi possível reagir agora.' }, { status: 500 });

  const { data } = await s.sb.from('publicacao_reacoes').select('reacao').eq('publicacao_id', params.id).limit(5000);
  const reacoes: Partial<Record<Reacao, number>> = {};
  for (const r of (data ?? []) as { reacao: Reacao }[]) reacoes[r.reacao] = (reacoes[r.reacao] ?? 0) + 1;
  return NextResponse.json({ reacoes, minhaReacao: reacao });
}
