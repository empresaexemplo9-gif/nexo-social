import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { montarRodaCompleta } from '@/lib/listas';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };
const SUMIU = () => NextResponse.json({ error: 'Esta roda já terminou ou não está aberta para você.' }, { status: 404 });

/** GET /api/rodas/<id> — a roda, quem está nela (e o vínculo com cada um) e a conversa. */
export async function GET(_request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return SUMIU();
  const { data } = await s.sb.from('rodas').select('*').eq('id', params.id).maybeSingle();
  if (!data) return SUMIU();
  return NextResponse.json({ roda: await montarRodaCompleta(s.sb, data, s.user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** POST /api/rodas/<id> { acao: 'entrar' | 'sair' | 'encerrar' }. */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return SUMIU();
  const acao = (await request.json().catch(() => null))?.acao;

  if (acao === 'entrar') {
    const { error } = await s.sb.from('roda_participantes').insert({ roda_id: params.id, user_id: s.user.id });
    if (error?.code === '42501') return SUMIU();
    if (error && error.code !== '23505') return NextResponse.json({ error: 'Não foi possível entrar agora.' }, { status: 500 });
  } else if (acao === 'sair') {
    const { error } = await s.sb.from('roda_participantes').delete().eq('roda_id', params.id).eq('user_id', s.user.id);
    if (error) return NextResponse.json({ error: 'Não foi possível sair agora.' }, { status: 500 });
  } else if (acao === 'encerrar') {
    const { error } = await s.sb.rpc('encerrar_roda', { p_roda: params.id });
    if (error?.code === 'P0001') return NextResponse.json({ error: error.message }, { status: 403 });
    if (error) return NextResponse.json({ error: 'Não foi possível encerrar agora.' }, { status: 500 });
  } else {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const { data } = await s.sb.from('rodas').select('*').eq('id', params.id).maybeSingle();
  // Saiu de uma roda fechada a quem não participa: não há mais o que mostrar.
  if (!data) return NextResponse.json({ roda: null });
  return NextResponse.json({ roda: await montarRodaCompleta(s.sb, data, s.user.id) });
}
