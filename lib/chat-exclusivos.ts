import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validarMensagem, type MensagemNova } from './chat-mensagens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida mensagens comuns e, no caso de adesivo exclusivo, confirma no banco
 * que o remetente recebeu o item do superadministrador. O URL gravado na
 * mensagem é gerado no servidor; o cliente não consegue injetar imagem externa.
 */
export async function validarMensagemComExclusivos(
  sb: SupabaseClient,
  body: any,
  pasta: string,
  uid: string,
): Promise<MensagemNova | { erro: string }> {
  if (body?.kind !== 'adesivo' || !body?.meta?.exclusiveId) return validarMensagem(body, pasta, uid);

  const exclusiveId = String(body.meta.exclusiveId);
  if (!UUID.test(exclusiveId)) return { erro: 'Adesivo exclusivo inválido.' };

  const { data: grant, error: grantError } = await sb
    .from('exclusive_asset_grants')
    .select('asset_id')
    .eq('asset_id', exclusiveId)
    .eq('user_id', uid)
    .maybeSingle();
  if (grantError || !grant) return { erro: 'Esse adesivo não foi liberado para a sua conta.' };

  const { data: asset, error: assetError } = await sb
    .from('exclusive_assets')
    .select('id, kind, image_path, active')
    .eq('id', exclusiveId)
    .eq('kind', 'sticker')
    .eq('active', true)
    .maybeSingle();
  if (assetError || !asset?.image_path) return { erro: 'Esse adesivo não está disponível.' };

  const exclusiveUrl = sb.storage.from('exclusivos').getPublicUrl(asset.image_path).data.publicUrl;
  return {
    kind: 'adesivo',
    body: '',
    media_path: null,
    media_meta: { exclusiveId, exclusiveUrl },
  };
}
