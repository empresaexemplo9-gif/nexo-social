import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido, membrosDoGrupo, texto } from '@/lib/comunidade';
import { ehTipoPost, youtubeIdDe, type Post } from '@/lib/comunidade-tipos';
import { isUuid, profilesByIds } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** Mural do grupo, do mais novo ao mais antigo. `?antes=<data>` pagina. */
export async function GET(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const antes = new URL(request.url).searchParams.get('antes');
  let q = s.sb.from('community_posts').select('*').eq('group_id', params.id).order('created_at', { ascending: false }).limit(30);
  if (antes && !Number.isNaN(Date.parse(antes))) q = q.lt('created_at', antes);

  const [{ data, error }, grupo] = await Promise.all([
    q,
    s.sb.from('community_groups').select('owner_id').eq('id', params.id).maybeSingle(),
  ]);
  if (error) return falha(error, 'Falha ao carregar o mural.');
  const rows = data ?? [];

  // Nomes: dos membros atuais; de quem já saiu, pelo perfil (se visível).
  const nomes = new Map<string, string>();
  try {
    for (const m of await membrosDoGrupo(s.sb, params.id)) nomes.set(m.userId, m.name);
  } catch {
    /* sem nomes, o mural ainda funciona */
  }
  const faltam = rows.map((r) => r.author_id).filter((id) => !nomes.has(id));
  if (faltam.length) {
    for (const [id, p] of Array.from((await profilesByIds(s.sb, faltam)).entries())) {
      nomes.set(id, p.name || p.email?.split('@')[0] || 'Ex-membro');
    }
  }

  const souDono = grupo.data?.owner_id === s.user.id;
  const posts: Post[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title ?? null,
    subtitle: r.subtitle ?? null,
    url: r.url ?? null,
    body: r.body ?? null,
    youtubeId: r.youtube_id ?? null,
    createdAt: r.created_at,
    authorId: r.author_id,
    authorName: nomes.get(r.author_id) ?? 'Ex-membro',
    podeApagar: souDono || r.author_id === s.user.id,
  }));
  return NextResponse.json({ posts, fim: rows.length < 30 });
}

/** Compartilha um livro, música, clipe, filme, link ou recado com o grupo. */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  const kind = ehTipoPost(b?.kind) ? b.kind : 'recado';
  const title = texto(b?.title, 200);
  const body = texto(b?.body, 2000);
  let url = texto(b?.url, 1000);
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url) {
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'O link não parece um endereço válido.' }, { status: 400 });
    }
  }

  if (kind === 'recado' ? !body : !title) {
    return NextResponse.json({ error: kind === 'recado' ? 'Escreva o recado.' : 'Informe o título.' }, { status: 400 });
  }
  if (kind === 'link' && !url) return NextResponse.json({ error: 'Cole o endereço do link.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_posts')
    .insert({
      group_id: params.id,
      author_id: s.user.id,
      kind,
      title,
      subtitle: texto(b?.subtitle, 200),
      url,
      body,
      youtube_id: youtubeIdDe(url),
    })
    .select('id')
    .maybeSingle();
  if (error || !data) return falha(error, 'Falha ao publicar.');
  return NextResponse.json({ ok: true, id: data.id });
}

/** DELETE ?postId=<id> — autor ou dono do grupo. */
export async function DELETE(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const postId = new URL(request.url).searchParams.get('postId') || '';
  if (!isUuid(postId)) return NextResponse.json({ error: 'Publicação inválida.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('group_id', params.id)
    .select('id');
  if (error) return falha(error, 'Falha ao apagar.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem publicou ou o dono do grupo apagam.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
