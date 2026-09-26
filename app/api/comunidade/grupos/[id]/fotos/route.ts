import { NextResponse } from 'next/server';
import { arquivosDasFotos, exigirSessao, falha, fotosDasLinhas, idInvalido, membrosDoGrupo } from '@/lib/comunidade';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** Fotos do grupo (todas, ou `?album=<id>`), da mais nova à mais antiga. `?antes=` pagina. */
export async function GET(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const sp = new URL(request.url).searchParams;
  const album = sp.get('album');
  const antes = sp.get('antes');
  if (album && !isUuid(album)) return NextResponse.json({ error: 'Álbum inválido.' }, { status: 400 });

  let q = s.sb.from('community_photos').select('*').eq('group_id', params.id).order('created_at', { ascending: false }).limit(60);
  if (album) q = q.eq('album_id', album);
  if (antes && !Number.isNaN(Date.parse(antes))) q = q.lt('created_at', antes);

  const [{ data, error }, grupo] = await Promise.all([
    q,
    s.sb.from('community_groups').select('owner_id').eq('id', params.id).maybeSingle(),
  ]);
  if (error) return falha(error, 'Falha ao carregar as fotos.');

  const nomes = new Map<string, string>();
  try {
    for (const m of await membrosDoGrupo(s.sb, params.id)) nomes.set(m.userId, m.name);
  } catch {
    /* sem nomes, as fotos ainda aparecem */
  }
  const fotos = await fotosDasLinhas(s.sb, data ?? [], { nomes, meuId: s.user.id, souDono: grupo.data?.owner_id === s.user.id });
  return NextResponse.json({ fotos, fim: (data ?? []).length < 60 });
}

/** Põe fotos num álbum (ou tira: `albumId: null`). Quem enviou ou o dono do grupo. */
export async function PATCH(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  const ids = (Array.isArray(b?.fotoIds) ? b.fotoIds : []).filter(isUuid).slice(0, 100);
  const albumId = b?.albumId ?? null;
  if (!ids.length) return NextResponse.json({ error: 'Escolha as fotos.' }, { status: 400 });
  if (albumId !== null && !isUuid(albumId)) return NextResponse.json({ error: 'Álbum inválido.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_photos')
    .update({ album_id: albumId })
    .eq('group_id', params.id)
    .in('id', ids)
    .select('id');
  if (error) return falha(error, 'Falha ao mover as fotos.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem enviou a foto ou o dono do grupo podem movê-la.' }, { status: 403 });
  return NextResponse.json({ ok: true, movidas: data.length });
}

/** DELETE ?fotoId=<id> — quem enviou ou o dono do grupo. Sai do Storage também. */
export async function DELETE(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const fotoId = new URL(request.url).searchParams.get('fotoId') || '';
  if (!isUuid(fotoId)) return NextResponse.json({ error: 'Foto inválida.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_photos')
    .delete()
    .eq('id', fotoId)
    .eq('group_id', params.id)
    .select('storage_path, thumb_path');
  if (error) return falha(error, 'Falha ao apagar a foto.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem enviou a foto ou o dono do grupo podem apagá-la.' }, { status: 403 });
  await s.sb.storage.from('comunidade').remove(arquivosDasFotos(data));
  return NextResponse.json({ ok: true });
}
