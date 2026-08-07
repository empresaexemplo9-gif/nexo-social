// Termos de busca dos clipes de cada tema.
//
// "Clipe" aqui é vídeo curto: clipe musical, cena, jogada, receita, trecho de
// entrevista. O termo é o que o YouTube recebe — vários por tema, sorteados por
// dia, para a estante não repetir sempre o mesmo conteúdo.

import { daily } from './rotation';
import { MUSIC_GENRES, genreLabel } from './taxonomy';
import type { CategorySlug } from './data';

const CLIPES: Record<CategorySlug, string[]> = {
  musica: [
    'clipes MPB oficiais',
    'clipes música brasileira lançamentos',
    'ao vivo música brasileira show completo',
    'clipe rap nacional oficial',
    'clipes samba pagode oficiais',
    'sessão acústica música brasileira',
  ],
  cinema: [
    'cenas clássicas do cinema legendado',
    'trailer filme brasileiro',
    'making of filme nacional',
    'análise de cena cinema',
    'melhores cenas cinema brasileiro',
  ],
  esporte: [
    'melhores momentos futebol brasileiro',
    'gols históricos futebol',
    'melhores jogadas basquete NBA',
    'lances de vôlei seleção brasileira',
    'ultrapassagens Fórmula 1',
  ],
  tecnologia: [
    'novidades tecnologia explicado português',
    'review gadget português',
    'inteligência artificial explicado português',
    'programação dicas português',
  ],
  moda: [
    'desfile São Paulo Fashion Week',
    'bastidores semana de moda',
    'história da moda documentário curto',
    'tendências de moda análise',
  ],
  cultura: [
    'exposição de arte visita guiada',
    'entrevista escritor brasileiro',
    'apresentação teatro brasileiro trecho',
    'documentário cultura brasileira curto',
  ],
  livros: [
    'resenha de livro brasileiro',
    'entrevista com autor brasileiro',
    'clube do livro discussão',
    'literatura brasileira análise',
  ],
  gastronomia: [
    'receita rápida brasileira',
    'técnica de cozinha explicada',
    'ingredientes brasileiros documentário',
    'confeitaria receita passo a passo',
  ],
  viagem: [
    'roteiro de viagem Brasil',
    'trilha natureza Brasil documentário',
    'dicas de viagem econômica',
    'cidades históricas Brasil vídeo',
  ],
  games: [
    'gameplay jogo brasileiro',
    'melhores momentos CBLOL',
    'análise de jogo indie português',
    'speedrun recorde mundial',
  ],
  'bem-estar': [
    'aula de yoga completa português',
    'treino em casa 20 minutos',
    'meditação guiada português',
    'alongamento para quem trabalha sentado',
  ],
  arte: [
    'processo criativo artista brasileiro',
    'técnica de pintura tutorial',
    'fotografia dicas de composição',
    'street art mural time lapse',
  ],
};

/** Termo do dia para a estante de clipes do tema. */
export function clipQuery(topic: CategorySlug, generosMusicais: string[] = []): string {
  // Em música, os gêneros escolhidos no questionário mandam mais que a lista
  // genérica — é o que torna o clipe realmente pessoal.
  if (topic === 'musica' && generosMusicais.length) {
    const escolhido = daily(generosMusicais, 1, 3)[0] ?? generosMusicais[0];
    return `clipes ${genreLabel(MUSIC_GENRES, escolhido)} oficiais`;
  }
  const pool = CLIPES[topic] ?? [];
  const offset = topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return daily(pool, 1, offset)[0] ?? topic;
}

export function temClipes(topic: CategorySlug): boolean {
  return (CLIPES[topic]?.length ?? 0) > 0;
}
