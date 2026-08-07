// Transmissões ao vivo gratuitas, por tema.
//
// Só canais oficiais que transmitem aberto — mesma regra do esporte.
//
// SOBRE DETECTAR "ESTÁ AO VIVO AGORA":
// perguntar isso ao YouTube custa 100 unidades por canal, e a cota gratuita é
// de 10.000 por dia. Checar 30 canais de 15 em 15 minutos daria ~288.000/dia —
// impossível. Por isso a checagem:
//   1. só cobre os temas que a pessoa segue;
//   2. é limitada a MAX_CANAIS por requisição;
//   3. tem cache compartilhado entre todos os usuários;
//   4. e é opcional: sem ela, o player embutido do canal ainda mostra a
//      transmissão quando existe — só não dá para avisar antes.
//
// Os alertas com hora exata vêm da agenda esportiva, que é gratuita e não gasta
// cota nenhuma.

import type { CategorySlug } from './data';

export interface LiveChannel {
  id: string;
  topic: CategorySlug;
  nome: string;
  /** @handle do YouTube — é o que permite embutir. */
  youtube: string;
  url: string;
  /** O que o canal transmite de graça. */
  nota: string;
}

export const LIVE_CHANNELS: LiveChannel[] = [
  // Tecnologia
  { id: 'nasa', topic: 'tecnologia', nome: 'NASA', youtube: '@NASA', url: 'https://www.youtube.com/@NASA', nota: 'Lançamentos, caminhadas espaciais e coletivas ao vivo.' },
  { id: 'spacex', topic: 'tecnologia', nome: 'SpaceX', youtube: '@SpaceX', url: 'https://www.youtube.com/@SpaceX', nota: 'Transmissão ao vivo de todos os lançamentos.' },
  { id: 'google-dev', topic: 'tecnologia', nome: 'Google for Developers', youtube: '@GoogleDevelopers', url: 'https://www.youtube.com/@GoogleDevelopers', nota: 'Keynotes e conferências abertas.' },

  // Música
  { id: 'npr', topic: 'musica', nome: 'NPR Music (Tiny Desk)', youtube: '@nprmusic', url: 'https://www.youtube.com/@nprmusic', nota: 'Shows completos e a série Tiny Desk, de graça.' },
  { id: 'kexp', topic: 'musica', nome: 'KEXP', youtube: '@kexp', url: 'https://www.youtube.com/@kexp', nota: 'Sessões ao vivo em estúdio, liberadas na íntegra.' },
  { id: 'coala', topic: 'musica', nome: 'Coala Festival', youtube: '@coalafestival', url: 'https://www.youtube.com/@coalafestival', nota: 'Shows da música brasileira transmitidos abertos.' },

  // Cultura
  { id: 'sesctv', topic: 'cultura', nome: 'Sesc São Paulo', youtube: '@sescsp', url: 'https://www.youtube.com/@sescsp', nota: 'Debates, shows e espetáculos ao vivo, gratuitos.' },
  { id: 'itaucultural', topic: 'cultura', nome: 'Itaú Cultural', youtube: '@itaucultural', url: 'https://www.youtube.com/@itaucultural', nota: 'Mesas, exposições e performances transmitidas.' },
  { id: 'tvcultura', topic: 'cultura', nome: 'TV Cultura', youtube: '@tvcultura', url: 'https://www.youtube.com/@tvcultura', nota: 'Programação aberta e acervo de entrevistas.' },

  // Cinema & Séries
  { id: 'mubi', topic: 'cinema', nome: 'MUBI', youtube: '@mubi', url: 'https://www.youtube.com/@mubi', nota: 'Conversas com diretores e curtas liberados.' },
  { id: 'criterion', topic: 'cinema', nome: 'Criterion Collection', youtube: '@criterioncollection', url: 'https://www.youtube.com/@criterioncollection', nota: 'Ensaios em vídeo e entrevistas do acervo.' },

  // Livros
  { id: 'flip', topic: 'livros', nome: 'Flip — Paraty', youtube: '@flipparaty', url: 'https://www.youtube.com/@flipparaty', nota: 'Mesas da festa literária transmitidas ao vivo.' },
  { id: 'companhia', topic: 'livros', nome: 'Companhia das Letras', youtube: '@companhiadasletras', url: 'https://www.youtube.com/@companhiadasletras', nota: 'Lançamentos e conversas com autores.' },

  // Gastronomia
  { id: 'panelinha', topic: 'gastronomia', nome: 'Panelinha — Rita Lobo', youtube: '@panelinha', url: 'https://www.youtube.com/@panelinha', nota: 'Aulas de cozinha do dia a dia, abertas.' },
  { id: 'tastemade', topic: 'gastronomia', nome: 'Tastemade Brasil', youtube: '@tastemadebrasil', url: 'https://www.youtube.com/@tastemadebrasil', nota: 'Receitas e séries de gastronomia.' },

  // Viagem
  { id: 'natgeo', topic: 'viagem', nome: 'National Geographic', youtube: '@NatGeo', url: 'https://www.youtube.com/@NatGeo', nota: 'Documentários e expedições.' },
  { id: 'earthcam', topic: 'viagem', nome: 'EarthCam', youtube: '@EarthCamTV', url: 'https://www.youtube.com/@EarthCamTV', nota: 'Câmeras ao vivo de cidades do mundo inteiro.' },

  // Games
  { id: 'nintendo', topic: 'games', nome: 'Nintendo Brasil', youtube: '@NintendoBrasil', url: 'https://www.youtube.com/@NintendoBrasil', nota: 'Directs e apresentações ao vivo.' },
  { id: 'gdc', topic: 'games', nome: 'GDC', youtube: '@Gdconf', url: 'https://www.youtube.com/@Gdconf', nota: 'Palestras da maior conferência de desenvolvimento.' },

  // Bem-estar
  { id: 'yogacomkassandra', topic: 'bem-estar', nome: 'Yoga with Kassandra', youtube: '@yogawithkassandra', url: 'https://www.youtube.com/@yogawithkassandra', nota: 'Aulas completas de ioga, gratuitas.' },
  { id: 'ted', topic: 'bem-estar', nome: 'TED', youtube: '@TED', url: 'https://www.youtube.com/@TED', nota: 'Palestras sobre saúde, hábitos e comportamento.' },

  // Arte & Fotografia
  { id: 'moma', topic: 'arte', nome: 'MoMA', youtube: '@MoMAvideos', url: 'https://www.youtube.com/@MoMAvideos', nota: 'Visitas guiadas e conversas com artistas.' },
  { id: 'tate', topic: 'arte', nome: 'Tate', youtube: '@Tate', url: 'https://www.youtube.com/@Tate', nota: 'Séries sobre artistas e técnicas.' },
  { id: 'pinacoteca', topic: 'arte', nome: 'Pinacoteca de São Paulo', youtube: '@pinacotecasp', url: 'https://www.youtube.com/@pinacotecasp', nota: 'Mediações e cursos abertos.' },

  // Moda
  { id: 'vogue', topic: 'moda', nome: 'Vogue', youtube: '@Vogue', url: 'https://www.youtube.com/@Vogue', nota: 'Desfiles e bastidores das semanas de moda.' },
  { id: 'spfw', topic: 'moda', nome: 'São Paulo Fashion Week', youtube: '@spfw', url: 'https://www.youtube.com/@spfw', nota: 'Desfiles transmitidos ao vivo, de graça.' },

  // Esporte — os canais principais já estão em lib/sports-media.ts
  { id: 'cazetv-live', topic: 'esporte', nome: 'CazéTV', youtube: '@CazeTV', url: 'https://www.youtube.com/@CazeTV', nota: 'Jogos ao vivo abertos, conforme os direitos da temporada.' },
];

export function channelsOf(topic: CategorySlug): LiveChannel[] {
  return LIVE_CHANNELS.filter((c) => c.topic === topic);
}

export function channelsForProfile(interests: CategorySlug[]): LiveChannel[] {
  const temas = interests.length ? interests : (['musica', 'cinema', 'tecnologia'] as CategorySlug[]);
  return LIVE_CHANNELS.filter((c) => temas.includes(c.topic));
}

/** Teto de canais checados por requisição — protege a cota do YouTube. */
export const MAX_CANAIS = 6;
