import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createServerSupabase } from './supabase-server';
import { isPlatformAdmin } from './auth';

export async function getSession(): Promise<{ sb: SupabaseClient | null; user: User | null }> {
  const sb = createServerSupabase();
  if (!sb) return { sb: null, user: null };
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

type AdminResult =
  | { ok: true; sb: SupabaseClient; user: User }
  | { ok: false; response: NextResponse };

/** Garante que a requisição vem do administrador da plataforma. */
export async function requireAdmin(): Promise<AdminResult> {
  const sb = createServerSupabase();
  if (!sb) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Supabase não configurado (modo demonstração).' }, { status: 503 }),
    };
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isPlatformAdmin(user.email)) {
    return { ok: false, response: NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 }) };
  }
  return { ok: true, sb, user };
}
