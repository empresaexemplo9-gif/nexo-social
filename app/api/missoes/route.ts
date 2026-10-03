import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import { itemParaCliente } from '@/lib/exclusivos';
import { inicioDaSemana, missaoPorId, periodoDaMissao, semanaDe, tamanhoDoPremio } from '@/lib/missoes';
import { estaBanida, missoesDe, progressoDe } from '@/lib/missoes-servidor';

export const dynamic = 'force-dynamic';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

async function contexto() {
  const { user } = await getSession();
  if (!user) return { erro: NextResponse.json({ error: 'Entre para ver suas missões.' }, { status: 401 }) } as const;
  const admin = createAdminClient();
  if (!admin) return { erro: NextResponse.json({ error: 'As missões estão indisponíveis agora.' }, { status: 503 }) } as const;
  return { user, admin } as const;
}

/** As missões da pessoa: progresso, o que já dá para resgatar e o que já saiu. */
export async function GET() {
  const c = await contexto();
  if ('erro' in c) return c.erro;
  const agora = new Date();
  const missoes = await missoesDe(c.admin, c.user.id, agora);
  const proxima = new Date(inicioDaSemana(agora).getTime() + 7 * 86400000);
  return NextResponse.json({ semana: semanaDe(agora), renovaEm: proxima.toISOString(), missoes }, { headers: SEM_CACHE });
}

/**
 * Resgata uma missão cumprida: o servidor confere o progresso no uso real e o
 * banco registra o resgate (uma vez por período) e sorteia os itens.
 */
export async function POST(request: Request) {
  const c = await contexto();
  if ('erro' in c) return c.erro;
  const body = (await request.json().catch(() => null)) as { missao?: unknown } | null;
  const missao = missaoPorId(body?.missao);
  if (!missao) return NextResponse.json({ error: 'Missão inválida.' }, { status: 400 });
  if (await estaBanida(c.admin, c.user.id)) return NextResponse.json({ error: 'Conta suspensa pelas regras da comunidade.' }, { status: 403 });

  const agora = new Date();
  const progresso = await progressoDe(c.admin, c.user.id, missao, agora);
  if (progresso < missao.meta) {
    return NextResponse.json({ error: `Falta pouco: ${progresso} de ${missao.meta}.` }, { status: 409 });
  }

  const quantos = tamanhoDoPremio(missao, Math.random());
  const { data: ids, error } = await c.admin.rpc('exclusivos_resgatar_missao', {
    p_user: c.user.id,
    p_missao: missao.id,
    p_periodo: periodoDaMissao(missao, agora),
    p_quantos: quantos,
  });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Você já resgatou esta missão.' }, { status: 409 });
    if (error.code === 'P0002') return NextResponse.json({ error: 'Ainda não há itens no sorteio. Volte mais tarde.' }, { status: 409 });
    if (error.code === '42883' || error.code === 'PGRST202') return NextResponse.json({ error: 'As missões ainda não foram ativadas no banco.' }, { status: 503 });
    return NextResponse.json({ error: 'Não foi possível resgatar agora.' }, { status: 500 });
  }

  // Os itens sorteados, na ordem, com quantos a pessoa tem de cada agora (repetido = dá para trocar).
  const sorteados = (ids ?? []) as string[];
  const unicos = Array.from(new Set(sorteados));
  const [{ data: assets }, { data: grants }] = await Promise.all([
    c.admin.from('exclusive_assets').select('id, title, kind, collection, edition, image_path, thumb_path, sort_order, created_at').in('id', unicos),
    c.admin.from('exclusive_asset_grants').select('asset_id, quantidade').eq('user_id', c.user.id).in('asset_id', unicos),
  ]);
  const bucket = (p: string) => c.admin.storage.from('exclusivos').getPublicUrl(p).data.publicUrl as string;
  const porId = new Map((assets ?? []).map((a: any) => [a.id, itemParaCliente(a, bucket)]));
  const qtd = new Map((grants ?? []).map((g: any) => [g.asset_id, Number(g.quantidade) || 1]));
  const itens = sorteados
    .map((id) => porId.get(id))
    .filter(Boolean)
    .map((i) => ({ ...i!, quantidade: qtd.get(i!.id) ?? 1 }));
  return NextResponse.json({ missao: missao.id, itens }, { headers: SEM_CACHE });
}
