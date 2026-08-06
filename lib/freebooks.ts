// Acervos de livros e audiolivros liberados gratuitamente por terceiros.
//
// Todas as fontes usadas aqui são abertas e não exigem chave de API:
//   - Gutendex (https://gutendex.com) — API pública sobre o Projeto Gutenberg,
//     ~75 mil obras em domínio público, com EPUB, Kindle, HTML e texto.
//   - LibriVox (https://librivox.org/api) — audiolivros em domínio público,
//     lidos por voluntários, com feed MP3 por capítulo.
//   - Open Library (https://openlibrary.org) — catálogo aberto do Internet
//     Archive, usado como busca de apoio.
//
// A "liberação" semanal e mensal é determinística: a seleção é sorteada a
// partir da semana ISO (ou do mês) no fuso de São Paulo, então todo mundo vê
// a mesma estante durante o período e ela troca sozinha na virada — sem
// intervenção do administrador.

import { saoPauloParts } from './datetime';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type BookSource = 'gutenberg' | 'librivox' | 'openlibrary' | 'dominio-publico';

export interface BookFormat {
  label: string;
  url: string;
}

export interface FreeBook {
  id: string;
  title: string;
  author: string;
  language: string;
  cover: string | null;
  source: BookSource;
  /** Página principal da obra na plataforma de origem. */
  url: string;
  /** Downloads/leitura direta, quando a fonte expõe. */
  formats: BookFormat[];
  subjects: string[];
}

export interface AudioBook {
  id: string;
  title: string;
  author: string;
  language: string;
  /** Duração total no formato da fonte (ex.: "6:41:12"). */
  duration: string | null;
  source: BookSource;
  url: string;
  /** Feed RSS com os capítulos em MP3, quando disponível. */
  feedUrl: string | null;
  cover: string | null;
}

export type Period = 'semana' | 'mes';

export interface Shelf {
  periodo: Period;
  /** Rótulo do período corrente, ex.: "Semana 32 de 2026". */
  rotulo: string;
  /** Quando esta estante é trocada (ISO, fuso de São Paulo). */
  proximaTroca: string;
  livros: FreeBook[];
  audiolivros: AudioBook[];
  /** 'live' = veio da API da fonte; 'reserva' = catálogo local de segurança. */
  fonte: 'live' | 'reserva' | 'parcial';
  avisos: string[];
}

// ---------------------------------------------------------------------------
// Semente determinística do período
// ---------------------------------------------------------------------------

/** Número da semana ISO de uma data (1–53). */
function isoWeek(y: number, m: number, d: number): number {
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function periodInfo(periodo: Period): { seed: number; rotulo: string; proximaTroca: string } {
  const { year, month, day } = saoPauloParts(new Date());
  if (periodo === 'mes') {
    const proximo = month === 12 ? new Date(Date.UTC(year + 1, 0, 1, 3)) : new Date(Date.UTC(year, month, 1, 3));
    return {
      seed: year * 100 + month,
      rotulo: `${MESES[month - 1]} de ${year}`,
      proximaTroca: proximo.toISOString(),
    };
  }
  const week = isoWeek(year, month, day);
  // Próxima segunda-feira às 00h de São Paulo (03h UTC).
  const hoje = new Date(Date.UTC(year, month - 1, day, 3));
  const diasParaSegunda = ((8 - (hoje.getUTCDay() || 7)) % 7) || 7;
  hoje.setUTCDate(hoje.getUTCDate() + diasParaSegunda);
  return { seed: year * 100 + week, rotulo: `Semana ${week} de ${year}`, proximaTroca: hoje.toISOString() };
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Embaralhamento estável a partir de uma semente (mulberry32 + Fisher-Yates). */
export function seededPick<T>(pool: T[], seed: number, n: number): T[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// ---------------------------------------------------------------------------
// Gutendex — Projeto Gutenberg
// ---------------------------------------------------------------------------

interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string }[];
  languages: string[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

const FORMAT_LABELS: { match: string; label: string }[] = [
  { match: 'application/epub+zip', label: 'EPUB' },
  { match: 'application/x-mobipocket-ebook', label: 'Kindle' },
  { match: 'text/html', label: 'Ler no navegador' },
  { match: 'text/plain', label: 'Texto' },
];

function normalizeGutendex(b: GutendexBook): FreeBook {
  const formats: BookFormat[] = [];
  for (const { match, label } of FORMAT_LABELS) {
    const key = Object.keys(b.formats).find((k) => k.startsWith(match) && !k.includes('zip=') );
    const url = key ? b.formats[key] : null;
    if (url && !url.endsWith('.zip')) formats.push({ label, url });
  }
  const cover = Object.entries(b.formats).find(([k]) => k.startsWith('image/jpeg'))?.[1] ?? null;
  return {
    id: `gutenberg-${b.id}`,
    title: b.title.replace(/\s*\n\s*/g, ' — ').trim(),
    author: b.authors[0]?.name ?? 'Autoria desconhecida',
    language: b.languages[0] ?? 'pt',
    cover,
    source: 'gutenberg',
    url: `https://www.gutenberg.org/ebooks/${b.id}`,
    formats,
    subjects: (b.subjects ?? []).slice(0, 3),
  };
}

async function fetchGutendex(languages: string, pages = 1): Promise<FreeBook[]> {
  const out: FreeBook[] = [];
  for (let page = 1; page <= pages; page++) {
    const url = `https://gutendex.com/books?languages=${languages}&sort=popular&page=${page}`;
    const res = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Gutendex respondeu ${res.status}`);
    const json = (await res.json()) as { results: GutendexBook[] };
    out.push(...(json.results ?? []).map(normalizeGutendex));
  }
  return out.filter((b) => b.formats.length > 0);
}

// ---------------------------------------------------------------------------
// LibriVox — audiolivros em domínio público
// ---------------------------------------------------------------------------

interface LibrivoxBook {
  id: string;
  title: string;
  description?: string;
  language: string;
  totaltime?: string;
  url_librivox?: string;
  url_rss?: string;
  url_zip_file?: string;
  authors?: { first_name?: string; last_name?: string }[];
}

function normalizeLibrivox(b: LibrivoxBook): AudioBook {
  const a = b.authors?.[0];
  const author = [a?.first_name, a?.last_name].filter(Boolean).join(' ').trim();
  return {
    id: `librivox-${b.id}`,
    title: b.title,
    author: author || 'Autoria desconhecida',
    language: b.language === 'Portuguese' ? 'pt' : b.language?.toLowerCase() ?? 'en',
    duration: b.totaltime ?? null,
    source: 'librivox',
    url: b.url_librivox || `https://librivox.org/search?q=${encodeURIComponent(b.title)}`,
    feedUrl: b.url_rss ?? null,
    cover: null,
  };
}

async function fetchLibrivox(language: string, limit = 40): Promise<AudioBook[]> {
  const url = `https://librivox.org/api/feed/audiobooks/?format=json&limit=${limit}&language=${encodeURIComponent(language)}&extended=1`;
  const res = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`LibriVox respondeu ${res.status}`);
  const json = (await res.json()) as { books?: LibrivoxBook[] };
  return (json.books ?? []).map(normalizeLibrivox);
}

// ---------------------------------------------------------------------------
// Catálogo de reserva
//
// Se a fonte estiver fora do ar (ou a rede bloqueada), a estante continua
// cheia. Os links apontam para a busca da própria plataforma pelo título e
// autor — sempre resolvem, mesmo que o identificador da obra mude.
// ---------------------------------------------------------------------------

const g = (t: string, a: string) =>
  `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(`${t} ${a}`)}`;
const lv = (t: string) => `https://librivox.org/search?q=${encodeURIComponent(t)}&search_form=advanced`;

interface Seed {
  title: string;
  author: string;
  subjects: string[];
}

const RESERVA_LIVROS: Seed[] = [
  { title: 'Dom Casmurro', author: 'Machado de Assis', subjects: ['Romance', 'Literatura brasileira'] },
  { title: 'Memórias Póstumas de Brás Cubas', author: 'Machado de Assis', subjects: ['Romance', 'Sátira'] },
  { title: 'Quincas Borba', author: 'Machado de Assis', subjects: ['Romance'] },
  { title: 'O Cortiço', author: 'Aluísio Azevedo', subjects: ['Naturalismo'] },
  { title: 'O Ateneu', author: 'Raul Pompeia', subjects: ['Romance'] },
  { title: 'Os Sertões', author: 'Euclides da Cunha', subjects: ['Ensaio', 'História'] },
  { title: 'Triste Fim de Policarpo Quaresma', author: 'Lima Barreto', subjects: ['Romance'] },
  { title: 'Iracema', author: 'José de Alencar', subjects: ['Romantismo'] },
  { title: 'Senhora', author: 'José de Alencar', subjects: ['Romance'] },
  { title: 'A Escrava Isaura', author: 'Bernardo Guimarães', subjects: ['Romance'] },
  { title: 'Casa de Pensão', author: 'Aluísio Azevedo', subjects: ['Naturalismo'] },
  { title: 'Poesias Completas', author: 'Cruz e Sousa', subjects: ['Poesia', 'Simbolismo'] },
  { title: 'Espumas Flutuantes', author: 'Castro Alves', subjects: ['Poesia'] },
  { title: 'Os Lusíadas', author: 'Luís de Camões', subjects: ['Poesia épica'] },
  { title: 'A Cidade e as Serras', author: 'Eça de Queirós', subjects: ['Romance'] },
  { title: 'O Primo Basílio', author: 'Eça de Queirós', subjects: ['Realismo'] },
  { title: 'Amor de Perdição', author: 'Camilo Castelo Branco', subjects: ['Romance'] },
  { title: 'Livro do Desassossego', author: 'Fernando Pessoa', subjects: ['Prosa'] },
  { title: 'Contos Gauchescos', author: 'Simões Lopes Neto', subjects: ['Contos'] },
  { title: 'Urupês', author: 'Monteiro Lobato', subjects: ['Contos'] },
  { title: 'A Metamorfose', author: 'Franz Kafka', subjects: ['Novela'] },
  { title: 'Orgulho e Preconceito', author: 'Jane Austen', subjects: ['Romance'] },
  { title: 'Frankenstein', author: 'Mary Shelley', subjects: ['Ficção científica'] },
  { title: 'Drácula', author: 'Bram Stoker', subjects: ['Terror'] },
  { title: 'As Aventuras de Sherlock Holmes', author: 'Arthur Conan Doyle', subjects: ['Policial'] },
  { title: 'A Arte da Guerra', author: 'Sun Tzu', subjects: ['Estratégia'] },
  { title: 'A República', author: 'Platão', subjects: ['Filosofia'] },
  { title: 'Meditações', author: 'Marco Aurélio', subjects: ['Filosofia', 'Estoicismo'] },
];

const RESERVA_AUDIO: Seed[] = [
  { title: 'Dom Casmurro', author: 'Machado de Assis', subjects: [] },
  { title: 'Memórias Póstumas de Brás Cubas', author: 'Machado de Assis', subjects: [] },
  { title: 'O Alienista', author: 'Machado de Assis', subjects: [] },
  { title: 'A Cartomante', author: 'Machado de Assis', subjects: [] },
  { title: 'O Cortiço', author: 'Aluísio Azevedo', subjects: [] },
  { title: 'Iracema', author: 'José de Alencar', subjects: [] },
  { title: 'A Escrava Isaura', author: 'Bernardo Guimarães', subjects: [] },
  { title: 'Os Lusíadas', author: 'Luís de Camões', subjects: [] },
  { title: 'Amor de Perdição', author: 'Camilo Castelo Branco', subjects: [] },
  { title: 'A Relíquia', author: 'Eça de Queirós', subjects: [] },
  { title: 'Contos Gauchescos', author: 'Simões Lopes Neto', subjects: [] },
  { title: 'Noite na Taverna', author: 'Álvares de Azevedo', subjects: [] },
  { title: 'Poesias', author: 'Casimiro de Abreu', subjects: [] },
  { title: 'A Moreninha', author: 'Joaquim Manuel de Macedo', subjects: [] },
  { title: 'Helena', author: 'Machado de Assis', subjects: [] },
  { title: 'Esaú e Jacó', author: 'Machado de Assis', subjects: [] },
];

function reservaLivros(): FreeBook[] {
  return RESERVA_LIVROS.map((s, i) => ({
    id: `reserva-livro-${i}`,
    title: s.title,
    author: s.author,
    language: 'pt',
    cover: null,
    source: 'gutenberg' as const,
    url: g(s.title, s.author),
    formats: [
      { label: 'Projeto Gutenberg', url: g(s.title, s.author) },
      {
        label: 'Domínio Público',
        url: `https://www.dominiopublico.gov.br/pesquisa/ResultadoPesquisaObraForm.do?first=50&skip=0&ds_titulo=${encodeURIComponent(s.title)}&co_autor=&no_autor=&co_categoria=&pagina=1&select_action=Submit`,
      },
      { label: 'Open Library', url: `https://openlibrary.org/search?q=${encodeURIComponent(`${s.title} ${s.author}`)}` },
    ],
    subjects: s.subjects,
  }));
}

function reservaAudio(): AudioBook[] {
  return RESERVA_AUDIO.map((s, i) => ({
    id: `reserva-audio-${i}`,
    title: s.title,
    author: s.author,
    language: 'pt',
    duration: null,
    source: 'librivox' as const,
    url: lv(`${s.title} ${s.author}`),
    feedUrl: null,
    cover: null,
  }));
}

// ---------------------------------------------------------------------------
// Montagem da estante
// ---------------------------------------------------------------------------

/**
 * Estante do período. Busca nas fontes abertas e, se alguma falhar, completa
 * com o catálogo de reserva — a página nunca fica vazia. Semanal traz uma
 * seleção enxuta; mensal, uma estante maior.
 */
export async function buildShelf(periodo: Period): Promise<Shelf> {
  const { seed, rotulo, proximaTroca } = periodInfo(periodo);
  const qtdLivros = periodo === 'semana' ? 6 : 12;
  const qtdAudio = periodo === 'semana' ? 4 : 8;
  const avisos: string[] = [];

  const [livrosRes, audioRes] = await Promise.allSettled([
    // pt = português; en entra como complemento porque o acervo em pt é menor.
    fetchGutendex('pt', 2).then(async (pt) => (pt.length >= qtdLivros * 3 ? pt : [...pt, ...(await fetchGutendex('en', 1))])),
    fetchLibrivox('Portuguese', 60),
  ]);

  let livrosPool: FreeBook[];
  let audioPool: AudioBook[];
  let vivos = 0;

  if (livrosRes.status === 'fulfilled' && livrosRes.value.length) {
    livrosPool = livrosRes.value;
    vivos++;
  } else {
    livrosPool = reservaLivros();
    avisos.push(
      `Projeto Gutenberg indisponível agora (${
        livrosRes.status === 'rejected' ? mensagem(livrosRes.reason) : 'sem resultados'
      }). Mostrando o acervo de reserva.`,
    );
  }

  if (audioRes.status === 'fulfilled' && audioRes.value.length) {
    audioPool = audioRes.value;
    vivos++;
  } else {
    audioPool = reservaAudio();
    avisos.push(
      `LibriVox indisponível agora (${
        audioRes.status === 'rejected' ? mensagem(audioRes.reason) : 'sem resultados'
      }). Mostrando o acervo de reserva.`,
    );
  }

  return {
    periodo,
    rotulo,
    proximaTroca,
    livros: seededPick(livrosPool, seed, qtdLivros),
    audiolivros: seededPick(audioPool, seed + 7, qtdAudio),
    fonte: vivos === 2 ? 'live' : vivos === 1 ? 'parcial' : 'reserva',
    avisos,
  };
}

function mensagem(e: unknown): string {
  if (e instanceof Error) return e.message.slice(0, 120);
  return 'erro desconhecido';
}
