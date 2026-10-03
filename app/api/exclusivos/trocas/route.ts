import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import { itemParaCliente, type ItemExclusivo } from '@/lib/exclusivos';
import { estaBanida } from '@/lib/missoes-servidor';
import { isUuid, notify } from '@/lib/social';

export const dynamic = 'force-dynamic';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };
const COLUNAS = 'id, title, kind, collection, edition, image_path, thumb_path, sort_order, created_at, active';
const LINK = '/colecionaveis?aba=trocas';

type Pessoa = { id: string; nome: string; avatar: string | null };

async function contexto() {
  const { user } = await getSession();
  if (!user) return { erro: NextResponse.json({ error: 'Entre para trocar colecionáveis.' }, { status: 401 }) } as const;
  const admin = createAdminClient();
  if (!admin) return { erro: NextResponse.json({ error: 'As trocas estão indisponíveis agora.' }, { status: 503 }) } as const;
  return { user, admin } as const;
}

async function itens(admin: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, ItemExclusivo>();
  const { data } = await admin.from('exclusive_assets').select(COLUNAS).in('id', ids).eq('active', true);
  const bucket = (p: string) => admin.storage.from('exclusivos').getPublicUrl(p).data.publicUrl as string;
  return new Map((data ?? []).map((a: any) => [a.id as string, itemParaCliente(a, bucket)]));
}

async function pessoas(admin: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, Pessoa>();
  const { data } = await admin.from('profiles').select('id, full_name, avatar_path').in('id', ids);
  return new Map(
    (data ?? []).map((p: any) => [p.id as string, { id: p.id, nome: String(p.full_name || '').trim() || 'Alguém da comunidade', avatar: p.avatar_path ?? null }]),
  );
}

/**
 * A tela de trocas: os meus repetidos, a vitrine dos repetidos dos outros e as
 * propostas (recebidas, enviadas e as últimas resolvidas).
 */
export async function GET() {
  const c = await contexto();
  if ('erro' in c) return c.erro;
  const { admin, user } = c;

  const [meus, outros, propostas, bans] = await Promise.all([
    admin.from('exclusive_asset_grants').select('asset_id, quantidade').eq('user_id', user.id),
    admin.from('exclusive_asset_grants').select('asset_id, user_id, quantidade').gte('quantidade', 2).neq('user_id', user.id).limit(600),
    admin
      .from('exclusivos_trocas')
      .select('id, de_id, para_id, oferece, pede, status, created_at, respondida_em')
      .or(`de_id.eq.${user.id},para_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(60),
    admin.from('user_bans').select('user_id').is('revogado_em', null),
  ]);
  if (meus.error || outros.error || propostas.error) {
    const e = meus.error || outros.error || propostas.error;
    const falta = e?.code === '42P01' || e?.code === 'PGRST205' || e?.code === '42703';
    return NextResponse.json({ error: falta ? 'As trocas ainda não foram ativadas no banco.' : 'Não foi possível carregar as trocas.' }, { status: falta ? 503 : 500 });
  }

  const banidos = new Set((bans.data ?? []).map((b: any) => b.user_id as string));
  const minhaQtd = new Map((meus.data ?? []).map((g: any) => [g.asset_id as string, Number(g.quantidade) || 1]));
  const vitrineBruta = (outros.data ?? []).filter((g: any) => !banidos.has(g.user_id));
  const props = propostas.data ?? [];

  const idsItens = Array.from(
    new Set([...Array.from(minhaQtd.keys()), ...vitrineBruta.map((g: any) => g.asset_id), ...props.flatMap((p: any) => [p.oferece, p.pede])]),
  );
  const idsPessoas = Array.from(new Set([...vitrineBruta.map((g: any) => g.user_id), ...props.flatMap((p: any) => [p.de_id, p.para_id])]));
  const [porItem, porPessoa] = await Promise.all([itens(admin, idsItens), pessoas(admin, idsPessoas)]);

  const repetidos = Array.from(minhaQtd.entries())
    .filter(([id, q]) => q >= 2 && porItem.has(id))
    .map(([id, q]) => ({ ...porItem.get(id)!, quantidade: q }));

  // Vitrine: um cartão por item, com quem tem repetido. O que eu ainda não tenho vem primeiro.
  const vitrine = new Map<string, { item: ItemExclusivo; tenho: number; pessoas: (Pessoa & { quantidade: number })[] }>();
  for (const g of vitrineBruta as any[]) {
    const item = porItem.get(g.asset_id);
    const pessoa = porPessoa.get(g.user_id);
    if (!item || !pessoa) continue;
    const v = vitrine.get(item.id) ?? { item, tenho: minhaQtd.get(item.id) ?? 0, pessoas: [] };
    v.pessoas.push({ ...pessoa, quantidade: Number(g.quantidade) });
    vitrine.set(item.id, v);
  }
  const listaVitrine = Array.from(vitrine.values()).sort((a, b) => Number(a.tenho > 0) - Number(b.tenho > 0) || a.item.sortOrder - b.item.sortOrder);

  const proposta = (p: any) => ({
    id: p.id,
    status: p.status,
    criadaEm: p.created_at,
    respondidaEm: p.respondida_em,
    minha: p.de_id === user.id,
    de: porPessoa.get(p.de_id) ?? { id: p.de_id, nome: 'Alguém da comunidade', avatar: null },
    para: porPessoa.get(p.para_id) ?? { id: p.para_id, nome: 'Alguém da comunidade', avatar: null },
    oferece: porItem.get(p.oferece) ?? null,
    pede: porItem.get(p.pede) ?? null,
  });
  return NextResponse.json(
    {
      repetidos,
      vitrine: listaVitrine,
      recebidas: props.filter((p: any) => p.para_id === user.id && p.status === 'aberta').map(proposta),
      enviadas: props.filter((p: any) => p.de_id === user.id && p.status === 'aberta').map(proposta),
      historico: props.filter((p: any) => p.status !== 'aberta').slice(0, 20).map(proposta),
    },
    { headers: SEM_CACHE },
  );
}

/** Propor, responder (aceitar/recusar) ou cancelar uma troca. */
export async function POST(request: Request) {
  const c = await contexto();
  if ('erro' in c) return c.erro;
  const { admin, user } = c;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const acao = body?.acao;
  if (await estaBanida(admin, user.id)) return NextResponse.json({ error: 'Conta suspensa pelas regras da comunidade.' }, { status: 403 });

  const falha = (e: { code?: string; message?: string }) => {
    if (e.code === 'P0001') return NextResponse.json({ error: (e.message || 'Troca indisponível.').replace(/^./, (l) => l.toUpperCase()) + '.' }, { status: 409 });
    if (e.code === 'P0002') return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
    if (e.code === '23505') return NextResponse.json({ error: 'Você já fez esta mesma proposta.' }, { status: 409 });
    if (e.code === '42883' || e.code === 'PGRST202') return NextResponse.json({ error: 'As trocas ainda não foram ativadas no banco.' }, { status: 503 });
    return NextResponse.json({ error: 'Não foi possível concluir agora.' }, { status: 500 });
  };

  if (acao === 'propor') {
    const { para, oferece, pede } = body ?? {};
    if (!isUuid(para) || !isUuid(oferece) || !isUuid(pede) || para === user.id) return NextResponse.json({ error: 'Proposta inválida.' }, { status: 400 });
    if (await estaBanida(admin, para)) return NextResponse.json({ error: 'Essa pessoa não está disponível para trocas.' }, { status: 409 });
    const { data: id, error } = await admin.rpc('exclusivos_propor_troca', { p_de: user.id, p_para: para, p_oferece: oferece, p_pede: pede });
    if (error) return falha(error);
    const [quem, nomes] = await Promise.all([pessoas(admin, [user.id]), itens(admin, [oferece, pede])]);
    await notify([
      {
        userId: para,
        type: 'troca',
        title: `${quem.get(user.id)?.nome ?? 'Alguém'} quer trocar colecionáveis`,
        body: `Oferece “${nomes.get(oferece)?.title ?? 'um item'}” pelo seu “${nomes.get(pede)?.title ?? 'item'}” repetido.`,
        link: LINK,
        actorId: user.id,
      },
    ]);
    return NextResponse.json({ ok: true, id }, { headers: SEM_CACHE });
  }

  if (acao === 'responder') {
    const { troca, aceitar } = body ?? {};
    if (!isUuid(troca) || typeof aceitar !== 'boolean') return NextResponse.json({ error: 'Resposta inválida.' }, { status: 400 });
    const { data: status, error } = await admin.rpc('exclusivos_responder_troca', { p_user: user.id, p_troca: troca, p_aceitar: aceitar });
    if (error) return falha(error);
    if (status === 'aceita') {
      const { data: t } = await admin.from('exclusivos_trocas').select('de_id, oferece, pede').eq('id', troca).maybeSingle();
      if (t) {
        const [quem, nomes] = await Promise.all([pessoas(admin, [user.id]), itens(admin, [t.oferece, t.pede])]);
        await notify([
          {
            userId: t.de_id,
            type: 'troca',
            title: `${quem.get(user.id)?.nome ?? 'Alguém'} aceitou a troca`,
            body: `Você ganhou “${nomes.get(t.pede)?.title ?? 'um item'}” e deu “${nomes.get(t.oferece)?.title ?? 'um repetido'}”.`,
            link: LINK,
            actorId: user.id,
          },
        ]);
      }
    }
    return NextResponse.json({ ok: true, status }, { headers: SEM_CACHE });
  }

  if (acao === 'cancelar') {
    const { troca } = body ?? {};
    if (!isUuid(troca)) return NextResponse.json({ error: 'Proposta inválida.' }, { status: 400 });
    const { data: status, error } = await admin.rpc('exclusivos_cancelar_troca', { p_user: user.id, p_troca: troca });
    if (error) return falha(error);
    return NextResponse.json({ ok: true, status }, { headers: SEM_CACHE });
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}
