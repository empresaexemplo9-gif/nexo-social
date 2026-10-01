import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

const privado = { 'Cache-Control': 'private, no-store' };

/** GET /api/regras — esta conta já aceitou as regras da comunidade? */
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
  const { data, error } = await sb.from('community_rules_acceptance').select('user_id').eq('user_id', user.id).maybeSingle();
  // Sem a tabela (migração ainda não aplicada), não trava ninguém num aviso que não dá para aceitar.
  return NextResponse.json({ aceitas: error ? true : Boolean(data) }, { headers: privado });
}

/** POST /api/regras — registra o aceite. */
export async function POST(request: Request) {
  const origem = request.headers.get('origin');
  if (origem && origem !== new URL(request.url).origin) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
  const { error } = await sb.rpc('aceitar_regras');
  if (error) return NextResponse.json({ error: 'Não foi possível registrar agora. Tente de novo.' }, { status: 500 });
  return NextResponse.json({ aceitas: true }, { headers: privado });
}
