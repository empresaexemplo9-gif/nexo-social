import { NextResponse } from 'next/server';
import { arquivosDasFotos, exigirSessao, falha, fotosDasLinhas, idInvalido, membrosDoGrupo, texto } from '@/lib/comunidade';
import { ehTipoPost, youtubeIdDe, type Post } from '@/lib/comunidade-tipos';
import { caminhoValido } from '@/lib/imagens-url';
import { isUuid, profilesByIds } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** Mural do grupo, do mais novo ao mais antigo, com as fotos. `?antes=<data>` pagina. */
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

  // Nomes e fotos de perfil: dos membros atuais; de quem já saiu, pelo perfil.
  const nomes = new Map<string, string>();
  const avatares = new Map<string, string | null>();
  try {
    for (const m of await membrosDoGrupo(s.sb, params.id)) {
      nomes.set(m.userId, m.name);
      avatares.set(m.userId, m.avatarPath);
    }
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
  const idsDeFoto = rows.filter((r) => r.kind === 'foto').map((r) => r.id);
  const { data: linhasDeFoto } = idsDeFoto.length
    ? await s.sb.from('community_photos').select('*').in('post_id', idsDeFoto).order('created_at')
    : { data: [] as any[] };
  const fotos = await fotosDasLinhas(s.sb, linhasDeFoto ?? [], { nomes, meuId: s.user.id, souDono });

  // Quantos comentários cada publicação tem (sem a tabela ainda, zero).
  const comentarios = new Map<string, number>();
  if (rows.length) {
    const { data: cs } = await s.sb.from('community_post_comments').select('post_id').in('post_id', rows.map((r) => r.id)).limit(5000);
    for (const c of (cs ?? []) as { post_id: string }[]) comentarios.set(c.post_id, (comentarios.get(c.post_id) ?? 0) + 1);
  }

  const posts: Post[] = rows
    .map((r) => ({
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
      authorAvatar: avatares.get(r.author_id) ?? null,
      podeApagar: souDono || r.author_id === s.user.id,
      fotos: fotos.filter((f) => f.postId === r.id),
      comentarios: comentarios.get(r.id) ?? 0,
    }))
    // Publicação de fotos que ficou sem foto e sem texto não tem o que mostrar.
    .filter((p) => p.kind !== 'foto' || p.fotos.length || p.body);
  return NextResponse.json({ posts, fim: rows.length < 30 });
}

/**
 * Compartilha com o grupo: fotos, livro, música, clipe, filme, link ou recado.
 *
 * Fotos: o navegador já subiu as imagens para o Storage (bucket "comunidade",
 * pasta do grupo) e manda aqui só os caminhos — `fotos: [{path, thumbPath,
 * width, height}]` — e, se quiser, o `albumId` onde elas entram.
 */
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

  const pasta = `grupos/${params.id}`;
  const fotos: { path: string; thumbPath: string | null; width: number | null; height: number | null }[] = [];
  if (kind === 'foto') {
    const lista = Array.isArray(b?.fotos) ? b.fotos.slice(0, 20) : [];
    for (const f of lista) {
      if (!caminhoValido(f?.path, pasta) || (f?.thumbPath && !caminhoValido(f.thumbPath, pasta))) {
        return NextResponse.json({ error: 'Foto inválida.' }, { status: 400 });
      }
      const dim = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 && (v as number) <= 10000 ? (v as number) : null);
      fotos.push({ path: f.path, thumbPath: f.thumbPath || null, width: dim(f.width), height: dim(f.height) });
    }
    if (!fotos.length) return NextResponse.json({ error: 'Escolha ao menos uma foto.' }, { status: 400 });
    if (b?.albumId && !isUuid(b.albumId)) return NextResponse.json({ error: 'Álbum inválido.' }, { status: 400 });
  } else if (kind === 'recado' ? !body : !title) {
    return NextResponse.json({ error: kind === 'recado' ? 'Escreva o recado.' : 'Informe o título.' }, { status: 400 });
  }
  if (kind === 'link' && !url) return NextResponse.json({ error: 'Cole o endereço do link.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_posts')
    .insert({
      group_id: params.id,
      author_id: s.user.id,
      kind,
      title: kind === 'foto' ? null : title,
      subtitle: kind === 'foto' ? null : texto(b?.subtitle, 200),
      url: kind === 'foto' ? null : url,
      body,
      youtube_id: kind === 'foto' ? null : youtubeIdDe(url),
    })
    .select('id')
    .maybeSingle();
  if (error || !data) return falha(error, 'Falha ao publicar.');

  if (fotos.length) {
    const { error: e2 } = await s.sb.from('community_photos').insert(
      fotos.map((f) => ({
        group_id: params.id,
        post_id: data.id,
        album_id: b?.albumId || null,
        uploader_id: s.user.id,
        storage_path: f.path,
        thumb_path: f.thumbPath,
        width: f.width,
        height: f.height,
      })),
    );
    if (e2) {
      // Sem as fotos, a publicação não faz sentido.
      await s.sb.from('community_posts').delete().eq('id', data.id);
      return falha(e2, 'Falha ao guardar as fotos.');
    }
  }
  return NextResponse.json({ ok: true, id: data.id });
}

/** DELETE ?postId=<id> — autor ou dono do grupo. As fotos da publicação vão junto. */
export async function DELETE(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const postId = new URL(request.url).searchParams.get('postId') || '';
  if (!isUuid(postId)) return NextResponse.json({ error: 'Publicação inválida.' }, { status: 400 });

  const { data: fotos } = await s.sb.from('community_photos').select('storage_path, thumb_path').eq('post_id', postId);
  const { data, error } = await s.sb
    .from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('group_id', params.id)
    .select('id');
  if (error) return falha(error, 'Falha ao apagar.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem publicou ou o dono do grupo apagam.' }, { status: 403 });
  if (fotos?.length) await s.sb.storage.from('comunidade').remove(arquivosDasFotos(fotos));
  return NextResponse.json({ ok: true });
}
