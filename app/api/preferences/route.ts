import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// Lê as preferências do usuário autenticado.
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await sb.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data ?? null });
}

// Cria/atualiza as preferências do usuário autenticado (resultado do questionário).
export async function PUT(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: { interests?: string[]; city?: string | null; radiusKm?: number; frequency?: string; [k: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  // Atualização parcial: só grava o que veio no corpo, para que salvar um
  // campo isolado (a meta de leitura, por exemplo) não zere os interesses.
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const row: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  const b = body as Record<string, unknown>;

  const arrayFields: [string, string][] = [
    ['interests', 'interests'],
    ['subtopics', 'subtopics'],
    ['musicGenres', 'music_genres'],
    ['filmGenres', 'film_genres'],
    ['bookGenres', 'book_genres'],
    ['hobbies', 'hobbies'],
  ];
  for (const [from, to] of arrayFields) {
    if (from in b) row[to] = arr(b[from]);
  }

  if ('city' in b) row.city = b.city ?? null;
  if (Number.isFinite(b.radiusKm)) row.radius_km = b.radiusKm;
  if (typeof b.frequency === 'string') row.frequency = b.frequency;
  if (Number.isFinite(b.readingGoal)) row.reading_goal = Math.min(365, Math.max(1, Number(b.readingGoal)));

  const { error } = await sb.from('user_preferences').upsert(row, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
