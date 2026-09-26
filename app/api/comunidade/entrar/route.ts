import { NextResponse } from 'next/server';
import { exigirSessao, falha } from '@/lib/comunidade';

export const dynamic = 'force-dynamic';

/** Entra no grupo pelo link de convite (inclusive logo depois de criar a conta). */
export async function POST(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;

  const b = await request.json().catch(() => null);
  const token = String(b?.token || '').trim();
  if (!/^[0-9a-f]{16,64}$/i.test(token)) return NextResponse.json({ error: 'Convite inválido.' }, { status: 400 });

  const { data, error } = await s.sb.rpc('join_group_by_token', { p_token: token });
  if (error) return falha(error, 'Falha ao entrar no grupo.');
  return NextResponse.json({ ok: true, id: data });
}
