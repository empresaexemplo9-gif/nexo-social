import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_PATH = /^[A-Za-z0-9_\-/.]+$/;

function itemToClient(admin: any, a: any) {
  const url = admin.storage.from('exclusivos').getPublicUrl(a.image_path).data.publicUrl;
  return {
    id: a.id,
    title: a.title,
    kind: a.kind,
    collection: a.collection,
    imagePath: a.image_path,
    url,
    sortOrder: a.sort_order ?? 0,
    active: a.active !== false,
    createdAt: a.created_at,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Chave administrativa do Supabase indisponível.' }, { status: 503 });

  const [assetsR, profilesR, grantsR] = await Promise.all([
    admin.from('exclusive_assets').select('id, title, kind, collection, image_path, sort_order, active, created_at').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    admin.from('profiles').select('id, full_name, email').order('created_at', { ascending: true }),
    admin.from('exclusive_asset_grants').select('asset_id, user_id, granted_at'),
  ]);

  const firstError = assetsR.error || profilesR.error || grantsR.error;
  if (firstError) {
    const missing = firstError.code === '42P01' || /exclusive_asset/i.test(firstError.message || '');
    return NextResponse.json(
      { error: missing ? 'Migração db/exclusivos.sql ainda não foi aplicada no Supabase.' : firstError.message },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json(
    {
      assets: (assetsR.data ?? []).map((a: any) => itemToClient(admin, a)),
      users: profilesR.data ?? [],
      grants: grantsR.data ?? [],
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Chave administrativa do Supabase indisponível.' }, { status: 503 });

  const body = await request.json().catch(() => null) as any;
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'create') {
    const title = String(body?.title ?? '').trim().slice(0, 120);
    const kind = body?.kind === 'sticker' || body?.kind === 'wallpaper' ? body.kind : '';
    const collection = String(body?.collection ?? 'geral').trim().slice(0, 80) || 'geral';
    const imagePath = String(body?.imagePath ?? '').trim();
    const sortOrder = Number.isInteger(body?.sortOrder) ? body.sortOrder : 0;
    if (!title || !kind || !imagePath || !SAFE_PATH.test(imagePath) || imagePath.includes('..')) {
      return NextResponse.json({ error: 'Dados do item inválidos.' }, { status: 400 });
    }
    const { data, error } = await admin
      .from('exclusive_assets')
      .insert({ title, kind, collection, image_path: imagePath, sort_order: sortOrder, created_by: auth.user.id })
      .select('id, title, kind, collection, image_path, sort_order, active, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, asset: itemToClient(admin, data) });
  }

  if (action === 'grant' || action === 'revoke') {
    const assetIds = Array.isArray(body?.assetIds) ? body.assetIds.filter((x: unknown) => typeof x === 'string' && UUID.test(x)) : [];
    const userIds = Array.isArray(body?.userIds) ? body.userIds.filter((x: unknown) => typeof x === 'string' && UUID.test(x)) : [];
    if (!assetIds.length || !userIds.length) return NextResponse.json({ error: 'Selecione itens e usuários.' }, { status: 400 });

    if (action === 'grant') {
      const rows = assetIds.flatMap((assetId: string) => userIds.map((userId: string) => ({ asset_id: assetId, user_id: userId, granted_by: auth.user.id })));
      const { error } = await admin.from('exclusive_asset_grants').upsert(rows, { onConflict: 'asset_id,user_id', ignoreDuplicates: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, granted: rows.length });
    }

    const { error } = await admin.from('exclusive_asset_grants').delete().in('asset_id', assetIds).in('user_id', userIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const assetId = typeof body?.assetId === 'string' && UUID.test(body.assetId) ? body.assetId : '';
    if (!assetId) return NextResponse.json({ error: 'Item inválido.' }, { status: 400 });
    const { data } = await admin.from('exclusive_assets').select('image_path').eq('id', assetId).maybeSingle();
    const { error } = await admin.from('exclusive_assets').delete().eq('id', assetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (data?.image_path) await admin.storage.from('exclusivos').remove([data.image_path]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}
