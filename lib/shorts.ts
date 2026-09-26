import 'server-only';

// Shorts do YouTube para o feed vertical da plataforma — a alternativa aos
// reels da Meta, com os temas, hobbies e estilos que a pessoa escolheu.
//
// Duas fontes:
//   - com YOUTUBE_API_KEY: busca por interesse (vídeo curto, Brasil, em
//     português), 100 unidades por termo, com cache de 24h;
//   - sem chave: os feeds RSS públicos dos canais curados de cada interesse.
//     Cada canal tem uma playlist só de Shorts ("UUSH" + id do canal) e o
//     YouTube publica o RSS dela sem exigir chave.

import { diaDeHoje, embaralhar, sorteador } from './descoberta-musical';
import { isYoutubeConfigured, searchVideos } from './youtube';
import { decodificarEntidades } from './midia';
import { canalPorHandle, videosDoCanal } from './youtube-aberto';
import { FILM_GENRES, HOBBIES, MUSIC_GENRES, BOOK_GENRES, genreLabel } from './taxonomy';
import { getTopic } from './data';

export interface Short {
  id: string;
  titulo: string;
  canal: string;
  capa: string;
  /** Chave do interesse que trouxe este short ("tema:musica"…). */
  de: string;
}

/** O que buscar no YouTube para cada tema. */
const TERMO_DO_TEMA: Record<string, string> = {
  tecnologia: 'tecnologia curiosidades',
  musica: 'música ao vivo',
  moda: 'moda look dicas',
  cultura: 'arte cultura curiosidades',
  esporte: 'futebol lances',
  cinema: 'cinema curiosidades filmes',
  livros: 'livros indicação',
  gastronomia: 'receita rápida',
  viagem: 'viagem lugares incríveis',
  games: 'games jogos',
  'bem-estar': 'bem-estar saúde dicas',
  arte: 'arte desenho pintura',
};

const TERMO_DO_HOBBY: Record<string, string> = {
  cozinhar: 'receita fácil',
  correr: 'corrida dicas',
  pedalar: 'ciclismo bike',
  fotografar: 'fotografia dicas',
  tocar: 'violão dica',
  ler: 'livros booktok',
  jogar: 'games',
  viajar: 'viagem dicas',
  desenhar: 'desenho tutorial',
  jardinagem: 'plantas dicas',
  colecionar: 'coleção colecionador',
  voluntariado: 'voluntariado',
};

/**
 * Canais por interesse para quando não há chave do YouTube. Lista curta e de
 * canais grandes; um handle que não resolver é só ignorado.
 */
export const CANAIS: Record<string, string[]> = {
  'tema:tecnologia': ['@tecmundo', '@canaltech', '@manualdomundo'],
  'tema:musica': ['@kondzilla', '@nprmusic', '@multishow'],
  'tema:esporte': ['@CazeTV', '@nba', '@FIFA'],
  'tema:cinema': ['@NetflixBrasil', '@omelete', '@primevideobr'],
  'tema:games': ['@PlayStation', '@Xbox', '@nintendobrasil'],
  'tema:gastronomia': ['@tastemadebr', '@panelinha', '@tudogostoso'],
  'tema:viagem': ['@NatGeo', '@lonelyplanet'],
  'tema:bem-estar': ['@drauziovarella', '@yogawithadriene'],
  'tema:moda': ['@VogueBrasil', '@vogue'],
  'tema:cultura': ['@MoMAvideos', '@tateshots'],
  'tema:arte': ['@MoMAvideos', '@proko'],
  'tema:livros': ['@tatianagfeltrin', '@penguinbooks'],
  'hobby:cozinhar': ['@tastemadebr', '@tudogostoso'],
  'hobby:jogar': ['@PlayStation', '@Xbox'],
  'hobby:fotografar': ['@NatGeo'],
  'hobby:desenhar': ['@proko'],
  'hobby:viajar': ['@NatGeo', '@lonelyplanet'],
};

/** Rótulo e termo de busca de uma chave de interesse. */
export function descreverChave(chave: string): { rotulo: string; termo: string } | null {
  const [tipo, id] = chave.split(':');
  if (!id) return null;
  if (tipo === 'tema') {
    const t = getTopic(id);
    return t ? { rotulo: t.label, termo: TERMO_DO_TEMA[id] ?? t.label } : null;
  }
  if (tipo === 'hobby') {
    const h = HOBBIES.find((x) => x.id === id);
    return h ? { rotulo: h.label, termo: TERMO_DO_HOBBY[id] ?? h.label } : null;
  }
  if (tipo === 'musica' && MUSIC_GENRES.some((g) => g.id === id)) {
    const l = genreLabel(MUSIC_GENRES, id);
    return { rotulo: l, termo: `${l} música` };
  }
  if (tipo === 'filme' && FILM_GENRES.some((g) => g.id === id)) {
    const l = genreLabel(FILM_GENRES, id);
    return { rotulo: l, termo: `filme ${l} cena` };
  }
  if (tipo === 'livro' && BOOK_GENRES.some((g) => g.id === id)) {
    const l = genreLabel(BOOK_GENRES, id);
    return { rotulo: l, termo: `livro ${l} indicação` };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fontes
// ---------------------------------------------------------------------------

async function porBusca(chave: string, termo: string): Promise<Short[]> {
  const videos = await searchVideos(`${termo} #shorts`, 25, { videoDuration: 'short', regionCode: 'BR' });
  return videos.map((v) => ({
    id: v.id,
    titulo: decodificarEntidades(v.title),
    canal: decodificarEntidades(v.channel),
    capa: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    de: chave,
  }));
}

async function porCanais(chave: string): Promise<Short[]> {
  const handles = CANAIS[chave] ?? [];
  const listas = await Promise.all(
    handles.map(async (h) => {
      const canal = await canalPorHandle(h);
      if (!canal) return [];
      const videos = await videosDoCanal(canal, 'shorts', 21600);
      return videos.map((v) => ({ id: v.id, titulo: v.titulo, canal: v.canal, capa: v.capa, de: chave }));
    }),
  );
  return listas.flat();
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export interface Feed {
  itens: Short[];
  fonte: 'busca' | 'canais';
  avisos: string[];
}

/**
 * Monta o feed de uma lista de interesses: até 4 por vez (sorteados por dia e
 * rodada, para o YouTube não cobrar a cota inteira de uma vez), intercalados
 * para não virar uma sequência de um assunto só.
 */
/**
 * Sem chave, só há Shorts de interesses com canais curados: gênero musical vai
 * para os canais de música, de filme para os de cinema, de livro para os de
 * livros. Sem nenhum, um feed de partida.
 */
function paraCanais(chaves: string[]): string[] {
  const mapa = chaves
    .map((c) => {
      const [tipo] = c.split(':');
      if (tipo === 'musica') return 'tema:musica';
      if (tipo === 'filme') return 'tema:cinema';
      if (tipo === 'livro') return 'tema:livros';
      return CANAIS[c] ? c : null;
    })
    .filter((c): c is string => Boolean(c));
  const unicas = Array.from(new Set(mapa));
  return unicas.length ? unicas : ['tema:musica', 'tema:esporte', 'tema:gastronomia', 'tema:tecnologia'];
}

export async function montarFeed(chaves: string[], rodada: number): Promise<Feed> {
  const usarBusca = isYoutubeConfigured();
  const validas = chaves.filter((c) => descreverChave(c));
  const rand = sorteador(`${diaDeHoje()}:shorts:${rodada}`);
  const escolhidas = embaralhar(usarBusca ? [...validas] : paraCanais(validas), rand).slice(0, 4);
  const avisos: string[] = [];

  const listas = await Promise.all(
    escolhidas.map(async (chave) => {
      try {
        if (usarBusca) return await porBusca(chave, descreverChave(chave)!.termo);
        return await porCanais(chave);
      } catch (e) {
        avisos.push(`${chave}: ${(e as Error).message}`);
        return [];
      }
    }),
  );

  // Intercala: um de cada interesse por vez, cada lista embaralhada.
  const filas = listas.map((l) => embaralhar([...l], rand));
  const vistos = new Set<string>();
  const itens: Short[] = [];
  for (let i = 0; filas.some((f) => i < f.length); i++) {
    for (const f of filas) {
      const s = f[i];
      if (s && !vistos.has(s.id)) {
        vistos.add(s.id);
        itens.push(s);
      }
    }
  }
  return { itens: itens.slice(0, 60), fonte: usarBusca ? 'busca' : 'canais', avisos };
}
