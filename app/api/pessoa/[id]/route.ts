import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/**
 * GET /api/pessoa/<id> — a página da pessoa: nome, foto, bio, o vínculo com
 * quem olha e se pode abrir (a pessoa escolhe: todos ou só contatos). As
 * publicações vêm de /api/mural?autor=<id>, já filtradas pelo que cada uma permite.
 */
export async function GET(_: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Pessoa inválida.' }, { status: 400 });
  const { data, error } = await s.sb.rpc('perfil_publico', { p_user: params.id });
  if (error) return NextResponse.json({ error: 'Falha ao abrir a página.' }, { status: 500 });
  const p = (Array.isArray(data) ? data[0] : data) as Record<string, any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!p) return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 });
  return NextResponse.json({
    pessoa: {
      id: p.id,
      nome: p.nome,
      avatarPath: p.avatar_path ?? null,
      // Bio só para quem pode ver a página.
      bio: p.pode_ver ? p.bio ?? null : null,
      visibilidadePerfil: p.visibilidade_perfil,
      contato: p.contato,
      conexaoId: p.conexao_id ?? null,
      podeVer: Boolean(p.pode_ver),
      banida: Boolean(p.banido),
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
