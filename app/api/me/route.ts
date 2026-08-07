import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { isPlatformAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me — quem está logado, seu tenant e o que ele pode acessar.
 *
 * `admin` vem do e-mail da sessão, nunca de uma coluna do banco: é a mesma
 * regra usada pelo middleware, pelo requireAdmin e pelas políticas de RLS.
 * Assim não existe caminho em que alterar o próprio perfil vire acesso ao
 * painel.
 */
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const admin = isPlatformAdmin(user.email);

  const { data: profile } = await sb
    .from('profiles')
    .select('id, tenant_id, full_name, email, role')
    .eq('id', user.id)
    .maybeSingle();

  let tenant: { id: string; name: string; slug: string; account_type: string } | null = null;
  if (profile?.tenant_id) {
    const { data } = await sb
      .from('tenants')
      .select('id, name, slug, account_type')
      .eq('id', profile.tenant_id)
      .maybeSingle();
    tenant = data ?? null;
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: profile ?? null,
    tenant,
    // Falso aqui significa conta sem tenant: o app chama ensure_my_profile.
    provisionado: Boolean(profile?.tenant_id),
    acesso: {
      admin,
      // Todo mundo usa a plataforma inteira; só as ferramentas administrativas
      // ficam restritas à conta oficial.
      nichos: true,
      agenda: true,
      biblioteca: true,
      esporte: true,
      ferramentasAdministrativas: admin,
    },
  });
}
