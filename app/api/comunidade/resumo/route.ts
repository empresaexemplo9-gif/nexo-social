import { NextResponse } from 'next/server';
import { exigirSessao, grupoResumo } from '@/lib/comunidade';
import { profilesByIds } from '@/lib/social';
import { avataresPorId, previaDaLinha } from '@/lib/chat-mensagens';
import type { GrupoResumo } from '@/lib/comunidade-tipos';

export const dynamic = 'force-dynamic';

/**
 * GET /api/comunidade/resumo — a Comunidade em uma olhada, para a home:
 * grupos com a última mensagem de cada um, conversas recentes com contatos
 * (com as não lidas), pedidos de contato e convites para grupos.
 */
export async function GET() {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const eu = s.user.id;

  const { data: gruposBrutos, error } = await s.sb.rpc('my_community_groups');
  if (error) return NextResponse.json({ error: 'Falha ao carregar a Comunidade.' }, { status: 500 });
  const todos: GrupoResumo[] = (gruposBrutos ?? []).map(grupoResumo);
  const grupos = todos
    .filter((g) => g.myStatus === 'ativo')
    .sort((a, b) => Date.parse(b.lastActivity ?? '0') - Date.parse(a.lastActivity ?? '0'));
  const convites = todos.filter((g) => g.myStatus === 'convidado');

  // Última mensagem do chat de cada um dos grupos mais ativos.
  const ultimaDoGrupo = async (id: string) => {
    const q = (cols: string) => s.sb.from('community_chat_messages').select(cols).eq('group_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    let { data, error: e } = await q('author_id, body, kind, media_meta, created_at');
    if (e?.code === '42703') ({ data } = await q('author_id, body, created_at'));
    return (data ?? null) as any;
  };
  const ultimas = await Promise.all(grupos.slice(0, 4).map((g) => ultimaDoGrupo(g.id)));

  // Conversas diretas: a mensagem mais recente com cada contato e as não lidas.
  const q = (cols: string) => s.sb.from('messages').select(cols).or(`from_user.eq.${eu},to_user.eq.${eu}`).is('appointment_id', null).order('created_at', { ascending: false }).limit(80);
  let { data: diretas, error: e2 } = await q('from_user, to_user, body, kind, media_meta, read_at, created_at');
  if (e2?.code === '42703') ({ data: diretas } = await q('from_user, to_user, body, read_at, created_at'));
  const porContato = new Map<string, { ultima: any; naoLidas: number }>();
  for (const m of (diretas ?? []) as any[]) {
    const outro = m.from_user === eu ? m.to_user : m.from_user;
    const atual = porContato.get(outro) ?? { ultima: m, naoLidas: 0 };
    if (m.to_user === eu && !m.read_at) atual.naoLidas += 1;
    porContato.set(outro, atual);
  }
  const conversas = Array.from(porContato.entries()).slice(0, 4);

  const { count: pedidos } = await s.sb.from('connections').select('id', { count: 'exact', head: true }).eq('contact_id', eu).eq('status', 'pendente');

  const pessoas = [...ultimas.filter(Boolean).map((u) => u.author_id), ...conversas.map(([id]) => id)];
  const [nomes, fotos] = await Promise.all([profilesByIds(s.sb, pessoas), avataresPorId(s.sb, conversas.map(([id]) => id))]);

  return NextResponse.json({
    grupos: grupos.slice(0, 4).map((g, i) => ({
      id: g.id, name: g.name, imagePath: g.imagePath, memberCount: g.memberCount, playingTitle: g.playingTitle,
      ultima: ultimas[i] ? {
        autor: ultimas[i].author_id === eu ? 'Você' : nomes.get(ultimas[i].author_id)?.name?.split(' ')[0] ?? 'Alguém',
        texto: previaDaLinha(ultimas[i]).slice(0, 90),
        em: ultimas[i].created_at,
      } : null,
    })),
    totalDeGrupos: grupos.length,
    conversas: conversas.map(([id, c]) => ({
      userId: id,
      name: nomes.get(id)?.name ?? 'Contato',
      avatar: fotos.get(id) ?? null,
      texto: `${c.ultima.from_user === eu ? 'Você: ' : ''}${previaDaLinha(c.ultima)}`.slice(0, 90),
      em: c.ultima.created_at,
      naoLidas: c.naoLidas,
    })),
    pedidosDeContato: pedidos ?? 0,
    convites: convites.map((g) => ({ id: g.id, name: g.name, invitedByName: g.invitedByName })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
