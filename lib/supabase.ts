import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './supabase-config';

const { url, anonKey, isConfigured } = getSupabaseEnv();

/**
 * Indica se as credenciais do Supabase foram configuradas (e são válidas).
 * Quando `false`, a aplicação opera em "modo demonstração".
 */
export const isSupabaseConfigured = isConfigured;

function createBrowserSupabase(): SupabaseClient | null {
  if (!isConfigured || !url) return null;
  try {
    return createBrowserClient(url, anonKey);
  } catch (e) {
    // URL/credenciais inválidas não devem quebrar a aplicação — cai para demo.
    console.error('[supabase] Falha ao criar o cliente do navegador:', e);
    return null;
  }
}

/** Cliente Supabase do navegador. `null` quando não configurado. */
export const supabase: SupabaseClient | null = createBrowserSupabase();
