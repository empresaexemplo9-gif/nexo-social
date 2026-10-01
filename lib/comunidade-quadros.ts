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
  | 'pincel'
  // Dos murais de cultura, histórias e movimento:
  | 'brasil'
  | 'mundo'
  | 'futebol'
  | 'violao'
  | 'anime'
  | 'faroeste'
  | 'cyber'
  | 'f1'
  | 'fantasia'
  | 'oxford'
  | 'paraquedas'
  | 'xadrez'
  | 'festa';

/** Todos os quadros (cada um tem imagem, miniatura e estilo próprios). */
export const QUADROS: Quadro[] = [
  'lambe', 'recorte', 'selo', 'halftone', 'skyline', 'palco', 'estatua', 'holo', 'holo-d', 'listras', 'placa', 'sinal',
  'grafite', 'laranja', 'metro', 'pincel', 'brasil', 'mundo', 'futebol', 'violao', 'anime', 'faroeste', 'cyber', 'f1',
  'fantasia', 'oxford', 'paraquedas', 'xadrez', 'festa',
];

/** Capa do quadro (o recorte do mural). */
export const capaDoQuadro = (q: Quadro) => `/bg/comunidade/quadros/${q}.webp`;
/** Miniatura quadrada (vira o selinho redondo dos botões e etiquetas). */
export const miniDoQuadro = (q: Quadro) => `/bg/comunidade/quadros/${q}-mini.webp`;

export type AbaDaComunidade = 'mural' | 'listas' | 'rodas' | 'grupos' | 'jogos';

/**
 * O muro do fundo de cada aba (public/bg/comunidade/parede-*.webp; o CSS
 * troca pelo [data-aba] da página): o mural de mundo, moda e futebol no Mural;
 * o de histórias (anime, faroeste, ficção, Oxford) nas Listas; o de amizade,
 * música e adrenalina nas Rodas; o da marca nos Grupos; e, nos Jogos, tiras
 * de estratégia, velocidade e esporte.
 */
export const PAREDE_DA_ABA: Record<AbaDaComunidade, string> = {
  mural: 'parede-mural',
  listas: 'parede-listas',
  rodas: 'parede-rodas',
  grupos: 'parede',
  jogos: 'parede-jogos',
};

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
  experiencia: 'paraquedas',
  video: 'cyber',
  livro: 'estatua',
};

/** Cada tipo de lista, com o seu quadro. */
export const QUADRO_DA_LISTA: Record<TipoLista, Quadro> = {
  musicas: 'festa',
  clipes: 'palco',
  livros: 'oxford',
  filmes: 'faroeste',
  series: 'anime',
  jogos: 'f1',
  mista: 'fantasia',
};

/** O assunto de uma roda de conversa (ou de uma resenha), com o seu quadro. */
export function quadroDoAssunto(a: AssuntoTipo | null | undefined): Quadro {
  switch (a) {
    case 'livro':
      return 'oxford';
    case 'show':
      return 'festa';
    case 'musica':
      return 'violao';
    case 'filme':
      return 'listras';
    case 'serie':
      return 'placa';
    case 'jogo':
      return 'xadrez';
    case 'esporte':
      return 'futebol';
    case 'evento':
      return 'brasil';
    case 'lugar':
      return 'mundo';
    default:
      return 'grafite';
  }
}
