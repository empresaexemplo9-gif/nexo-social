import { NextResponse } from 'next/server';
import { exigirSessao } from '@/lib/comunidade';
import { montarPublicacoes } from '@/lib/mural';
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
 * GET /api/busca/conteudo?q=… — o que as pessoas publicaram (só o que quem
 * busca pode ver), pessoas pelo nome e matérias históricas.
 */
export async function GET(request: Request) {
  const s = await exigirSessao();
  if (!s.ok) return s.response;
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 120);
  const termos = normalizarBusca(q).split(' ').filter((t) => t.length >= 2).slice(0, 6);
  if (!termos.length) return NextResponse.json({ q, publicacoes: [], pessoas: [], historicas: [] });

  let consulta = s.sb.from('publicacoes').select('*').order('created_at', { ascending: false }).limit(LIMITE);
  for (const t of termos) consulta = consulta.like('busca', `%${t}%`);
  const [pubs, pessoas] = await Promise.all([
    consulta,
    searchPeople(s.sb, q).catch(() => []),
  ]);

  return NextResponse.json({
    q,
    publicacoes: pubs.error ? [] : await montarPublicacoes(s.sb, pubs.data ?? [], s.user.id),
    pessoas: pessoas.slice(0, LIMITE),
    historicas: historicas(termos),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
