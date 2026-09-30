import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import { configurarDespacho, pushConfigurado } from '@/lib/push';

export const dynamic = 'force-dynamic';

interface Corpo {
  inscricao?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  /** Endereço antigo (quando o navegador troca a inscrição sozinho). */
  antiga?: unknown;
}

const texto = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null);

/** POST { inscricao } — guarda este aparelho para receber avisos. */
export async function POST(request: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: 'Entre na sua conta para ativar os avisos.' }, { status: 401 });
  if (!pushConfigurado()) return NextResponse.json({ error: 'Os avisos no aparelho ainda não foram ligados no servidor.' }, { status: 503 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Servidor sem acesso ao banco para os avisos.' }, { status: 503 });

  const b = (await request.json().catch(() => null)) as Corpo | null;
  const endpoint = texto(b?.inscricao?.endpoint, 1000);
  const p256dh = texto(b?.inscricao?.keys?.p256dh, 200);
  const auth = texto(b?.inscricao?.keys?.auth, 100);
  if (!endpoint || !/^https:\/\//.test(endpoint) || !p256dh || !auth) {
    return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 });
  }
  const antiga = texto(b?.antiga, 1000);
  if (antiga && antiga !== endpoint) await admin.from('push_subscriptions').delete().eq('endpoint', antiga).eq('user_id', user.id);

  // O mesmo aparelho com outra conta passa a avisar só a conta atual.
  const { error } = await admin.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh, auth, user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null, last_used_at: new Date().toISOString() },
    { onConflict: 'endpoint' },
  );
  if (error) {
    const semTabela = error.code === '42P01' || /push_subscriptions/.test(error.message);
    return NextResponse.json({ error: semTabela ? 'Os avisos no aparelho ainda não foram ativados no banco.' : 'Não foi possível ativar os avisos.' }, { status: semTabela ? 503 : 500 });
  }
  await configurarDespacho(new URL(request.url).origin).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

/** DELETE { endpoint } — este aparelho para de receber avisos. */
export async function DELETE(request: Request) {
  const { sb, user } = await getSession();
  if (!sb || !user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const endpoint = texto(b?.endpoint, 1000);
  if (!endpoint) return NextResponse.json({ error: 'Aparelho inválido.' }, { status: 400 });
  await sb.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
