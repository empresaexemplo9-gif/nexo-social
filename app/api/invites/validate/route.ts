import { NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim() || '';
  if (!/^[0-9a-f]{64}$/i.test(token)) return NextResponse.json({ valid: false });
  const sb = createAnonServerClient();
  if (!sb) return NextResponse.json({ valid: false }, { status: 503 });
  const { data, error } = await sb.rpc('platform_invite_preview', { p_token: token });
  if (error) return NextResponse.json({ valid: false }, { status: 503 });
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ valid: Boolean(row?.valid) }, { headers: { 'Cache-Control': 'no-store' } });
}
