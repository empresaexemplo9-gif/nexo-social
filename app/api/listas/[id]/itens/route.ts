import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { youtubeIdDe } from '@/lib/comunidade-tipos';
import { isUuid } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** Uma lista não vira um catálogo: até este tanto de itens. */
const MAX_ITENS = 200;

/** A lista é de quem pede? (Os itens só mudam pelas mãos de quem criou.) */
async function minhaLista(sb: SupabaseClient, id: string, userId: string) {
  const { data } = await sb.from('listas').select('id').eq('id', id).eq('autor_id', userId).maybeSingle();
  return Boolean(data);
}

/** POST /api/listas/<id>/itens — põe um item no fim da lista. */
export async function POST(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Lista inválida.' }, { status: 400 });
  const b = await request.json().catch(() => null);
  const titulo = texto(b?.titulo, 200);
  if (!titulo) return NextResponse.json({ error: 'Diga o que é (o nome da música, do livro, do filme…).' }, { status: 400 });
  const link = texto(b?.url, 1000);
  if (link && !/^https?:\/\//i.test(link)) return NextResponse.json({ error: 'O link precisa começar com http:// ou https://.' }, { status: 400 });
  const youtubeId = (typeof b?.youtubeId === 'string' && /^[\w-]{11}$/.test(b.youtubeId) ? b.youtubeId : null) ?? youtubeIdDe(link);

  if (!(await minhaLista(s.sb, params.id, s.user.id))) {
    return NextResponse.json({ error: 'Só quem criou a lista põe itens nela.' }, { status: 403 });
  }
  const { data: ultimos, count } = await s.sb
    .from('lista_itens')
    .select('posicao', { count: 'exact' })
    .eq('lista_id', params.id)
    .order('posicao', { ascending: false })
    .limit(1);
  if ((count ?? 0) >= MAX_ITENS) return NextResponse.json({ error: `A lista chegou a ${MAX_ITENS} itens. Que tal começar outra?` }, { status: 400 });

  const { data, error } = await s.sb
    .from('lista_itens')
    .insert({
      lista_id: params.id,
      posicao: (ultimos?.[0]?.posicao ?? 0) + 1,
      titulo,
      subtitulo: texto(b?.subtitulo, 200),
      youtube_id: youtubeId,
      url: youtubeId ? null : link,
      nota: texto(b?.nota, 500),
    })
    .select('id, posicao, titulo, subtitulo, youtube_id, url, nota')
    .single();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  // Nome de obra com palavra que a plataforma não aceita: barra o item, sem banir.
  if (error?.code === 'P0001') return NextResponse.json({ error: error.message }, { status: 400 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível pôr o item.' }, { status: 500 });
  return NextResponse.json({
    item: {
      id: data.id,
      posicao: data.posicao,
      titulo: data.titulo,
      subtitulo: data.subtitulo ?? null,
      youtubeId: data.youtube_id ?? null,
      url: data.url ?? null,
      nota: data.nota ?? null,
      reacoes: {},
      minhaReacao: null,
      comentarios: 0,
    },
  }, { status: 201 });
}

/** PATCH /api/listas/<id>/itens { ordem: [ids] } — reordena (quem criou). */
export async function PATCH(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Lista inválida.' }, { status: 400 });
  const b = await request.json().catch(() => null);
  const ordem: string[] = Array.isArray(b?.ordem) ? b.ordem.filter((x: unknown) => typeof x === 'string' && isUuid(x)).slice(0, MAX_ITENS) : [];
  if (!ordem.length) return NextResponse.json({ error: 'Ordem inválida.' }, { status: 400 });
  if (!(await minhaLista(s.sb, params.id, s.user.id))) {
    return NextResponse.json({ error: 'Só quem criou a lista muda a ordem.' }, { status: 403 });
  }
  const resultados = await Promise.all(
    ordem.map((id, i) => s.sb.from('lista_itens').update({ posicao: i + 1 }).eq('id', id).eq('lista_id', params.id)),
  );
  if (resultados.some((r) => r.error)) return NextResponse.json({ error: 'Não foi possível mudar a ordem.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/listas/<id>/itens?item=<id> — tira o item (quem criou). */
export async function DELETE(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const item = new URL(request.url).searchParams.get('item') || '';
  if (!isUuid(params.id) || !isUuid(item)) return NextResponse.json({ error: 'Item inválido.' }, { status: 400 });
  const { data, error } = await s.sb.from('lista_itens').delete().eq('id', item).eq('lista_id', params.id).select('id');
  if (error) return NextResponse.json({ error: 'Não foi possível tirar o item.' }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Só quem criou a lista tira itens dela.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
