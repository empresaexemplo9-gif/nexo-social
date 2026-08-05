import { NextResponse } from 'next/server';
import { fetchContents } from '@/lib/repo';
import type { CategorySlug } from '@/lib/data';

// Lista pública de conteúdos, opcionalmente filtrada por tema (?topic=).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic') as CategorySlug | null;
  const contents = await fetchContents(topic ?? undefined);
  return NextResponse.json({ contents });
}
