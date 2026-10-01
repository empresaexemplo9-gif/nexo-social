import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { autores } from '@/lib/mural';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** POST /api/listas/<id>/comentarios { itemId?, corpo } — comenta a lista inteira ou um item. */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Lista inválida.' }, { status: 400 });
  const b = await request.json().catch(() => null);
  const corpo = texto(b?.corpo, 1000);
  if (!corpo) return NextResponse.json({ error: 'Escreva o comentário.' }, { status: 400 });
  const itemId = b?.itemId ? String(b.itemId) : null;
  if (itemId && !isUuid(itemId)) return NextResponse.json({ error: 'Item inválido.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('lista_comentarios')
    .insert({ lista_id: params.id, item_id: itemId, autor_id: s.user.id, corpo })
    .select('id, item_id, corpo, created_at')
    .single();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error?.code === '42501') return NextResponse.json({ error: 'Esta lista não existe mais ou não está visível para você.' }, { status: 404 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível comentar agora.' }, { status: 500 });
  const pessoas = await autores(s.sb, [s.user.id]);
  return NextResponse.json({
    comentario: {
      id: data.id,
      itemId: data.item_id ?? null,
      autor: pessoas.get(s.user.id) ?? { id: s.user.id, nome: 'Você', avatarPath: null },
      corpo: data.corpo,
      criadoEm: data.created_at,
      podeApagar: true,
    },
  }, { status: 201 });
}

/** DELETE /api/listas/<id>/comentarios?id=<comentário> — apaga quem comentou ou quem criou a lista. */
export async function DELETE(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!isUuid(params.id) || !isUuid(id)) return NextResponse.json({ error: 'Comentário inválido.' }, { status: 400 });
  const { data, error } = await s.sb.from('lista_comentarios').delete().eq('id', id).eq('lista_id', params.id).select('id');
  if (error) return NextResponse.json({ error: 'Não foi possível apagar.' }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Só quem comentou ou quem criou a lista apagam.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
