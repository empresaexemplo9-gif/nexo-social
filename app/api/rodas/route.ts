import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { montarRodas } from '@/lib/listas';
import { RODA_ENCERRA_PARADA_HORAS } from '@/lib/listas-tipos';
import { ehAssuntoTipo, ehVisibilidade, normalizarBusca } from '@/lib/mural-tipos';
import { isUuid } from '@/lib/social';
import { semTabela } from '@/lib/erros-banco';

export const dynamic = 'force-dynamic';

const SEM_RODAS = () => NextResponse.json({ error: 'As rodas de conversa ainda não foram ativadas no banco.' }, { status: 503 });

/**
 * GET /api/rodas — as rodas abertas que a pessoa pode ver (as paradas há mais
 * de 24 h já contam como encerradas, mesmo antes da faxina do banco) e as
 * encerradas de que ela participou (para se adicionar aos contatos).  ?q=<texto>
 */
export async function GET(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const limite = new Date(Date.now() - RODA_ENCERRA_PARADA_HORAS * 3600_000).toISOString();

  let abertas = s.sb.from('rodas').select('*').eq('aberta', true).gt('ultima_atividade', limite)
    .order('ultima_atividade', { ascending: false }).limit(30);
  for (const termo of normalizarBusca(new URL(request.url).searchParams.get('q') || '').split(' ').filter((t) => t.length >= 2).slice(0, 6)) {
    abertas = abertas.like('busca', `%${termo}%`);
  }
  // Encerradas: o banco só mostra a quem participou.
  const [a, e] = await Promise.all([
    abertas,
    s.sb.from('rodas').select('*').eq('aberta', false).order('encerrada_em', { ascending: false }).limit(10),
  ]);
  if (semTabela(a.error)) return SEM_RODAS();
  if (a.error) return NextResponse.json({ error: 'Falha ao carregar as rodas.' }, { status: 500 });
  const [rodasAbertas, encerradas] = await Promise.all([
    montarRodas(s.sb, a.data ?? [], s.user.id),
    montarRodas(s.sb, e.data ?? [], s.user.id),
  ]);
  return NextResponse.json({ abertas: rodasAbertas, encerradas }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** POST /api/rodas — abre uma roda (quem abre já está nela). */
export async function POST(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const b = await request.json().catch(() => null);
  const tema = texto(b?.tema, 160);
  if (!tema) return NextResponse.json({ error: 'Diga sobre o que é a roda.' }, { status: 400 });
  const visibilidade = b?.visibilidade;
  if (!ehVisibilidade(visibilidade)) return NextResponse.json({ error: 'Escolha quem pode entrar.' }, { status: 400 });
  const grupoId = visibilidade === 'grupo' ? String(b?.grupoId ?? '') : null;
  if (visibilidade === 'grupo' && !isUuid(grupoId!)) return NextResponse.json({ error: 'Escolha o grupo.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('rodas')
    .insert({
      criador_id: s.user.id,
      tema,
      descricao: texto(b?.descricao, 1000),
      assunto_tipo: ehAssuntoTipo(b?.assuntoTipo) ? b.assuntoTipo : null,
      visibilidade,
      grupo_id: grupoId,
    })
    .select('id')
    .single();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (semTabela(error)) return SEM_RODAS();
  if (error?.code === '42501') return NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível abrir a roda.' }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
