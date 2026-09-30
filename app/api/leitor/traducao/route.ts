import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { carregarLivro } from '@/lib/leitor';
import { precisaTraduzir, traduzirTextos } from '@/lib/traducao';

export const maxDuration = 30;

const TRINTA_DIAS = 60 * 60 * 24 * 30;

type Traducao =
  | { emPortugues: true }
  | { tipo: 'sumario'; origem: string | null; titulo: string; capitulos: string[] }
  | { tipo: 'capitulo'; origem: string | null; cap: number; titulo: string; paragrafos: string[] };

// Cada capítulo é traduzido uma vez e fica guardado para todo mundo que lê.
// Erros não são guardados: o próximo pedido tenta de novo.
const traduzir = unstable_cache(
  async (id: number, parte: number | 'sumario'): Promise<Traducao> => {
    const livro = await carregarLivro(id);
    if (!precisaTraduzir(livro.idioma)) return { emPortugues: true };
    if (parte === 'sumario') {
      const r = await traduzirTextos([livro.titulo, ...livro.capitulos.map((c) => c.titulo)], { de: livro.idioma });
      return { tipo: 'sumario', origem: r.origem, titulo: r.textos[0], capitulos: r.textos.slice(1) };
    }
    const c = livro.capitulos[parte];
    if (!c) throw new Error('Capítulo inexistente.');
    const r = await traduzirTextos([c.titulo, ...c.paragrafos], { de: livro.idioma });
    if (!livro.idioma && r.origem?.startsWith('pt')) return { emPortugues: true };
    return { tipo: 'capitulo', origem: r.origem ?? livro.idioma, cap: parte, titulo: r.textos[0], paragrafos: r.textos.slice(1) };
  },
  ['leitor-traducao-v1'],
  { revalidate: TRINTA_DIAS },
);

/**
 * GET /api/leitor/traducao?id=1342&cap=3 — o capítulo traduzido para o português.
 * GET /api/leitor/traducao?id=1342&cap=sumario — o título e os títulos dos capítulos.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const id = Number((q.get('id') || '').trim());
  const capBruto = (q.get('cap') || '').trim();
  const parte = capBruto === 'sumario' ? 'sumario' : Number(capBruto);
  if (!Number.isInteger(id) || id <= 0 || id > 10_000_000 || (parte !== 'sumario' && (!Number.isInteger(parte) || parte < 0 || parte > 2000))) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  }
  try {
    const t = await traduzir(id, parte);
    return NextResponse.json(t, { headers: { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=604800' } });
  } catch (e: any) {
    // O navegador de quem lê tenta traduzir direto quando o servidor não consegue.
    return NextResponse.json({ error: e?.message || 'Não foi possível traduzir agora.' }, { status: 502 });
  }
}
