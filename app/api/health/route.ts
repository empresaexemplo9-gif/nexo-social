import { NextResponse } from 'next/server';
import { getSupabaseEnv, isSecretKey, resolveSupabaseUrl, PUBLISHABLE_ANON_KEY } from '@/lib/supabase-config';
import { createAnonServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function classifyKey(key: string): 'publishable' | 'secret' | 'jwt' | 'vazia' | 'desconhecida' {
  if (!key) return 'vazia';
  if (/^sb_publishable_/i.test(key)) return 'publishable';
  if (isSecretKey(key)) return 'secret';
  if (key.split('.').length === 3) return 'jwt';
  return 'desconhecida';
}

/** Consulta o /auth/v1/settings do projeto — diz se a chave é aceita e se o cadastro está liberado. */
async function checkAuth(url: string, key: string) {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: body || '(corpo vazio)' };
    }
    return {
      ok: true,
      status: res.status,
      emailSignupEnabled: body?.external?.email ?? null,
      signupDisabled: body?.disable_signup ?? null,
      mailerAutoconfirm: body?.mailer_autoconfirm ?? null,
    };
  } catch (e: any) {
    return { ok: false, error: `falha de rede: ${e?.message || e}` };
  }
}

/** Verifica se as tabelas do schema existem e são legíveis. */
async function checkTables() {
  const sb = createAnonServerClient();
  if (!sb) return { ok: false, error: 'cliente indisponível' };
  const tables = ['tenants', 'profiles', 'contents', 'events', 'bom_dia', 'user_preferences', 'subscribers'];
  const out: Record<string, string> = {};
  await Promise.all(
    tables.map(async (t) => {
      const { error, count } = await sb.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        out[t] = /does not exist|schema cache/i.test(error.message) ? 'AUSENTE — rode o db/schema.sql' : `erro: ${error.message}`;
      } else {
        out[t] = `ok (${count ?? 0} linhas)`;
      }
    }),
  );
  return { ok: true, tables: out };
}

// Diagnóstico completo — NÃO expõe segredos.
export async function GET() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();
  const anonKeyType = classifyKey(anonKey);

  let urlHost: string | null = null;
  try {
    urlHost = new URL(url).host;
  } catch {
    urlHost = null;
  }

  const [auth, db] = await Promise.all([checkAuth(resolveSupabaseUrl(), PUBLISHABLE_ANON_KEY), checkTables()]);

  const problemas: string[] = [];
  if (anonKeyType !== 'publishable') problemas.push('A chave usada no navegador não é a publishable.');
  if (!auth.ok) problemas.push(`O endpoint de autenticação respondeu com erro (${auth.status ?? 'rede'}). Confira a URL e a publishable key do projeto.`);
  if (auth.ok && auth.signupDisabled) problemas.push('O cadastro está DESABILITADO no projeto (Authentication → Providers → Email).');
  if (auth.ok && auth.emailSignupEnabled === false) problemas.push('O provedor de e-mail está desabilitado (Authentication → Providers → Email).');
  if (db.ok && db.tables) {
    const faltando = Object.entries(db.tables).filter(([, v]) => v.startsWith('AUSENTE')).map(([k]) => k);
    if (faltando.length) problemas.push(`Tabelas ausentes (${faltando.join(', ')}) — rode o db/schema.sql no SQL Editor.`);
  }

  return NextResponse.json({
    configured: isConfigured,
    urlHost,
    anonKeyType, // deve ser "publishable"
    serviceRolePresent: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()),
    auth,
    db,
    problemas: problemas.length ? problemas : ['Nenhum problema detectado.'],
  });
}
