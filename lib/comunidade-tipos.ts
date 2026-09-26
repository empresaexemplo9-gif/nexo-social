// Tipos e utilidades da Comunidade usados no servidor E no navegador (sem
// 'server-only'): grupos, membros, mural e a sala sincronizada.

export type TipoPost = 'recado' | 'foto' | 'livro' | 'musica' | 'clipe' | 'filme' | 'link';

/** Fechado: só o dono convida. Aberto: qualquer membro convida. */
export type Privacidade = 'aberto' | 'fechado';

export const TIPOS_POST: {
  id: TipoPost;
  rotulo: string;
  icone: 'chat' | 'image' | 'book' | 'music' | 'video' | 'film' | 'link';
  titulo?: string;
  subtitulo?: string;
  url?: string;
}[] = [
  { id: 'recado', rotulo: 'Recado', icone: 'chat' },
  { id: 'foto', rotulo: 'Fotos', icone: 'image' },
  { id: 'livro', rotulo: 'Livro', icone: 'book', titulo: 'Título do livro', subtitulo: 'Autor(a)', url: 'Link (opcional)' },
  { id: 'musica', rotulo: 'Música', icone: 'music', titulo: 'Nome da música', subtitulo: 'Artista', url: 'Link do YouTube (opcional)' },
  { id: 'clipe', rotulo: 'Clipe / vídeo', icone: 'video', titulo: 'Nome do clipe ou vídeo', subtitulo: 'Artista ou canal', url: 'Link do YouTube (opcional)' },
  { id: 'filme', rotulo: 'Filme / série', icone: 'film', titulo: 'Título do filme ou série', subtitulo: 'Direção, ano ou plataforma', url: 'Link (opcional)' },
  { id: 'link', rotulo: 'Link', icone: 'link', titulo: 'Sobre o que é o link', url: 'Endereço (https://…)' },
];

export const ehTipoPost = (v: unknown): v is TipoPost => TIPOS_POST.some((t) => t.id === v);

export interface GrupoResumo {
  id: string;
  name: string;
  description: string | null;
  privacy: Privacidade;
  /** Caminho no bucket público "perfis" (ver urlPublica). */
  imagePath: string | null;
  ownerId: string;
  ownerName: string;
  myRole: 'dono' | 'membro';
  myStatus: 'ativo' | 'convidado';
  invitedByName: string | null;
  memberCount: number;
  postCount: number;
  /** O que a sala está tocando agora, se estiver. */
  playingTitle: string | null;
  lastActivity: string | null;
  createdAt: string;
}

export interface Membro {
  userId: string;
  name: string;
  avatarPath: string | null;
  role: 'dono' | 'membro';
  status: 'ativo' | 'convidado';
  invitedByName: string | null;
  joinedAt: string | null;
}

export interface Post {
  id: string;
  kind: TipoPost;
  title: string | null;
  subtitle: string | null;
  url: string | null;
  body: string | null;
  youtubeId: string | null;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  podeApagar: boolean;
  /** Só nas publicações do tipo 'foto'. */
  fotos: Foto[];
}

export interface Foto {
  id: string;
  postId: string;
  albumId: string | null;
  /** Links assinados (o bucket é privado) — valem algumas horas. */
  url: string | null;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
  podeApagar: boolean;
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdByName: string;
  photoCount: number;
  coverUrl: string | null;
  createdAt: string;
  podeEditar: boolean;
}

/** A sala: o que toca para o grupo inteiro, e em que segundo. */
export interface Sala {
  youtubeId: string | null;
  title: string | null;
  kind: 'musica' | 'clipe';
  isPlaying: boolean;
  /** Posição no instante `updatedAt` (relógio do servidor). */
  positionSec: number;
  updatedAt: string;
  updatedBy: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function salaDaLinha(r: any): Sala | null {
  if (!r) return null;
  return {
    youtubeId: r.youtube_id ?? null,
    title: r.title ?? null,
    kind: r.kind === 'musica' ? 'musica' : 'clipe',
    isPlaying: Boolean(r.is_playing),
    positionSec: Number(r.position_sec) || 0,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Id de um vídeo do YouTube a partir de qualquer formato de link. */
export function youtubeIdDe(url?: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/.*[?&]v=([\w-]{11})/) ||
    url.match(/^https?:\/\/youtu\.be\/([\w-]{11})/) ||
    url.match(/^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([\w-]{11})/);
  return m ? m[1] : null;
}

/** Caminho do convite por link (o domínio entra no navegador). */
export const caminhoDoConvite = (token: string) => `/comunidade/convite/${token}`;
