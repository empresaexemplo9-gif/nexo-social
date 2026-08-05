import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { email?: string; frequency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const frequency = body.frequency || 'semanal';

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  const sb = createServerSupabase();
  if (!sb) {
    // Modo demonstração — aceita a inscrição sem persistir.
    return NextResponse.json({ ok: true, demo: true });
  }

  const { error } = await sb.from('subscribers').upsert({ email, frequency }, { onConflict: 'email' });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
