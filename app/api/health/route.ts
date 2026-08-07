import { NextResponse } from 'next/server';
import { getSupabaseEnv, isSecretKey, resolveSupabaseUrl, PUBLISHABLE_ANON_KEY } from '@/lib/supabase-config';
import { createAnonServerClient, serviceRoleStatus } from '@/lib/supabase-server';

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

/**
 * Testa a service role de verdade: chama um endpoint que SÓ ela pode usar.
 * Ter a variável preenchida não significa que o Supabase aceita o Bearer —
 * era exatamente isso que derrubava a criação de conta.
 */
async function checkServiceRole(url: string) {
  const bruta = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const status = serviceRoleStatus();
  if (!status.ok) {
    return { presente: Boolean(bruta), formatoValido: false, aceita: false, detalhe: status.motivo };
  }
  try {
    // Lista 1 usuário — exige privilégio de admin.
    const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: { apikey: bruta, Authorization: `Bearer ${bruta}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      const corpo = (await res.text()).replace(/\s+/g, ' ').slice(0, 160);
      return {
        presente: true,
        formatoValido: true,
        aceita: false,
        detalhe:
          `O Supabase recusou a chave (HTTP ${res.status}): ${corpo || '(sem corpo)'}. ` +
          'Provavelmente é a secret key de OUTRO projeto, ou foi revogada. Copie de novo em Project Settings → API Keys.',
      };
    }
    return { presente: true, formatoValido: true, aceita: true, detalhe: 'Chave aceita — cadastro sai já confirmado.' };
  } catch (e: any) {
    return { presente: true, formatoValido: true, aceita: false, detalhe: `falha de rede: ${e?.message || e}` };
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
        const msg = error.message || error.details || error.hint || '(sem mensagem)';
        const code = error.code ? ` [${error.code}]` : '';
        if (/does not exist|schema cache/i.test(msg) || error.code === '42P01') {
          out[t] = 'AUSENTE — rode o db/schema.sql';
        } else if (error.code === '42P17' || /infinite recursion/i.test(msg)) {
          out[t] = 'RECURSÃO no RLS — rode o db/schema.sql atualizado (current_tenant_id como SECURITY DEFINER)';
        } else {
          out[t] = `erro${code}: ${msg}`;
        }
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

  const [auth, db, serviceRole] = await Promise.all([
    checkAuth(resolveSupabaseUrl(), PUBLISHABLE_ANON_KEY),
    checkTables(),
    checkServiceRole(resolveSupabaseUrl()),
  ]);

  const problemas: string[] = [];
  if (!serviceRole.aceita) {
    problemas.push(
      `Service role: ${serviceRole.detalhe} Sem ela, o cadastro ainda funciona, mas exige confirmação por e-mail.`,
    );
  }
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
    serviceRole,
    auth,
    db,
    problemas: problemas.length ? problemas : ['Nenhum problema detectado.'],
  });
}
