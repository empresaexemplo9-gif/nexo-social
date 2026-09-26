import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSession } from './api-helpers';
import { isUuid } from './social';
import type { Foto, GrupoResumo, Membro } from './comunidade-tipos';

// Acesso da Comunidade no servidor. As regras de quem vê e quem mexe estão no
// banco (RLS e funções em db/schema.sql); aqui ficam a sessão, o formato das
// respostas e as mensagens de erro em português.

/* eslint-disable @typescript-eslint/no-explicit-any */

type Sessao = { ok: true; sb: SupabaseClient; user: User } | { ok: false; response: NextResponse };

export async function exigirSessao(): Promise<Sessao> {
  const { sb, user } = await getSession();
  if (!sb) return { ok: false, response: NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 }) };
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Entre na sua conta para usar a Comunidade.' }, { status: 401 }) };
  return { ok: true, sb, user };
}

export function idInvalido(id: string) {
  return isUuid(id) ? null : NextResponse.json({ error: 'Grupo inválido.' }, { status: 400 });
}

/** Erro do Postgres/RPC → resposta. `RAISE EXCEPTION` das funções já vem em português. */
export function falha(error: { message?: string; code?: string } | null, padrao: string) {
  const msg = error?.message || padrao;
  // 42501 = RLS/permissão; P0001 = RAISE EXCEPTION das funções.
  const status = error?.code === '42501' ? 403 : error?.code === 'P0001' ? 400 : 500;
  return NextResponse.json({ error: status === 403 ? 'Você não participa deste grupo.' : msg }, { status });
}

export function grupoResumo(r: any): GrupoResumo {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    privacy: r.privacy === 'aberto' ? 'aberto' : 'fechado',
    imagePath: r.image_path ?? null,
    ownerId: r.owner_id,
    ownerName: r.owner_name ?? 'Alguém',
    myRole: r.my_role === 'dono' ? 'dono' : 'membro',
    myStatus: r.my_status === 'convidado' ? 'convidado' : 'ativo',
    invitedByName: r.invited_by_name ?? null,
    memberCount: Number(r.member_count) || 0,
    postCount: Number(r.post_count) || 0,
    playingTitle: r.playing_title ?? null,
    lastActivity: r.last_activity ?? null,
    createdAt: r.created_at,
  };
}

export async function membrosDoGrupo(sb: SupabaseClient, groupId: string): Promise<Membro[]> {
  const { data, error } = await sb.rpc('community_group_members', { p_group: groupId });
  if (error) throw error;
  return (data ?? []).map((m: any) => ({
    userId: m.user_id,
    name: m.name,
    avatarPath: m.avatar_path ?? null,
    role: m.role === 'dono' ? 'dono' : 'membro',
    status: m.status === 'convidado' ? 'convidado' : 'ativo',
    invitedByName: m.invited_by_name ?? null,
    joinedAt: m.joined_at ?? null,
  }));
}

/** A minha linha no grupo (o RLS sempre deixa ver a própria). */
export async function minhaParticipacao(sb: SupabaseClient, groupId: string, userId: string) {
  const { data } = await sb
    .from('community_members')
    .select('role, status')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return data as { role: 'dono' | 'membro'; status: 'ativo' | 'convidado' | 'recusado' } | null;
}

/** Validade dos links das fotos (bucket privado): o mural fica aberto por horas. */
const VALIDADE_LINK = 12 * 3600;

/** Linhas de community_photos → fotos com links assinados (uma chamada só). */
export async function fotosDasLinhas(
  sb: SupabaseClient,
  rows: any[],
  ctx: { nomes: Map<string, string>; meuId: string; souDono: boolean },
): Promise<Foto[]> {
  if (!rows.length) return [];
  const caminhos = Array.from(new Set(rows.flatMap((r) => [r.storage_path, r.thumb_path]).filter(Boolean)));
  const links = new Map<string, string>();
  const { data } = await sb.storage.from('comunidade').createSignedUrls(caminhos, VALIDADE_LINK);
  for (const d of data ?? []) if (d.path && d.signedUrl) links.set(d.path, d.signedUrl);
  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    albumId: r.album_id ?? null,
    url: links.get(r.storage_path) ?? null,
    thumbUrl: links.get(r.thumb_path) ?? links.get(r.storage_path) ?? null,
    width: r.width ?? null,
    height: r.height ?? null,
    uploaderId: r.uploader_id,
    uploaderName: ctx.nomes.get(r.uploader_id) ?? 'Ex-membro',
    createdAt: r.created_at,
    podeApagar: ctx.souDono || r.uploader_id === ctx.meuId,
  }));
}

/** Arquivos das fotos (imagem + miniatura), para apagar do Storage. */
export const arquivosDasFotos = (rows: { storage_path: string; thumb_path: string | null }[]) =>
  rows.flatMap((r) => [r.storage_path, r.thumb_path]).filter((p): p is string => Boolean(p));

/** Tudo o que está na pasta do grupo num bucket (o Storage lista por pasta). */
export async function arquivosDaPasta(sb: SupabaseClient, bucket: string, pasta: string): Promise<string[]> {
  const saida: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(bucket).list(pasta, { limit: 1000, offset });
    if (error || !data?.length) break;
    saida.push(...data.filter((o) => o.id).map((o) => `${pasta}/${o.name}`));
    if (data.length < 1000) break;
  }
  return saida;
}

/** Texto do usuário: corta espaços e o excesso, e vazio vira null. */
export function texto(v: unknown, max: number): string | null {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
