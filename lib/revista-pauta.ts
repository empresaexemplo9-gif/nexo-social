// Pauta da Revista nexo: os assuntos de cada tema e o formato da matéria.
//
// Cada assunto é um verbete da Wikipédia em português — fonte gratuita, de
// licença aberta (CC BY-SA) e com referências. A plataforma não copia o
// verbete: monta uma matéria no formato dela (dossiê, perfil, linha do tempo,
// curiosidades), com imagens do Wikimedia Commons creditadas, vídeo de canal
// oficial e as fontes no fim. Só entram assuntos desta lista — nada de texto
// de origem desconhecida.

import type { CategorySlug } from './data';

export type FormatoDeMateria = 'dossie' | 'perfil' | 'linha-do-tempo' | 'curiosidades';

export interface Pauta {
  /** Título do verbete na Wikipédia em português. */
  verbete: string;
  formato: FormatoDeMateria;
}

export const FORMATOS: Record<FormatoDeMateria, { rotulo: string; apoio: string }> = {
  dossie: { rotulo: 'Dossiê', apoio: 'A história completa, do começo ao agora.' },
  perfil: { rotulo: 'Perfil', apoio: 'Quem é, de onde veio e o que deixou.' },
  'linha-do-tempo': { rotulo: 'Linha do tempo', apoio: 'Os marcos, ano a ano.' },
  curiosidades: { rotulo: 'Curiosidades', apoio: 'O que pouca gente sabe.' },
};

const p = (verbete: string, formato: FormatoDeMateria): Pauta => ({ verbete, formato });

export const PAUTA: Record<CategorySlug, Pauta[]> = {
  moda: [
    p('Alta-costura', 'dossie'),
    p('Coco Chanel', 'perfil'),
    p('Moda sustentável', 'dossie'),
    p('Streetwear', 'dossie'),
    p('Zuzu Angel', 'perfil'),
    p('Jeans', 'linha-do-tempo'),
    p('São Paulo Fashion Week', 'dossie'),
    p('Minissaia', 'curiosidades'),
    p('Alexander McQueen', 'perfil'),
    p('Havaianas', 'curiosidades'),
    p('Yves Saint Laurent (estilista)', 'perfil'),
  ],
  tecnologia: [
    p('Inteligência artificial', 'dossie'),
    p('Alan Turing', 'perfil'),
    p('Internet', 'linha-do-tempo'),
    p('Software livre', 'dossie'),
    p('Computação quântica', 'curiosidades'),
    p('Linux', 'linha-do-tempo'),
    p('Ada Lovelace', 'perfil'),
    p('World Wide Web', 'dossie'),
    p('Smartphone', 'curiosidades'),
    p('Criptografia', 'dossie'),
  ],
  musica: [
    p('Bossa nova', 'dossie'),
    p('Tropicália', 'dossie'),
    p('Samba', 'linha-do-tempo'),
    p('Elis Regina', 'perfil'),
    p('Música popular brasileira', 'dossie'),
    p('Disco de vinil', 'curiosidades'),
    p('Hip hop', 'linha-do-tempo'),
    p('Tom Jobim', 'perfil'),
    p('Chiquinha Gonzaga', 'perfil'),
    p('Rock in Rio', 'curiosidades'),
  ],
  cultura: [
    p('Semana de Arte Moderna', 'dossie'),
    p('Tarsila do Amaral', 'perfil'),
    p('Literatura de cordel', 'curiosidades'),
    p('Museu do Ipiranga', 'linha-do-tempo'),
    p('Carnaval do Brasil', 'dossie'),
    p('Capoeira', 'linha-do-tempo'),
    p('Oscar Niemeyer', 'perfil'),
    p('Teatro Oficina', 'curiosidades'),
  ],
  esporte: [
    p('Copa do Mundo FIFA', 'linha-do-tempo'),
    p('Pelé', 'perfil'),
    p('Marta (futebolista)', 'perfil'),
    p('Ayrton Senna', 'perfil'),
    p('Jogos Olímpicos', 'dossie'),
    p('Estádio do Maracanã', 'curiosidades'),
    p('Voleibol de praia', 'dossie'),
    p('Skate', 'curiosidades'),
    p('Rebeca Andrade', 'perfil'),
  ],
  cinema: [
    p('Cinema Novo', 'dossie'),
    p('Glauber Rocha', 'perfil'),
    p('Central do Brasil (filme)', 'curiosidades'),
    p('Fernanda Montenegro', 'perfil'),
    p('Oscar', 'linha-do-tempo'),
    p('Cidade de Deus (filme)', 'curiosidades'),
    p('Charles Chaplin', 'perfil'),
    p('Cinema mudo', 'dossie'),
    p('Animação', 'linha-do-tempo'),
  ],
  livros: [
    p('Machado de Assis', 'perfil'),
    p('Clarice Lispector', 'perfil'),
    p('Carlos Drummond de Andrade', 'perfil'),
    p('Modernismo no Brasil', 'dossie'),
    p('Dom Casmurro', 'curiosidades'),
    p('Grande Sertão: Veredas', 'curiosidades'),
    p('Conceição Evaristo', 'perfil'),
    p('Monteiro Lobato', 'perfil'),
    p('Prensa móvel', 'linha-do-tempo'),
  ],
  gastronomia: [
    p('Feijoada', 'curiosidades'),
    p('Pão de queijo', 'curiosidades'),
    p('Culinária do Brasil', 'dossie'),
    p('Café', 'linha-do-tempo'),
    p('Açaí', 'curiosidades'),
    p('Brigadeiro (doce)', 'curiosidades'),
    p('Moqueca', 'dossie'),
    p('Cachaça', 'linha-do-tempo'),
    p('Mandioca', 'dossie'),
  ],
  viagem: [
    p('Fernando de Noronha', 'dossie'),
    p('Parque Nacional dos Lençóis Maranhenses', 'curiosidades'),
    p('Pantanal', 'dossie'),
    p('Chapada Diamantina', 'curiosidades'),
    p('Cataratas do Iguaçu', 'curiosidades'),
    p('Ouro Preto', 'linha-do-tempo'),
    p('Floresta Amazônica', 'dossie'),
    p('Bonito (Mato Grosso do Sul)', 'curiosidades'),
  ],
  games: [
    p('Jogo eletrônico', 'linha-do-tempo'),
    p('Nintendo', 'linha-do-tempo'),
    p('Esporte eletrônico', 'dossie'),
    p('The Legend of Zelda', 'curiosidades'),
    p('Minecraft', 'curiosidades'),
    p('PlayStation', 'linha-do-tempo'),
    p('Pac-Man', 'curiosidades'),
    p('Tetris', 'curiosidades'),
  ],
  'bem-estar': [
    p('Meditação', 'dossie'),
    p('Sono', 'curiosidades'),
    p('Ioga', 'linha-do-tempo'),
    p('Atividade física', 'dossie'),
    p('Saúde mental', 'dossie'),
    p('Caminhada', 'curiosidades'),
  ],
  arte: [
    p('Fotografia', 'linha-do-tempo'),
    p('Sebastião Salgado', 'perfil'),
    p('Candido Portinari', 'perfil'),
    p('Grafite (arte)', 'dossie'),
    p('Arte digital', 'dossie'),
    p('Frida Kahlo', 'perfil'),
    p('Vincent van Gogh', 'perfil'),
    p('Os Gêmeos', 'perfil'),
    p('Impressionismo', 'linha-do-tempo'),
  ],
};

/**
 * Palavras que puxam um fato do "Hoje na história" para o tema. Casam no
 * começo da palavra, então radicais valem ("olímpic" pega olímpico/olímpica).
 */
export const TERMOS_DA_HISTORIA: Record<CategorySlug, string[]> = {
  moda: ['moda', 'estilista', 'costureir', 'desfile', 'grife', 'vestido', 'fashion', 'maison'],
  tecnologia: ['computador', 'internet', 'software', 'satélite', 'tecnologi', 'microsoft', 'apple', 'google', 'inteligência artificial', 'telefone', 'foguete', 'transistor'],
  musica: ['música', 'músic', 'cantor', 'banda', 'álbum', 'compositor', 'canção', 'orquestra', 'samba', 'ópera', 'beatles'],
  cultura: ['museu', 'teatro', 'patrimônio', 'arquitet', 'carnaval', 'cultura', 'biblioteca', 'unesco'],
  esporte: ['futebol', 'copa do mundo', 'olímpic', 'campeonato', 'fórmula 1', 'atleta', 'estádio', 'tenista', 'voleibol', 'basquete', 'maratona'],
  cinema: ['filme', 'cinema', 'cineasta', 'ator ', 'atriz', 'oscar', 'hollywood', 'estreia'],
  livros: ['livro', 'romance', 'escritor', 'poeta', 'poema', 'literatura', 'literári', 'publicad', 'nobel de literatura'],
  gastronomia: ['culinári', 'restaurante', 'alimento', 'comida', 'café', 'vinho', 'cerveja', 'chocolate', 'chef'],
  viagem: ['parque nacional', 'turismo', 'turista', 'patrimônio mundial', 'expedição', 'navegador', 'aeroporto', 'voo ', 'cataratas'],
  games: ['jogo eletrônico', 'jogos eletrônicos', 'videogame', 'nintendo', 'playstation', 'xbox', 'sega', 'atari', 'console'],
  'bem-estar': ['saúde', 'medicina', 'vacina', 'hospital', 'médic', 'doença', 'penicilina', 'epidemia'],
  arte: ['pintor', 'pintura', 'escultor', 'escultura', 'fotografia', 'fotógraf', 'exposição', 'artista', 'museu'],
};

/** "Coco Chanel" → "coco-chanel"; é o endereço da matéria. */
export function slugDaPauta(verbete: string): string {
  return verbete
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function pautaPorSlug(tema: CategorySlug, slug: string): Pauta | null {
  return PAUTA[tema]?.find((x) => slugDaPauta(x.verbete) === slug) ?? null;
}
