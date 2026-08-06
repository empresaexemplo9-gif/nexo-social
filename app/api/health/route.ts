import { NextResponse } from 'next/server';
import { getSupabaseEnv, isSecretKey } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

function classifyKey(key: string): 'publishable' | 'secret' | 'jwt' | 'vazia' | 'desconhecida' {
  if (!key) return 'vazia';
  if (/^sb_publishable_/i.test(key)) return 'publishable';
  if (isSecretKey(key)) return 'secret';
  if (key.split('.').length === 3) return 'jwt';
  return 'desconhecida';
}

// Diagnóstico de configuração — NÃO expõe segredos, apenas se cada variável
// foi encontrada em runtime e o TIPO da chave anon resolvida.
export async function GET() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();
  let urlHost: string | null = null;
  try {
    urlHost = url ? new URL(url).host : null; // host não é segredo
  } catch {
    urlHost = null;
  }

  const anonKeyType = classifyKey(anonKey);

  return NextResponse.json({
    configured: isConfigured,
    urlPresent: Boolean(url),
    urlHost,
    anonKeyPresent: Boolean(anonKey),
    anonKeyType, // deve ser "publishable" — nunca "secret" no navegador
    serviceRolePresent: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()),
    hint:
      isConfigured && anonKeyType === 'publishable'
        ? 'OK: usando a publishable key. Se ainda houver erro, limpe o cache e redeploy.'
        : 'Verifique as variáveis: a anon key deve ser a publishable (sb_publishable_...).',
  });
}
