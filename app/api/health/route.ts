import { NextResponse } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

// Diagnóstico de configuração — NÃO expõe segredos, apenas se cada variável
// foi encontrada pelo app em runtime. Útil para depurar o "modo demonstração".
export async function GET() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();
  let urlHost: string | null = null;
  try {
    urlHost = url ? new URL(url).host : null; // host não é segredo (vai em toda request)
  } catch {
    urlHost = null;
  }

  return NextResponse.json({
    configured: isConfigured,
    urlPresent: Boolean(url),
    urlHost, // ex.: "srunjulrflvsbrkhllaf.supabase.co" — confirma que a URL chegou
    anonKeyPresent: Boolean(anonKey),
    serviceRolePresent: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()),
    hint:
      isConfigured
        ? 'OK: URL e anon key encontradas. Se ainda aparecer "modo demonstração", limpe o cache e redeploy.'
        : 'Faltando: verifique se as variáveis se chamam EXATAMENTE NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (em inglês).',
  });
}
