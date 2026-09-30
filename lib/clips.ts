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
    'roda de choro ao vivo',
    'clipe forró oficial',
    'clipe sertanejo oficial lançamento',
    'clipe funk brasileiro oficial',
    'voz e violão MPB ao vivo',
    'Tiny Desk artista brasileiro',
  ],
  cinema: [
    'cenas clássicas do cinema legendado',
    'trailer filme brasileiro',
    'making of filme nacional',
    'análise de cena cinema',
    'melhores cenas cinema brasileiro',
    'trailer oficial legendado lançamento',
    'trailer série brasileira oficial',
    'crítica de filme sem spoiler português',
    'curta-metragem brasileiro premiado',
    'bastidores efeitos especiais cinema',
    'trailer animação dublado',
  ],
  esporte: [
    'melhores momentos futebol brasileiro',
    'gols históricos futebol',
    'melhores jogadas basquete NBA',
    'lances de vôlei seleção brasileira',
    'ultrapassagens Fórmula 1',
    'gols da rodada Brasileirão',
    'melhores momentos Superliga de vôlei',
    'Rebeca Andrade ginástica apresentação',
    'surfe brasileiro melhores ondas',
    'skate street Rayssa Leal manobras',
    'melhores momentos futebol feminino seleção brasileira',
  ],
  tecnologia: [
    'novidades tecnologia explicado português',
    'review gadget português',
    'inteligência artificial explicado português',
    'programação dicas português',
    'unboxing celular review português',
    'review notebook português',
    'como funciona explicado animação português',
    'robótica projeto brasileiro',
    'truques de celular dicas português',
    'curiosidades história da tecnologia',
  ],
  moda: [
    'desfile São Paulo Fashion Week',
    'bastidores semana de moda',
    'história da moda documentário curto',
    'tendências de moda análise',
    'desfile alta-costura Paris',
    'desfile Casa de Criadores',
    'dicas de estilo como montar looks',
    'entrevista estilista brasileiro',
    'brechó garimpo moda sustentável',
    'costura para iniciantes tutorial',
  ],
  cultura: [
    'exposição de arte visita guiada',
    'entrevista escritor brasileiro',
    'apresentação teatro brasileiro trecho',
    'documentário cultura brasileira curto',
    'Festival de Parintins apresentação',
    'roda de capoeira',
    'dança popular brasileira apresentação',
    'museu brasileiro visita virtual',
    'arquitetura brasileira documentário curto',
    'festa popular brasileira tradição',
  ],
  livros: [
    'resenha de livro brasileiro',
    'entrevista com autor brasileiro',
    'clube do livro discussão',
    'literatura brasileira análise',
    'booktuber brasileiro indicações',
    'clássicos da literatura brasileira indicação',
    'declamação de poesia brasileira',
    'resumo de livro vestibular',
    'mesa Flip Festa Literária de Paraty',
    'conto lido em voz alta',
  ],
  gastronomia: [
    'receita rápida brasileira',
    'técnica de cozinha explicada',
    'ingredientes brasileiros documentário',
    'confeitaria receita passo a passo',
    'receita de bolo simples',
    'receita comida nordestina',
    'comida de rua brasileira',
    'receita de pão caseiro',
    'receita vegetariana fácil',
    'doce brasileiro receita tradicional',
  ],
  viagem: [
    'roteiro de viagem Brasil',
    'trilha natureza Brasil documentário',
    'dicas de viagem econômica',
    'cidades históricas Brasil vídeo',
    'praias do Nordeste roteiro',
    'viagem pela Amazônia',
    'mochilão América do Sul',
    'o que fazer em Salvador',
    'parques nacionais do Brasil',
    'viagem de carro pelo Brasil',
  ],
  games: [
    'gameplay jogo brasileiro',
    'melhores momentos CBLOL',
    'análise de jogo indie português',
    'speedrun recorde mundial',
    'Horizon Chase gameplay',
    'Free Fire melhores jogadas',
    'jogos clássicos Master System Tectoy',
    'review de jogo em português',
    'trailer de jogo lançamento legendado',
    'Super Nintendo jogos retrô gameplay',
  ],
  'bem-estar': [
    'aula de yoga completa português',
    'treino em casa 20 minutos',
    'meditação guiada português',
    'alongamento para quem trabalha sentado',
    'treino HIIT em casa iniciante',
    'exercício de respiração para ansiedade',
    'pilates em casa iniciante',
    'receita saudável café da manhã',
    'dicas para dormir melhor',
    'yoga para iniciantes 15 minutos',
  ],
  arte: [
    'processo criativo artista brasileiro',
    'técnica de pintura tutorial',
    'fotografia dicas de composição',
    'street art mural time lapse',
    'desenho realista passo a passo',
    'aquarela tutorial iniciante',
    'fotografia com celular dicas',
    'grafite brasileiro mural',
    'visita guiada museu de arte',
    'xilogravura processo artesanal',
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
