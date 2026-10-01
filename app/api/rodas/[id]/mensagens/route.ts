import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { autores } from '@/lib/mural';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** POST /api/rodas/<id>/mensagens { corpo } — fala na roda (quem está nela, com ela aberta). */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Roda inválida.' }, { status: 400 });
  const corpo = texto((await request.json().catch(() => null))?.corpo, 1000);
  if (!corpo) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('roda_mensagens')
    .insert({ roda_id: params.id, autor_id: s.user.id, corpo })
    .select('id, corpo, created_at')
    .single();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (error?.code === '42501') return NextResponse.json({ error: 'A roda terminou ou você ainda não entrou nela.' }, { status: 403 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível enviar agora.' }, { status: 500 });
  const pessoas = await autores(s.sb, [s.user.id]);
  return NextResponse.json({
    mensagem: {
      id: data.id,
      autor: pessoas.get(s.user.id) ?? { id: s.user.id, nome: 'Você', avatarPath: null },
      corpo: data.corpo,
      criadaEm: data.created_at,
      minha: true,
    },
  }, { status: 201 });
}
