import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { autores } from './mural';
import type { Autor, Reacao } from './mural-tipos';
import type {
  ComentarioDeLista,
  ItemDeLista,
  ListaCompleta,
  ListaResumo,
  MensagemDaRoda,
  ParticipanteDaRoda,
  RodaCompleta,
  RodaResumo,
  Vinculo,
} from './listas-tipos';

// Listas e rodas no servidor: as consultas passam pela sessão de quem pede,
// então o banco (RLS em db/listas-rodas.sql) já devolve só o que a pessoa
// pode ver. Aqui ficam os nomes, as contagens e o formato das respostas.

/* eslint-disable @typescript-eslint/no-explicit-any */

const autorDe = (mapa: Map<string, Autor>, id: string): Autor => mapa.get(id) ?? { id, nome: 'Alguém', avatarPath: null };

async function nomesDosGrupos(sb: SupabaseClient, ids: string[]) {
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  const mapa = new Map<string, { nome: string; dono: string }>();
  if (!unicos.length) return mapa;
  const { data } = await sb.from('community_groups').select('id, name, owner_id').in('id', unicos);
  for (const g of (data ?? []) as any[]) mapa.set(g.id, { nome: g.name, dono: g.owner_id });
  return mapa;
}

/** Contagem de reações e a minha, por chave. */
function contarReacoes(linhas: any[], chave: (r: any) => string | null, meuId: string) {
  const contas = new Map<string, Partial<Record<Reacao, number>>>();
  const minhas = new Map<string, Reacao>();
  for (const r of linhas) {
    const k = chave(r);
    if (!k) continue;
    const c = contas.get(k) ?? {};
    c[r.reacao as Reacao] = (c[r.reacao as Reacao] ?? 0) + 1;
    contas.set(k, c);
    if (r.user_id === meuId) minhas.set(k, r.reacao);
  }
  return { contas, minhas };
}

/** Linhas de `listas` → cartões, com quantos itens, capas, reações e comentários. */
export async function montarListas(sb: SupabaseClient, linhas: any[], meuId: string): Promise<ListaResumo[]> {
  if (!linhas.length) return [];
  const ids = linhas.map((l) => l.id);
  const [pessoas, grupos, itensR, reacoesR, comentariosR] = await Promise.all([
    autores(sb, linhas.map((l) => l.autor_id)),
    nomesDosGrupos(sb, linhas.map((l) => l.grupo_id)),
    sb.from('lista_itens').select('lista_id, youtube_id, posicao').in('lista_id', ids).order('posicao').limit(5000),
    sb.from('lista_reacoes').select('lista_id, user_id, reacao').in('lista_id', ids).is('item_id', null).limit(5000),
    sb.from('lista_comentarios').select('lista_id').in('lista_id', ids).limit(5000),
  ]);
  const itens = new Map<string, number>();
  const capas = new Map<string, string[]>();
  for (const i of (itensR.data ?? []) as any[]) {
    itens.set(i.lista_id, (itens.get(i.lista_id) ?? 0) + 1);
    if (i.youtube_id) {
      const c = capas.get(i.lista_id) ?? [];
      if (c.length < 4) c.push(i.youtube_id);
      capas.set(i.lista_id, c);
    }
  }
  const { contas, minhas } = contarReacoes((reacoesR.data ?? []) as any[], (r) => r.lista_id, meuId);
  const comentarios = new Map<string, number>();
  for (const c of (comentariosR.data ?? []) as any[]) comentarios.set(c.lista_id, (comentarios.get(c.lista_id) ?? 0) + 1);

  return linhas.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    titulo: l.titulo,
    descricao: l.descricao ?? null,
    visibilidade: l.visibilidade,
    grupo: l.grupo_id ? { id: l.grupo_id, nome: grupos.get(l.grupo_id)?.nome ?? 'Grupo' } : null,
    autor: autorDe(pessoas, l.autor_id),
    itens: itens.get(l.id) ?? 0,
    capas: capas.get(l.id) ?? [],
    reacoes: contas.get(l.id) ?? {},
    minhaReacao: minhas.get(l.id) ?? null,
    comentarios: comentarios.get(l.id) ?? 0,
    atualizadaEm: l.updated_at,
    souAutor: l.autor_id === meuId,
  }));
}

/** A lista inteira: itens (com reações e comentários de cada um) e a conversa da lista. */
export async function montarListaCompleta(sb: SupabaseClient, linha: any, meuId: string): Promise<ListaCompleta> {
  const [[resumo], itensR, reacoesR, comentariosR, grupos] = await Promise.all([
    montarListas(sb, [linha], meuId),
    sb.from('lista_itens').select('id, posicao, titulo, subtitulo, youtube_id, url, nota').eq('lista_id', linha.id).order('posicao').order('created_at'),
    sb.from('lista_reacoes').select('item_id, user_id, reacao').eq('lista_id', linha.id).not('item_id', 'is', null).limit(5000),
    sb.from('lista_comentarios').select('id, item_id, autor_id, corpo, created_at').eq('lista_id', linha.id).order('created_at').limit(1000),
    nomesDosGrupos(sb, [linha.grupo_id]),
  ]);
  const comentarios = (comentariosR.data ?? []) as any[];
  const pessoas = await autores(sb, comentarios.map((c) => c.autor_id));
  const { contas, minhas } = contarReacoes((reacoesR.data ?? []) as any[], (r) => r.item_id, meuId);
  const porItem = new Map<string, number>();
  for (const c of comentarios) if (c.item_id) porItem.set(c.item_id, (porItem.get(c.item_id) ?? 0) + 1);
  const souAutor = linha.autor_id === meuId;

  const itensDaLista: ItemDeLista[] = ((itensR.data ?? []) as any[]).map((i) => ({
    id: i.id,
    posicao: i.posicao,
    titulo: i.titulo,
    subtitulo: i.subtitulo ?? null,
    youtubeId: i.youtube_id ?? null,
    url: i.url ?? null,
    nota: i.nota ?? null,
    reacoes: contas.get(i.id) ?? {},
    minhaReacao: minhas.get(i.id) ?? null,
    comentarios: porItem.get(i.id) ?? 0,
  }));
  const comentariosDaLista: ComentarioDeLista[] = comentarios.map((c) => ({
    id: c.id,
    itemId: c.item_id ?? null,
    autor: autorDe(pessoas, c.autor_id),
    corpo: c.corpo,
    criadoEm: c.created_at,
    podeApagar: c.autor_id === meuId || souAutor,
  }));
  const dono = linha.grupo_id ? grupos.get(linha.grupo_id)?.dono : undefined;
  return { ...resumo, itensDaLista, comentariosDaLista, podeApagar: souAutor || dono === meuId };
}

/** Linhas de `rodas` → cartões, com quem está nelas. */
export async function montarRodas(sb: SupabaseClient, linhas: any[], meuId: string): Promise<RodaResumo[]> {
  if (!linhas.length) return [];
  const ids = linhas.map((r) => r.id);
  const { data } = await sb.from('roda_participantes').select('roda_id, user_id, entrou_em').in('roda_id', ids).order('entrou_em').limit(5000);
  const part = (data ?? []) as any[];
  const [pessoas, grupos] = await Promise.all([
    autores(sb, [...linhas.map((r) => r.criador_id), ...part.map((p) => p.user_id)]),
    nomesDosGrupos(sb, linhas.map((r) => r.grupo_id)),
  ]);
  return linhas.map((r) => {
    const daRoda = part.filter((p) => p.roda_id === r.id);
    return {
      id: r.id,
      tema: r.tema,
      descricao: r.descricao ?? null,
      assuntoTipo: r.assunto_tipo ?? null,
      visibilidade: r.visibilidade,
      grupo: r.grupo_id ? { id: r.grupo_id, nome: grupos.get(r.grupo_id)?.nome ?? 'Grupo' } : null,
      criador: autorDe(pessoas, r.criador_id),
      aberta: Boolean(r.aberta),
      participantes: daRoda.length,
      rostos: daRoda.slice(0, 5).map((p) => autorDe(pessoas, p.user_id)),
      participo: daRoda.some((p) => p.user_id === meuId),
      souCriador: r.criador_id === meuId,
      ultimaAtividade: r.ultima_atividade,
      encerradaEm: r.encerrada_em ?? null,
    };
  });
}

/** O vínculo de quem pede com cada pessoa (para "Adicionar aos contatos"). */
export async function vinculos(sb: SupabaseClient, meuId: string): Promise<Map<string, { vinculo: Vinculo; conexaoId: string }>> {
  const { data } = await sb
    .from('connections')
    .select('id, user_id, contact_id, status')
    .or(`user_id.eq.${meuId},contact_id.eq.${meuId}`);
  const mapa = new Map<string, { vinculo: Vinculo; conexaoId: string }>();
  for (const c of (data ?? []) as any[]) {
    const outro = c.user_id === meuId ? c.contact_id : c.user_id;
    const vinculo: Vinculo = c.status === 'aceito' ? 'aceito' : c.user_id === meuId ? 'enviado' : 'recebido';
    // Aceito vale mais que um pedido pendente que tenha sobrado.
    if (!mapa.has(outro) || vinculo === 'aceito') mapa.set(outro, { vinculo, conexaoId: c.id });
  }
  return mapa;
}

/** A roda inteira: quem está (com o vínculo de cada um) e a conversa, para quem participa. */
export async function montarRodaCompleta(sb: SupabaseClient, linha: any, meuId: string): Promise<RodaCompleta> {
  const [[resumo], partR, msgR, meus] = await Promise.all([
    montarRodas(sb, [linha], meuId),
    sb.from('roda_participantes').select('user_id, entrou_em').eq('roda_id', linha.id).order('entrou_em'),
    // O banco só devolve as mensagens a quem está na roda (e só com ela aberta, que fechada não tem mais nenhuma).
    sb.from('roda_mensagens').select('id, autor_id, corpo, created_at').eq('roda_id', linha.id).order('created_at').limit(500),
    vinculos(sb, meuId),
  ]);
  const part = (partR.data ?? []) as any[];
  const msgs = (msgR.data ?? []) as any[];
  const pessoas = await autores(sb, [...part.map((p) => p.user_id), ...msgs.map((m) => m.autor_id)]);
  const pessoasDaRoda: ParticipanteDaRoda[] = part.map((p) => {
    const v = p.user_id === meuId ? { vinculo: 'eu' as Vinculo, conexaoId: null } : meus.get(p.user_id) ?? { vinculo: 'nenhum' as Vinculo, conexaoId: null };
    return { ...autorDe(pessoas, p.user_id), vinculo: v.vinculo, conexaoId: v.conexaoId };
  });
  const mensagens: MensagemDaRoda[] = msgs.map((m) => ({
    id: m.id,
    autor: autorDe(pessoas, m.autor_id),
    corpo: m.corpo,
    criadaEm: m.created_at,
    minha: m.autor_id === meuId,
  }));
  return { ...resumo, pessoas: pessoasDaRoda, mensagens };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
