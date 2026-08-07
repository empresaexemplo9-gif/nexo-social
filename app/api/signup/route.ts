import { NextResponse } from 'next/server';
import { createAdminClient, createAnonServerClient, serviceRoleStatus } from '@/lib/supabase-server';
import { isPlatformAdmin, tenantSlug, type AccountType } from '@/lib/auth';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Garante tenant + perfil para o usuário (idempotente).
 * Roda com service role, portanto ignora o RLS — não depende do gatilho do banco.
 */
async function provision(
  admin: SupabaseClient,
  user: User,
  fullName: string,
  accountType: AccountType,
  tenantName: string,
) {
  const { data: existing } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing) return;

  // Slug único (sufixa com parte do id em caso de colisão).
  let slug = tenantSlug(tenantName || user.email || 'tenant') || 'tenant';
  const { data: clash } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${user.id.slice(0, 8)}`;

  const { data: tenant } = await admin
    .from('tenants')
    .insert({ name: tenantName || user.email, slug, account_type: accountType, owner_id: user.id })
    .select('id')
    .maybeSingle();

  await admin.from('profiles').insert({
    id: user.id,
    tenant_id: tenant?.id ?? null,
    full_name: fullName || null,
    email: user.email,
    role: 'owner',
    is_platform_admin: isPlatformAdmin(user.email),
  });
}

/**
 * Cria a conta pelo servidor, já confirmada.
 *
 * Motivo: o fluxo padrão exige confirmação por e-mail, e o serviço de e-mail
 * embutido do Supabase tem limite de envio baixo — o que fazia o cadastro
 * falhar. Aqui a conta é criada com `email_confirm: true` e o usuário já pode
 * entrar. Contrapartida: o e-mail não passa por verificação.
 */
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const email = String(b?.email || '').trim().toLowerCase();
  const password = String(b?.password || '');
  const fullName = String(b?.fullName || '').trim();
  const accountType: AccountType = b?.accountType === 'organizacao' ? 'organizacao' : 'pessoal';
  const tenantName = String(b?.tenantName || fullName || email).trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
  }

  const metadata = {
    full_name: fullName,
    account_type: accountType,
    tenant_name: tenantName,
    tenant_slug: tenantSlug(tenantName || email),
  };

  /**
   * Fluxo padrão do Supabase: cria a conta com a chave publishable e o usuário
   * confirma por e-mail. Tenant e perfil ficam por conta do gatilho do banco e,
   * se ele falhar, de `ensure_my_profile` no primeiro login.
   */
  const cadastroPadrao = async (aviso?: string) => {
    const anon = createAnonServerClient();
    if (!anon) {
      return NextResponse.json({ error: 'Supabase não configurado neste servidor.' }, { status: 503 });
    }
    let error: { message?: string; status?: number } | null = null;
    try {
      ({ error } = await anon.auth.signUp({ email, password, options: { data: metadata } }));
    } catch (e: any) {
      // Falha de rede/proxy: a resposta nem chega a ser JSON. Sem este catch, o
      // usuário via um "Unexpected token ... is not valid JSON" sem sentido.
      console.error('[signup] falha de rede ao falar com o Supabase:', e?.message || e);
      return NextResponse.json(
        { error: 'Não foi possível falar com o servidor de autenticação. Tente de novo em instantes.' },
        { status: 502 },
      );
    }
    if (error) {
      const already = /already|registered|exists/i.test(error.message || '');
      const rede = /not valid JSON|fetch failed|ENOTFOUND|ECONNREFUSED|Host not/i.test(error.message || '');
      if (rede) {
        return NextResponse.json(
          { error: 'Não foi possível falar com o servidor de autenticação. Tente de novo em instantes.' },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: already ? 'Este e-mail já possui conta. Use "Fazer login".' : error.message },
        { status: already ? 409 : error.status || 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      confirmacaoPendente: true,
      admin: isPlatformAdmin(email),
      aviso: aviso ?? null,
    });
  };

  const admin = createAdminClient();
  const chave = serviceRoleStatus();

  // Sem service role válida o cadastro NÃO pode simplesmente falhar.
  if (!admin) return cadastroPadrao(chave.motivo);

  let data: { user: User | null } | null = null;
  let error: { message?: string; status?: number } | null = null;
  try {
    ({ data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }));
  } catch (e: any) {
    // O endpoint de admin devolveu algo que nem é JSON (proxy, 5xx, HTML de
    // erro). Não dá para concluir por aqui — segue pelo fluxo padrão.
    console.error('[signup] endpoint de admin indisponível:', e?.message || e);
    return cadastroPadrao('O endpoint de administração do Supabase não respondeu como esperado; usei o fluxo padrão.');
  }

  if (error) {
    const msg = error.message || '';
    const already = /already|registered|exists/i.test(msg);
    if (already) {
      return NextResponse.json({ error: 'Este e-mail já possui conta. Use "Fazer login".' }, { status: 409 });
    }

    // A chave passou na validação de formato mas o Supabase recusou o
    // `Authorization: Bearer` — chave de outro projeto, revogada, ou sem
    // permissão de admin. Em vez de derrubar o cadastro, usa o fluxo padrão.
    const credencial =
      error.status === 401 ||
      error.status === 403 ||
      /invalid api key|api key|not allowed|unauthorized|forbidden|signature|jwt/i.test(msg);

    // Resposta que nem chegou a ser JSON (proxy, HTML de erro, 5xx): não dá
    // para concluir nada sobre a chave, mas o cadastro não pode morrer aqui.
    const indisponivel = /not valid JSON|unexpected token|fetch failed|ENOTFOUND|ECONNREFUSED|Host not/i.test(msg);

    if (credencial || indisponivel) {
      console.error('[signup] caminho de admin descartado:', msg);
      return cadastroPadrao(
        credencial
          ? `A SUPABASE_SERVICE_ROLE_KEY foi recusada pelo Supabase ("${msg}"). ` +
            'Confira se ela é a secret key deste projeto em Project Settings → API Keys. ' +
            'A conta foi criada pelo fluxo padrão, com confirmação por e-mail.'
          : 'O endpoint de administração do Supabase não respondeu como esperado; usei o fluxo padrão.',
      );
    }

    return NextResponse.json({ error: msg || 'Falha ao criar a conta.' }, { status: error.status || 500 });
  }

  if (data.user) {
    try {
      await provision(admin, data.user, fullName, accountType, tenantName);
    } catch (e: any) {
      // Conta criada com sucesso — provisionamento pode ser refeito depois.
      console.error('[signup] provisionamento falhou:', e?.message || e);
    }
  }

  return NextResponse.json({ ok: true, admin: isPlatformAdmin(email) });
}
