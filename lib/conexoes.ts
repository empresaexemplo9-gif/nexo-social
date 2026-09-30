import 'server-only';
import { createServerSupabase } from './supabase-server';

// Cópia persistente (selada) de uma conexão externa na conta do usuário. É o
// que mantém a pessoa conectada quando o cookie se perde. Sem a tabela
// (migração db/connected-accounts.sql ainda não aplicada), tudo vira no-op e o
// cookie segue funcionando sozinho.

type Provider = 'youtube';

export async function lerConexao(uid: string, provider: Provider): Promise<string | null> {
  const sb = createServerSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.from('connected_accounts').select('sealed').eq('user_id', uid).eq('provider', provider).maybeSingle();
    return (data?.sealed as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function gravarConexao(uid: string, provider: Provider, sealed: string): Promise<void> {
  const sb = createServerSupabase();
  if (!sb) return;
  try {
    await sb.from('connected_accounts').upsert({ user_id: uid, provider, sealed, updated_at: new Date().toISOString() });
  } catch {
    /* sem a tabela, fica só o cookie */
  }
}

export async function apagarConexao(uid: string, provider: Provider): Promise<void> {
  const sb = createServerSupabase();
  if (!sb) return;
  try {
    await sb.from('connected_accounts').delete().eq('user_id', uid).eq('provider', provider);
  } catch {
    /* nada a apagar */
  }
}
