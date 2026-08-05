import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Indica se as credenciais do Supabase foram configuradas via variáveis de
 * ambiente. Quando `false`, a aplicação opera em "modo demonstração": a
 * personalização usa localStorage e as telas de autenticação exibem avisos
 * amigáveis em vez de tentar chamadas que falhariam.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Cliente Supabase. É `null` quando as credenciais não estão configuradas —
 * sempre verifique `isSupabaseConfigured` (ou faça um guard de null) antes de
 * usá-lo.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
