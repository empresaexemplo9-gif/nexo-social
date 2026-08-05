import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isPlatformAdmin } from '@/lib/auth';
import { normalizeSupabaseUrl } from '@/lib/supabase-config';

const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export async function middleware(request: NextRequest) {
  // Sem Supabase configurado (ou URL inválida) → modo demonstração, sem proteção.
  if (!url || !anonKey) return NextResponse.next();

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Renova a sessão (mantém os cookies válidos entre servidor e cliente).
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // /admin é exclusivo do administrador da plataforma.
    if (path.startsWith('/admin')) {
      if (!user) return NextResponse.redirect(new URL('/login', request.url));
      if (!isPlatformAdmin(user.email)) return NextResponse.redirect(new URL('/', request.url));
    }

    // /conta exige autenticação.
    if (path.startsWith('/conta') && !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  } catch (e) {
    // Falha de credencial/rede não deve derrubar todas as requisições.
    console.error('[middleware] Supabase indisponível:', e);
    return NextResponse.next();
  }
}

export const config = {
  // Executa em todas as rotas, exceto assets estáticos e as próprias APIs.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
