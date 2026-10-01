import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Autor, Opiniao, Publicacao, Reacao } from './mural-tipos';

// Mural no servidor: as consultas passam pela sessão de quem pede, então o
// banco (RLS em db/social.sql) já devolve só o que a pessoa pode ver. Aqui
// ficam os nomes, os grupos, as contagens e o formato das respostas.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Nome e foto de quem aparece (os perfis têm RLS por conta; a função devolve só isso). */
export async function autores(sb: SupabaseClient, ids: string[]): Promise<Map<string, Autor>> {
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  const mapa = new Map<string, Autor>();
  if (!unicos.length) return mapa;
  const { data } = await sb.rpc('perfis_basicos', { p_ids: unicos });
  for (const p of (data ?? []) as any[]) mapa.set(p.id, { id: p.id, nome: p.nome || 'Alguém', avatarPath: p.avatar_path ?? null });
  return mapa;
}

const autorDe = (mapa: Map<string, Autor>, id: string): Autor => mapa.get(id) ?? { id, nome: 'Alguém', avatarPath: null };

/** Linhas de `publicacoes` → publicações para a tela, com tudo o que o cartão mostra. */
export async function montarPublicacoes(sb: SupabaseClient, linhas: any[], meuId: string): Promise<Publicacao[]> {
  if (!linhas.length) return [];
  const ids = linhas.map((l) => l.id);
  const grupos = Array.from(new Set(linhas.map((l) => l.grupo_id).filter(Boolean)));
  const [pessoas, gruposR, opinioesR, reacoesR] = await Promise.all([
    autores(sb, linhas.map((l) => l.autor_id)),
    grupos.length ? sb.from('community_groups').select('id, name, owner_id').in('id', grupos) : Promise.resolve({ data: [] as any[] }),
    sb.from('publicacao_comentarios').select('publicacao_id').in('publicacao_id', ids).limit(5000),
    sb.from('publicacao_reacoes').select('publicacao_id, user_id, reacao').in('publicacao_id', ids).limit(5000),
  ]);
  const nomeDoGrupo = new Map<string, { nome: string; dono: string }>();
  for (const g of (gruposR.data ?? []) as any[]) nomeDoGrupo.set(g.id, { nome: g.name, dono: g.owner_id });
  const opinioes = new Map<string, number>();
  for (const o of (opinioesR.data ?? []) as any[]) opinioes.set(o.publicacao_id, (opinioes.get(o.publicacao_id) ?? 0) + 1);
  const reacoes = new Map<string, Partial<Record<Reacao, number>>>();
  const minhas = new Map<string, Reacao>();
  for (const r of (reacoesR.data ?? []) as any[]) {
    const conta = reacoes.get(r.publicacao_id) ?? {};
    conta[r.reacao as Reacao] = (conta[r.reacao as Reacao] ?? 0) + 1;
    reacoes.set(r.publicacao_id, conta);
    if (r.user_id === meuId) minhas.set(r.publicacao_id, r.reacao);
  }
  return linhas.map((l) => {
    const grupo = l.grupo_id ? nomeDoGrupo.get(l.grupo_id) : undefined;
    const souAutor = l.autor_id === meuId;
    return {
      id: l.id,
      tipo: l.tipo,
      titulo: l.titulo ?? null,
      corpo: l.corpo ?? null,
      assunto: l.assunto ?? null,
      assuntoTipo: l.assunto_tipo ?? null,
      nota: l.nota ?? null,
      tema: l.tema ?? null,
      youtubeId: l.youtube_id ?? null,
      url: l.url ?? null,
      visibilidade: l.visibilidade,
      grupo: l.grupo_id ? { id: l.grupo_id, nome: grupo?.nome ?? 'Grupo' } : null,
      autor: autorDe(pessoas, l.autor_id),
      criadaEm: l.created_at,
      editadaEm: l.updated_at ?? null,
      opinioes: opinioes.get(l.id) ?? 0,
      reacoes: reacoes.get(l.id) ?? {},
      minhaReacao: minhas.get(l.id) ?? null,
      souAutor,
      podeApagar: souAutor || (grupo?.dono === meuId),
    } satisfies Publicacao;
  });
}

/** As opiniões de uma publicação, da mais antiga à mais nova. */
export async function opinioesDa(sb: SupabaseClient, publicacao: { id: string; autor_id: string }, meuId: string): Promise<Opiniao[]> {
  const { data } = await sb
    .from('publicacao_comentarios')
    .select('id, autor_id, corpo, resposta_a, created_at')
    .eq('publicacao_id', publicacao.id)
    .order('created_at')
    .limit(500);
  const linhas = (data ?? []) as any[];
  const pessoas = await autores(sb, linhas.map((l) => l.autor_id));
  return linhas.map((l) => ({
    id: l.id,
    autor: autorDe(pessoas, l.autor_id),
    corpo: l.corpo,
    respostaA: l.resposta_a ?? null,
    criadaEm: l.created_at,
    podeApagar: l.autor_id === meuId || publicacao.autor_id === meuId,
  }));
}

/** Ids dos contatos aceitos de quem pede (para o filtro "Contatos"). */
export async function idsDosContatos(sb: SupabaseClient, meuId: string): Promise<string[]> {
  const { data } = await sb
    .from('connections')
    .select('user_id, contact_id')
    .eq('status', 'aceito')
    .or(`user_id.eq.${meuId},contact_id.eq.${meuId}`);
  return ((data ?? []) as any[]).map((c) => (c.user_id === meuId ? c.contact_id : c.user_id));
}

/* eslint-enable @typescript-eslint/no-explicit-any */
