import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import { CAMINHO_DA_COLECAO, CAMINHO_DO_BUCKET, ehTipoExclusivo, itemParaCliente } from '@/lib/exclusivos';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLUNAS = 'id, title, kind, collection, edition, image_path, thumb_path, sort_order, active, created_at';
const MAX_POR_VEZ = 200;

const caminhoValido = (p: unknown) => typeof p === 'string' && !p.includes('..') && (CAMINHO_DA_COLECAO.test(p) || CAMINHO_DO_BUCKET.test(p));
const texto = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

function faltaMigracao(e: { code?: string; message?: string }) {
  return e.code === '42P01' || e.code === 'PGRST205' || e.code === '42703' || /exclusive_asset/i.test(e.message || '');
}

/** O catálogo inteiro, as pessoas e quem recebeu o quê (só o superadministrador). */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Chave administrativa do Supabase indisponível.' }, { status: 503 });

  const catalogo = (colunas: string) =>
    admin.from('exclusive_assets').select(colunas).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  const [assetsComSorteio, profilesR, grantsR] = await Promise.all([
    catalogo(`${COLUNAS}, sorteavel`),
    admin.from('profiles').select('id, full_name, email').order('created_at', { ascending: true }),
    admin.from('exclusive_asset_grants').select('asset_id, user_id, granted_at'),
  ]);

  // `sorteavel` vem de db/missoes.sql; sem ela, todo item entra no sorteio.
  const assetsR = assetsComSorteio.error?.code === '42703' ? await catalogo(COLUNAS) : assetsComSorteio;
  const firstError = assetsR.error || profilesR.error || grantsR.error;
  if (firstError) {
    const missing = faltaMigracao(firstError);
    return NextResponse.json(
      { error: missing ? 'Migração db/exclusivos.sql ainda não foi aplicada no Supabase.' : firstError.message },
      { status: missing ? 503 : 500 },
    );
  }

  const bucket = (p: string) => admin.storage.from('exclusivos').getPublicUrl(p).data.publicUrl;
  return NextResponse.json(
    {
      assets: (assetsR.data ?? []).map((a: any) => ({ ...itemParaCliente(a, bucket), active: a.active !== false, sorteavel: a.sorteavel !== false })),
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

  const body = (await request.json().catch(() => null)) as any;
  const action = typeof body?.action === 'string' ? body.action : '';
  const bucket = (p: string) => admin.storage.from('exclusivos').getPublicUrl(p).data.publicUrl;

  if (action === 'create') {
    const title = texto(body?.title, 120);
    const kind = ehTipoExclusivo(body?.kind) ? body.kind : '';
    const collection = texto(body?.collection, 80) || 'geral';
    const edition = texto(body?.edition, 80);
    const imagePath = String(body?.imagePath ?? '').trim();
    const thumbPath = body?.thumbPath ? String(body.thumbPath).trim() : null;
    const sortOrder = Number.isInteger(body?.sortOrder) ? body.sortOrder : 0;
    if (!title || !kind || !caminhoValido(imagePath) || (thumbPath && !caminhoValido(thumbPath))) {
      return NextResponse.json({ error: 'Dados do item inválidos.' }, { status: 400 });
    }
    const { data, error } = await admin
      .from('exclusive_assets')
      .insert({ title, kind, collection, edition, image_path: imagePath, thumb_path: thumbPath, sort_order: sortOrder, created_by: auth.user.id })
      .select(COLUNAS)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, asset: { ...itemParaCliente(data, bucket), active: true } });
  }

  if (action === 'update') {
    const assetId = typeof body?.assetId === 'string' && UUID.test(body.assetId) ? body.assetId : '';
    if (!assetId) return NextResponse.json({ error: 'Item inválido.' }, { status: 400 });
    const mudanca: Record<string, unknown> = {};
    if (body?.title !== undefined) mudanca.title = texto(body.title, 120);
    if (body?.collection !== undefined) mudanca.collection = texto(body.collection, 80) || 'geral';
    if (body?.edition !== undefined) mudanca.edition = texto(body.edition, 80);
    if (typeof body?.active === 'boolean') mudanca.active = body.active;
    if (typeof body?.sorteavel === 'boolean') mudanca.sorteavel = body.sorteavel;
    if (mudanca.title === '') return NextResponse.json({ error: 'O item precisa de um nome.' }, { status: 400 });
    const { error } = await admin.from('exclusive_assets').update(mudanca).eq('id', assetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'grant' || action === 'revoke') {
    const assetIds = Array.isArray(body?.assetIds) ? body.assetIds.filter((x: unknown) => typeof x === 'string' && UUID.test(x)) : [];
    const userIds = Array.isArray(body?.userIds) ? body.userIds.filter((x: unknown) => typeof x === 'string' && UUID.test(x)) : [];
    if (!assetIds.length || !userIds.length) return NextResponse.json({ error: 'Selecione itens e pessoas.' }, { status: 400 });
    if (assetIds.length * userIds.length > MAX_POR_VEZ * 50) return NextResponse.json({ error: 'Envio grande demais de uma vez.' }, { status: 400 });

    if (action === 'grant') {
      const rows = assetIds.flatMap((assetId: string) => userIds.map((userId: string) => ({ asset_id: assetId, user_id: userId, granted_by: auth.user.id })));
      // Quem já tinha continua com a data em que ganhou.
      const { error } = await admin.from('exclusive_asset_grants').upsert(rows, { onConflict: 'asset_id,user_id', ignoreDuplicates: true });
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
    const { data } = await admin.from('exclusive_assets').select('image_path, thumb_path').eq('id', assetId).maybeSingle();
    const { error } = await admin.from('exclusive_assets').delete().eq('id', assetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Os arquivos da coleção embutida ficam no site; só os do bucket saem.
    const doBucket = [data?.image_path, data?.thumb_path].filter((p): p is string => typeof p === 'string' && !CAMINHO_DA_COLECAO.test(p));
    if (doBucket.length) await admin.storage.from('exclusivos').remove(doBucket);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}
