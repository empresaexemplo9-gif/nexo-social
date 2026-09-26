import 'server-only';

// Tudo o que dá para assistir, ler e ouvir DE GRAÇA dentro da plataforma, a
// partir dos gêneros e hobbies que a pessoa escolheu.
//
// Fontes, na ordem em que são tentadas:
//   - Internet Archive (sem chave): filmes em domínio público das coleções
//     curadas e os audiolivros do LibriVox (coleção librivoxaudio). Tocam no
//     player do próprio Archive, embutido.
//   - Gutendex/Projeto Gutenberg (sem chave): livros em domínio público, lidos
//     no leitor da plataforma (lib/leitor.ts).
//   - YouTube (YOUTUBE_API_KEY): o que os acervos abertos não têm — filme
//     completo, audiolivro em português, tutorial de hobby. É a reserva: entra
//     quando a fonte aberta traz pouco ou nada.
//
// O "filtro de indicação" é o mesmo espírito da trilha musical: só os gêneros
// da pessoa, e ela escolhe se quer os clássicos (os mais vistos/lidos), as
// descobertas (fora do topo) ou uma mistura. A seleção vira todo dia e
// "Outras descobertas" (rodada) troca na hora.

import { diaDeHoje, embaralhar, sorteador } from './descoberta-musical';
import { isYoutubeConfigured, searchVideos } from './youtube';
import { BOOK_GENRES, FILM_GENRES, HOBBIES, genreLabel } from './taxonomy';
import { decodificarEntidades, type Midia } from './midia';

export type AreaGratis = 'filmes' | 'livros' | 'audiolivros' | 'hobbies';
export type EstiloDeIndicacao = 'misturar' | 'classicos' | 'descobertas';
export type IdiomaDeIndicacao = 'pt' | 'todos';

export interface ItemGratis {
  /** Único entre as fontes: "ia:<id>", "gutenberg:<n>", "yt:<id>". */
  id: string;
  midia: Midia;
  titulo: string;
  autor: string | null;
  ano: string | null;
  capa: string | null;
  fonte: 'Internet Archive' | 'Projeto Gutenberg' | 'LibriVox' | 'YouTube';
  /** Idioma, quando a fonte informa ("pt", "en"…). */
  idioma: string | null;
  link: string;
}

export interface ResultadoGratis {
  area: AreaGratis;
  chave: string;
  rotulo: string;
  itens: ItemGratis[];
  /** O YouTube entrou para completar? */
  usouYoutube: boolean;
  /** Sem chave do YouTube, a busca de reserva que a pessoa pode abrir lá. */
  buscaExterna: string | null;
  avisos: string[];
}

const QUANTOS = 12;
const TEMPO = { next: { revalidate: 43200 } } as const;

// ---------------------------------------------------------------------------
// Mapas de gênero → consulta de cada fonte
// ---------------------------------------------------------------------------

/** Filmes: filtro de assunto no Internet Archive. */
const FILMES_IA: Record<string, { filtro: string; colecoes?: string }> = {
  acao: { filtro: 'subject:(action OR adventure OR western OR aventura OR ação)' },
  comedia: { filtro: 'subject:(comedy OR comédia OR comedia)' },
  drama: { filtro: 'subject:(drama)' },
  ficcao: { filtro: 'subject:("science fiction" OR "sci-fi" OR scifi OR "ficção científica")' },
  terror: { filtro: 'subject:(horror OR terror OR monster OR zombie)' },
  suspense: { filtro: 'subject:(thriller OR suspense OR mystery OR noir)' },
  documentario: {
    filtro: 'subject:(documentary OR documentário OR documentario)',
    colecoes: 'feature_films OR prelinger OR documentaries',
  },
  animacao: { filtro: 'subject:(animation OR cartoon OR animação OR desenho)', colecoes: 'animationandcartoons OR feature_films' },
  'romance-cine': { filtro: 'subject:(romance OR romantic)' },
  'fantasia-cine': { filtro: 'subject:(fantasy OR fantasia OR fairy)' },
  nacional: { filtro: '(language:(Portuguese OR por) OR subject:(brasil OR brazil OR brasileiro OR brazilian))' },
  classicos: { filtro: '' },
};
const COLECOES_DE_FILME = 'feature_films OR silent_films OR film_noir OR animationandcartoons';

/** Livros: "topic" do Gutendex (casa com assunto e estante do Gutenberg). */
const LIVROS_GUTENDEX: Record<string, string> = {
  'ficcao-lit': 'fiction',
  'fantasia-lit': 'fantasy',
  policial: 'detective',
  biografia: 'biography',
  historia: 'history',
  negocios: 'economics',
  autoajuda: 'conduct of life',
  ciencia: 'science',
  poesia: 'poetry',
  tecnico: 'technology',
  'romance-lit': 'love stories',
  quadrinhos: 'humor',
};

/** Audiolivros: assunto dentro da coleção do LibriVox no Internet Archive. */
const AUDIO_IA: Record<string, string> = {
  'ficcao-lit': 'fiction OR novel OR romance',
  'fantasia-lit': 'fantasy OR fairy',
  policial: 'detective OR mystery OR crime',
  biografia: 'biography OR memoir OR autobiography',
  historia: 'history',
  negocios: 'economics OR business',
  autoajuda: 'philosophy OR "self-help" OR conduct',
  ciencia: 'science OR nature',
  poesia: 'poetry OR poesia',
  tecnico: 'technology OR science',
  'romance-lit': 'romance OR love',
  quadrinhos: 'humor OR comedy',
};

/** Hobbies: o que buscar no YouTube (tutorial de verdade, não vitrine). */
const HOBBIES_YT: Record<string, string> = {
  cozinhar: 'receita fácil passo a passo',
  correr: 'corrida para iniciantes treino',
  pedalar: 'ciclismo para iniciantes dicas',
  fotografar: 'fotografia para iniciantes aula',
  tocar: 'aula de violão para iniciantes',
  ler: 'como ler mais livros dicas',
  jogar: 'dicas de jogos para iniciantes',
  viajar: 'roteiro de viagem econômica',
  desenhar: 'aula de desenho para iniciantes',
  jardinagem: 'como cuidar de plantas em casa',
  colecionar: 'dicas para colecionadores',
  voluntariado: 'como começar a ser voluntário',
};

// ---------------------------------------------------------------------------
// Estilo: clássicos, descobertas ou mistura (mesma lógica em todas as fontes)
// ---------------------------------------------------------------------------

/**
 * `ordenados` vem do mais visto/lido para o menos. Clássicos = o topo (a
 * rodada anda a janela); descobertas = fora do topo, sorteadas; misturar =
 * alguns do topo e o resto de descobertas.
 */
function aplicarEstilo<T>(ordenados: T[], estilo: EstiloDeIndicacao, semente: string, rodada: number): T[] {
  const rand = sorteador(`${semente}:${rodada}`);
  const topo = ordenados.slice(0, 15);
  const resto = ordenados.slice(15);
  if (estilo === 'classicos') {
    const ini = (rodada * QUANTOS) % Math.max(1, Math.min(ordenados.length, 45));
    const janela = ordenados.slice(ini, ini + QUANTOS);
    return janela.length >= QUANTOS / 2 ? janela : ordenados.slice(0, QUANTOS);
  }
  if (estilo === 'descobertas') {
    const pool = resto.length >= QUANTOS / 2 ? resto : ordenados;
    return embaralhar([...pool], rand).slice(0, QUANTOS);
  }
  const doTopo = embaralhar([...topo], rand).slice(0, 5);
  const descobertas = embaralhar([...(resto.length ? resto : topo)], rand).filter((x) => !doTopo.includes(x));
  return [...doTopo, ...descobertas].slice(0, QUANTOS);
}

// ---------------------------------------------------------------------------
// Internet Archive
// ---------------------------------------------------------------------------

interface DocIA {
  identifier: string;
  title?: string | string[];
  creator?: string | string[];
  year?: string | number;
  date?: string;
  language?: string | string[];
  downloads?: number;
}

const primeiro = (v: unknown): string | null => {
  const x = Array.isArray(v) ? v[0] : v;
  return x === undefined || x === null || x === '' ? null : String(x);
};

async function buscarNoArchive(consulta: string, linhas = 80): Promise<DocIA[]> {
  const params = new URLSearchParams({ q: consulta, rows: String(linhas), page: '1', output: 'json' });
  for (const f of ['identifier', 'title', 'creator', 'year', 'date', 'language', 'downloads']) params.append('fl[]', f);
  params.append('sort[]', 'downloads desc');
  const res = await fetch(`https://archive.org/advancedsearch.php?${params}`, { ...TEMPO, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Internet Archive respondeu ${res.status}`);
  const json = await res.json();
  return (json?.response?.docs ?? []).filter((d: DocIA) => d?.identifier);
}

const IDIOMAS: Record<string, string> = {
  por: 'pt', portuguese: 'pt', pt: 'pt', eng: 'en', english: 'en', en: 'en', spa: 'es', spanish: 'es',
  fre: 'fr', fra: 'fr', french: 'fr', ger: 'de', deu: 'de', german: 'de', ita: 'it', italian: 'it',
};
function codigoDeIdioma(v: string): string {
  const k = v.trim().toLowerCase();
  return IDIOMAS[k] ?? k.slice(0, 2);
}

function doArchive(d: DocIA, formato: 'video' | 'audio', fonte: ItemGratis['fonte']): ItemGratis {
  const idioma = primeiro(d.language);
  return {
    id: `ia:${d.identifier}`,
    midia: { tipo: 'archive', id: d.identifier, formato },
    titulo: primeiro(d.title) ?? d.identifier,
    autor: primeiro(d.creator),
    ano: primeiro(d.year) ?? (d.date ? String(d.date).slice(0, 4) : null),
    capa: `https://archive.org/services/img/${encodeURIComponent(d.identifier)}`,
    fonte,
    idioma: idioma ? codigoDeIdioma(idioma) : null,
    link: `https://archive.org/details/${encodeURIComponent(d.identifier)}`,
  };
}

// ---------------------------------------------------------------------------
// Gutendex (Projeto Gutenberg)
// ---------------------------------------------------------------------------

interface LivroGutendex {
  id: number;
  title: string;
  authors?: { name: string }[];
  languages?: string[];
  formats?: Record<string, string>;
  download_count?: number;
}

async function buscarNoGutendex(params: Record<string, string>, paginas = 2): Promise<LivroGutendex[]> {
  const saida: LivroGutendex[] = [];
  for (let page = 1; page <= paginas; page++) {
    const qs = new URLSearchParams({ ...params, page: String(page) });
    const res = await fetch(`https://gutendex.com/books?${qs}`, { ...TEMPO, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Gutendex respondeu ${res.status}`);
    const json = await res.json();
    saida.push(...(json?.results ?? []));
    if (!json?.next) break;
  }
  return saida;
}

/** "Assis, Machado de" → "Machado de Assis". */
function nomeDoAutor(n: string | undefined): string | null {
  if (!n) return null;
  const [sobrenome, nome] = n.split(', ');
  return nome ? `${nome} ${sobrenome}` : n;
}

function doGutenberg(l: LivroGutendex): ItemGratis {
  const capa = Object.entries(l.formats ?? {}).find(([k]) => k.startsWith('image/jpeg'))?.[1] ?? null;
  return {
    id: `gutenberg:${l.id}`,
    midia: { tipo: 'livro', gutenberg: l.id },
    titulo: l.title.replace(/\s*\n\s*/g, ' — ').trim(),
    autor: nomeDoAutor(l.authors?.[0]?.name),
    ano: null,
    capa,
    fonte: 'Projeto Gutenberg',
    idioma: l.languages?.[0] ?? null,
    link: `https://www.gutenberg.org/ebooks/${l.id}`,
  };
}

// ---------------------------------------------------------------------------
// YouTube — a reserva
// ---------------------------------------------------------------------------

async function doYoutube(termo: string, duracao: 'long' | 'medium' | 'any'): Promise<ItemGratis[]> {
  if (!isYoutubeConfigured()) return [];
  const extras: Record<string, string> = { regionCode: 'BR' };
  if (duracao !== 'any') extras.videoDuration = duracao;
  const videos = await searchVideos(termo, 12, extras);
  return videos.map((v) => ({
    id: `yt:${v.id}`,
    midia: { tipo: 'youtube', id: v.id },
    titulo: decodificarEntidades(v.title),
    autor: decodificarEntidades(v.channel),
    ano: null,
    capa: v.thumb ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    fonte: 'YouTube',
    idioma: null,
    link: `https://www.youtube.com/watch?v=${v.id}`,
  }));
}

const buscaNoYoutube = (termo: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`;

// ---------------------------------------------------------------------------
// Montagem por área
// ---------------------------------------------------------------------------

interface Pedido {
  area: AreaGratis;
  chave: string;
  estilo: EstiloDeIndicacao;
  idioma: IdiomaDeIndicacao;
  rodada: number;
}

/** Junta a fonte aberta com a reserva do YouTube quando ela veio curta. */
async function comReserva(
  base: ItemGratis[],
  termoYoutube: string,
  duracao: 'long' | 'medium' | 'any',
  avisos: string[],
  forcar = false,
): Promise<{ itens: ItemGratis[]; usouYoutube: boolean; buscaExterna: string | null }> {
  if (base.length >= QUANTOS / 2 && !forcar) return { itens: base, usouYoutube: false, buscaExterna: null };
  if (!isYoutubeConfigured()) {
    return { itens: base, usouYoutube: false, buscaExterna: buscaNoYoutube(termoYoutube) };
  }
  try {
    const yt = await doYoutube(termoYoutube, duracao);
    return { itens: [...base, ...yt].slice(0, QUANTOS + 4), usouYoutube: yt.length > 0, buscaExterna: null };
  } catch (e) {
    avisos.push(`YouTube: ${(e as Error).message}`);
    return { itens: base, usouYoutube: false, buscaExterna: buscaNoYoutube(termoYoutube) };
  }
}

export async function indicacoesGratis(p: Pedido): Promise<ResultadoGratis> {
  const semente = `${diaDeHoje()}:${p.area}:${p.chave}:${p.estilo}`;
  const avisos: string[] = [];
  let base: ItemGratis[] = [];

  if (p.area === 'filmes') {
    const cfg = FILMES_IA[p.chave] ?? FILMES_IA.classicos;
    const rotulo = genreLabel(FILM_GENRES, p.chave);
    const consulta = [`mediatype:(movies)`, `collection:(${cfg.colecoes ?? COLECOES_DE_FILME})`, cfg.filtro].filter(Boolean).join(' AND ');
    try {
      const docs = await buscarNoArchive(consulta);
      base = aplicarEstilo(docs.map((d) => doArchive(d, 'video', 'Internet Archive')), p.estilo, semente, p.rodada);
    } catch (e) {
      avisos.push((e as Error).message);
    }
    const termo = p.chave === 'documentario' ? `documentário completo ${rotulo}` : `filme completo ${rotulo} dublado`;
    // Cinema nacional quase não está nos acervos abertos: o YouTube entra sempre.
    const r = await comReserva(base, termo, 'long', avisos, p.chave === 'nacional');
    return { area: p.area, chave: p.chave, rotulo, ...r, avisos };
  }

  if (p.area === 'livros') {
    const rotulo = genreLabel(BOOK_GENRES, p.chave);
    const topic = LIVROS_GUTENDEX[p.chave] ?? 'fiction';
    try {
      const pt = p.idioma === 'pt' ? await buscarNoGutendex({ topic, languages: 'pt' }, 1) : [];
      const outros = pt.length >= QUANTOS ? [] : await buscarNoGutendex({ topic, languages: p.idioma === 'pt' ? 'en,es,fr' : 'pt,en,es,fr' });
      const ordenados = [...pt, ...outros].sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0));
      // Em português primeiro quando a pessoa pediu; o resto completa.
      const escolhidos = aplicarEstilo(ordenados, p.estilo, semente, p.rodada);
      base = (p.idioma === 'pt' ? [...escolhidos.filter((l) => l.languages?.[0] === 'pt'), ...escolhidos.filter((l) => l.languages?.[0] !== 'pt')] : escolhidos).map(
        doGutenberg,
      );
    } catch (e) {
      avisos.push((e as Error).message);
    }
    // Livro não tem reserva no YouTube para ler; quem quiser ouvir tem a aba de audiolivros.
    return { area: p.area, chave: p.chave, rotulo, itens: base, usouYoutube: false, buscaExterna: null, avisos };
  }

  if (p.area === 'audiolivros') {
    const rotulo = genreLabel(BOOK_GENRES, p.chave);
    const assunto = AUDIO_IA[p.chave] ?? 'fiction';
    const idioma = p.idioma === 'pt' ? ' AND language:(Portuguese OR por)' : '';
    try {
      const docs = await buscarNoArchive(`collection:(librivoxaudio) AND subject:(${assunto})${idioma}`);
      base = aplicarEstilo(docs.map((d) => doArchive(d, 'audio', 'LibriVox')), p.estilo, semente, p.rodada);
    } catch (e) {
      avisos.push((e as Error).message);
    }
    // Em português o LibriVox tem pouco: o YouTube tem muito audiolivro completo.
    const r = await comReserva(base, `audiolivro completo ${rotulo} português`, 'long', avisos, p.idioma === 'pt');
    return { area: p.area, chave: p.chave, rotulo, ...r, avisos };
  }

  // Hobbies: tutoriais — só o YouTube tem esse acervo.
  const hobby = HOBBIES.find((h) => h.id === p.chave);
  const rotulo = hobby?.label ?? p.chave;
  const termo = HOBBIES_YT[p.chave] ?? `${rotulo} para iniciantes`;
  const r = await comReserva([], termo, 'medium', avisos, true);
  return { area: p.area, chave: p.chave, rotulo, ...r, avisos };
}

/**
 * Versões gratuitas de um título específico (do registro de leitura, por
 * exemplo): livro no Gutenberg, audiolivro no LibriVox e, se não houver,
 * audiolivro no YouTube.
 */
export async function gratisPorTitulo(titulo: string, autor: string | null): Promise<{
  livros: ItemGratis[];
  audiolivros: ItemGratis[];
  buscaExterna: string | null;
  avisos: string[];
}> {
  const avisos: string[] = [];
  const termo = [titulo, autor].filter(Boolean).join(' ');
  const [livros, audio] = await Promise.all([
    buscarNoGutendex({ search: termo }, 1)
      .then((ls) => ls.slice(0, 4).map(doGutenberg))
      .catch((e) => {
        avisos.push((e as Error).message);
        return [] as ItemGratis[];
      }),
    buscarNoArchive(`collection:(librivoxaudio) AND title:(${titulo.replace(/[()":]/g, ' ')})`, 6)
      .then((ds) => ds.map((d) => doArchive(d, 'audio', 'LibriVox')))
      .catch((e) => {
        avisos.push((e as Error).message);
        return [] as ItemGratis[];
      }),
  ]);
  const r = await comReserva(audio, `audiolivro ${termo} completo`, 'long', avisos);
  return { livros, audiolivros: r.itens, buscaExterna: r.buscaExterna, avisos };
}
