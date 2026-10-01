import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

function publicUrl(sb: any, path: string) {
  return sb.storage.from('exclusivos').getPublicUrl(path).data.publicUrl as string;
}

export async function GET(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  if (kind && kind !== 'sticker' && kind !== 'wallpaper') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  const { data: grants, error: grantsError } = await sb
    .from('exclusive_asset_grants')
    .select('asset_id')
    .eq('user_id', user.id);

  if (grantsError) {
    const missing = grantsError.code === '42P01' || /exclusive_asset_grants/i.test(grantsError.message || '');
    return NextResponse.json(
      { error: missing ? 'Os itens exclusivos ainda não foram ativados no banco.' : 'Não foi possível carregar seus itens exclusivos.' },
      { status: missing ? 503 : 500 },
    );
  }

  const ids = (grants ?? []).map((g: any) => g.asset_id).filter(Boolean);
  if (!ids.length) return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'private, no-store' } });

  let query = sb
    .from('exclusive_assets')
    .select('id, title, kind, collection, image_path, sort_order, created_at')
    .in('id', ids)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Não foi possível carregar seus itens exclusivos.' }, { status: 500 });

  return NextResponse.json(
    {
      items: (data ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        kind: a.kind,
        collection: a.collection,
        imagePath: a.image_path,
        url: publicUrl(sb, a.image_path),
        sortOrder: a.sort_order ?? 0,
        createdAt: a.created_at,
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
