import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MISSOES, estadoDaMissao, inicioDaSemana, periodoDaMissao, type Medida, type Missao, type MissaoParaCliente } from './missoes';

// O progresso das missões, medido no uso real (com a chave de serviço: conta o
// que a pessoa fez em tabelas que o RLS esconderia dela, como as próprias
// reações). Tabela que ainda não existe no banco conta zero.

type Contagem = (admin: SupabaseClient, uid: string, desde: string | null) => Promise<number>;

/** count(*) com filtro do autor e, nas semanais, da data. */
const contar =
  (tabela: string, coluna: string, data = 'created_at', extra?: (q: any) => any): Contagem =>
  async (admin, uid, desde) => {
    let q = admin.from(tabela).select('*', { count: 'exact', head: true }).eq(coluna, uid);
    if (desde) q = q.gte(data, desde);
    if (extra) q = extra(q);
    const { count, error } = await q;
    return error ? 0 : count ?? 0;
  };

const somar =
  (...partes: Contagem[]): Contagem =>
  async (admin, uid, desde) =>
    (await Promise.all(partes.map((p) => p(admin, uid, desde)))).reduce((a, b) => a + b, 0);

const MEDIDAS: Record<Medida, Contagem> = {
  questionario: contar('user_preferences', 'user_id', 'completed_at', (q) => q.not('completed_at', 'is', null)),
  perfil: async (admin, uid) => {
    const [foto, bio] = await Promise.all([
      admin.from('profiles').select('avatar_path').eq('id', uid).maybeSingle(),
      admin.from('perfil_social').select('bio').eq('user_id', uid).maybeSingle(),
    ]);
    return (foto.data?.avatar_path ? 1 : 0) + (String(bio.data?.bio ?? '').trim() ? 1 : 0);
  },
  publicacoes: contar('publicacoes', 'autor_id'),
  comentarios: somar(contar('publicacao_comentarios', 'autor_id'), contar('community_post_comments', 'author_id'), contar('lista_comentarios', 'autor_id')),
  reacoes: somar(contar('publicacao_reacoes', 'user_id'), contar('lista_reacoes', 'user_id')),
  listas: contar('listas', 'autor_id'),
  rodas_criadas: contar('rodas', 'criador_id'),
  rodas_mensagens: contar('roda_mensagens', 'autor_id'),
  grupos: contar('community_members', 'user_id', 'created_at', (q) => q.eq('status', 'ativo')),
  chat_grupo: contar('community_chat_messages', 'author_id'),
  compromissos: contar('appointments', 'owner_id'),
  leituras: contar('reading_log', 'user_id'),
  convites: contar('platform_invites', 'inviter_id', 'used_at', (q) => q.eq('status', 'used')),
  trocas: async (admin, uid, desde) => {
    let q = admin.from('exclusivos_trocas').select('id', { count: 'exact', head: true }).eq('status', 'aceita').or(`de_id.eq.${uid},para_id.eq.${uid}`);
    if (desde) q = q.gte('respondida_em', desde);
    const { count, error } = await q;
    return error ? 0 : count ?? 0;
  },
};

/** O progresso de uma missão (nas semanais, só o que foi feito nesta semana). */
export async function progressoDe(admin: SupabaseClient, uid: string, m: Missao, agora = new Date()) {
  const desde = m.periodo === 'semanal' ? inicioDaSemana(agora).toISOString() : null;
  return MEDIDAS[m.medida](admin, uid, desde);
}

/** Todas as missões com progresso e estado, para a tela. */
export async function missoesDe(admin: SupabaseClient, uid: string, agora = new Date()): Promise<MissaoParaCliente[]> {
  const { data: resgates } = await admin.from('missao_resgates').select('missao, periodo, itens').eq('user_id', uid);
  const feito = new Map((resgates ?? []).map((r: any) => [`${r.missao}|${r.periodo}`, (r.itens ?? []) as string[]]));
  // A mesma medida e o mesmo período contam uma vez só (várias conquistas usam "publicações").
  const cache = new Map<string, Promise<number>>();
  return Promise.all(
    MISSOES.map(async (m) => {
      const chave = `${m.medida}|${m.periodo}`;
      if (!cache.has(chave)) cache.set(chave, progressoDe(admin, uid, m, agora));
      const progresso = Math.min(m.meta, await cache.get(chave)!);
      const ganhos = feito.get(`${m.id}|${periodoDaMissao(m, agora)}`);
      return { ...m, progresso, estado: estadoDaMissao(progresso, m.meta, Boolean(ganhos)), ...(ganhos ? { ganhos } : {}) };
    }),
  );
}

/** Banida pelas regras da comunidade: não resgata nem troca. */
export async function estaBanida(admin: SupabaseClient, uid: string) {
  const { data } = await admin.from('user_bans').select('user_id').eq('user_id', uid).is('revogado_em', null).maybeSingle();
  return Boolean(data);
}
