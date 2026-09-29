import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { notify, profilesByIds } from '@/lib/social';

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

export async function GET(_request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!/^[0-9a-f-]{36}$/i.test(params.userId)) return NextResponse.json({ error: 'Contato inválido.' }, { status: 400 });
  if (!(await contatoAceito(s.sb, s.user.id, params.userId))) {
    return NextResponse.json({ error: 'Esse usuário ainda não está nos seus contatos.' }, { status: 403 });
  }

  const { data, error } = await s.sb.from('messages')
    .select('id, from_user, to_user, body, read_at, created_at')
    .or(`and(from_user.eq.${s.user.id},to_user.eq.${params.userId}),and(from_user.eq.${params.userId},to_user.eq.${s.user.id})`)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) return NextResponse.json({ error: 'Falha ao carregar a conversa.' }, { status: 500 });

  await s.sb.from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('from_user', params.userId)
    .eq('to_user', s.user.id)
    .is('read_at', null);

  const names = await profilesByIds(s.sb, [params.userId]);
  return NextResponse.json({
    contact: { userId: params.userId, name: names.get(params.userId)?.name ?? 'Contato' },
    messages: (data ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      fromMe: m.from_user === s.user.id,
      createdAt: m.created_at,
      readAt: m.read_at,
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!/^[0-9a-f-]{36}$/i.test(params.userId)) return NextResponse.json({ error: 'Contato inválido.' }, { status: 400 });
  if (!(await contatoAceito(s.sb, s.user.id, params.userId))) {
    return NextResponse.json({ error: 'Adicione e aceite o contato antes de conversar.' }, { status: 403 });
  }

  const b = await request.json().catch(() => null);
  const body = String(b?.body ?? '').trim().slice(0, 4000);
  if (!body) return NextResponse.json({ error: 'Escreva uma mensagem.' }, { status: 400 });

  const { data, error } = await s.sb.from('messages').insert({
    from_user: s.user.id,
    to_user: params.userId,
    body,
    appointment_id: null,
  }).select('id, created_at').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Não foi possível enviar a mensagem.' }, { status: 500 });

  await notify([{
    userId: params.userId,
    type: 'chat',
    title: 'Nova mensagem',
    body: body.slice(0, 100),
    link: `/comunidade/chat?com=${s.user.id}`,
    actorId: s.user.id,
  }]);

  return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
}
