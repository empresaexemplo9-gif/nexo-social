import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { montarPublicacoes } from '@/lib/mural';
import { montarListas, montarRodas } from '@/lib/listas';
import { RODA_ENCERRA_PARADA_HORAS } from '@/lib/listas-tipos';
import { normalizarBusca } from '@/lib/mural-tipos';
import { searchPeople } from '@/lib/social';
import { FORMATOS, PAUTA, slugDaPauta } from '@/lib/historicas-pauta';
import { getTopic, type CategorySlug } from '@/lib/data';

export const dynamic = 'force-dynamic';

const LIMITE = 8;

/** As matérias históricas cujo assunto tem todos os termos. */
function historicas(termos: string[]) {
  const saida: { tema: CategorySlug; temaRotulo: string; slug: string; titulo: string; formato: string }[] = [];
  for (const [tema, lista] of Object.entries(PAUTA) as [CategorySlug, (typeof PAUTA)[CategorySlug]][]) {
    for (const p of lista) {
      const alvo = normalizarBusca(`${p.verbete} ${getTopic(tema)?.label ?? ''}`);
      if (termos.every((t) => alvo.includes(t))) {
        saida.push({ tema, temaRotulo: getTopic(tema)?.label ?? tema, slug: slugDaPauta(p.verbete), titulo: p.verbete.replace(/ \(.+\)$/, ''), formato: FORMATOS[p.formato].rotulo });
      }
    }
  }
  return saida.slice(0, LIMITE);
}

/**
 * GET /api/busca/conteudo?q=… — o que as pessoas publicaram, as listas e as
 * rodas abertas (só o que quem busca pode ver), pessoas pelo nome e matérias
 * históricas.
 */
export async function GET(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 120);
  const termos = normalizarBusca(q).split(' ').filter((t) => t.length >= 2).slice(0, 6);
  if (!termos.length) return NextResponse.json({ q, publicacoes: [], listas: [], rodas: [], pessoas: [], historicas: [] });

  // O banco (RLS) devolve só o que quem busca pode ver.
  let consulta = s.sb.from('publicacoes').select('*').order('created_at', { ascending: false }).limit(LIMITE);
  let listas = s.sb.from('listas').select('*').order('updated_at', { ascending: false }).limit(LIMITE);
  let rodas = s.sb.from('rodas').select('*').eq('aberta', true)
    .gt('ultima_atividade', new Date(Date.now() - RODA_ENCERRA_PARADA_HORAS * 3600_000).toISOString())
    .order('ultima_atividade', { ascending: false }).limit(LIMITE);
  for (const t of termos) {
    consulta = consulta.like('busca', `%${t}%`);
    listas = listas.like('busca', `%${t}%`);
    rodas = rodas.like('busca', `%${t}%`);
  }
  const [pubs, ls, rs, pessoas] = await Promise.all([
    consulta,
    listas,
    rodas,
    searchPeople(s.sb, q).catch(() => []),
  ]);

  const [publicacoes, listasAchadas, rodasAchadas] = await Promise.all([
    pubs.error ? [] : montarPublicacoes(s.sb, pubs.data ?? [], s.user.id),
    ls.error ? [] : montarListas(s.sb, ls.data ?? [], s.user.id),
    rs.error ? [] : montarRodas(s.sb, rs.data ?? [], s.user.id),
  ]);
  return NextResponse.json({
    q,
    publicacoes,
    listas: listasAchadas,
    rodas: rodasAchadas,
    pessoas: pessoas.slice(0, LIMITE),
    historicas: historicas(termos),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
