import { NextResponse } from 'next/server';
import { exigirSessao, idInvalido, minhaParticipacao } from '@/lib/comunidade';
import { isUuid, profilesByIds } from '@/lib/social';
import { avataresPorId } from '@/lib/chat-mensagens';
import { semTabela } from '@/lib/erros-banco';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };
const JOGOS = ['trilha', 'arcanos'] as const;

async function membro(id: string) {
  const s = await exigirSessao();
  if (!s.ok) return { erro: s.response } as const;
  const inv = idInvalido(id);
  if (inv) return { erro: inv } as const;
  const me = await minhaParticipacao(s.sb, id, s.user.id);
  if (!me || me.status !== 'ativo') return { erro: NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 }) } as const;
  return { s } as const;
}

/** GET — ranking do grupo em cada jogo (vitórias) e as últimas partidas. */
export async function GET(_request: Request, { params }: Ctx) {
  const r = await membro(params.id);
  if ('erro' in r) return r.erro;
  const { s } = r;

  const { data, error } = await s.sb
    .from('community_game_results')
    .select('id, game, winner_id, players, details, created_at')
    .eq('group_id', params.id)
    .order('created_at', { ascending: false })
    .limit(500);
  // O placar ainda não foi criado no banco — os jogos funcionam, só sem ranking.
  if (semTabela(error)) return NextResponse.json({ ativo: false, ranking: { trilha: [], arcanos: [] }, recentes: [] });
  if (error) return NextResponse.json({ error: 'Falha ao carregar o placar.' }, { status: 500 });

  const linhas = (data ?? []) as { id: string; game: string; winner_id: string | null; players: string[]; details: any; created_at: string }[];
  const pessoas = Array.from(new Set(linhas.flatMap((l) => l.players)));
  const [nomes, fotos] = await Promise.all([profilesByIds(s.sb, pessoas), avataresPorId(s.sb, pessoas)]);
  const nome = (id: string) => nomes.get(id)?.name || nomes.get(id)?.email?.split('@')[0] || 'Membro';

  const ranking = Object.fromEntries(
    JOGOS.map((jogo) => {
      const placar = new Map<string, { vitorias: number; partidas: number }>();
      for (const l of linhas.filter((x) => x.game === jogo)) {
        for (const p of l.players) {
          const atual = placar.get(p) ?? { vitorias: 0, partidas: 0 };
          atual.partidas += 1;
          if (l.winner_id === p) atual.vitorias += 1;
          placar.set(p, atual);
        }
      }
      const lista = Array.from(placar, ([userId, v]) => ({ userId, nome: nome(userId), avatar: fotos.get(userId) ?? null, ...v }))
        .sort((a, b) => b.vitorias - a.vitorias || a.partidas - b.partidas)
        .slice(0, 8);
      return [jogo, lista];
    }),
  );

  return NextResponse.json({
    ativo: true,
    ranking,
    recentes: linhas.slice(0, 10).map((l) => ({
      id: l.id,
      jogo: l.game,
      vencedor: l.winner_id ? nome(l.winner_id) : null,
      jogadores: l.players.map(nome),
      em: l.created_at,
      resumo: typeof l.details?.resumo === 'string' ? l.details.resumo.slice(0, 140) : null,
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** POST { mesa, jogo, vencedor, jogadores, resumo } — grava o fim de uma partida. */
export async function POST(request: Request, { params }: Ctx) {
  const r = await membro(params.id);
  if ('erro' in r) return r.erro;
  const { s } = r;
  const b = await request.json().catch(() => null);

  const mesa = String(b?.mesa ?? '');
  const jogo = String(b?.jogo ?? '');
  const jogadores: string[] = Array.isArray(b?.jogadores) ? Array.from(new Set(b.jogadores.filter(isUuid))) : [];
  const vencedor = isUuid(b?.vencedor) ? b.vencedor : null;
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(mesa) || !(JOGOS as readonly string[]).includes(jogo)) return NextResponse.json({ error: 'Partida inválida.' }, { status: 400 });
  if (!jogadores.length || jogadores.length > 12 || !jogadores.includes(s.user.id)) return NextResponse.json({ error: 'Jogadores inválidos.' }, { status: 400 });
  if (vencedor && !jogadores.includes(vencedor)) return NextResponse.json({ error: 'Vencedor inválido.' }, { status: 400 });

  const { error } = await s.sb.from('community_game_results').insert({
    id: mesa,
    group_id: params.id,
    game: jogo,
    winner_id: vencedor,
    players: jogadores,
    details: { resumo: typeof b?.resumo === 'string' ? b.resumo.slice(0, 200) : null },
    created_by: s.user.id,
  });
  // 23505: a outra pessoa da partida já gravou. semTabela: placar ainda não existe.
  if (error && error.code !== '23505') {
    if (semTabela(error)) return NextResponse.json({ ok: false, ativo: false });
    return NextResponse.json({ error: 'Não foi possível gravar a partida.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
