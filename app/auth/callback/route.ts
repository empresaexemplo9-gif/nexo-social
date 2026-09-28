import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { safeAuthDestination } from '@/lib/auth-redirect';
import { isPlatformAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeAuthDestination(url.searchParams.get('next'));
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
    const meta = user.user_metadata ?? {};
    const { error: profileError } = await sb.rpc('ensure_my_profile', {
      p_full_name: meta.full_name || meta.name || null,
      p_account_type: meta.account_type === 'organizacao' ? 'organizacao' : 'pessoal',
      p_tenant_name: meta.tenant_name || null,
    });
    if (profileError) return fail('profile_unavailable');
    return redirect(next ?? (isPlatformAdmin(user.email) ? '/admin' : '/'));
  } catch { return fail('auth_unavailable'); }
}
