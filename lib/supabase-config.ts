// Leitura e normalização das credenciais do Supabase a partir do ambiente.
// Módulo PURO (sem side effects, sem 'server-only') — pode ser importado pelo
// cliente do navegador, pelo servidor e pelo middleware (edge).

// ---------------------------------------------------------------------------
// Padrões públicos do projeto (embutidos de propósito).
//
// A URL e a "publishable key" (chave anon) NÃO são segredos — o próprio Supabase
// classifica a publishable key como "safe to share publicly", e ela já vai
// embutida no bundle do navegador de qualquer forma. Deixá-las aqui garante que
// o app funcione mesmo sem variáveis de ambiente configuradas.
//
// O único segredo de verdade é a SERVICE_ROLE / secret key, que continua APENAS
// em variável de ambiente no servidor (SUPABASE_SERVICE_ROLE_KEY) e nunca é
// commitada. A proteção dos dados é feita pelo RLS do banco (db/schema.sql).
//
// Variáveis de ambiente, quando presentes e válidas, têm prioridade sobre estes
// padrões.
// ---------------------------------------------------------------------------
const DEFAULT_SUPABASE_URL = 'https://srunjulrflvsbrkhllaf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_cnuelDPyyicyEj48xk79zQ_4anTLWBM';

// Objetivo: um valor mal formatado de NEXT_PUBLIC_SUPABASE_URL (ex.: colado sem
// "https://" ou com espaços) NÃO deve derrubar o build. Normalizamos o que dá
// para consertar e, se ainda assim for inválido, caímos no padrão público.
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
  // Prioridade: variável de ambiente válida → padrão público embutido.
  const url =
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    normalizeSupabaseUrl(DEFAULT_SUPABASE_URL);
  const anonKey =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || DEFAULT_SUPABASE_ANON_KEY;
  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
}
