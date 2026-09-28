import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isPlatformAdmin } from '@/lib/auth';
import { resolveSupabaseUrl, PUBLISHABLE_ANON_KEY } from '@/lib/supabase-config';

// Entrada, política de privacidade, cadastro e arquivos do app são públicos.
// Não liberar por extensão: uma rota interna pode terminar em .png ou .svg.
const publicPaths = new Set([
  '/login', '/auth/callback', '/privacidade', '/termos', '/offline', '/api/signup', '/manifest.webmanifest', '/sw.js',
  '/favicon.ico', '/favicon-32.png', '/favicon-48.png', '/apple-touch-icon.png',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-192.png', '/icon-maskable-512.png',
  '/logo.png', '/logo.svg',
  '/bg/linhas-luz.svg', '/bg/grade.svg', '/bg/chip.svg', '/bg/hud.svg',
  '/bg/rede.svg', '/bg/hexagonos.svg', '/bg/circuito.svg',
]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicPaths.has(path)) return NextResponse.next();

  const isApi = path === '/api' || path.startsWith('/api/');
  let response = NextResponse.next({ request });
  const finish = (result: NextResponse) => {
    if (result !== response) {
      response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    }
    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  };
  const deny = (unavailable = false) => {
    if (path === '/api/youtube/entrar' || path === '/api/youtube/retorno') {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', '/conta?youtube=sessao_expirada#youtube');
      return finish(NextResponse.redirect(login));
    }
    if (isApi) {
      return finish(NextResponse.json(
        { error: unavailable ? 'Não foi possível validar sua sessão. Tente novamente.' : 'Faça login para acessar a plataforma.' },
        { status: unavailable ? 503 : 401 },
      ));
    }
    const login = new URL('/login', request.url);
    login.searchParams.set('next', path + request.nextUrl.search);
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

    // Validação no servidor: a presença de um cookie não comprova identidade.
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.is_anonymous) return deny();

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
    // Falhas de rede/configuração nunca podem liberar a área interna.
    console.error('[middleware] Não foi possível validar a sessão.');
    return deny(true);
  }
}

export const config = {
  matcher: ['/((?!_next/static/|_next/image(?:/|$)).*)'],
};
