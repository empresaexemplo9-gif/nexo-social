import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const b = await request.json().catch(() => null);
  if (!b?.title || !b?.topic || !b?.imageUrl) {
    return NextResponse.json({ error: 'Campos obrigatórios: title, topic, imageUrl.' }, { status: 400 });
  }

  const { data, error } = await auth.sb
    .from('contents')
    .insert({
      title: b.title,
      category: b.topic,
      subtopic: b.subtopic ?? null,
      snippet: b.snippet ?? '',
      body: b.body ?? null,
      read_time: b.readTime ?? '5 min',
      image_url: b.imageUrl,
    })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, content: data });
}
