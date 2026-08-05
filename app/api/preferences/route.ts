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

  let body: { interests?: string[]; city?: string | null; radiusKm?: number; frequency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const row = {
    user_id: user.id,
    interests: Array.isArray(body.interests) ? body.interests : [],
    city: body.city ?? null,
    radius_km: Number.isFinite(body.radiusKm) ? body.radiusKm : 50,
    frequency: body.frequency ?? 'semanal',
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from('user_preferences').upsert(row, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
