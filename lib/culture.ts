// Indicações de livros e filmes a partir dos gêneros do questionário.
//
// Sem API paga: montamos buscas nas plataformas onde o usuário efetivamente
// consome (streaming, livrarias, catálogos abertos). Assim a indicação leva a
// um resultado real, sem depender de credencial nem de curadoria manual.

import { BOOK_GENRES, FILM_GENRES, genreLabel } from './taxonomy';

const q = (s: string) => encodeURIComponent(s.trim());

export interface CultureLink {
  label: string;
  url: string;
}

export interface CulturePick {
  genre: string;
  label: string;
  links: CultureLink[];
}

/** Onde assistir / descobrir filmes do gênero. */
export function filmPicks(genreIds: string[]): CulturePick[] {
  const ids = genreIds.length ? genreIds : ['drama', 'documentario'];
  return ids.slice(0, 4).map((id) => {
    const label = genreLabel(FILM_GENRES, id);
    const term = FILM_GENRES.find((g) => g.id === id)?.query ?? label;
    return {
      genre: id,
      label,
      links: [
        { label: 'JustWatch', url: `https://www.justwatch.com/br/busca?q=${q(term)}` },
        { label: 'Letterboxd', url: `https://letterboxd.com/search/${q(term)}/` },
        { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${q(`${term} filme completo legendado`)}` },
      ],
    };
  });
}

/** Onde ler / comprar livros do gênero. */
export function bookPicks(genreIds: string[]): CulturePick[] {
  const ids = genreIds.length ? genreIds : ['ficcao-lit', 'biografia'];
  return ids.slice(0, 4).map((id) => {
    const label = genreLabel(BOOK_GENRES, id);
    const term = BOOK_GENRES.find((g) => g.id === id)?.query ?? label;
    return {
      genre: id,
      label,
      links: [
        { label: 'Open Library', url: `https://openlibrary.org/search?q=${q(term)}` },
        { label: 'Skoob', url: `https://www.skoob.com.br/livro/lista/busca:${q(term)}` },
        { label: 'Domínio público', url: `https://www.dominiopublico.gov.br/pesquisa/PesquisaObraForm.jsp` },
      ],
    };
  });
}
