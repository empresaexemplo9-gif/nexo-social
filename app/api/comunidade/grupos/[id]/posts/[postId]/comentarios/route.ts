import { NextResponse } from 'next/server';
import { exigirSessao, idInvalido, minhaParticipacao, seBanido, texto } from '@/lib/comunidade';
import { isUuid, notify, profilesByIds } from '@/lib/social';
import { avataresPorId } from '@/lib/chat-mensagens';
import { semTabela } from '@/lib/erros-banco';
import type { Comentario } from '@/lib/comunidade-tipos';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string; postId: string } };

// A tabela de comentários ainda não foi criada no banco (semTabela).
const SEM_TABELA = () => NextResponse.json({ error: 'Os comentários ainda não foram ativados no banco.' }, { status: 503 });

/** Sessão + membro ativo do grupo + a publicação é deste grupo. */
async function publicacao(params: Ctx['params']) {
  const s = await exigirSessao();
  if (!s.ok) return { erro: s.response } as const;
  const inv = idInvalido(params.id);
  if (inv) return { erro: inv } as const;
  if (!isUuid(params.postId)) return { erro: NextResponse.json({ error: 'Publicação inválida.' }, { status: 400 }) } as const;
  const me = await minhaParticipacao(s.sb, params.id, s.user.id);
  if (!me || me.status !== 'ativo') return { erro: NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 }) } as const;
  const { data: post } = await s.sb.from('community_posts').select('id, author_id, title, kind').eq('id', params.postId).eq('group_id', params.id).maybeSingle();
  if (!post) return { erro: NextResponse.json({ error: 'Essa publicação não existe mais.' }, { status: 404 }) } as const;
  return { s, dono: me.role === 'dono', post: post as { id: string; author_id: string; title: string | null; kind: string } } as const;
}

/** GET — comentários da publicação, do mais antigo ao mais novo. */
export async function GET(_request: Request, { params }: Ctx) {
  const r = await publicacao(params);
  if ('erro' in r) return r.erro;
  const { s, dono } = r;

  const { data, error } = await s.sb
    .from('community_post_comments')
    .select('id, post_id, author_id, reply_to, body, created_at')
    .eq('post_id', params.postId)
    .eq('group_id', params.id)
    .order('created_at', { ascending: true })
    .limit(300);
  if (semTabela(error)) return SEM_TABELA();
  if (error) return NextResponse.json({ error: 'Falha ao carregar os comentários.' }, { status: 500 });

  const rows = (data ?? []) as { id: string; post_id: string; author_id: string; reply_to: string | null; body: string; created_at: string }[];
  const ids = rows.map((c) => c.author_id);
  const [nomes, fotos] = await Promise.all([profilesByIds(s.sb, ids), avataresPorId(s.sb, ids)]);
  const nome = (id: string) => (id === s.user.id ? 'Você' : nomes.get(id)?.name || nomes.get(id)?.email?.split('@')[0] || 'Membro');
  const porId = new Map(rows.map((c) => [c.id, c]));

  const comentarios: Comentario[] = rows.map((c) => {
    const o = c.reply_to ? porId.get(c.reply_to) : null;
    return {
      id: c.id,
      postId: c.post_id,
      authorId: c.author_id,
      authorName: nome(c.author_id),
      authorAvatar: fotos.get(c.author_id) ?? null,
      body: c.body,
      createdAt: c.created_at,
      podeApagar: dono || c.author_id === s.user.id,
      replyTo: o ? { id: o.id, authorName: nome(o.author_id), texto: o.body.slice(0, 140) } : null,
    };
  });
  return NextResponse.json({ comentarios, meuId: s.user.id }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** POST { body, replyTo? } — comenta (ou responde a um comentário desta publicação). */
export async function POST(request: Request, { params }: Ctx) {
  const r = await publicacao(params);
  if ('erro' in r) return r.erro;
  const { s, post } = r;

  const b = await request.json().catch(() => null);
  const body = texto(b?.body, 2000);
  if (!body) return NextResponse.json({ error: 'Escreva o comentário.' }, { status: 400 });

  type Original = { id: string; author_id: string };
  const { data: achada } = isUuid(b?.replyTo)
    ? await s.sb.from('community_post_comments').select('id, author_id').eq('id', b.replyTo).eq('post_id', params.postId).maybeSingle()
    : { data: null };
  const original = (achada as Original | null) ?? null;

  const { data, error } = await s.sb
    .from('community_post_comments')
    .insert({ post_id: params.postId, group_id: params.id, author_id: s.user.id, reply_to: original?.id ?? null, body })
    .select('id, created_at')
    .maybeSingle();
  if (semTabela(error)) return SEM_TABELA();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error || !data) return NextResponse.json({ error: 'Não foi possível comentar.' }, { status: 500 });

  // Avisa quem publicou e quem teve o comentário respondido (menos a própria pessoa).
  const eu = (await profilesByIds(s.sb, [s.user.id])).get(s.user.id)?.name ?? 'Alguém do grupo';
  const assunto = post.title ? `“${post.title.slice(0, 60)}”` : 'sua publicação';
  const avisos = new Map<string, { title: string }>();
  if (original && original.author_id !== s.user.id) avisos.set(original.author_id, { title: `${eu} respondeu seu comentário` });
  if (post.author_id !== s.user.id && !avisos.has(post.author_id)) avisos.set(post.author_id, { title: `${eu} comentou ${assunto}` });
  await notify(Array.from(avisos, ([userId, a]) => ({
    userId,
    type: 'comentario',
    title: a.title,
    body: body.slice(0, 100),
    link: `/comunidade/${params.id}`,
    actorId: s.user.id,
  })));

  return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
}

/** DELETE ?comentario=<id> — quem comentou ou o dono do grupo. */
export async function DELETE(request: Request, { params }: Ctx) {
  const r = await publicacao(params);
  if ('erro' in r) return r.erro;
  const { s } = r;
  const id = new URL(request.url).searchParams.get('comentario');
  if (!isUuid(id)) return NextResponse.json({ error: 'Comentário inválido.' }, { status: 400 });
  const { data, error } = await s.sb.from('community_post_comments').delete().eq('id', id).eq('post_id', params.postId).select('id');
  if (semTabela(error)) return SEM_TABELA();
  if (error) return NextResponse.json({ error: 'Não foi possível apagar.' }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Só quem comentou ou o dono do grupo apagam.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
