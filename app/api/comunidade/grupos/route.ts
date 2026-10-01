import { NextResponse } from 'next/server';
import { exigirSessao, falha, grupoResumo, seBanido, texto } from '@/lib/comunidade';
import type { GrupoResumo } from '@/lib/comunidade-tipos';

export const dynamic = 'force-dynamic';

/** Meus grupos e os convites para grupos que esperam resposta. */
export async function GET() {
  const s = await exigirSessao();
  if (!s.ok) return s.response;

  const { data, error } = await s.sb.rpc('my_community_groups');
  if (error) return falha(error, 'Falha ao carregar seus grupos.');
  const grupos: GrupoResumo[] = (data ?? []).map(grupoResumo);
  return NextResponse.json({
    grupos: grupos.filter((g) => g.myStatus === 'ativo'),
    convites: grupos.filter((g) => g.myStatus === 'convidado'),
  });
}

/**
 * Cria um grupo — sem limite de quantos. Quem cria entra como dono e escolhe
 * o tipo: fechado (só o dono convida, o padrão) ou aberto (todos convidam).
 */
export async function POST(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;

  const b = await request.json().catch(() => null);
  const name = texto(b?.name, 80);
  if (!name) return NextResponse.json({ error: 'Dê um nome ao grupo.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_groups')
    .insert({
      owner_id: s.user.id,
      name,
      description: texto(b?.description, 500),
      privacy: b?.privacy === 'aberto' ? 'aberto' : 'fechado',
    })
    .select('id')
    .maybeSingle();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error || !data) return falha(error, 'Falha ao criar o grupo.');
  return NextResponse.json({ ok: true, id: data.id });
}
