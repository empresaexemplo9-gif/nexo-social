import { NextResponse } from 'next/server';
import { carregarLivro } from '@/lib/leitor';

export const revalidate = 604800;

/** GET /api/leitor?id=55752 — livro do Projeto Gutenberg dividido em capítulos. */
export async function GET(request: Request) {
  const id = Number((new URL(request.url).searchParams.get('id') || '').trim());
  if (!Number.isInteger(id) || id <= 0 || id > 10_000_000) {
    return NextResponse.json({ error: 'Livro inválido.' }, { status: 400 });
  }
  try {
    const livro = await carregarLivro(id);
    return NextResponse.json(livro, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao abrir o livro.' }, { status: 502 });
  }
}
