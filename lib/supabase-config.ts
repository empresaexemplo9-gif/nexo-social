// Leitura e normalização das credenciais do Supabase a partir do ambiente.
// Módulo PURO (sem side effects, sem 'server-only') — pode ser importado pelo
// cliente do navegador, pelo servidor e pelo middleware (edge).
//
// Objetivo: um valor mal formatado de NEXT_PUBLIC_SUPABASE_URL (ex.: colado sem
// "https://" ou com espaços) NÃO deve derrubar o build. Normalizamos o que dá
// para consertar e, se ainda assim for inválido, tratamos como "não
// configurado" (modo demonstração) em vez de lançar exceção.

export function normalizeSupabaseUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;
  // Adiciona o protocolo se o usuário esqueceu (ex.: "abc.supabase.co").
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Remove barra(s) final(is).
  url = url.replace(/\/+$/, '');
  try {
    // Valida o formato — lança se for inválido.
    // eslint-disable-next-line no-new
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

export interface SupabaseEnv {
  url: string | null;
  anonKey: string;
  isConfigured: boolean;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
}
