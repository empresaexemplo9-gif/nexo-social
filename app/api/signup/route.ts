import { NextResponse } from 'next/server';
import { createAdminClient, createAnonServerClient } from '@/lib/supabase-server';
import { tenantSlug } from '@/lib/auth';
import { describeAuthError } from '@/lib/auth-errors';
import { AVISO_DA_SENHA, senhaValida } from '@/lib/senha';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return reply({ error: 'Origem inválida.' }, 403);
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 150) : '';
  const accountType = body?.accountType === 'organizacao' ? 'organizacao' : 'pessoal';
  const tenantName = accountType === 'organizacao' && typeof body?.tenantName === 'string' ? body.tenantName.trim().slice(0, 150) : fullName;
  const inviteToken = typeof body?.inviteToken === 'string' ? body.inviteToken.trim() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return reply({ error: 'E-mail inválido.' }, 400);
  if (!senhaValida(password)) return reply({ error: AVISO_DA_SENHA }, 400);
  if (!fullName || !tenantName) return reply({ error: 'Preencha seu nome e o nome da organização, quando aplicável.' }, 400);
  if (!/^[0-9a-f]{64}$/i.test(inviteToken)) return reply({ error: 'Você precisa de um convite válido para criar uma conta.' }, 403);
  if (body?.aceitouRegras !== true) return reply({ error: 'Para criar a conta, leia e aceite as regras da comunidade.' }, 400);

  try {
    const anon = createAnonServerClient();
    const admin = createAdminClient();
    if (!anon || !admin) return reply({ error: 'Cadastro temporariamente indisponível.' }, 503);
    const perfil = { full_name: fullName, account_type: accountType, tenant_name: tenantName, tenant_slug: tenantSlug(tenantName) };

    const { data: preview, error: previewError } = await anon.rpc('platform_invite_preview', { p_token: inviteToken });
    const valid = Boolean((Array.isArray(preview) ? preview[0] : preview)?.valid);
    if (previewError || !valid) {
      // Quem já usou este convite numa conta que nunca foi confirmada (o
      // e-mail de confirmação não chegou ou o link falhou) termina o cadastro
      // aqui, com o mesmo link e o mesmo e-mail.
      const retomada = previewError ? null : await retomarCadastro(admin, inviteToken, email, password, perfil);
      if (!retomada) return reply({ error: 'Este convite é inválido ou já foi utilizado.' }, 403);
      await registrarRegras(admin, retomada);
      return reply({ ok: true, confirmacaoPendente: false, retomada: true });
    }

    // O convite é pessoal e de uso único: ele já comprova a pessoa. A conta
    // nasce confirmada e entra na hora — sem depender do e-mail de confirmação
    // (que pode não chegar, ser aberto em outro aparelho ou "gasto" pelo
    // leitor de links do e-mail).
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: perfil });
    if (error) {
      const jaExiste = error.code === 'email_exists' || /already (been )?registered|already exists/i.test(error.message || '');
      if (jaExiste) return reply({ error: 'Este e-mail já tem conta na nexo.social. Toque em "Fazer login" para entrar.' }, 409);
      return reply({ error: describeAuthError(error) }, error.status && error.status >= 400 && error.status < 500 ? error.status : 502);
    }
    if (!data.user) return reply({ error: 'Não foi possível criar a conta.' }, 502);

    const { data: claimed, error: claimError } = await admin.rpc('claim_platform_invite', { p_token: inviteToken, p_user: data.user.id });
    if (claimError || claimed !== true) {
      await admin.auth.admin.deleteUser(data.user.id).catch(() => null);
      return reply({ error: 'Este convite acabou de ser utilizado. Peça um novo convite.' }, 409);
    }

    await registrarRegras(admin, data.user.id);
    return reply({ ok: true, confirmacaoPendente: false });
  } catch {
    return reply({ error: 'Não foi possível criar a conta agora. Tente novamente em instantes.' }, 502);
  }
}

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** O aceite das regras fica registrado (sem a tabela ainda, o aviso aparece no primeiro acesso). */
async function registrarRegras(admin: Admin, userId: string) {
  try {
    await admin.from('community_rules_acceptance').upsert({ user_id: userId });
  } catch {
    /* segue: o aviso das regras aparece no primeiro acesso */
  }
}

/**
 * Conta criada com este convite e nunca confirmada: se o e-mail é o mesmo,
 * ativa agora com a senha nova. Exige o link do convite (segredo pessoal) e
 * o e-mail exato de quem o usou — e só vale para conta ainda não confirmada.
 */
async function retomarCadastro(admin: Admin, token: string, email: string, password: string, perfil: Record<string, string>): Promise<string | null> {
  const { data: convite } = await admin.from('platform_invites').select('status, used_by').eq('token', token).maybeSingle();
  if (convite?.status !== 'used' || !convite.used_by) return null;
  const { data, error } = await admin.auth.admin.getUserById(convite.used_by);
  const u = data?.user;
  if (error || !u || u.email_confirmed_at || (u.email ?? '').toLowerCase() !== email) return null;
  const { error: erro } = await admin.auth.admin.updateUserById(u.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(u.user_metadata ?? {}), ...perfil },
  });
  return erro ? null : u.id;
}
