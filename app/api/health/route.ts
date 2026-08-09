import { NextResponse } from 'next/server';
import { getSupabaseEnv, isSecretKey, resolveSupabaseUrl, PUBLISHABLE_ANON_KEY } from '@/lib/supabase-config';
import { createAnonServerClient, serviceRoleStatus } from '@/lib/supabase-server';
import { statusPagamento } from '@/lib/pagamento';

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
  const tables = [
    'tenants', 'profiles', 'contents', 'events', 'bom_dia', 'user_preferences', 'subscribers',
    // Bilheteria própria.
    'ticket_types', 'ticket_orders', 'ticket_order_items', 'tickets',
  ];
  const out: Record<string, string> = {};
  await Promise.all(
    tables.map(async (t) => {
      // `head: true` faz uma requisição HEAD, que é barata — mas resposta HEAD
      // NÃO TEM CORPO. Quando dá erro, o PostgREST não tem onde escrever o
      // motivo e o diagnóstico virava "(sem mensagem)", justamente na hora em
      // que ele precisa falar. Por isso o GET de reserva abaixo.
      const r = await sb.from(t).select('*', { count: 'exact', head: true });
      const status = r.status;

      if (r.error) {
        let msg = r.error.message || r.error.details || r.error.hint || '';
        let code = r.error.code || '';

        if (!msg) {
          // Sem corpo no HEAD: repete com um GET de uma linha só para ler o
          // motivo de verdade.
          const g = await sb.from(t).select('*').limit(1);
          msg = g.error?.message || g.error?.details || g.error?.hint || '';
          code = g.error?.code || code;
        }

        const httpInfo = status ? ` [HTTP ${status}]` : '';
        const pgInfo = code ? ` [${code}]` : '';

        // PGRST205 nomeia o SCHEMA em que o PostgREST procurou. Se não for
        // `public`, o problema não é a tabela faltando: é o Data API exposto no
        // schema errado, e mandar rodar o schema.sql não conserta nada.
        const schemaProcurado = msg.match(/'([a-z0-9_]+)\.[a-z0-9_]+'/i)?.[1];
        if (schemaProcurado && schemaProcurado !== 'public') {
          out[t] =
            `SCHEMA ERRADO — o Data API está exposto em "${schemaProcurado}", mas as tabelas ficam em "public". ` +
            'Em Supabase → Project Settings → API → Data API, inclua "public" nos Exposed schemas.';
        } else if (/does not exist|schema cache/i.test(msg) || code === '42P01') {
          out[t] = 'AUSENTE — rode o db/schema.sql';
        } else if (code === '42P17' || /infinite recursion/i.test(msg)) {
          out[t] = 'RECURSÃO no RLS — rode o db/schema.sql atualizado (current_tenant_id como SECURITY DEFINER)';
        } else if (status === 401 || status === 403 || /invalid api key|jwt|unauthorized/i.test(msg)) {
          // Sintoma clássico de chave publishable revogada ou trocada: TODAS as
          // tabelas caem juntas, porque o problema é a credencial, não o schema.
          out[t] =
            `CHAVE RECUSADA${httpInfo} — a publishable embutida em lib/supabase-config.ts não vale mais ` +
            `neste projeto. Copie a atual em Project Settings → API Keys.${msg ? ` (${msg})` : ''}`;
        } else {
          out[t] = `erro${httpInfo}${pgInfo}: ${msg || '(o Supabase não devolveu motivo)'}`;
        }
      } else {
        out[t] = `ok (${r.count ?? 0} linhas)`;
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

  const pagamento = statusPagamento();

  const problemas: string[] = [];
  if (!pagamento.ok) problemas.push(`Ingressos pagos: ${pagamento.motivo}`);
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
    const todas = Object.entries(db.tables);
    const faltando = todas.filter(([, v]) => v.startsWith('AUSENTE')).map(([k]) => k);
    const comErro = todas.filter(([, v]) => !v.startsWith('ok'));

    // Se NENHUMA tabela responde, o problema é a credencial ou o projeto — não
    // o schema. Mandar rodar o schema.sql aqui só faria perder tempo.
    const schemaErrado = todas.find(([, v]) => v.startsWith('SCHEMA ERRADO'));
    const chaveRecusada = todas.some(([, v]) => v.startsWith('CHAVE RECUSADA'));

    if (schemaErrado) {
      problemas.push(schemaErrado[1]);
    } else if (comErro.length === todas.length && todas.length > 0) {
      problemas.push(
        chaveRecusada
          ? 'NENHUMA tabela respondeu e a credencial foi recusada: a publishable embutida em ' +
            'lib/supabase-config.ts foi revogada ou é de outro projeto. Confira em Project Settings → API Keys.'
          : 'NENHUMA tabela respondeu. Quando todas caem juntas o motivo costuma estar na configuração do ' +
            'projeto (schema exposto no Data API ou credencial), não em tabela faltando. Veja o detalhe em "db.tables".',
      );
    } else if (faltando.length) {
      problemas.push(`Tabelas ausentes (${faltando.join(', ')}) — rode o db/schema.sql no SQL Editor.`);
    }
  }

  return NextResponse.json({
    configured: isConfigured,
    urlHost,
    anonKeyType, // deve ser "publishable"
    serviceRole,
    auth,
    db,
    pagamento,
    problemas: problemas.length ? problemas : ['Nenhum problema detectado.'],
  });
}
