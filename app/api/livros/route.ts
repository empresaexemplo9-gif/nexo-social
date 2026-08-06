import { NextResponse } from 'next/server';
import { buildShelf, type Period } from '@/lib/freebooks';

// A estante muda por semana/mês, então cache curto já basta e evita bater
// nas fontes abertas a cada visita.
export const revalidate = 3600;

/**
 * GET /api/livros?periodo=semana|mes
 * Devolve os livres e os audiolivros liberados no período corrente.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('periodo');
  const periodo: Period = raw === 'mes' ? 'mes' : 'semana';

  try {
    const shelf = await buildShelf(periodo);
    return NextResponse.json(shelf);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Não foi possível montar a estante.' },
      { status: 500 },
    );
  }
}
