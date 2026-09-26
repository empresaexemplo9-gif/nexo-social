import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido } from '@/lib/comunidade';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

/**
 * Convida contas da plataforma para o grupo. Qualquer membro convida. O
 * convite chega nas notificações (gatilho notify_community_member no banco) e
 * fica pendente até a pessoa aceitar ou recusar.
 *
 * Quem ainda não tem conta é convidado pelo link do grupo (ver
 * /comunidade/convite/[token]).
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  const ids = (Array.isArray(b?.userIds) ? b.userIds : []).filter(isUuid).slice(0, 50);
  if (!ids.length) return NextResponse.json({ error: 'Escolha quem você quer convidar.' }, { status: 400 });

  const { data, error } = await s.sb.rpc('invite_to_group', { p_group: params.id, p_users: ids });
  if (error) return falha(error, 'Falha ao convidar.');

  const por = (r: string) => (data ?? []).filter((x: { resultado: string }) => x.resultado === r).length;
  return NextResponse.json({
    ok: true,
    convidados: por('convidado'),
    jaConvidados: por('ja_convidado'),
    jaMembros: por('ja_membro'),
  });
}
