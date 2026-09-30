import { NextResponse } from 'next/server';
import { livrosIndicados } from '@/lib/livros-indicados';

export const dynamic = 'force-dynamic';

/** GET /api/livros/indicados?generos=a,b — livros indicados, com versão grátis quando existe. */
export async function GET(request: Request) {
  const generos = (new URL(request.url).searchParams.get('generos') ?? '')
    .split(',').map((g) => g.trim()).filter((g) => /^[a-z-]{2,40}$/.test(g)).slice(0, 3);
  const livros = await livrosIndicados(generos);
  return NextResponse.json({ livros }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}
