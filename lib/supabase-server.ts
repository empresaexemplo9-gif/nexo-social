import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv, isSecretKey } from './supabase-config';

const { url, anonKey, isConfigured } = getSupabaseEnv();
const serviceKeyRaw = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Só vale como service role uma chave REALMENTE secreta (sb_secret_… ou JWT com
// role service_role). Colar a publishable aqui criaria um cliente cujo header
// `Authorization: Bearer …` o Supabase recusa — e aí toda operação privilegiada,
// inclusive a criação de conta, quebra com 401. Tratando como ausente, os
// caminhos alternativos assumem em vez de o fluxo morrer.
const serviceKey = isSecretKey(serviceKeyRaw) ? serviceKeyRaw : '';

export const isSupabaseConfigured = isConfigured;
export const hasServiceRole = Boolean(url && serviceKey);

/** Diagnóstico da SUPABASE_SERVICE_ROLE_KEY, para /api/health e o cadastro. */
export function serviceRoleStatus(): { ok: boolean; motivo: string } {
  if (!serviceKeyRaw) {
    return { ok: false, motivo: 'SUPABASE_SERVICE_ROLE_KEY não está definida no servidor.' };
  }
  if (!serviceKey) {
    const parece = serviceKeyRaw.startsWith('sb_publishable_')
      ? 'Parece ser a chave publishable (pública), não a secreta.'
      : 'O valor não tem formato de chave secreta (sb_secret_… ou JWT com role service_role).';
    return {
      ok: false,
      motivo: `SUPABASE_SERVICE_ROLE_KEY tem valor inválido. ${parece} Copie a "secret key" em Supabase → Project Settings → API Keys e faça Redeploy.`,
    };
  }
  return { ok: true, motivo: 'Chave secreta presente e com formato válido.' };
}

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
