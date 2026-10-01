import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { conteudoParaCliente, validarMensagem, type MensagemNova } from './chat-mensagens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function adesivoExclusivoPorIndice(sb: SupabaseClient, uid: string, index: number) {
  const { data: grants, error: grantError } = await sb
    .from('exclusive_asset_grants')
    .select('asset_id')
    .eq('user_id', uid);
  if (grantError) return null;
  const ids = (grants ?? []).map((g: any) => g.asset_id).filter(Boolean);
  if (!ids.length) return null;
  const { data, error } = await sb
    .from('exclusive_assets')
    .select('id, kind, image_path, active, sort_order, created_at')
    .in('id', ids)
    .eq('kind', 'sticker')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return null;
  return (data ?? [])[index] ?? null;
}

/**
 * Valida mensagens comuns e, no caso de adesivo exclusivo, confirma no banco
 * que o remetente recebeu o item do superadministrador. O painel codifica os
 * exclusivos como n=-1,-2,… para continuar usando o mesmo contrato do chat;
 * o servidor resolve esse índice só entre os itens liberados para a conta.
 */
export async function validarMensagemComExclusivos(
  sb: SupabaseClient,
  body: any,
  pasta: string,
  uid: string,
): Promise<MensagemNova | { erro: string }> {
  if (body?.kind !== 'adesivo') return validarMensagem(body, pasta, uid);

  const n = Number(body?.meta?.n);
  const explicitId = typeof body?.meta?.exclusiveId === 'string' ? body.meta.exclusiveId : '';
  const wantsExclusive = (Number.isInteger(n) && n < 0) || Boolean(explicitId);
  if (!wantsExclusive) return validarMensagem(body, pasta, uid);

  let asset: any = null;
  if (Number.isInteger(n) && n < 0) {
    const index = -1 - n;
    if (index < 0 || index > 9999) return { erro: 'Adesivo exclusivo inválido.' };
    asset = await adesivoExclusivoPorIndice(sb, uid, index);
  } else {
    if (!UUID.test(explicitId)) return { erro: 'Adesivo exclusivo inválido.' };
    const { data: grant, error: grantError } = await sb
      .from('exclusive_asset_grants')
      .select('asset_id')
      .eq('asset_id', explicitId)
      .eq('user_id', uid)
      .maybeSingle();
    if (grantError || !grant) return { erro: 'Esse adesivo não foi liberado para a sua conta.' };
    const { data, error } = await sb
      .from('exclusive_assets')
      .select('id, kind, image_path, active')
      .eq('id', explicitId)
      .eq('kind', 'sticker')
      .eq('active', true)
      .maybeSingle();
    if (!error) asset = data;
  }

  if (!asset?.id || !asset?.image_path) return { erro: 'Esse adesivo não foi liberado para a sua conta.' };
  const exclusiveUrl = sb.storage.from('exclusivos').getPublicUrl(asset.image_path).data.publicUrl;
  return {
    kind: 'adesivo',
    body: '',
    media_path: null,
    media_meta: { exclusiveId: asset.id, exclusiveUrl },
  };
}

/** Mensagem para o cliente: adesivo exclusivo usa o URL validado salvo no meta. */
export function conteudoParaClienteComExclusivos(row: any, links: Map<string, string>) {
  const base = conteudoParaCliente(row, links);
  const exclusiveUrl = typeof row?.media_meta?.exclusiveUrl === 'string' ? row.media_meta.exclusiveUrl : '';
  if (base.kind === 'adesivo' && /^https:\/\//i.test(exclusiveUrl)) return { ...base, mediaUrl: exclusiveUrl };
  return base;
}
