import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabase } from '@/lib/supabase-server';
import { safeAuthDestination } from '@/lib/auth-redirect';
import { isPlatformAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeAuthDestination(url.searchParams.get('next'));
  const convite = url.searchParams.get('convite')?.trim() || '';
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url.origin));
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  };
  const fail = (reason: string) => redirect(`/login?error=${reason}${next ? `&next=${encodeURIComponent(next)}` : ''}`);
  if (url.searchParams.has('error')) return fail('oauth_cancelled');
  const code = url.searchParams.get('code');
  if (!code) return fail('invalid_callback');

  try {
    const sb = createServerSupabase();
    if (!sb) return fail('auth_unavailable');
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return fail('invalid_callback');
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user || user.is_anonymous) return fail('invalid_callback');

    const admin = createAdminClient();
    if (!admin) {
      await sb.auth.signOut();
      return fail('auth_unavailable');
    }

    const { data: existingAccess, error: accessError } = await admin
      .from('platform_access').select('user_id').eq('user_id', user.id).maybeSingle();
    const accessSchemaPending = accessError && (
      accessError.code === '42P01' ||
      accessError.code === 'PGRST205' ||
      /platform_access|schema cache|does not exist/i.test(accessError.message || '')
    );
    if (accessError && !accessSchemaPending) {
      await sb.auth.signOut();
      return fail('invite_unavailable');
    }

    // Antes de a migração de convites existir, preserva somente o login de
    // contas já provisionadas. Novas contas continuam dependendo do convite.
    if (!existingAccess && !accessSchemaPending) {
      if (!/^[0-9a-f]{64}$/i.test(convite)) {
        await admin.auth.admin.deleteUser(user.id).catch(() => null);
        await sb.auth.signOut();
        return fail('invite_required');
      }
      const { data: claimed, error: claimError } = await admin.rpc('claim_platform_invite', { p_token: convite, p_user: user.id });
      if (claimError || claimed !== true) {
        await admin.auth.admin.deleteUser(user.id).catch(() => null);
        await sb.auth.signOut();
        return fail('invite_invalid');
      }
      // Conta nova pelo Google: aceitou as regras na tela de cadastro. Sem o
      // registro, o aviso das regras aparece no primeiro acesso.
      if (url.searchParams.get('regras') === '1') {
        try {
          await admin.from('community_rules_acceptance').upsert({ user_id: user.id });
        } catch {
          /* o aviso aparece no primeiro acesso */
        }
      }
    }

    const meta = user.user_metadata ?? {};
    const { error: profileError } = await sb.rpc('ensure_my_profile', {
      p_full_name: meta.full_name || meta.name || null,
      p_account_type: meta.account_type === 'organizacao' ? 'organizacao' : 'pessoal',
      p_tenant_name: meta.tenant_name || null,
    });
    if (profileError) return fail('profile_unavailable');
    return redirect(next ?? (isPlatformAdmin(user.email) ? '/admin' : '/'));
  } catch {
    return fail('auth_unavailable');
  }
}
