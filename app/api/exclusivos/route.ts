import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { ehTipoExclusivo, itemParaCliente } from '@/lib/exclusivos';

export const dynamic = 'force-dynamic';

const COLUNAS = 'id, title, kind, collection, edition, image_path, thumb_path, sort_order, created_at';

/**
 * Os itens exclusivos que o superadministrador enviou para a conta (?kind= um
 * tipo só). O que a pessoa ganhou não expira: fica até o superadministrador
 * tirar.
 */
export async function GET(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const url = new URL(request.url);
  const tipos = (url.searchParams.get('kind') ?? '').split(',').filter(Boolean);
  if (tipos.some((t) => !ehTipoExclusivo(t))) return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });

  const { data: grants, error: grantsError } = await sb.from('exclusive_asset_grants').select('asset_id').eq('user_id', user.id);
  if (grantsError) {
    const missing = grantsError.code === '42P01' || grantsError.code === 'PGRST205' || /exclusive_asset_grants/i.test(grantsError.message || '');
    return NextResponse.json(
      { error: missing ? 'Os itens exclusivos ainda não foram ativados no banco.' : 'Não foi possível carregar seus itens exclusivos.' },
      { status: missing ? 503 : 500 },
    );
  }

  const ids = (grants ?? []).map((g: any) => g.asset_id).filter(Boolean);
  if (!ids.length) return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'private, no-store' } });

  let query = sb
    .from('exclusive_assets')
    .select(COLUNAS)
    .in('id', ids)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (tipos.length) query = query.in('kind', tipos);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Não foi possível carregar seus itens exclusivos.' }, { status: 500 });

  const bucket = (p: string) => sb.storage.from('exclusivos').getPublicUrl(p).data.publicUrl as string;
  return NextResponse.json(
    { items: (data ?? []).map((a: any) => itemParaCliente(a, bucket)).filter((i) => i.url) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
