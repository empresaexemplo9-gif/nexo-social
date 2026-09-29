import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Convites de grupo por link foram desativados: grupos aceitam apenas contas existentes convidadas dentro da plataforma. */
export async function POST() {
  return NextResponse.json(
    { error: 'Convites de grupo por link não existem mais. Convide uma conta já cadastrada dentro da Comunidade.' },
    { status: 410 },
  );
}
