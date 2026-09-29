import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Chave administrativa do Supabase indisponível.' }, { status: 503 });

  const { data: profiles, error } = await admin.from('profiles').select('id, full_name, email').order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'Não foi possível listar os usuários.' }, { status: 500 });
  const { data: balances } = await admin.from('platform_invite_balances').select('user_id, credits');
  const map = new Map((balances ?? []).map((b) => [b.user_id, b.credits]));
  return NextResponse.json({
    users: (profiles ?? []).map((p) => ({ ...p, credits: map.get(p.id) ?? 0 })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  const amount = Number(body?.amount);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !Number.isInteger(amount) || amount <= 0 || amount > 1000) {
    return NextResponse.json({ error: 'Usuário ou quantidade inválida.' }, { status: 400 });
  }
  const { data, error } = await auth.sb.rpc('add_platform_invite_credits', { p_user: userId, p_amount: amount });
  if (error) return NextResponse.json({ error: 'Não foi possível adicionar convites.' }, { status: 500 });
  return NextResponse.json({ ok: true, credits: data });
}
