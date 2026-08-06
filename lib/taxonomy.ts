// Taxonomia de gostos usada no questionário e nas indicações.
// Separada de lib/data.ts porque descreve PREFERÊNCIAS do usuário (gêneros),
// não o catálogo da plataforma (temas, conteúdos e eventos).

import type { IconName } from '@/components/icons';

export interface GenreOption {
  id: string;
  label: string;
  /** Termo usado nas buscas externas (Spotify, livrarias, streaming). */
  query: string;
}

/** Gêneros musicais — `query` casa com os gêneros que o Spotify reconhece. */
export const MUSIC_GENRES: GenreOption[] = [
  { id: 'mpb', label: 'MPB', query: 'mpb' },
  { id: 'samba', label: 'Samba & Pagode', query: 'samba' },
  { id: 'sertanejo', label: 'Sertanejo', query: 'sertanejo' },
  { id: 'forro', label: 'Forró', query: 'forro' },
  { id: 'funk', label: 'Funk', query: 'funk carioca' },
  { id: 'rap', label: 'Rap & Hip-Hop', query: 'hip hop' },
  { id: 'rock', label: 'Rock', query: 'rock' },
  { id: 'indie', label: 'Indie', query: 'indie' },
  { id: 'pop', label: 'Pop', query: 'pop' },
  { id: 'eletronica', label: 'Eletrônica', query: 'electronic' },
  { id: 'jazz', label: 'Jazz', query: 'jazz' },
  { id: 'blues', label: 'Blues', query: 'blues' },
  { id: 'classica', label: 'Clássica', query: 'classical' },
  { id: 'reggae', label: 'Reggae', query: 'reggae' },
  { id: 'metal', label: 'Metal', query: 'metal' },
  { id: 'gospel', label: 'Gospel', query: 'gospel' },
  { id: 'kpop', label: 'K-Pop', query: 'k-pop' },
  { id: 'lofi', label: 'Lo-fi & Foco', query: 'lo-fi' },
];

/** Gêneros de cinema e séries. */
export const FILM_GENRES: GenreOption[] = [
  { id: 'acao', label: 'Ação', query: 'ação' },
  { id: 'comedia', label: 'Comédia', query: 'comédia' },
  { id: 'drama', label: 'Drama', query: 'drama' },
  { id: 'ficcao', label: 'Ficção científica', query: 'ficção científica' },
  { id: 'terror', label: 'Terror', query: 'terror' },
  { id: 'suspense', label: 'Suspense', query: 'suspense' },
  { id: 'documentario', label: 'Documentário', query: 'documentário' },
  { id: 'animacao', label: 'Animação', query: 'animação' },
  { id: 'romance-cine', label: 'Romance', query: 'romance' },
  { id: 'fantasia-cine', label: 'Fantasia', query: 'fantasia' },
  { id: 'nacional', label: 'Cinema nacional', query: 'cinema brasileiro' },
  { id: 'classicos', label: 'Clássicos', query: 'clássicos do cinema' },
];

/** Gêneros literários. */
export const BOOK_GENRES: GenreOption[] = [
  { id: 'ficcao-lit', label: 'Ficção', query: 'ficção' },
  { id: 'fantasia-lit', label: 'Fantasia', query: 'fantasia' },
  { id: 'policial', label: 'Policial & Mistério', query: 'policial mistério' },
  { id: 'biografia', label: 'Biografia', query: 'biografia' },
  { id: 'historia', label: 'História', query: 'história' },
  { id: 'negocios', label: 'Negócios', query: 'negócios' },
  { id: 'autoajuda', label: 'Desenvolvimento pessoal', query: 'desenvolvimento pessoal' },
  { id: 'ciencia', label: 'Ciência', query: 'divulgação científica' },
  { id: 'poesia', label: 'Poesia', query: 'poesia' },
  { id: 'tecnico', label: 'Técnico', query: 'tecnologia programação' },
  { id: 'romance-lit', label: 'Romance', query: 'romance literário' },
  { id: 'quadrinhos', label: 'Quadrinhos', query: 'graphic novel' },
];

/** Hobbies — usados para afinar as indicações e sugerir eventos. */
export interface HobbyOption {
  id: string;
  label: string;
  icon: IconName;
}

export const HOBBIES: HobbyOption[] = [
  { id: 'cozinhar', label: 'Cozinhar', icon: 'leaf' },
  { id: 'correr', label: 'Correr', icon: 'activity' },
  { id: 'pedalar', label: 'Pedalar', icon: 'activity' },
  { id: 'fotografar', label: 'Fotografar', icon: 'video' },
  { id: 'tocar', label: 'Tocar um instrumento', icon: 'music' },
  { id: 'ler', label: 'Ler', icon: 'book' },
  { id: 'jogar', label: 'Games', icon: 'gamepad' },
  { id: 'viajar', label: 'Viajar', icon: 'compass' },
  { id: 'desenhar', label: 'Desenhar & pintar', icon: 'palette' },
  { id: 'jardinagem', label: 'Plantas', icon: 'leaf' },
  { id: 'colecionar', label: 'Colecionar', icon: 'bookmark' },
  { id: 'voluntariado', label: 'Voluntariado', icon: 'user' },
];

export function genreLabel(list: GenreOption[], id: string): string {
  return list.find((g) => g.id === id)?.label ?? id;
}

export function genreQueries(list: GenreOption[], ids: string[]): string[] {
  return ids.map((id) => list.find((g) => g.id === id)?.query).filter(Boolean) as string[];
}
