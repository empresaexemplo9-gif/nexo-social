// Chaves de interesse do perfil, no formato que o feed de Shorts entende:
// "tema:musica", "hobby:cozinhar", "musica:rock", "filme:terror", "livro:poesia".

import type { UserPreferences } from './preferences';

export function chavesDoPerfil(
  p: Pick<UserPreferences, 'interests' | 'hobbies' | 'musicGenres' | 'filmGenres' | 'bookGenres'>,
): string[] {
  return [
    ...(p.interests ?? []).map((t) => `tema:${t}`),
    ...(p.hobbies ?? []).map((h) => `hobby:${h}`),
    ...(p.musicGenres ?? []).map((g) => `musica:${g}`),
    ...(p.filmGenres ?? []).map((g) => `filme:${g}`),
    ...(p.bookGenres ?? []).map((g) => `livro:${g}`),
  ];
}

/** Sem perfil ainda: um feed de partida, variado. */
export const CHAVES_DE_PARTIDA = ['tema:musica', 'tema:esporte', 'tema:gastronomia', 'tema:tecnologia', 'tema:cinema'];
