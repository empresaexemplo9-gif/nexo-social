import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { caminhoValido } from '@/lib/imagens-url';

export const dynamic = 'force-dynamic';

/**
 * PUT { path } — a foto de perfil nova, que o navegador já subiu para o
 * bucket "perfis" em usuarios/<meu id>/. A anterior sai do Storage.
 * DELETE — tira a foto de perfil.
 */
async function trocar(path: string | null) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (path !== null && !caminhoValido(path, `usuarios/${user.id}`)) {
    return NextResponse.json({ error: 'Foto inválida.' }, { status: 400 });
  }

  const { data: antes } = await sb.from('profiles').select('avatar_path').eq('id', user.id).maybeSingle();
  const { data, error } = await sb
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', user.id)
    .select('avatar_path')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });

  if (antes?.avatar_path && antes.avatar_path !== path) await sb.storage.from('perfis').remove([antes.avatar_path]);
  return NextResponse.json({ ok: true, avatarPath: data.avatar_path });
}

export async function PUT(request: Request) {
  const b = await request.json().catch(() => null);
  return trocar(typeof b?.path === 'string' ? b.path : '');
}

export async function DELETE() {
  return trocar(null);
}
