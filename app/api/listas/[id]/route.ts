import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { montarListaCompleta } from '@/lib/listas';
import { ehTipoLista } from '@/lib/listas-tipos';
import { ehVisibilidade } from '@/lib/mural-tipos';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };
const SUMIU = () => NextResponse.json({ error: 'Esta lista não existe mais ou não está aberta para você.' }, { status: 404 });

/** GET /api/listas/<id> — a lista inteira, com itens, reações e comentários. */
export async function GET(_request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return SUMIU();
  const { data } = await s.sb.from('listas').select('*').eq('id', params.id).maybeSingle();
  if (!data) return SUMIU();
  return NextResponse.json({ lista: await montarListaCompleta(s.sb, data, s.user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** PATCH /api/listas/<id> — quem criou muda nome, descrição, tipo ou quem vê. */
export async function PATCH(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return SUMIU();
  const b = await request.json().catch(() => null);
  const mudar: Record<string, unknown> = {};
  if (b?.titulo !== undefined) {
    const titulo = texto(b.titulo, 120);
    if (!titulo) return NextResponse.json({ error: 'Dê um nome à lista.' }, { status: 400 });
    mudar.titulo = titulo;
  }
  if (b?.descricao !== undefined) mudar.descricao = texto(b.descricao, 1000);
  if (b?.tipo !== undefined) {
    if (!ehTipoLista(b.tipo)) return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    mudar.tipo = b.tipo;
  }
  if (b?.visibilidade !== undefined) {
    if (!ehVisibilidade(b.visibilidade)) return NextResponse.json({ error: 'Escolha quem vê a lista.' }, { status: 400 });
    const grupoId = b.visibilidade === 'grupo' ? String(b?.grupoId ?? '') : null;
    if (b.visibilidade === 'grupo' && !isUuid(grupoId!)) return NextResponse.json({ error: 'Escolha o grupo.' }, { status: 400 });
    mudar.visibilidade = b.visibilidade;
    mudar.grupo_id = grupoId;
  }
  if (!Object.keys(mudar).length) return NextResponse.json({ error: 'Nada para mudar.' }, { status: 400 });
  mudar.updated_at = new Date().toISOString();

  const { data, error } = await s.sb.from('listas').update(mudar).eq('id', params.id).eq('autor_id', s.user.id).select('*').maybeSingle();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error?.code === '42501') return NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 });
  if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Só quem criou a lista muda ela.' }, { status: 403 });
  return NextResponse.json({ lista: await montarListaCompleta(s.sb, data, s.user.id) });
}

/** DELETE /api/listas/<id> — apaga quem criou (ou o dono do grupo, numa lista do grupo). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return SUMIU();
  const { data, error } = await s.sb.from('listas').delete().eq('id', params.id).select('id');
  if (error) return NextResponse.json({ error: 'Não foi possível apagar.' }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Só quem criou a lista apaga ela.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
