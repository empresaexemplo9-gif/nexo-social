import { NextResponse } from 'next/server';
import { exigirSessao, idInvalido, minhaParticipacao } from '@/lib/comunidade';
import { profilesByIds, isUuid } from '@/lib/social';
import { avataresPorId, citacoesDasRespostas, conteudoParaCliente, inserirMensagem, lerMensagens, linksDaMidia, respostaPedida, validarMensagem } from '@/lib/chat-mensagens';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

async function membroAtivo(id: string) {
  const s = await exigirSessao();
  if (!s.ok) return { erro: s.response } as const;
  const invalid = idInvalido(id);
  if (invalid) return { erro: invalid } as const;
  const me = await minhaParticipacao(s.sb, id, s.user.id);
  if (!me || me.status !== 'ativo') return { erro: NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 }) } as const;
  return { s, me } as const;
}

/**
 * GET ?depois=<data> — mensagens do grupo (só as mais novas que `depois`,
 * quando informado, para a atualização contínua ficar leve).
 */
export async function GET(request: Request, { params }: Ctx) {
  const r = await membroAtivo(params.id);
  if ('erro' in r) return r.erro;
  const { s } = r;
  const depois = new URL(request.url).searchParams.get('depois');

  const consulta = (colunas: string) => {
    let q = s.sb.from('community_chat_messages').select(colunas).eq('group_id', params.id);
    if (depois && !Number.isNaN(Date.parse(depois))) q = q.gt('created_at', depois);
    return q.order('created_at', { ascending: false }).limit(depois ? 100 : 200);
  };
  // Banco ainda sem as migrações de mídia e respostas: segue com o que houver.
  const { data, error } = await lerMensagens(consulta, 'id, author_id, body, created_at');
  if (error) return NextResponse.json({ error: 'Falha ao carregar o chat do grupo.' }, { status: 500 });

  const rows = ((data ?? []) as any[]).reverse();
  const citacoes = await citacoesDasRespostas(rows, (m) => m.author_id, (ids) =>
    s.sb.from('community_chat_messages').select('id, author_id, body, kind, media_meta').eq('group_id', params.id).in('id', ids),
  );
  const autores = [...rows.map((m) => m.author_id), ...Array.from(citacoes.values(), (c) => c.authorId)];
  const [names, links, fotos] = await Promise.all([
    profilesByIds(s.sb, autores),
    linksDaMidia(s.sb, rows.map((m) => m.media_path)),
    avataresPorId(s.sb, rows.map((m) => m.author_id)),
  ]);
  const citar = (id: string) => {
    const c = citacoes.get(id);
    return c ? { ...c, authorName: c.authorId === s.user.id ? 'Você' : names.get(c.authorId)?.name ?? 'Membro' } : null;
  };

  return NextResponse.json({
    pasta: `grupos/${params.id}`,
    meuId: s.user.id,
    messages: rows.map((m) => ({
      id: m.id,
      authorId: m.author_id,
      authorName: names.get(m.author_id)?.name ?? 'Membro',
      authorAvatar: fotos.get(m.author_id) ?? null,
      fromMe: m.author_id === s.user.id,
      createdAt: m.created_at,
      ...conteudoParaCliente(m, links),
      replyTo: citar(m.id),
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** POST { kind, body, mediaPath?, meta?, replyTo? } — texto, foto, vídeo, áudio, figurinha ou adesivo. */
export async function POST(request: Request, { params }: Ctx) {
  const r = await membroAtivo(params.id);
  if ('erro' in r) return r.erro;
  const { s } = r;

  const b = await request.json().catch(() => null);
  const nova = validarMensagem(b, `grupos/${params.id}`, s.user.id);
  if ('erro' in nova) return NextResponse.json({ error: nova.erro }, { status: 400 });

  // Resposta: só a uma mensagem deste mesmo grupo (se sumiu, vai sem citação).
  const pedida = respostaPedida(b);
  const { data: original } = pedida
    ? await s.sb.from('community_chat_messages').select('id').eq('id', pedida).eq('group_id', params.id).maybeSingle()
    : { data: null };

  const linha: Record<string, unknown> = nova.kind === 'texto'
    ? { group_id: params.id, author_id: s.user.id, body: nova.body }
    : { group_id: params.id, author_id: s.user.id, ...nova };
  if (original) linha.reply_to = original.id;
  const { data, error } = await inserirMensagem((l) => s.sb.from('community_chat_messages').insert(l).select('id, created_at').maybeSingle(), linha);
  if (error?.code === '42703') return NextResponse.json({ error: 'Fotos, vídeos e áudios no chat ainda não foram ativados no banco.' }, { status: 503 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível enviar a mensagem.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
}

/** DELETE ?msg=<id> — apaga a própria mensagem (o dono do grupo apaga qualquer uma). */
export async function DELETE(request: Request, { params }: Ctx) {
  const r = await membroAtivo(params.id);
  if ('erro' in r) return r.erro;
  const { s } = r;
  const msg = new URL(request.url).searchParams.get('msg');
  if (!isUuid(msg)) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_chat_messages')
    .delete()
    .eq('id', msg)
    .eq('group_id', params.id)
    .select('media_path')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Não foi possível apagar.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Só dá para apagar as suas mensagens.' }, { status: 403 });
  // O arquivo também sai (quando foi a própria pessoa que enviou).
  const path = (data as { media_path?: string | null }).media_path;
  if (path && path.startsWith(`grupos/${params.id}/`)) await s.sb.storage.from('chat').remove([path]).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
