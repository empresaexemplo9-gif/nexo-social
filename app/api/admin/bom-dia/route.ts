import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const b = await request.json().catch(() => null);
  if (!b?.soundtrackTitle || !b?.recipeTitle) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
  }

  // Publica uma nova curadoria "Bom Dia" (a home lê sempre a mais recente).
  const { data, error } = await auth.sb
    .from('bom_dia')
    .insert({
      soundtrack_title: b.soundtrackTitle,
      soundtrack_artist: b.soundtrackArtist ?? 'Curadoria nexo.social',
      recipe_title: b.recipeTitle,
      recipe_description: b.recipeDescription ?? '',
      quick_tip: b.quickTip ?? '',
    })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, bomDia: data });
}
