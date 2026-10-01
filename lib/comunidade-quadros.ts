// Tema da Comunidade: os quadros dos murais da marca (public/bg/comunidade).
// Cada aba e cada opção da Comunidade tem um quadro — a imagem (capa e
// miniatura) e o estilo de botão, moldura e faixa que vêm dele (app/globals.css,
// seletor [data-quadro]). Vale no servidor e no navegador.

import type { AssuntoTipo, TipoPublicacao } from './mural-tipos';
import type { TipoLista } from './listas-tipos';

export type Quadro =
  | 'lambe'
  | 'recorte'
  | 'selo'
  | 'halftone'
  | 'skyline'
  | 'palco'
  | 'estatua'
  | 'holo'
  | 'holo-d'
  | 'listras'
  | 'placa'
  | 'sinal'
  | 'grafite'
  | 'laranja'
  | 'metro'
  | 'pincel';

/** Capa do quadro (o recorte do mural). */
export const capaDoQuadro = (q: Quadro) => `/bg/comunidade/quadros/${q}.webp`;
/** Miniatura quadrada (vira o selinho redondo dos botões e etiquetas). */
export const miniDoQuadro = (q: Quadro) => `/bg/comunidade/quadros/${q}-mini.webp`;

export type AbaDaComunidade = 'mural' | 'listas' | 'rodas' | 'grupos' | 'jogos';

/** O quadro e a capa de cada aba. */
export const ABAS_DA_COMUNIDADE: Record<AbaDaComunidade, { quadro: Quadro; rotulo: string; titulo: string; texto: string }> = {
  mural: {
    quadro: 'lambe',
    rotulo: 'Mural',
    titulo: 'O que está rolando',
    texto: 'Conversas, opiniões, resenhas e experiências coladas no muro de todo mundo.',
  },
  listas: {
    quadro: 'holo',
    rotulo: 'Listas',
    titulo: 'Seleções da comunidade',
    texto: 'Playlists, livros, filmes, séries e jogos — com retorno em cada item e na seleção inteira.',
  },
  rodas: {
    quadro: 'grafite',
    rotulo: 'Rodas',
    titulo: 'Rodas de conversa',
    texto: 'Papo ao vivo que some quando acaba. No fim, quem quiser vira contato.',
  },
  grupos: {
    quadro: 'metro',
    rotulo: 'Grupos',
    titulo: 'Seus grupos',
    texto: 'Fotos, chat, chamadas e a sala para ouvir e assistir junto, no mesmo segundo.',
  },
  jogos: {
    quadro: 'sinal',
    rotulo: 'Jogos',
    titulo: 'Jogos da comunidade',
    texto: 'Partidas com quem está nos seus grupos.',
  },
};

/** Cada tipo de publicação do mural, com o seu quadro. */
export const QUADRO_DA_PUBLICACAO: Record<TipoPublicacao, Quadro> = {
  conversa: 'selo',
  pergunta: 'halftone',
  resenha: 'recorte',
  experiencia: 'skyline',
  video: 'palco',
  livro: 'estatua',
};

/** Cada tipo de lista, com o seu quadro. */
export const QUADRO_DA_LISTA: Record<TipoLista, Quadro> = {
  musicas: 'holo-d',
  clipes: 'palco',
  livros: 'estatua',
  filmes: 'listras',
  series: 'placa',
  jogos: 'sinal',
  mista: 'grafite',
};

/** O assunto de uma roda de conversa (ou de uma resenha), com o seu quadro. */
export function quadroDoAssunto(a: AssuntoTipo | null | undefined): Quadro {
  switch (a) {
    case 'livro':
      return 'estatua';
    case 'show':
      return 'palco';
    case 'musica':
      return 'holo-d';
    case 'filme':
      return 'listras';
    case 'serie':
      return 'placa';
    case 'jogo':
      return 'sinal';
    case 'esporte':
      return 'laranja';
    case 'evento':
    case 'lugar':
      return 'skyline';
    default:
      return 'grafite';
  }
}
