import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido, texto } from '@/lib/comunidade';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string; albumId: string } };

/** Renomeia o álbum ou muda a descrição. Quem criou ou o dono do grupo. */
export async function PATCH(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;
  if (!isUuid(params.albumId)) return NextResponse.json({ error: 'Álbum inválido.' }, { status: 400 });

  const b = await request.json().catch(() => null);
  const mudancas: Record<string, string | null> = {};
  if (b?.title !== undefined) {
    const title = texto(b.title, 120);
    if (!title) return NextResponse.json({ error: 'O álbum precisa de um nome.' }, { status: 400 });
    mudancas.title = title;
  }
  if (b?.description !== undefined) mudancas.description = texto(b.description, 500);
  if (!Object.keys(mudancas).length) return NextResponse.json({ error: 'Nada para mudar.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_albums')
    .update(mudancas)
    .eq('id', params.albumId)
    .eq('group_id', params.id)
    .select('id, title, description');
  if (error) return falha(error, 'Falha ao salvar o álbum.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem criou o álbum ou o dono do grupo podem mudá-lo.' }, { status: 403 });
  return NextResponse.json({ ok: true, album: data[0] });
}

/** Apaga o álbum. As fotos continuam no grupo (só saem do álbum). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;
  if (!isUuid(params.albumId)) return NextResponse.json({ error: 'Álbum inválido.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_albums')
    .delete()
    .eq('id', params.albumId)
    .eq('group_id', params.id)
    .select('id');
  if (error) return falha(error, 'Falha ao apagar o álbum.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem criou o álbum ou o dono do grupo podem apagá-lo.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
