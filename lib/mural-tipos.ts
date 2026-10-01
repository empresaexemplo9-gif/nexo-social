// Mural da comunidade: tipos e rótulos usados no servidor E no navegador (sem
// 'server-only'). As regras de quem vê e quem mexe ficam no banco
// (db/social.sql); aqui, o vocabulário das telas.

import type { IconName } from '@/components/icons';

export type TipoPublicacao = 'conversa' | 'pergunta' | 'resenha' | 'experiencia' | 'video' | 'livro';
export type Visibilidade = 'todos' | 'contatos' | 'grupo';
export type AssuntoTipo = 'filme' | 'serie' | 'livro' | 'evento' | 'show' | 'jogo' | 'esporte' | 'musica' | 'lugar' | 'outro';
export type Reacao = 'curti' | 'amei' | 'concordo' | 'discordo';

export const TIPOS_PUBLICACAO: {
  id: TipoPublicacao;
  rotulo: string;
  icone: IconName;
  /** O que aparece no lugar do texto, puxando o assunto. */
  convite: string;
  /** Tem "sobre o quê" (assunto) e nota? */
  assunto?: boolean;
  nota?: boolean;
}[] = [
  { id: 'conversa', rotulo: 'Conversa', icone: 'chat', convite: 'Sobre o que você quer conversar hoje?' },
  { id: 'pergunta', rotulo: 'Pedir opinião', icone: 'compass', convite: 'O que você quer saber? Ex.: vale a pena ver a nova temporada?' },
  { id: 'resenha', rotulo: 'Resenha', icone: 'star', convite: 'O que você achou? Conte sem spoiler — ou avise antes.', assunto: true, nota: true },
  {
    id: 'experiencia',
    rotulo: 'Experiência',
    icone: 'sparkles',
    convite: 'Conte como foi. Ex.: fui no Rock in Rio, foi maravilhoso porém cansativo — será que eu iria gostar mais do The Town?',
    assunto: true,
    nota: true,
  },
  { id: 'video', rotulo: 'Vídeo', icone: 'video', convite: 'Por que vale assistir? (opcional)' },
  { id: 'livro', rotulo: 'Livro que li', icone: 'book', convite: 'O que ficou do livro para você?', assunto: true, nota: true },
];

export const ASSUNTO_TIPOS: { id: AssuntoTipo; rotulo: string }[] = [
  { id: 'filme', rotulo: 'Filme' },
  { id: 'serie', rotulo: 'Série' },
  { id: 'livro', rotulo: 'Livro' },
  { id: 'show', rotulo: 'Show' },
  { id: 'evento', rotulo: 'Evento' },
  { id: 'jogo', rotulo: 'Jogo' },
  { id: 'esporte', rotulo: 'Esporte' },
  { id: 'musica', rotulo: 'Música / álbum' },
  { id: 'lugar', rotulo: 'Lugar / viagem' },
  { id: 'outro', rotulo: 'Outro' },
];

export const VISIBILIDADES: { id: Visibilidade; rotulo: string; explica: string; icone: IconName }[] = [
  { id: 'todos', rotulo: 'Todos', explica: 'Todo mundo da nexo.social vê.', icone: 'globe' },
  { id: 'contatos', rotulo: 'Meus contatos', explica: 'Só quem é seu contato vê.', icone: 'users' },
  { id: 'grupo', rotulo: 'Um grupo', explica: 'Só os membros do grupo escolhido veem.', icone: 'lock' },
];

export const REACOES: { id: Reacao; rotulo: string; emoji: string }[] = [
  { id: 'curti', rotulo: 'Curti', emoji: '👍' },
  { id: 'amei', rotulo: 'Amei', emoji: '❤️' },
  { id: 'concordo', rotulo: 'Concordo', emoji: '🙌' },
  { id: 'discordo', rotulo: 'Discordo', emoji: '🤔' },
];

/**
 * Texto da busca: sem acento, minúsculo, só letras e números — igual à coluna
 * `busca` do banco (busca_normalizar em db/social.sql).
 */
export function normalizarBusca(texto: string): string {
  const de = 'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ';
  const para = 'aaaaaaaaaaaaeeeeeeeeiiiiiiiioooooooooouuuuuuuuccnn';
  let s = '';
  for (const c of texto) {
    const i = de.indexOf(c);
    s += i >= 0 ? para[i] : c;
  }
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const ehTipoPublicacao = (v: unknown): v is TipoPublicacao => TIPOS_PUBLICACAO.some((t) => t.id === v);
export const ehVisibilidade = (v: unknown): v is Visibilidade => VISIBILIDADES.some((t) => t.id === v);
export const ehAssuntoTipo = (v: unknown): v is AssuntoTipo => ASSUNTO_TIPOS.some((t) => t.id === v);
export const ehReacao = (v: unknown): v is Reacao => REACOES.some((t) => t.id === v);

export interface Autor {
  id: string;
  nome: string;
  avatarPath: string | null;
}

export interface Publicacao {
  id: string;
  tipo: TipoPublicacao;
  titulo: string | null;
  corpo: string | null;
  assunto: string | null;
  assuntoTipo: AssuntoTipo | null;
  nota: number | null;
  tema: string | null;
  youtubeId: string | null;
  url: string | null;
  visibilidade: Visibilidade;
  grupo: { id: string; nome: string } | null;
  autor: Autor;
  criadaEm: string;
  editadaEm: string | null;
  opinioes: number;
  /** Quantas de cada reação. */
  reacoes: Partial<Record<Reacao, number>>;
  minhaReacao: Reacao | null;
  souAutor: boolean;
  podeApagar: boolean;
}

export interface Opiniao {
  id: string;
  autor: Autor;
  corpo: string;
  respostaA: string | null;
  criadaEm: string;
  podeApagar: boolean;
}
