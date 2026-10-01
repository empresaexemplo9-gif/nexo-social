import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { conteudoParaCliente, validarMensagem, type MensagemNova } from './chat-mensagens';
import { urlDoItem } from './exclusivos';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida mensagens comuns e, no caso de adesivo ou botton exclusivo
 * (meta.exclusiveId), confirma no banco que quem envia recebeu o item do
 * superadministrador. O endereço da imagem fica guardado na mensagem.
 */
export async function validarMensagemComExclusivos(
  sb: SupabaseClient,
  body: any,
  pasta: string,
  uid: string,
): Promise<MensagemNova | { erro: string }> {
  const exclusiveId = body?.kind === 'adesivo' && typeof body?.meta?.exclusiveId === 'string' ? body.meta.exclusiveId : '';
  if (!exclusiveId) return validarMensagem(body, pasta, uid);
  if (!UUID.test(exclusiveId)) return { erro: 'Adesivo exclusivo inválido.' };

  const { data: grant, error: grantError } = await sb
    .from('exclusive_asset_grants')
    .select('asset_id')
    .eq('asset_id', exclusiveId)
    .eq('user_id', uid)
    .maybeSingle();
  if (grantError || !grant) return { erro: 'Esse adesivo não foi liberado para a sua conta.' };
  const { data: asset } = await sb
    .from('exclusive_assets')
    .select('id, kind, image_path')
    .eq('id', exclusiveId)
    .in('kind', ['sticker', 'button'])
    .eq('active', true)
    .maybeSingle();
  if (!asset?.image_path) return { erro: 'Esse adesivo não foi liberado para a sua conta.' };

  const exclusiveUrl = urlDoItem(asset.image_path, (p) => sb.storage.from('exclusivos').getPublicUrl(p).data.publicUrl);
  if (!exclusiveUrl) return { erro: 'Adesivo exclusivo indisponível.' };
  return {
    kind: 'adesivo',
    body: '',
    media_path: null,
    media_meta: { exclusiveId: asset.id, exclusiveUrl, ...(asset.kind === 'button' ? { botton: 1 } : {}) },
  };
}

/** Endereço guardado na mensagem: adesivo ou botton da coleção embutida, ou do bucket `exclusivos`. */
const DA_COLECAO = /^\/colecao\/[a-z0-9-]+\/(adesivos|bottons)\/[a-z0-9-]+\.webp$/;
const DO_BUCKET = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/exclusivos\//i;

/** Mensagem para o cliente: adesivo exclusivo usa o endereço validado salvo no meta. */
export function conteudoParaClienteComExclusivos(row: any, links: Map<string, string>) {
  const base = conteudoParaCliente(row, links);
  const url = typeof row?.media_meta?.exclusiveUrl === 'string' ? row.media_meta.exclusiveUrl : '';
  if (base.kind === 'adesivo' && (DA_COLECAO.test(url) || (DO_BUCKET.test(url) && !url.includes('..')))) {
    return { ...base, mediaUrl: url };
  }
  return base;
}
