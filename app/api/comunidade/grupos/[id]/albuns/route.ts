import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido, membrosDoGrupo, seBanido, texto } from '@/lib/comunidade';
import type { Album } from '@/lib/comunidade-tipos';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** Álbuns do grupo, com a quantidade de fotos e a capa (a foto mais recente). */
export async function GET(_req: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const [{ data: albuns, error }, grupo] = await Promise.all([
    s.sb.from('community_albums').select('*').eq('group_id', params.id).order('created_at', { ascending: false }),
    s.sb.from('community_groups').select('owner_id').eq('id', params.id).maybeSingle(),
  ]);
  if (error) return falha(error, 'Falha ao carregar os álbuns.');
  const lista = albuns ?? [];

  // Contagem e capa numa consulta só (a mais nova de cada álbum vem primeiro).
  const { data: fotos } = lista.length
    ? await s.sb
        .from('community_photos')
        .select('album_id, thumb_path, storage_path, created_at')
        .in('album_id', lista.map((a) => a.id))
        .order('created_at', { ascending: false })
    : { data: [] as any[] };
  const contagem = new Map<string, number>();
  const capa = new Map<string, string>();
  for (const f of fotos ?? []) {
    contagem.set(f.album_id, (contagem.get(f.album_id) ?? 0) + 1);
    if (!capa.has(f.album_id)) capa.set(f.album_id, f.thumb_path || f.storage_path);
  }
  const links = new Map<string, string>();
  if (capa.size) {
    const { data } = await s.sb.storage.from('comunidade').createSignedUrls(Array.from(capa.values()), 12 * 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) links.set(d.path, d.signedUrl);
  }

  const nomes = new Map<string, string>();
  try {
    for (const m of await membrosDoGrupo(s.sb, params.id)) nomes.set(m.userId, m.name);
  } catch {
    /* segue sem nomes */
  }
  const souDono = grupo.data?.owner_id === s.user.id;
  const resposta: Album[] = lista.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description ?? null,
    createdBy: a.created_by,
    createdByName: nomes.get(a.created_by) ?? 'Ex-membro',
    photoCount: contagem.get(a.id) ?? 0,
    coverUrl: capa.has(a.id) ? links.get(capa.get(a.id)!) ?? null : null,
    createdAt: a.created_at,
    podeEditar: souDono || a.created_by === s.user.id,
  }));
  return NextResponse.json({ albuns: resposta });
}

/** Cria um álbum. Qualquer membro. */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  const title = texto(b?.title, 120);
  if (!title) return NextResponse.json({ error: 'Dê um nome ao álbum.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_albums')
    .insert({ group_id: params.id, created_by: s.user.id, title, description: texto(b?.description, 500) })
    .select('id')
    .maybeSingle();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error || !data) return falha(error, 'Falha ao criar o álbum.');
  return NextResponse.json({ ok: true, id: data.id });
}
