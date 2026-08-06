import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
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

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada.' },
      { status: 503 },
    );
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      account_type: accountType,
      tenant_name: tenantName,
      tenant_slug: tenantSlug(tenantName || email),
    },
  });

  if (error) {
    const already = /already|registered|exists/i.test(error.message || '');
    return NextResponse.json(
      { error: already ? 'Este e-mail já possui conta. Use "Fazer login".' : error.message || 'Falha ao criar a conta.' },
      { status: already ? 409 : error.status || 500 },
    );
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
