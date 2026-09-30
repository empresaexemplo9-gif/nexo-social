import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isPlatformAdmin } from '@/lib/auth';
import { resolveSupabaseUrl, PUBLISHABLE_ANON_KEY } from '@/lib/supabase-config';

const publicPaths = new Set([
  '/login', '/auth/callback', '/privacidade', '/termos', '/offline', '/api/signup', '/api/invites/validate',
  '/manifest.webmanifest', '/sw.js',
  '/favicon.ico', '/favicon-32.png', '/favicon-48.png', '/apple-touch-icon.png',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-192.png', '/icon-maskable-512.png',
  '/logo.png', '/logo.svg', '/google12ea32661b84e35f.html',
  '/bg/linhas-luz.svg', '/bg/grade.svg', '/bg/chip.svg', '/bg/hud.svg',
  '/bg/rede.svg', '/bg/hexagonos.svg', '/bg/circuito.svg',
]);

// Adesivos, fontes e texturas da página pública do convite.
const INVITE_ASSET = /^\/convite-assets\/(adesivos\/[0-9]{3}\.png|fonts\/[a-z0-9-]+\.ttf|texturas\/[a-z-]+\.(jpg|png))$/;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicPaths.has(path) || /^\/convite\/[a-f0-9]{64}$/.test(path) || /^\/convite\/arte\/(0|[1-9][0-9]{0,2})$/.test(path)
    || INVITE_ASSET.test(path)) return NextResponse.next();

  const isApi = path === '/api' || path.startsWith('/api/');
  let response = NextResponse.next({ request });

  const finish = (result: NextResponse) => {
    if (result !== response) response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  };

  const deny = (unavailable = false, invitation = false) => {
    if (path === '/api/youtube/entrar' || path === '/api/youtube/retorno') {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', '/conta?youtube=sessao_expirada#youtube');
      return finish(NextResponse.redirect(login));
    }
    if (isApi) {
      return finish(NextResponse.json(
        { error: invitation ? 'Esta conta não possui acesso à plataforma.' : unavailable ? 'Não foi possível validar sua sessão. Tente novamente.' : 'Faça login para acessar a plataforma.' },
        { status: unavailable ? 503 : invitation ? 403 : 401 },
      ));
    }
    const login = new URL('/login', request.url);
    login.searchParams.set('next', path + request.nextUrl.search);
    if (invitation) login.searchParams.set('error', 'invite_required');
    return finish(NextResponse.redirect(login));
  };

  try {
    const url = resolveSupabaseUrl();
    if (!url || !PUBLISHABLE_ANON_KEY) return deny(true);

    const supabase = createServerClient(url, PUBLISHABLE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.is_anonymous) return deny();

    if (!isPlatformAdmin(user.email)) {
      const { data: access, error: accessError } = await supabase
        .from('platform_access')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (accessError) {
        // Compatibilidade durante a implantação inicial: se a tabela de convites
        // ainda não existe no Supabase, não derruba contas que já existiam.
        // O cadastro novo continua bloqueado pelo endpoint /api/signup.
        const code = String((accessError as { code?: string }).code || '');
        const msg = String((accessError as { message?: string }).message || '');
        const schemaPending = code === '42P01' || code === 'PGRST205' || /platform_access|schema cache|does not exist/i.test(msg);
        if (!schemaPending) return deny(true);
      } else if (!access) {
        return deny(false, true);
      }
    }

    const adminPage = path === '/admin' || path.startsWith('/admin/');
    const adminApi = path === '/api/admin' || path.startsWith('/api/admin/')
      || path === '/api/spotify' || path.startsWith('/api/spotify/') || path === '/api/playlist';
    if ((adminPage || adminApi) && !isPlatformAdmin(user.email)) {
      return finish(adminApi
        ? NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 })
        : NextResponse.redirect(new URL('/', request.url)));
    }

    return finish(response);
  } catch {
    console.error('[middleware] Não foi possível validar a sessão.');
    return deny(true);
  }
}

export const config = {
  matcher: ['/((?!_next/static/|_next/image(?:/|$)).*)'],
};
