import { NextResponse } from 'next/server';
import { exigirSessao, falha, idInvalido, texto } from '@/lib/comunidade';
import { salaDaLinha } from '@/lib/comunidade-tipos';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/**
 * A sala sincronizada do grupo. `agora` é o relógio do servidor: com ele cada
 * aparelho corrige a diferença do próprio relógio antes de calcular em que
 * segundo a música ou o clipe está para todo mundo.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const { data, error } = await s.sb.from('community_sessions').select('*').eq('group_id', params.id).maybeSingle();
  if (error) return falha(error, 'Falha ao carregar a sala.');
  return NextResponse.json({ sala: salaDaLinha(data), agora: new Date().toISOString() });
}

/**
 * Muda a sala para todos: escolhe o que tocar (`youtubeId`), dá play, pausa
 * ou pula para outro ponto (`isPlaying` + `positionSec`). Qualquer membro pode.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const b = await request.json().catch(() => null);
  const novo = b?.youtubeId === undefined ? undefined : String(b.youtubeId);
  if (novo !== undefined && !/^[\w-]{11}$/.test(novo)) {
    return NextResponse.json({ error: 'Vídeo inválido.' }, { status: 400 });
  }
  const pos = Number(b?.positionSec);

  const { data: atual, error: e1 } = await s.sb
    .from('community_sessions')
    .select('*')
    .eq('group_id', params.id)
    .maybeSingle();
  if (e1) return falha(e1, 'Falha ao carregar a sala.');

  const youtubeId = novo ?? atual?.youtube_id;
  if (!youtubeId) return NextResponse.json({ error: 'Escolha primeiro o que tocar.' }, { status: 400 });

  const trocou = novo !== undefined && novo !== atual?.youtube_id;
  const { data, error } = await s.sb
    .from('community_sessions')
    .upsert(
      {
        group_id: params.id,
        youtube_id: youtubeId,
        title: trocou || b?.title !== undefined ? texto(b?.title, 200) : atual?.title ?? null,
        kind: b?.kind === 'musica' ? 'musica' : b?.kind === 'clipe' ? 'clipe' : trocou ? 'clipe' : atual?.kind ?? 'clipe',
        is_playing: typeof b?.isPlaying === 'boolean' ? b.isPlaying : trocou ? true : Boolean(atual?.is_playing),
        position_sec: Number.isFinite(pos) && pos >= 0 ? pos : trocou ? 0 : Number(atual?.position_sec) || 0,
        updated_by: s.user.id,
      },
      { onConflict: 'group_id' },
    )
    .select('*')
    .maybeSingle();
  if (error || !data) return falha(error, 'Falha ao atualizar a sala.');
  return NextResponse.json({ ok: true, sala: salaDaLinha(data), agora: new Date().toISOString() });
}

/** Limpa a sala para todos: tira o vídeo da tela até alguém escolher outro. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const inv = idInvalido(params.id);
  if (inv) return inv;

  const { data, error } = await s.sb
    .from('community_sessions')
    .upsert(
      { group_id: params.id, youtube_id: null, title: null, is_playing: false, position_sec: 0, updated_by: s.user.id },
      { onConflict: 'group_id' },
    )
    .select('*')
    .maybeSingle();
  if (error || !data) return falha(error, 'Falha ao limpar a sala.');
  return NextResponse.json({ ok: true, sala: salaDaLinha(data), agora: new Date().toISOString() });
}
