'use client';

// Garante que a conta logada tenha tenant e perfil.
//
// O gatilho `handle_new_user` do banco engole exceções de propósito (senão uma
// falha no provisionamento abortaria o cadastro inteiro). O preço é que uma
// conta pode nascer sem perfil. `ensure_my_profile` conserta isso na hora do
// login: é idempotente e barata, então roda sempre que a sessão começa.

import { supabase } from './supabase';

export interface EnsureResult {
  ok: boolean;
  tenantId?: string;
  error?: string;
}

export async function ensureProfile(fullName?: string, tenantName?: string): Promise<EnsureResult> {
  if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
  try {
    const { data, error } = await supabase.rpc('ensure_my_profile', {
      p_full_name: fullName ?? null,
      p_account_type: 'pessoal',
      p_tenant_name: tenantName ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, tenantId: typeof data === 'string' ? data : undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Falha ao preparar a conta.' };
  }
}
