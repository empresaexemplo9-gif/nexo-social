import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { montarPublicacoes, opinioesDa } from '@/lib/mural';
import { ehVisibilidade } from '@/lib/mural-tipos';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };
const privado = { 'Cache-Control': 'private, no-store' };
const NAO_ACHEI = () => NextResponse.json({ error: 'Esta publicação não existe mais ou não está visível para você.' }, { status: 404 });

/** GET /api/mural/<id> — a publicação e as opiniões (se a pessoa pode ver). */
export async function GET(_: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NAO_ACHEI();
  const { data } = await s.sb.from('publicacoes').select('*').eq('id', params.id).maybeSingle();
  if (!data) return NAO_ACHEI();
  const [[publicacao], opinioes] = await Promise.all([
    montarPublicacoes(s.sb, [data], s.user.id),
    opinioesDa(s.sb, data, s.user.id),
  ]);
  return NextResponse.json({ publicacao, opinioes }, { headers: privado });
}

/** PATCH /api/mural/<id> — quem publicou edita o texto e quem vê. */
export async function PATCH(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NAO_ACHEI();
  const b = await request.json().catch(() => null);
  const mudancas: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b && 'titulo' in b) mudancas.titulo = texto(b.titulo, 160);
  if (b && 'corpo' in b) mudancas.corpo = texto(b.corpo, 5000);
  if (b && 'visibilidade' in b) {
    if (!ehVisibilidade(b.visibilidade)) return NextResponse.json({ error: 'Escolha quem vê a publicação.' }, { status: 400 });
    mudancas.visibilidade = b.visibilidade;
    mudancas.grupo_id = b.visibilidade === 'grupo' && isUuid(String(b.grupoId ?? '')) ? b.grupoId : null;
    if (b.visibilidade === 'grupo' && !mudancas.grupo_id) return NextResponse.json({ error: 'Escolha o grupo.' }, { status: 400 });
  }
  const { data, error } = await s.sb.from('publicacoes').update(mudancas).eq('id', params.id).eq('autor_id', s.user.id).select('*').maybeSingle();
  // Sem linha de volta: ou não é de quem pede, ou o texto foi barrado pelas regras (e a conta, banida).
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error?.code === '23514') return NextResponse.json({ error: 'A publicação não pode ficar vazia.' }, { status: 400 });
  if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Só quem publicou edita.' }, { status: 403 });
  const [publicacao] = await montarPublicacoes(s.sb, [data], s.user.id);
  return NextResponse.json({ publicacao });
}

/** DELETE /api/mural/<id> — apaga quem publicou (no grupo, também o dono do grupo). */
export async function DELETE(_: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NAO_ACHEI();
  const { data, error } = await s.sb.from('publicacoes').delete().eq('id', params.id).select('id');
  if (error) return NextResponse.json({ error: 'Não foi possível apagar.' }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Só quem publicou apaga.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
