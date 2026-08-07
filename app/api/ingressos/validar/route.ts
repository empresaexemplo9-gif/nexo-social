import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ingressos/validar — check-in na porta.
 *
 * A permissão fica dentro de `validar_ingresso`: só o organizador do evento (ou
 * o admin da plataforma) consegue dar baixa, e o mesmo código não passa duas
 * vezes. A rota só repassa a resposta.
 */
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

  const code = (typeof body?.code === 'string' ? body.code : '').trim().slice(0, 60);
  if (!code) return NextResponse.json({ error: 'Informe o código do ingresso.' }, { status: 400 });

  const { data, error } = await sb.rpc('validar_ingresso', { p_code: code });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resultado = data as { ok: boolean; motivo?: string; holder?: string };
  return NextResponse.json(resultado, { status: resultado?.ok ? 200 : 409 });
}
