// Listas compartilhadas e rodas de conversa: tipos e rótulos usados no
// servidor E no navegador (sem 'server-only'). Quem vê e quem mexe fica no
// banco (db/listas-rodas.sql).

import type { IconName } from '@/components/icons';
import type { AssuntoTipo, Autor, Reacao, Visibilidade } from './mural-tipos';

export type TipoLista = 'musicas' | 'clipes' | 'livros' | 'filmes' | 'series' | 'jogos' | 'mista';

export const TIPOS_LISTA: {
  id: TipoLista;
  rotulo: string;
  icone: IconName;
  /** O que se pede ao pôr um item. */
  titulo: string;
  subtitulo: string;
  /** O item costuma ter vídeo do YouTube (toca aqui dentro). */
  video?: boolean;
}[] = [
  { id: 'musicas', rotulo: 'Músicas', icone: 'music', titulo: 'Nome da música', subtitulo: 'Artista', video: true },
  { id: 'clipes', rotulo: 'Clipes', icone: 'video', titulo: 'Nome do clipe', subtitulo: 'Artista', video: true },
  { id: 'livros', rotulo: 'Livros', icone: 'book', titulo: 'Título do livro', subtitulo: 'Autor(a)' },
  { id: 'filmes', rotulo: 'Filmes', icone: 'film', titulo: 'Nome do filme', subtitulo: 'Direção ou ano' },
  { id: 'series', rotulo: 'Séries', icone: 'play', titulo: 'Nome da série', subtitulo: 'Onde assistir' },
  { id: 'jogos', rotulo: 'Jogos', icone: 'gamepad', titulo: 'Nome do jogo', subtitulo: 'Plataforma' },
  { id: 'mista', rotulo: 'De tudo um pouco', icone: 'sparkles', titulo: 'O que é', subtitulo: 'De quem / onde' },
];

export const ehTipoLista = (v: unknown): v is TipoLista => TIPOS_LISTA.some((t) => t.id === v);
export const tipoDaLista = (id: TipoLista) => TIPOS_LISTA.find((t) => t.id === id) ?? TIPOS_LISTA[TIPOS_LISTA.length - 1];

/** A lista no cartão (sugestões, minhas listas, busca). */
export interface ListaResumo {
  id: string;
  tipo: TipoLista;
  titulo: string;
  descricao: string | null;
  visibilidade: Visibilidade;
  grupo: { id: string; nome: string } | null;
  autor: Autor;
  itens: number;
  /** Até 4 vídeos para a capa em mosaico. */
  capas: string[];
  reacoes: Partial<Record<Reacao, number>>;
  minhaReacao: Reacao | null;
  comentarios: number;
  atualizadaEm: string;
  souAutor: boolean;
}

export interface ItemDeLista {
  id: string;
  posicao: number;
  titulo: string;
  subtitulo: string | null;
  youtubeId: string | null;
  url: string | null;
  nota: string | null;
  reacoes: Partial<Record<Reacao, number>>;
  minhaReacao: Reacao | null;
  comentarios: number;
}

export interface ComentarioDeLista {
  id: string;
  itemId: string | null;
  autor: Autor;
  corpo: string;
  criadoEm: string;
  podeApagar: boolean;
}

export interface ListaCompleta extends ListaResumo {
  itensDaLista: ItemDeLista[];
  comentariosDaLista: ComentarioDeLista[];
  podeApagar: boolean;
}

/* --- Rodas de conversa ----------------------------------------------------------------- */

/** Roda parada por este tempo encerra sozinha (o banco faz a faxina). */
export const RODA_ENCERRA_PARADA_HORAS = 24;
/** Depois de encerrada, quem participou ainda vê quem estava por estes dias. */
export const RODA_FICA_DIAS = 7;

export interface RodaResumo {
  id: string;
  tema: string;
  descricao: string | null;
  assuntoTipo: AssuntoTipo | null;
  visibilidade: Visibilidade;
  grupo: { id: string; nome: string } | null;
  criador: Autor;
  aberta: boolean;
  participantes: number;
  /** Até 5 rostos para o cartão. */
  rostos: Autor[];
  participo: boolean;
  souCriador: boolean;
  ultimaAtividade: string;
  encerradaEm: string | null;
}

export type Vinculo = 'eu' | 'aceito' | 'enviado' | 'recebido' | 'nenhum';

export interface ParticipanteDaRoda extends Autor {
  vinculo: Vinculo;
  conexaoId: string | null;
}

export interface MensagemDaRoda {
  id: string;
  autor: Autor;
  corpo: string;
  criadaEm: string;
  minha: boolean;
}

export interface RodaCompleta extends RodaResumo {
  pessoas: ParticipanteDaRoda[];
  mensagens: MensagemDaRoda[];
}
