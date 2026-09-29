import { NextResponse } from 'next/server';
import { exigirSessao, idInvalido, minhaParticipacao } from '@/lib/comunidade';
import { profilesByIds } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(_request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const invalid = idInvalido(params.id);
  if (invalid) return invalid;
  const me = await minhaParticipacao(s.sb, params.id, s.user.id);
  if (!me || me.status !== 'ativo') return NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 });

  const { data, error } = await s.sb.from('community_chat_messages')
    .select('id, author_id, body, created_at')
    .eq('group_id', params.id)
    .order('created_at', { ascending: true })
    .limit(400);
  if (error) return NextResponse.json({ error: 'Falha ao carregar o chat do grupo.' }, { status: 500 });
  const names = await profilesByIds(s.sb, (data ?? []).map((m) => m.author_id));

  return NextResponse.json({
    messages: (data ?? []).map((m) => ({
      id: m.id,
      authorId: m.author_id,
      authorName: names.get(m.author_id)?.name ?? 'Membro',
      body: m.body,
      fromMe: m.author_id === s.user.id,
      createdAt: m.created_at,
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const invalid = idInvalido(params.id);
  if (invalid) return invalid;
  const me = await minhaParticipacao(s.sb, params.id, s.user.id);
  if (!me || me.status !== 'ativo') return NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 });

  const b = await request.json().catch(() => null);
  const body = String(b?.body ?? '').trim().slice(0, 4000);
  if (!body) return NextResponse.json({ error: 'Escreva uma mensagem.' }, { status: 400 });

  const { data, error } = await s.sb.from('community_chat_messages')
    .insert({ group_id: params.id, author_id: s.user.id, body })
    .select('id, created_at')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Não foi possível enviar a mensagem.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
}
