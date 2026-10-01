import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { semTabela } from '@/lib/erros-banco';

export const dynamic = 'force-dynamic';

const privado = { 'Cache-Control': 'private, no-store' };
const PADRAO = { bio: null, visibilidadePerfil: 'contatos', visibilidadePadrao: 'todos' } as const;

const deLinha = (l: { bio: string | null; visibilidade_perfil: string; visibilidade_padrao: string } | null) =>
  l ? { bio: l.bio, visibilidadePerfil: l.visibilidade_perfil, visibilidadePadrao: l.visibilidade_padrao } : PADRAO;

/** GET /api/perfil — a configuração da minha página (bio e quem vê). */
export async function GET() {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const { data, error } = await s.sb.from('perfil_social').select('bio, visibilidade_perfil, visibilidade_padrao').eq('user_id', s.user.id).maybeSingle();
  if (semTabela(error)) return NextResponse.json({ ...PADRAO, indisponivel: true }, { headers: privado });
  return NextResponse.json({ ...deLinha(data), userId: s.user.id }, { headers: privado });
}

/** PATCH /api/perfil — muda a bio e quem vê a página e as publicações (por padrão). */
export async function PATCH(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const b = await request.json().catch(() => null);
  const vis = (v: unknown, padrao: string) => (v === 'todos' || v === 'contatos' ? v : padrao);
  const { data: atual } = await s.sb.from('perfil_social').select('bio, visibilidade_perfil, visibilidade_padrao').eq('user_id', s.user.id).maybeSingle();
  const linha = {
    user_id: s.user.id,
    bio: b && 'bio' in b ? texto(b.bio, 280) : atual?.bio ?? null,
    visibilidade_perfil: vis(b?.visibilidadePerfil, atual?.visibilidade_perfil ?? PADRAO.visibilidadePerfil),
    visibilidade_padrao: vis(b?.visibilidadePadrao, atual?.visibilidade_padrao ?? PADRAO.visibilidadePadrao),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await s.sb.from('perfil_social').upsert(linha).select('bio, visibilidade_perfil, visibilidade_padrao').maybeSingle();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (semTabela(error)) return NextResponse.json({ error: 'A página pessoal ainda não foi ativada no banco.' }, { status: 503 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 });
  return NextResponse.json(deLinha(data));
}
