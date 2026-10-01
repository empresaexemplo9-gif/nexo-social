import { NextResponse } from 'next/server';
import { arquivosDaPasta, exigirSessao, falha, idInvalido, membrosDoGrupo, minhaParticipacao, seBanido, texto } from '@/lib/comunidade';
import { salaDaLinha } from '@/lib/comunidade-tipos';
import { caminhoValido } from '@/lib/imagens-url';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

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
        imagePath: g.image_path ?? null,
        privacy: g.privacy,
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
    const podeConvidar = eu.role === 'dono' || g.privacy === 'aberto';
    return NextResponse.json({
      convitePendente: false,
      meuId: s.user.id,
      meuPapel: eu.role,
      podeConvidar,
      grupo: {
        id: g.id,
        name: g.name,
        description: g.description ?? null,
        privacy: g.privacy === 'aberto' ? 'aberto' : 'fechado',
        imagePath: g.image_path ?? null,
        ownerId: g.owner_id,
        createdAt: g.created_at,
      },
      membros,
      sala: salaDaLinha(sala.data),
      agora: new Date().toISOString(),
    });
  } catch (e: any) {
    return falha(e, 'Falha ao carregar o grupo.');
  }
}

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
  if (b?.privacy !== undefined) {
    if (b.privacy !== 'aberto' && b.privacy !== 'fechado') {
      return NextResponse.json({ error: 'O grupo é "aberto" ou "fechado".' }, { status: 400 });
    }
    mudancas.privacy = b.privacy;
  }
  if (b?.imagePath !== undefined) {
    if (b.imagePath !== null && !caminhoValido(b.imagePath, `grupos/${params.id}`)) {
      return NextResponse.json({ error: 'Imagem inválida.' }, { status: 400 });
    }
    mudancas.image_path = b.imagePath;
  }
  if (!Object.keys(mudancas).length) return NextResponse.json({ error: 'Nada para mudar.' }, { status: 400 });

  const { data: antes } = await s.sb.from('community_groups').select('owner_id, image_path').eq('id', params.id).maybeSingle();
  if (!antes || antes.owner_id !== s.user.id) {
    return NextResponse.json({ error: 'Só quem criou o grupo pode mudá-lo.' }, { status: 403 });
  }

  const { data, error } = await s.sb
    .from('community_groups')
    .update(mudancas)
    .eq('id', params.id)
    .eq('owner_id', s.user.id)
    .select('name, description, privacy, image_path')
    .maybeSingle();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error || !data) return falha(error, 'Falha ao salvar o grupo.');

  if (mudancas.image_path !== undefined && antes.image_path && antes.image_path !== mudancas.image_path) {
    await s.sb.storage.from('perfis').remove([antes.image_path]);
  }

  return NextResponse.json({
    ok: true,
    grupo: { name: data.name, description: data.description, privacy: data.privacy, imagePath: data.image_path },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const { data: g } = await s.sb.from('community_groups').select('owner_id, image_path').eq('id', params.id).maybeSingle();
  if (!g || g.owner_id !== s.user.id) {
    return NextResponse.json({ error: 'Só quem criou o grupo pode apagá-lo.' }, { status: 403 });
  }

  const fotos = await arquivosDaPasta(s.sb, 'comunidade', `grupos/${params.id}`);
  for (let i = 0; i < fotos.length; i += 500) await s.sb.storage.from('comunidade').remove(fotos.slice(i, i + 500));
  if (g.image_path) await s.sb.storage.from('perfis').remove([g.image_path]);

  const { data, error } = await s.sb.from('community_groups').delete().eq('id', params.id).eq('owner_id', s.user.id).select('id');
  if (error) return falha(error, 'Falha ao apagar o grupo.');
  if (!data?.length) return NextResponse.json({ error: 'Só quem criou o grupo pode apagá-lo.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
