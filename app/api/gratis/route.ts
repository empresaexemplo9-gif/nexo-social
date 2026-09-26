import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
  gratisPorTitulo,
  indicacoesGratis,
  type AreaGratis,
  type EstiloDeIndicacao,
  type IdiomaDeIndicacao,
} from '@/lib/gratis';
import { BOOK_GENRES, FILM_GENRES, HOBBIES } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const AREAS: AreaGratis[] = ['filmes', 'livros', 'audiolivros', 'hobbies'];
const ESTILOS: EstiloDeIndicacao[] = ['misturar', 'classicos', 'descobertas'];
const RODADAS = 5;

function chaveValida(area: AreaGratis, chave: string): boolean {
  if (area === 'filmes') return FILM_GENRES.some((g) => g.id === chave);
  if (area === 'hobbies') return HOBBIES.some((h) => h.id === chave);
  return BOOK_GENRES.some((g) => g.id === chave);
}

// Uma montagem por área/gênero/estilo/idioma/rodada por dia — as fontes são
// lentas e o YouTube cobra cota por busca.
const montar = unstable_cache(
  async (area: AreaGratis, chave: string, estilo: EstiloDeIndicacao, idioma: IdiomaDeIndicacao, rodada: number, _dia: string) =>
    indicacoesGratis({ area, chave, estilo, idioma, rodada }),
  ['gratis-v1'],
  { revalidate: 43200 },
);

const porTitulo = unstable_cache(async (titulo: string, autor: string | null) => gratisPorTitulo(titulo, autor), ['gratis-titulo-v1'], {
  revalidate: 86400,
});

/**
 * GET /api/gratis?area=filmes&genero=drama&estilo=descobertas&idioma=pt&rodada=0
 * GET /api/gratis?titulo=Dom Casmurro&autor=Machado de Assis
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;

  const titulo = (p.get('titulo') || '').trim().slice(0, 120);
  if (titulo) {
    const autor = (p.get('autor') || '').trim().slice(0, 80) || null;
    const r = await porTitulo(titulo, autor);
    return NextResponse.json(r, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  }

  const area = p.get('area') as AreaGratis;
  const chave = (p.get('genero') || '').trim();
  if (!AREAS.includes(area)) return NextResponse.json({ error: 'Área inválida.' }, { status: 400 });
  if (!chaveValida(area, chave)) return NextResponse.json({ error: 'Gênero ou hobby inválido.' }, { status: 400 });
  const estilo = ESTILOS.includes(p.get('estilo') as EstiloDeIndicacao) ? (p.get('estilo') as EstiloDeIndicacao) : 'misturar';
  const idioma: IdiomaDeIndicacao = p.get('idioma') === 'todos' ? 'todos' : 'pt';
  const rodada = Math.abs(Number.parseInt(p.get('rodada') || '0', 10) || 0) % RODADAS;
  const dia = new Date().toISOString().slice(0, 10);

  const r = await montar(area, chave, estilo, idioma, rodada, dia);
  return NextResponse.json(
    { ...r, rodada, rodadas: RODADAS },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=43200' } },
  );
}
