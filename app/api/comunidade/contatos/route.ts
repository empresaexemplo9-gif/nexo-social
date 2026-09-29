import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { notify, profilesByIds } from '@/lib/social';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await exigirSessao();
  if (!s.ok) return s.response;

  const { data, error } = await s.sb
    .from('connections')
    .select('id, user_id, contact_id, status, created_at')
    .or(`user_id.eq.${s.user.id},contact_id.eq.${s.user.id}`)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Falha ao carregar seus contatos.' }, { status: 500 });

  const rows = data ?? [];
  const names = await profilesByIds(s.sb, rows.flatMap((r) => [r.user_id, r.contact_id]));
  const mapRow = (r: any) => {
    const outroId = r.user_id === s.user.id ? r.contact_id : r.user_id;
    const p = names.get(outroId);
    return {
      id: r.id,
      userId: outroId,
      name: p?.name ?? 'Usuário',
      email: p?.email ?? null,
      status: r.status,
      direction: r.user_id === s.user.id ? 'enviado' : 'recebido',
      createdAt: r.created_at,
    };
  };

  const mapped = rows.map(mapRow);
  return NextResponse.json({
    contacts: mapped.filter((r) => r.status === 'aceito'),
    incoming: mapped.filter((r) => r.status === 'pendente' && r.direction === 'recebido'),
    outgoing: mapped.filter((r) => r.status === 'pendente' && r.direction === 'enviado'),
    total: mapped.filter((r) => r.status === 'aceito').length,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const b = await request.json().catch(() => null);
  const userId = typeof b?.userId === 'string' ? b.userId : '';
  if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === s.user.id) {
    return NextResponse.json({ error: 'Contato inválido.' }, { status: 400 });
  }

  const [{ data: existingA }, { data: existingB }] = await Promise.all([
    s.sb.from('connections').select('id, status').eq('user_id', s.user.id).eq('contact_id', userId).maybeSingle(),
    s.sb.from('connections').select('id, status').eq('user_id', userId).eq('contact_id', s.user.id).maybeSingle(),
  ]);
  const existing = existingA ?? existingB;
  if (existing?.status === 'aceito') return NextResponse.json({ ok: true, status: 'aceito', already: true });
  if (existing?.status === 'pendente') return NextResponse.json({ ok: true, status: 'pendente', already: true });

  const { error } = await s.sb.from('connections').insert({
    user_id: s.user.id,
    contact_id: userId,
    status: 'pendente',
  });
  if (error) return NextResponse.json({ error: 'Não foi possível adicionar o contato.' }, { status: 500 });

  await notify([{
    userId,
    type: 'contato',
    title: 'Novo pedido de contato',
    body: 'Alguém da Comunidade quer adicionar você aos contatos.',
    link: '/comunidade/chat',
    actorId: s.user.id,
  }]);

  return NextResponse.json({ ok: true, status: 'pendente' });
}

export async function PATCH(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const b = await request.json().catch(() => null);
  const id = typeof b?.id === 'string' ? b.id : '';
  const action = b?.action;

  if (action === 'accept' || action === 'decline') {
    const status = action === 'accept' ? 'aceito' : 'recusado';
    const { data, error } = await s.sb.from('connections')
      .update({ status })
      .eq('id', id)
      .eq('contact_id', s.user.id)
      .select('id')
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Pedido de contato não encontrado.' }, { status: 404 });
    return NextResponse.json({ ok: true, status });
  }

  if (action === 'remove') {
    const { error } = await s.sb.from('connections')
      .delete()
      .eq('id', id)
      .or(`user_id.eq.${s.user.id},contact_id.eq.${s.user.id}`);
    if (error) return NextResponse.json({ error: 'Não foi possível remover o contato.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}
