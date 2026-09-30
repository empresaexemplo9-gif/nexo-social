import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { enviarAviso, pushConfigurado } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** POST — manda um aviso de teste para os aparelhos da pessoa. */
export async function POST() {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 });
  if (!pushConfigurado()) return NextResponse.json({ error: 'Os avisos no aparelho ainda não foram ligados no servidor.' }, { status: 503 });
  const entregas = await enviarAviso([user.id], {
    tipo: 'teste',
    titulo: 'Avisos ligados',
    corpo: 'É assim que ligações, mensagens, convites e lembretes vão chegar.',
    link: '/conta#avisos',
    etiqueta: 'teste',
    ligacao: false,
    quando: Date.now(),
  });
  if (!entregas) return NextResponse.json({ error: 'Nenhum aparelho seu está inscrito. Ative os avisos neste aparelho primeiro.' }, { status: 404 });
  return NextResponse.json({ ok: true, entregas });
}
