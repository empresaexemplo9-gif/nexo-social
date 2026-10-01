import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { autores } from '@/lib/mural';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** POST /api/mural/<id>/opinioes — dá uma opinião (ou responde a outra da mesma publicação). */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Publicação inválida.' }, { status: 400 });
  const b = await request.json().catch(() => null);
  const corpo = texto(b?.corpo, 2000);
  if (!corpo) return NextResponse.json({ error: 'Escreva a sua opinião.' }, { status: 400 });

  const { data: pub } = await s.sb.from('publicacoes').select('id, autor_id').eq('id', params.id).maybeSingle();
  if (!pub) return NextResponse.json({ error: 'Esta publicação não existe mais ou não está visível para você.' }, { status: 404 });

  // Resposta só a uma opinião desta mesma publicação.
  let respostaA: string | null = null;
  if (b?.respostaA && isUuid(String(b.respostaA))) {
    const { data: original } = await s.sb.from('publicacao_comentarios').select('id').eq('id', b.respostaA).eq('publicacao_id', params.id).maybeSingle();
    respostaA = original?.id ?? null;
  }

  const { data, error } = await s.sb
    .from('publicacao_comentarios')
    .insert({ publicacao_id: params.id, autor_id: s.user.id, resposta_a: respostaA, corpo })
    .select('id, autor_id, corpo, resposta_a, created_at')
    .single();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error || !data) return NextResponse.json({ error: 'Não foi possível opinar agora.' }, { status: 500 });
  const pessoas = await autores(s.sb, [s.user.id]);
  return NextResponse.json({
    opiniao: {
      id: data.id,
      autor: pessoas.get(s.user.id) ?? { id: s.user.id, nome: 'Você', avatarPath: null },
      corpo: data.corpo,
      respostaA: data.resposta_a ?? null,
      criadaEm: data.created_at,
      podeApagar: true,
    },
  }, { status: 201 });
}

/** DELETE /api/mural/<id>/opinioes?id=<opinião> — apaga quem opinou ou quem publicou. */
export async function DELETE(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!isUuid(params.id) || !isUuid(id)) return NextResponse.json({ error: 'Opinião inválida.' }, { status: 400 });
  const { data, error } = await s.sb.from('publicacao_comentarios').delete().eq('id', id).eq('publicacao_id', params.id).select('id');
  if (error) return NextResponse.json({ error: 'Não foi possível apagar.' }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Só quem opinou ou quem publicou apagam.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
