import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(url && anonKey);
export const hasServiceRole = Boolean(url && serviceKey);

/**
 * Cliente de servidor vinculado aos cookies da requisição — enxerga a sessão
 * autenticada. Use em Route Handlers e páginas que dependem do usuário logado.
 */
export function createServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component (somente leitura) — ignorado.
          // O middleware é responsável por renovar a sessão.
        }
      },
    },
  });
}

/**
 * Cliente anônimo de servidor SEM cookies — ideal para leituras públicas
 * (conteúdos, eventos, bom_dia) que podem ser cacheadas/ISR.
 */
export function createAnonServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Cliente com service role (ignora RLS) — apenas no servidor, para operações
 * privilegiadas (seed, leitura de inscritos). `null` sem SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!hasServiceRole) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
