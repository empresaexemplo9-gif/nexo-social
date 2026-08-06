// Configuração do Supabase (pura, sem side effects, sem 'server-only') —
// importável pelo navegador, servidor e middleware.

// ---------------------------------------------------------------------------
// Padrões públicos do projeto (embutidos de propósito).
//
// A URL e a "publishable key" (chave anon) são PÚBLICAS — o Supabase classifica
// a publishable como "safe to share publicly" e ela já vai no bundle do
// navegador de qualquer forma. Embuti-las garante que o app funcione sempre,
// sem depender de variáveis de ambiente.
//
// IMPORTANTE (segurança): NÃO lemos NEXT_PUBLIC_SUPABASE_ANON_KEY do ambiente.
// Se alguém colar a SECRET key (`sb_secret_...`) nessa variável por engano, o
// Next inlinaria esse segredo no bundle do navegador. Por isso a chave anon do
// cliente é SEMPRE a publishable embutida abaixo. O único segredo (service_role)
// fica apenas em SUPABASE_SERVICE_ROLE_KEY, no servidor, e nunca é commitado.
// A proteção dos dados é feita pelo RLS (db/schema.sql).
// ---------------------------------------------------------------------------
const DEFAULT_SUPABASE_URL = 'https://srunjulrflvsbrkhllaf.supabase.co';

/** Chave publishable (anon) — pública e segura para o navegador. */
export const PUBLISHABLE_ANON_KEY = 'sb_publishable_cnuelDPyyicyEj48xk79zQ_4anTLWBM';

export function normalizeSupabaseUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // adiciona protocolo se faltar
  url = url.replace(/\/+$/, ''); // remove barra final
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/** URL do Supabase: env (se válida) → padrão embutido. A URL não é segredo. */
export function resolveSupabaseUrl(): string {
  return (
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    normalizeSupabaseUrl(DEFAULT_SUPABASE_URL) ??
    DEFAULT_SUPABASE_URL
  );
}

/**
 * Detecta se uma chave é SECRETA (service_role) — nunca pode ir ao navegador.
 * Usada só para diagnóstico em /api/health.
 */
export function isSecretKey(key?: string | null): boolean {
  const k = (key || '').trim();
  if (!k) return false;
  if (/^sb_secret_/i.test(k)) return true; // nova secret key
  const parts = k.split('.');
  if (parts.length === 3) {
    try {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const payload = JSON.parse(typeof atob !== 'undefined' ? atob(b64) : '');
      if (payload && payload.role === 'service_role') return true;
    } catch {
      /* não é JWT decodificável — ignora */
    }
  }
  return false;
}

export interface SupabaseEnv {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function getSupabaseEnv(): SupabaseEnv {
  return { url: resolveSupabaseUrl(), anonKey: PUBLISHABLE_ANON_KEY, isConfigured: true };
}
