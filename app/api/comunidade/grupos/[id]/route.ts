import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido, membrosDoGrupo, minhaParticipacao, texto } from '@/lib/comunidade';
import { salaDaLinha } from '@/lib/comunidade-tipos';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/**
 * O grupo, seus membros e a sala. Convidado que ainda não respondeu recebe só
 * o essencial (nome, descrição, quem convidou) para decidir.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const [eu, grupo] = await Promise.all([
    minhaParticipacao(s.sb, params.id, s.user.id),
    s.sb.from('community_groups').select('*').eq('id', params.id).maybeSingle(),
  ]);
  if (!grupo.data || !eu || eu.status === 'recusado') {
    return NextResponse.json({ error: 'Grupo não encontrado — ou você não participa dele.' }, { status: 404 });
  }
  const g = grupo.data;

  if (eu.status === 'convidado') {
    const { data: resumo } = await s.sb.rpc('my_community_groups');
    const meu = (resumo ?? []).find((r: { id: string }) => r.id === g.id);
    return NextResponse.json({
      convitePendente: true,
      grupo: {
        id: g.id,
        name: g.name,
        description: g.description ?? null,
        ownerName: meu?.owner_name ?? null,
        invitedByName: meu?.invited_by_name ?? null,
        memberCount: meu?.member_count ?? null,
      },
    });
  }

  try {
    const [membros, sala] = await Promise.all([
      membrosDoGrupo(s.sb, g.id),
      s.sb.from('community_sessions').select('*').eq('group_id', g.id).maybeSingle(),
    ]);
    return NextResponse.json({
      convitePendente: false,
      meuId: s.user.id,
      meuPapel: eu.role,
      grupo: {
        id: g.id,
        name: g.name,
        description: g.description ?? null,
        ownerId: g.owner_id,
        createdAt: g.created_at,
        inviteToken: g.invite_token,
      },
      membros,
      sala: salaDaLinha(sala.data),
      agora: new Date().toISOString(),
    });
  } catch (e: any) {
    return falha(e, 'Falha ao carregar o grupo.');
  }
}

/** Dono: renomeia, muda a descrição ou gera um novo link de convite. */
export async function PATCH(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  const mudancas: Record<string, string | null> = {};
  if (b?.name !== undefined) {
    const name = texto(b.name, 80);
    if (!name) return NextResponse.json({ error: 'O grupo precisa de um nome.' }, { status: 400 });
    mudancas.name = name;
  }
  if (b?.description !== undefined) mudancas.description = texto(b.description, 500);
  // O link antigo para de funcionar na hora: é o que fazer se ele vazou.
  if (b?.novoLink) mudancas.invite_token = randomUUID().replace(/-/g, '');
  if (!Object.keys(mudancas).length) return NextResponse.json({ error: 'Nada para mudar.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_groups')
    .update(mudancas)
    .eq('id', params.id)
    .eq('owner_id', s.user.id)
    .select('id, name, description, invite_token')
    .maybeSingle();
  if (error) return falha(error, 'Falha ao salvar o grupo.');
  if (!data) return NextResponse.json({ error: 'Só quem criou o grupo pode mudá-lo.' }, { status: 403 });
  return NextResponse.json({ ok: true, grupo: { name: data.name, description: data.description, inviteToken: data.invite_token } });
}

/** Dono: apaga o grupo, com mural e sala. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const { data, error } = await s.sb
    .from('community_groups')
    .delete()
    .eq('id', params.id)
    .eq('owner_id', s.user.id)
    .select('id');
  if (error) return falha(error, 'Falha ao apagar o grupo.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem criou o grupo pode apagá-lo.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
