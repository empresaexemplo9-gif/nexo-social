import { NextResponse } from 'next/server';
import { exigirSessao, seBanido } from '@/lib/comunidade';
import { isUuid, notify, profilesByIds } from '@/lib/social';
import { avataresPorId, citacoesDasRespostas, inserirMensagem, lerMensagens, linksDaMidia, pastaDaConversa, previa, respostaPedida } from '@/lib/chat-mensagens';
import { conteudoParaClienteComExclusivos, validarMensagemComExclusivos } from '@/lib/chat-exclusivos';
import { semColuna } from '@/lib/erros-banco';

export const dynamic = 'force-dynamic';

type Ctx = { params: { userId: string } };

async function contatoAceito(sb: any, me: string, other: string) {
  const { data } = await sb.from('connections')
    .select('id')
    .eq('status', 'aceito')
    .or(`and(user_id.eq.${me},contact_id.eq.${other}),and(user_id.eq.${other},contact_id.eq.${me})`)
    .limit(1);
  return Boolean(data?.length);
}

/** Filtro das mensagens entre as duas pessoas (nos dois sentidos). */
const daConversa = (a: string, b: string) => `and(from_user.eq.${a},to_user.eq.${b}),and(from_user.eq.${b},to_user.eq.${a})`;

async function conversa(userId: string, aviso: string) {
  const s = await exigirSessao();
  if (!s.ok) return { erro: s.response } as const;
  if (!isUuid(userId)) return { erro: NextResponse.json({ error: 'Contato inválido.' }, { status: 400 }) } as const;
  if (!(await contatoAceito(s.sb, s.user.id, userId))) return { erro: NextResponse.json({ error: aviso }, { status: 403 }) } as const;
  return { s } as const;
}

/** GET ?depois=<data> — a conversa (só o que é mais novo que `depois`, quando informado). */
export async function GET(request: Request, { params }: Ctx) {
  const r = await conversa(params.userId, 'Esse usuário ainda não está nos seus contatos.');
  if ('erro' in r) return r.erro;
  const { s } = r;
  const depois = new URL(request.url).searchParams.get('depois');

  const par = daConversa(s.user.id, params.userId);
  const consulta = (colunas: string) => {
    let q = s.sb.from('messages').select(colunas).or(par);
    if (depois && !Number.isNaN(Date.parse(depois))) q = q.gt('created_at', depois);
    return q.order('created_at', { ascending: false }).limit(depois ? 100 : 200);
  };
  const { data, error } = await lerMensagens(consulta, 'id, from_user, to_user, body, read_at, created_at');
  if (error) return NextResponse.json({ error: 'Falha ao carregar a conversa.' }, { status: 500 });

  await s.sb.from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('from_user', params.userId)
    .eq('to_user', s.user.id)
    .is('read_at', null);

  const rows = ((data ?? []) as any[]).reverse();
  const [names, links, fotos, citacoes] = await Promise.all([
    profilesByIds(s.sb, [params.userId]),
    linksDaMidia(s.sb, rows.map((m) => m.media_path)),
    avataresPorId(s.sb, [params.userId]),
    citacoesDasRespostas(rows, (m) => m.from_user, (ids) => s.sb.from('messages').select('id, from_user, body, kind, media_meta').or(par).in('id', ids)),
  ]);
  const nome = names.get(params.userId)?.name ?? 'Contato';
  const citar = (id: string) => {
    const c = citacoes.get(id);
    return c ? { ...c, authorName: c.authorId === s.user.id ? 'Você' : nome } : null;
  };
  return NextResponse.json({
    pasta: pastaDaConversa(s.user.id, params.userId),
    meuId: s.user.id,
    contact: { userId: params.userId, name: nome, avatar: fotos.get(params.userId) ?? null },
    messages: rows.map((m) => ({
      id: m.id,
      authorId: m.from_user,
      fromMe: m.from_user === s.user.id,
      createdAt: m.created_at,
      readAt: m.read_at,
      ...conteudoParaClienteComExclusivos(m, links),
      replyTo: citar(m.id),
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** POST { kind, body, mediaPath?, meta?, replyTo? } — ou { chamada: true, video } para ligar. */
export async function POST(request: Request, { params }: Ctx) {
  const r = await conversa(params.userId, 'Adicione e aceite o contato antes de conversar.');
  if ('erro' in r) return r.erro;
  const { s } = r;
  const b = await request.json().catch(() => null);
  const eu = (await profilesByIds(s.sb, [s.user.id])).get(s.user.id)?.name ?? 'Seu contato';

  // Ligação: o aviso toca como telefone para a outra pessoa (AvisoDeChamada).
  if (b?.chamada === true) {
    const video = b?.video !== false;
    await notify([{
      userId: params.userId,
      type: 'chamada',
      title: video ? 'Chamada de vídeo' : 'Chamada de voz',
      body: `${eu} está te ligando.`,
      link: `/comunidade/chat?com=${s.user.id}&chamada=1${video ? '' : '&voz=1'}`,
      actorId: s.user.id,
    }]);
    return NextResponse.json({ ok: true });
  }

  const nova = await validarMensagemComExclusivos(s.sb, b, pastaDaConversa(s.user.id, params.userId), s.user.id);
  if ('erro' in nova) return NextResponse.json({ error: nova.erro }, { status: 400 });

  // Resposta: só a uma mensagem desta mesma conversa (se sumiu, vai sem citação).
  const pedida = respostaPedida(b);
  const { data: original } = pedida
    ? await s.sb.from('messages').select('id').eq('id', pedida).or(daConversa(s.user.id, params.userId)).maybeSingle()
    : { data: null };

  const linha: Record<string, unknown> = { from_user: s.user.id, to_user: params.userId, appointment_id: null, ...(nova.kind === 'texto' ? { body: nova.body } : nova) };
  if (original) linha.reply_to = original.id;
  const { data, error } = await inserirMensagem((l) => s.sb.from('messages').insert(l).select('id, created_at').maybeSingle(), linha);
  if (semColuna(error)) return NextResponse.json({ error: 'Fotos, vídeos e áudios no chat ainda não foram ativados no banco.' }, { status: 503 });
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error || !data) return NextResponse.json({ error: 'Não foi possível enviar a mensagem.' }, { status: 500 });

  await notify([{
    userId: params.userId,
    type: 'chat',
    title: `Nova mensagem de ${eu}`,
    body: previa(nova).slice(0, 100),
    link: `/comunidade/chat?com=${s.user.id}`,
    actorId: s.user.id,
  }]);

  return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
}

/** DELETE ?msg=<id> — apaga uma mensagem que você enviou. */
export async function DELETE(request: Request, { params }: Ctx) {
  const r = await conversa(params.userId, 'Esse usuário não está nos seus contatos.');
  if ('erro' in r) return r.erro;
  const { s } = r;
  const msg = new URL(request.url).searchParams.get('msg');
  if (!isUuid(msg)) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
  const { data, error } = await s.sb.from('messages').delete().eq('id', msg).eq('from_user', s.user.id).select('media_path').maybeSingle();
  if (error) return NextResponse.json({ error: 'Não foi possível apagar.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Só dá para apagar as suas mensagens.' }, { status: 403 });
  const path = (data as { media_path?: string | null }).media_path;
  if (path && path.startsWith(pastaDaConversa(s.user.id, params.userId))) await s.sb.storage.from('chat').remove([path]).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
