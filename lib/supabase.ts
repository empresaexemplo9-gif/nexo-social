import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Indica se as credenciais do Supabase foram configuradas. Quando `false`, a
 * aplicação opera em "modo demonstração": leituras usam o dataset semente
 * (lib/data.ts) e as telas de auth exibem avisos amigáveis.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Cliente Supabase do navegador (sessão via cookies, sincronizada com o
 * servidor através de @supabase/ssr). É `null` quando não configurado.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;
