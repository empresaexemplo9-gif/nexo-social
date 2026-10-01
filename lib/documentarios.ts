// Documentários da aba Descobrir: só o que é atual, completo e bem filmado —
// um tema didático para cada gênero que a pessoa escolheu no questionário.
// As buscas pedem 4K (e HD, quando o 4K não chega) e só vídeos recentes
// (lib/gratis.ts). Vale no servidor e no navegador.

export interface TemaDocumental {
  /** Como o gênero aparece na aba ("Espaço e ciência" no lugar de "Ficção científica"). */
  rotulo: string;
  /** O que buscar (documentário completo de cada assunto). */
  termos: string[];
}

export const TEMAS_DOCUMENTAIS: Record<string, TemaDocumental> = {
  documentario: { rotulo: 'Natureza e viagem', termos: ['documentário natureza completo 4K', 'documentário viagem completo 4K', 'documentário Sibéria completo 4K'] },
  acao: { rotulo: 'Aventura e expedições', termos: ['documentário expedição completo 4K', 'documentário aventura extrema completo', 'documentário esportes radicais 4K'] },
  comedia: { rotulo: 'Culturas e comida', termos: ['documentário culturas do mundo completo 4K', 'documentário comida de rua completo', 'documentário costumes de outros países 4K'] },
  drama: { rotulo: 'Histórias reais', termos: ['documentário histórias reais completo', 'documentário sobrevivência completo 4K', 'documentário povos isolados completo'] },
  ficcao: { rotulo: 'Espaço e ciência', termos: ['documentário universo completo 4K', 'documentário ciência e tecnologia completo', 'documentário sistema solar 4K'] },
  terror: { rotulo: 'Mistérios e lugares extremos', termos: ['documentário mistérios do mundo completo', 'documentário lugares mais perigosos do mundo 4K', 'documentário predadores natureza 4K'] },
  suspense: { rotulo: 'Investigação e oceano profundo', termos: ['documentário oceano profundo 4K completo', 'documentário investigação completo', 'documentário enigmas da história completo'] },
  animacao: { rotulo: 'Vida selvagem', termos: ['documentário vida selvagem 4K completo', 'documentário animais selvagens completo 4K', 'documentário mundo dos insetos 4K'] },
  'romance-cine': { rotulo: 'Cidades e paisagens', termos: ['documentário cidades do mundo 4K', 'documentário paisagens Europa 4K completo', 'documentário Japão completo 4K'] },
  'fantasia-cine': { rotulo: 'Mundos gelados e submarinos', termos: ['documentário Sibéria completo 4K', 'documentário Antártida 4K completo', 'documentário mundo submarino 4K'] },
  nacional: { rotulo: 'Brasil', termos: ['documentário Amazônia completo 4K', 'documentário Pantanal 4K', 'documentário Brasil completo 4K'] },
  classicos: { rotulo: 'Os mais vistos em 4K', termos: ['documentário completo 4K', 'documentário planeta Terra completo 4K', 'documentary 4K full'] },
};

/** O tema de um gênero (os que não têm mapa caem em natureza e viagem). */
export const temaDocumental = (genero: string): TemaDocumental => TEMAS_DOCUMENTAIS[genero] ?? TEMAS_DOCUMENTAIS.documentario;

/** Quantos anos, no máximo, um documentário pode ter para ainda contar como atual. */
export const IDADE_MAXIMA = 6;

/**
 * Cara de acervo antigo (cinejornal, filme mudo, colorizado, domínio público,
 * ano do século passado no título): fica de fora.
 */
export const PARECE_ANTIGO =
  /\b(19[0-9]{2})\b|cinejornal|newsreel|filme mudo|silent film|preto e branco|black and white|coloriz|colorid[oa] (em|por)|dom[ií]nio p[uú]blico|public domain|archive footage|imagens de arquivo/i;
