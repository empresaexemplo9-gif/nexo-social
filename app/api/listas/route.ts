import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { idsDosContatos } from '@/lib/mural';
import { montarListas } from '@/lib/listas';
import { ehTipoLista } from '@/lib/listas-tipos';
import { ehVisibilidade, normalizarBusca } from '@/lib/mural-tipos';
import { isUuid } from '@/lib/social';
import { semTabela } from '@/lib/erros-banco';

export const dynamic = 'force-dynamic';

const privado = { 'Cache-Control': 'private, no-store' };
const SEM_LISTAS = () => NextResponse.json({ error: 'As listas ainda não foram ativadas no banco.' }, { status: 503 });

/**
 * GET /api/listas — as listas que a pessoa pode ver.
 *   ?escopo=sugestoes (padrão: as abertas a todos, de outras pessoas, com itens)
 *          |minhas|contatos   ?autor=<id>   ?tipo=<tipo>   ?q=<texto>
 */
export async function GET(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const p = new URL(request.url).searchParams;
  const escopo = p.get('escopo') || 'sugestoes';
  const limite = Math.min(48, Math.max(1, Number(p.get('limite')) || 24));

  let q = s.sb.from('listas').select('*').order('updated_at', { ascending: false }).limit(limite);
  const autor = p.get('autor');
  if (autor && isUuid(autor)) q = q.eq('autor_id', autor);
  else if (escopo === 'minhas') q = q.eq('autor_id', s.user.id);
  else if (escopo === 'contatos') {
    const contatos = await idsDosContatos(s.sb, s.user.id);
    if (!contatos.length) return NextResponse.json({ listas: [] }, { headers: privado });
    q = q.in('autor_id', contatos);
  } else q = q.eq('visibilidade', 'todos').neq('autor_id', s.user.id);
  const tipo = p.get('tipo');
  if (ehTipoLista(tipo)) q = q.eq('tipo', tipo);
  for (const termo of normalizarBusca(p.get('q') || '').split(' ').filter((t) => t.length >= 2).slice(0, 6)) {
    q = q.like('busca', `%${termo}%`);
  }

  const { data, error } = await q;
  if (semTabela(error)) return SEM_LISTAS();
  if (error) return NextResponse.json({ error: 'Falha ao carregar as listas.' }, { status: 500 });
  let listas = await montarListas(s.sb, data ?? [], s.user.id);
  // Sugestão é lista com o que ouvir, ler ou assistir.
  if (escopo === 'sugestoes' && !autor) listas = listas.filter((l) => l.itens > 0);
  return NextResponse.json({ listas }, { headers: privado });
}

/** POST /api/listas — cria a lista (os itens entram depois, na página dela). */
export async function POST(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const b = await request.json().catch(() => null);
  const tipo = b?.tipo;
  if (!ehTipoLista(tipo)) return NextResponse.json({ error: 'Escolha o tipo da lista.' }, { status: 400 });
  const titulo = texto(b?.titulo, 120);
  if (!titulo) return NextResponse.json({ error: 'Dê um nome à lista.' }, { status: 400 });
  const visibilidade = b?.visibilidade;
  if (!ehVisibilidade(visibilidade)) return NextResponse.json({ error: 'Escolha quem vê a lista.' }, { status: 400 });
  const grupoId = visibilidade === 'grupo' ? String(b?.grupoId ?? '') : null;
  if (visibilidade === 'grupo' && !isUuid(grupoId!)) return NextResponse.json({ error: 'Escolha o grupo.' }, { status: 400 });

  const { data, error } = await s.sb
    .from('listas')
    .insert({ autor_id: s.user.id, tipo, titulo, descricao: texto(b?.descricao, 1000), visibilidade, grupo_id: grupoId })
    .select('*')
    .single();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (semTabela(error)) return SEM_LISTAS();
  if (error?.code === '42501') return NextResponse.json({ error: 'Você não participa deste grupo.' }, { status: 403 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível criar a lista.' }, { status: 500 });
  const [lista] = await montarListas(s.sb, [data], s.user.id);
  return NextResponse.json({ lista }, { status: 201 });
}
