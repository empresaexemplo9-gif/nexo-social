import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './supabase-config';

const { url, anonKey, isConfigured } = getSupabaseEnv();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const isSupabaseConfigured = isConfigured;
export const hasServiceRole = Boolean(url && serviceKey);

/**
 * Cliente de servidor vinculado aos cookies da requisição — enxerga a sessão
 * autenticada. Use em Route Handlers e páginas que dependem do usuário logado.
 */
export function createServerSupabase(): SupabaseClient | null {
  if (!isConfigured || !url) return null;
  const cookieStore = cookies();
  try {
    return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component (somente leitura) — o middleware renova a sessão.
          }
        },
      },
    });
  } catch (e) {
    console.error('[supabase] Falha ao criar o cliente de servidor:', e);
    return null;
  }
}

/**
 * Cliente anônimo de servidor SEM cookies — ideal para leituras públicas
 * (conteúdos, eventos, bom_dia) que podem ser cacheadas/ISR.
 */
export function createAnonServerClient(): SupabaseClient | null {
  if (!isConfigured || !url) return null;
  try {
    return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch (e) {
    console.error('[supabase] Falha ao criar o cliente anônimo:', e);
    return null;
  }
}

/**
 * Cliente com service role (ignora RLS) — apenas no servidor, para operações
 * privilegiadas (seed, leitura de inscritos). `null` sem SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  try {
    return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch (e) {
    console.error('[supabase] Falha ao criar o cliente admin:', e);
    return null;
  }
}
