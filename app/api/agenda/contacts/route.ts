import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { findUserByEmail, notify, profilesByIds } from '@/lib/social';

export const dynamic = 'force-dynamic';

/** Contatos: aceitos, enviados e recebidos. */
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await sb.from('connections').select('*').or(`user_id.eq.${user.id},contact_id.eq.${user.id}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const names = await profilesByIds(sb, rows.flatMap((r) => [r.user_id, r.contact_id]));

  return NextResponse.json({
    contacts: rows.map((r) => {
      const otherId = r.user_id === user.id ? r.contact_id : r.user_id;
      const info = names.get(otherId);
      return {
        id: r.id,
        userId: otherId,
        name: info?.name ?? null,
        email: info?.email ?? null,
        status: r.status,
        direction: r.user_id === user.id ? 'enviado' : 'recebido',
      };
    }),
  });
}

/** Adiciona um usuário à minha agenda (por e-mail). */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const b = await request.json().catch(() => null);
  const email = String(b?.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Informe o e-mail.' }, { status: 400 });
  if (email === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'Esse é o seu próprio e-mail.' }, { status: 400 });
  }

  const { user: found } = await findUserByEmail(sb, email);
  if (!found) {
    return NextResponse.json(
      { error: `Ninguém cadastrado com ${email}. Peça para a pessoa criar a conta primeiro.` },
      { status: 404 },
    );
  }

  const { error } = await sb.from('connections').upsert(
    { user_id: user.id, contact_id: found.id, status: 'pendente' },
    { onConflict: 'user_id,contact_id' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify([
    {
      userId: found.id,
      type: 'contato',
      title: 'Novo pedido de contato',
      body: `${user.email} quer adicionar você à agenda.`,
      link: '/agenda',
      actorId: user.id,
    },
  ]);

  return NextResponse.json({ ok: true, contact: { id: found.id, name: found.name, email: found.email } });
}

/** Aceita ou recusa um pedido recebido. */
export async function PATCH(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const b = await request.json().catch(() => null);
  const id = String(b?.id || '');
  const status = String(b?.status || '');
  if (!['aceito', 'recusado'].includes(status)) {
    return NextResponse.json({ error: 'Use "aceito" ou "recusado".' }, { status: 400 });
  }

  const { error } = await sb.from('connections').update({ status }).eq('id', id).eq('contact_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
