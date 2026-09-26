import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido } from '@/lib/comunidade';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

/**
 * DELETE ?userId=<id> — sem userId (ou com o próprio), a pessoa sai do grupo;
 * com o de outra, o dono a remove (ou cancela o convite dela).
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const alvo = new URL(request.url).searchParams.get('userId') || s.user.id;
  if (!isUuid(alvo)) return NextResponse.json({ error: 'Pessoa inválida.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('community_members')
    .delete()
    .eq('group_id', params.id)
    .eq('user_id', alvo)
    .select('user_id');
  if (error) return falha(error, 'Falha ao tirar do grupo.');
  if (!data?.length) {
    return NextResponse.json(
      {
        error:
          alvo === s.user.id
            ? 'Quem criou o grupo não sai dele: para encerrar, apague o grupo.'
            : 'Só quem criou o grupo remove outras pessoas.',
      },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
