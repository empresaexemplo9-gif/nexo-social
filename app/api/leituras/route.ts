import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

const KINDS = ['livro', 'audiolivro'] as const;
const STATUSES = ['quero-ler', 'lendo', 'lido'] as const;

function sanitize(body: any) {
  const kind = KINDS.includes(body?.kind) ? body.kind : 'livro';
  const status = STATUSES.includes(body?.status) ? body.status : 'lido';
  const rating = Number.isFinite(body?.rating) && body.rating >= 1 && body.rating <= 5 ? Math.round(body.rating) : null;
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 300) : '';
  return {
    title,
    author: typeof body?.author === 'string' ? body.author.trim().slice(0, 200) : null,
    kind,
    status,
    source: typeof body?.source === 'string' ? body.source.slice(0, 60) : null,
    external_id: typeof body?.externalId === 'string' ? body.externalId.slice(0, 120) : null,
    url: typeof body?.url === 'string' ? body.url.slice(0, 800) : null,
    cover_url: typeof body?.coverUrl === 'string' ? body.coverUrl.slice(0, 800) : null,
    rating,
    notes: typeof body?.notes === 'string' ? body.notes.slice(0, 2000) : null,
    started_at: typeof body?.startedAt === 'string' ? body.startedAt.slice(0, 10) : null,
    finished_at: typeof body?.finishedAt === 'string' ? body.finishedAt.slice(0, 10) : null,
  };
}

/** GET /api/leituras?ano=2026 — registro de leituras do usuário. */
export async function GET(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const ano = new URL(request.url).searchParams.get('ano');
  let query = sb.from('reading_log').select('*').eq('user_id', user.id).order('finished_at', { ascending: false });
  if (ano && /^\d{4}$/.test(ano)) {
    query = query.gte('finished_at', `${ano}-01-01`).lte('finished_at', `${ano}-12-31`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leituras: data ?? [] });
}

/** POST /api/leituras — adiciona (ou atualiza, se vier da mesma fonte). */
export async function POST(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const row = sanitize(body);
  if (!row.title) return NextResponse.json({ error: 'Informe o título.' }, { status: 400 });

  // Marcar como lido sem data preenche com hoje.
  if (row.status === 'lido' && !row.finished_at) row.finished_at = new Date().toISOString().slice(0, 10);

  const payload = { ...row, user_id: user.id, updated_at: new Date().toISOString() };
  const { data, error } =
    row.source && row.external_id
      ? await sb.from('reading_log').upsert(payload, { onConflict: 'user_id,source,external_id' }).select().single()
      : await sb.from('reading_log').insert(payload).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leitura: data }, { status: 201 });
}

/** PATCH /api/leituras — altera status, nota ou datas de um registro. */
export async function PATCH(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }
  if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Informe o id.' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (STATUSES.includes(body.status)) {
    patch.status = body.status;
    if (body.status === 'lido' && !body.finishedAt) patch.finished_at = new Date().toISOString().slice(0, 10);
    if (body.status !== 'lido') patch.finished_at = null;
  }
  if (Number.isFinite(body.rating)) patch.rating = Math.min(5, Math.max(1, Math.round(body.rating)));
  if (typeof body.notes === 'string') patch.notes = body.notes.slice(0, 2000);
  if (typeof body.finishedAt === 'string') patch.finished_at = body.finishedAt.slice(0, 10);
  if (typeof body.startedAt === 'string') patch.started_at = body.startedAt.slice(0, 10);

  const { data, error } = await sb
    .from('reading_log')
    .update(patch)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leitura: data });
}

/** DELETE /api/leituras?id=... */
export async function DELETE(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o id.' }, { status: 400 });

  const { error } = await sb.from('reading_log').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
