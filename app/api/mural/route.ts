import { NextResponse } from 'next/server';
import { exigirSessao, seBanido, texto } from '@/lib/comunidade';
import { youtubeIdDe } from '@/lib/comunidade-tipos';
import { idsDosContatos, montarPublicacoes } from '@/lib/mural';
import { ehAssuntoTipo, ehTipoPublicacao, ehVisibilidade, normalizarBusca, TIPOS_PUBLICACAO } from '@/lib/mural-tipos';
import { isUuid } from '@/lib/social';
import { getTopic } from '@/lib/data';
import { semTabela } from '@/lib/erros-banco';

export const dynamic = 'force-dynamic';

const POR_PAGINA = 20;
const privado = { 'Cache-Control': 'private, no-store' };
const SEM_MURAL = () => NextResponse.json({ error: 'O mural ainda não foi ativado no banco.' }, { status: 503 });

/**
 * GET /api/mural — as publicações que a pessoa pode ver, da mais nova à mais antiga.
 *   ?escopo=todos|contatos|meus   ?autor=<id>   ?grupo=<id>   ?tipo=<tipo>
 *   ?q=<texto> (busca)   ?antes=<data> (página seguinte)
 */
export async function GET(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const p = new URL(request.url).searchParams;

  let q = s.sb.from('publicacoes').select('*').order('created_at', { ascending: false }).limit(POR_PAGINA);
  const antes = p.get('antes');
  if (antes && !Number.isNaN(Date.parse(antes))) q = q.lt('created_at', antes);
  const tipo = p.get('tipo');
  if (ehTipoPublicacao(tipo)) q = q.eq('tipo', tipo);
  const autor = p.get('autor');
  if (autor && isUuid(autor)) q = q.eq('autor_id', autor);
  const grupo = p.get('grupo');
  if (grupo && isUuid(grupo)) q = q.eq('grupo_id', grupo);
  const escopo = p.get('escopo');
  if (escopo === 'meus') q = q.eq('autor_id', s.user.id);
  if (escopo === 'contatos') {
    const contatos = await idsDosContatos(s.sb, s.user.id);
    if (!contatos.length) return NextResponse.json({ publicacoes: [], fim: true }, { headers: privado });
    q = q.in('autor_id', contatos);
  }
  for (const termo of normalizarBusca(p.get('q') || '').split(' ').filter((t) => t.length >= 2).slice(0, 6)) {
    q = q.like('busca', `%${termo}%`);
  }

  const { data, error } = await q;
  if (semTabela(error)) return SEM_MURAL();
  if (error) return NextResponse.json({ error: 'Falha ao carregar o mural.' }, { status: 500 });
  const linhas = data ?? [];
  return NextResponse.json(
    { publicacoes: await montarPublicacoes(s.sb, linhas, s.user.id), fim: linhas.length < POR_PAGINA },
    { headers: privado },
  );
}

/** POST /api/mural — publica. Quem vê é escolha de quem publica: todos, contatos ou um grupo. */
export async function POST(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const b = await request.json().catch(() => null);

  const tipo = b?.tipo;
  if (!ehTipoPublicacao(tipo)) return NextResponse.json({ error: 'Escolha o tipo da publicação.' }, { status: 400 });
  const def = TIPOS_PUBLICACAO.find((t) => t.id === tipo)!;
  const visibilidade = b?.visibilidade;
  if (!ehVisibilidade(visibilidade)) return NextResponse.json({ error: 'Escolha quem vê a publicação.' }, { status: 400 });
  const grupoId = visibilidade === 'grupo' ? String(b?.grupoId ?? '') : null;
  if (visibilidade === 'grupo' && !isUuid(grupoId!)) return NextResponse.json({ error: 'Escolha o grupo.' }, { status: 400 });

  const titulo = texto(b?.titulo, 160);
  const corpo = texto(b?.corpo, 5000);
  const assunto = def.assunto ? texto(b?.assunto, 160) : null;
  if (def.assunto && !assunto) {
    return NextResponse.json({ error: tipo === 'livro' ? 'Diga qual é o livro.' : 'Diga sobre o que é (o filme, o show, o jogo…).' }, { status: 400 });
  }
  const assuntoTipo = tipo === 'livro' ? 'livro' : def.assunto && ehAssuntoTipo(b?.assuntoTipo) ? b.assuntoTipo : null;
  const nota = def.nota && Number.isInteger(b?.nota) && b.nota >= 1 && b.nota <= 5 ? b.nota : null;
  const tema = typeof b?.tema === 'string' && getTopic(b.tema) ? b.tema : null;

  const link = texto(b?.url, 1000);
  if (link && !/^https?:\/\//i.test(link)) return NextResponse.json({ error: 'O link precisa começar com http:// ou https://.' }, { status: 400 });
  const youtubeId = youtubeIdDe(link);
  if (tipo === 'video' && !youtubeId) return NextResponse.json({ error: 'Cole o link do vídeo no YouTube.' }, { status: 400 });
  if (!titulo && !corpo && !assunto && !youtubeId) return NextResponse.json({ error: 'Escreva alguma coisa para publicar.' }, { status: 400 });

  const linha = {
    autor_id: s.user.id,
    tipo,
    titulo,
    corpo,
    assunto,
    assunto_tipo: assuntoTipo,
    nota,
    tema,
    youtube_id: youtubeId,
    url: youtubeId ? null : link,
    visibilidade,
    grupo_id: grupoId,
  };
  const { data, error } = await s.sb.from('publicacoes').insert(linha).select('*').single();
  const banido = await seBanido(s.sb, s.user.id, { error, data });
  if (banido) return banido;
  if (semTabela(error)) return SEM_MURAL();
  if (error?.code === '42501') {
    return NextResponse.json({ error: visibilidade === 'grupo' ? 'Você não participa deste grupo.' : 'Não foi possível publicar.' }, { status: 403 });
  }
  if (error || !data) return NextResponse.json({ error: 'Não foi possível publicar.' }, { status: 500 });
  const [publicacao] = await montarPublicacoes(s.sb, [data], s.user.id);
  return NextResponse.json({ publicacao }, { status: 201 });
}
