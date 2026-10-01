import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import { isUuid, profilesByIds } from '@/lib/social';

export const dynamic = 'force-dynamic';

const privado = { 'Cache-Control': 'private, no-store' };
const TIPOS = ['palavra', 'prefixo', 'frase'] as const;

/** GET /api/admin/moderacao — banimentos (com o trecho, para revisar) e os termos proibidos. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const [bans, termos] = await Promise.all([
    auth.sb.from('user_bans').select('*').order('created_at', { ascending: false }).limit(200),
    auth.sb.from('moderation_terms').select('termo, tipo, created_at').order('termo'),
  ]);
  if (bans.error || termos.error) {
    return NextResponse.json({ error: 'A moderação ainda não foi ativada no banco (db/moderacao.sql).' }, { status: 503 });
  }
  const pessoas = await profilesByIds(auth.sb, (bans.data ?? []).map((b) => b.user_id));
  return NextResponse.json({
    banimentos: (bans.data ?? []).map((b) => ({
      userId: b.user_id,
      nome: pessoas.get(b.user_id)?.name ?? null,
      email: pessoas.get(b.user_id)?.email ?? null,
      termo: b.termo,
      trecho: b.trecho,
      origem: b.origem,
      criadoEm: b.created_at,
      revogadoEm: b.revogado_em,
    })),
    termos: termos.data ?? [],
  }, { headers: privado });
}

/**
 * POST /api/admin/moderacao
 *   { acao: 'termo', termo, tipo }  — acrescenta um termo
 *   { acao: 'revogar', userId }     — desfaz um banimento (engano)
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await request.json().catch(() => null);

  if (b?.acao === 'termo') {
    const termo = String(b.termo ?? '').trim().toLowerCase().slice(0, 60);
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'palavra';
    if (termo.length < 2) return NextResponse.json({ error: 'Escreva o termo (2 letras ou mais).' }, { status: 400 });
    if (tipo !== 'frase' && /\s/.test(termo)) return NextResponse.json({ error: 'Termo com espaço é do tipo "frase".' }, { status: 400 });
    const { error } = await auth.sb.from('moderation_terms').upsert({ termo, tipo });
    if (error) return NextResponse.json({ error: 'Não foi possível salvar o termo.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (b?.acao === 'revogar') {
    const userId = String(b.userId ?? '');
    if (!isUuid(userId)) return NextResponse.json({ error: 'Conta inválida.' }, { status: 400 });
    const { error } = await auth.sb.rpc('revogar_banimento', { p_user: userId });
    if (error) return NextResponse.json({ error: error.message || 'Não foi possível revogar.' }, { status: 500 });
    // O banco tenta liberar a conta no Auth; pela API do Auth é garantido.
    await createAdminClient()?.auth.admin.updateUserById(userId, { ban_duration: 'none' }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}

/** DELETE /api/admin/moderacao?termo=… — tira um termo da lista. */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const termo = (new URL(request.url).searchParams.get('termo') || '').trim();
  if (!termo) return NextResponse.json({ error: 'Termo inválido.' }, { status: 400 });
  const { error } = await auth.sb.from('moderation_terms').delete().eq('termo', termo);
  if (error) return NextResponse.json({ error: 'Não foi possível tirar o termo.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
