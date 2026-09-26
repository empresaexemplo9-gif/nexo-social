import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { searchPeople } from '@/lib/social';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pessoas?q=termo
 *
 * Pessoas da plataforma para convidar a um compromisso ou grupo, pelo nome ou
 * pelo e-mail exato. Sem `q`, as pessoas próximas (contatos, colegas de
 * compromisso e de grupo).
 */
export async function GET(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 120);
  try {
    return NextResponse.json({ q, pessoas: await searchPeople(sb, q) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao buscar pessoas.' }, { status: 500 });
  }
}
