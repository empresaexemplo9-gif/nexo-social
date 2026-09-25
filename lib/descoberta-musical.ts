// Descoberta musical — a parte pura da seleção, sem rede.
//
// Fica separada de lib/spotify.ts (que chama a API) para poder ser testada
// com dados de exemplo e para as regras ficarem legíveis num lugar só.
//
// O problema que isto resolve: a busca do Spotify ordena por relevância, que
// na prática é popularidade. Pegar sempre o topo dava os mesmos hits de
// sempre — e a API de 2026 não entrega mais o campo `popularity`, nem
// recomendações, nem artistas relacionados. O que sobra para fugir do óbvio
// é a própria busca: páginas mais fundas do gênero, o filtro de ano para
// lançamentos, e a primeira página usada ao contrário — como lista do que
// NÃO indicar.

export interface Faixa {
  id: string;
  name: string;
  /** Todos os artistas, para exibir. */
  artist: string;
  /** Artista principal, para variar e para barrar os mais tocados. */
  artistaPrincipal: string;
  album: string;
  image: string | null;
  ano: number | null;
  url: string;
  embedUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  owner: string;
  image: string | null;
  url: string;
  embedUrl: string;
}

/** Gerador pseudoaleatório com semente: o mesmo dia dá a mesma seleção. */
export function sorteador(semente: string): () => number {
  let h = 1779033703 ^ semente.length;
  for (let i = 0; i < semente.length; i++) {
    h = Math.imul(h ^ semente.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function entre(rand: () => number, min: number, max: number): number {
  return Math.floor(min + rand() * (max - min + 1));
}

export function embaralhar<T>(lista: T[], rand: () => number): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export interface OpcoesDoFiltro {
  /** A primeira página do gênero: os mais tocados. */
  topo?: Faixa[];
  /** Faixas já escolhidas em outra lista da mesma trilha (não repetem). */
  jaEscolhidas?: Faixa[];
  /** Barra faixas e artistas do topo — para quem não quer os hits. */
  barrarTopo?: boolean;
  /** Barra artistas que já estão em outra lista — variedade entre listas. */
  variarEntreListas?: boolean;
  /** Quantas faixas do mesmo artista cabem na lista. */
  porArtista?: number;
}

/**
 * Tira da lista o que não deve entrar: faixas repetidas, excesso do mesmo
 * artista e — para quem não quer hits — faixas e artistas da primeira página
 * do gênero (os mais tocados). A ordem de entrada é preservada.
 */
export function foraDoObvio(candidatas: Faixa[], opcoes: OpcoesDoFiltro = {}): Faixa[] {
  const { topo = [], jaEscolhidas = [], barrarTopo = true, variarEntreListas = true, porArtista = 1 } = opcoes;
  const idsTopo = new Set(barrarTopo ? topo.map((f) => f.id) : []);
  const artistasTopo = new Set(barrarTopo ? topo.map((f) => normalizar(f.artistaPrincipal)) : []);
  const vistos = new Set(jaEscolhidas.map((f) => f.id));
  const deOutrasListas = new Set(variarEntreListas ? jaEscolhidas.map((f) => normalizar(f.artistaPrincipal)) : []);
  const porArtistaAqui = new Map<string, number>();
  const saida: Faixa[] = [];
  for (const f of candidatas) {
    const artista = normalizar(f.artistaPrincipal);
    if (idsTopo.has(f.id) || artistasTopo.has(artista)) continue;
    if (vistos.has(f.id) || deOutrasListas.has(artista)) continue;
    const n = porArtistaAqui.get(artista) ?? 0;
    if (n >= porArtista) continue;
    porArtistaAqui.set(artista, n + 1);
    vistos.add(f.id);
    saida.push(f);
  }
  return saida;
}

// Nome de playlist que promete novidade ou cena independente…
const SINAIS_DE_DESCOBERTA = [
  'novo', 'nova', 'novidade', 'descobert', 'lancament', 'fresh', 'new ',
  'emergente', 'independente', 'underground', 'autoral', 'revelac', 'radar', 'cena', 'garimpo',
  'pouco conhecid', 'alternativ', 'indie',
];
// …e nome que promete o de sempre.
const SINAIS_DE_CLICHE = [
  'melhores', 'hits', 'top ', 'top 10', 'top 50', 'top 100', 'mais tocad', 'mais ouvid', 'sucesso',
  'classicos', 'antigas', 'as melhores', 'best of', 'greatest', 'mais famos', 'do momento', 'para tocar no',
  'flashback', 'relembrar',
];

/**
 * O que a playlist deve prometer, conforme o jeito de ouvir da pessoa:
 * - `descoberta`: novidade e cena independente; nome de "hits" não serve;
 * - `hits`: os sucessos e clássicos do estilo;
 * - `lancamentos`: o que saiu agora (com ou sem hits, conforme `aceitaHits`);
 * - `mista`: tanto faz — só precisa ser do gênero.
 */
export type EstiloDePlaylist = 'descoberta' | 'hits' | 'lancamentos' | 'mista';

/**
 * Nota de uma playlist. `null` = não serve: não é do gênero (nenhum dos
 * `sinais` no nome ou na descrição) ou promete os hits para quem não quer.
 */
export function notaDaPlaylist(p: Playlist, sinais: string[], ano: number, estilo: EstiloDePlaylist = 'descoberta'): number | null {
  const nome = ` ${normalizar(p.name)} `;
  const texto = `${nome} ${normalizar(p.description)}`;
  if (!sinais.some((s) => texto.includes(normalizar(s)))) return null;
  const cliche = SINAIS_DE_CLICHE.some((s) => nome.includes(s));
  if (cliche && estilo === 'descoberta') return null;
  let nota = 0;
  if (cliche && estilo === 'hits') nota += 4;
  if (cliche && estilo === 'mista') nota += 1;
  const pesoNovidade = estilo === 'hits' ? 0 : estilo === 'mista' ? 1 : 3;
  for (const s of SINAIS_DE_DESCOBERTA) if (texto.includes(s)) nota += nome.includes(s) ? pesoNovidade : Math.min(1, pesoNovidade);
  // Quem quer só lançamentos: a playlist precisa ser DE lançamentos.
  if (estilo === 'lancamentos' && /lancament|novidade|new music|release/.test(nome)) nota += 5;
  if (texto.includes(String(ano))) nota += 2; // atualizada neste ano
  if (texto.includes(String(ano - 1))) nota += 1;
  return nota;
}

/**
 * Escolhe a playlist do dia: entre as de melhor nota (até 3), sorteia uma —
 * para a trilha não ser sempre a mesma, mas também nunca uma ruim.
 */
export function escolherPlaylist(
  lista: Playlist[],
  sinais: string[],
  ano: number,
  rand: () => number,
  estilo: EstiloDePlaylist = 'descoberta',
): Playlist | null {
  const vistas = new Set<string>();
  const notas = lista
    .filter((p) => (vistas.has(p.id) ? false : (vistas.add(p.id), true)))
    .map((p) => ({ p, nota: notaDaPlaylist(p, sinais, ano, estilo) }))
    .filter((x): x is { p: Playlist; nota: number } => x.nota !== null)
    .sort((a, b) => b.nota - a.nota);
  if (!notas.length) return null;
  const melhores = notas.filter((x) => x.nota >= notas[0].nota - 1).slice(0, 3);
  return melhores[Math.floor(rand() * melhores.length)].p;
}

/** "2026-09-25" no fuso de Brasília — a seleção vira à meia-noite daqui. */
export function diaDeHoje(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
}
