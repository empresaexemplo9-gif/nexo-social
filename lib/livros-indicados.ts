import 'server-only';
import { buscarNoArchive, doArchive, type ItemGratis } from './gratis';

// Indicações de livros por gênero. Cada indicação é um livro de verdade (não
// uma busca). As obras em domínio público são procuradas nos acervos abertos
// e, quando existe versão livre, abrem no leitor do Nexo. As demais aparecem
// como compra, com aviso claro e link para a Amazon em outra aba.

export interface Indicacao {
  titulo: string;
  autor: string;
  /** Título pelo qual o acervo aberto conhece a obra (muitas vezes o original). */
  original?: string;
  /** Sobrenome como o acervo registra, quando difere ("Plato", "Tolstoy"). */
  autorAcervo?: string;
  /** Obra em domínio público: vale procurar versão gratuita. */
  livre?: boolean;
}

const L = (titulo: string, autor: string, original?: string, autorAcervo?: string): Indicacao => ({ titulo, autor, original, autorAcervo, livre: true });
const P = (titulo: string, autor: string): Indicacao => ({ titulo, autor });

export const INDICACOES: Record<string, Indicacao[]> = {
  'ficcao-lit': [L('Dom Casmurro', 'Machado de Assis'), P('Torto Arado', 'Itamar Vieira Junior'), L('Memórias Póstumas de Brás Cubas', 'Machado de Assis', 'Memorias Posthumas de Braz Cubas'), P('A Hora da Estrela', 'Clarice Lispector'), L('O Cortiço', 'Aluísio Azevedo', 'O Cortiço'), P('Cem Anos de Solidão', 'Gabriel García Márquez')],
  'fantasia-lit': [L('Alice no País das Maravilhas', 'Lewis Carroll', "Alice's Adventures in Wonderland"), P('O Hobbit', 'J. R. R. Tolkien'), L('O Mágico de Oz', 'L. Frank Baum', 'The Wonderful Wizard of Oz'), P('O Nome do Vento', 'Patrick Rothfuss'), L('Peter Pan', 'J. M. Barrie', 'Peter Pan'), P('Harry Potter e a Pedra Filosofal', 'J. K. Rowling')],
  policial: [L('O Cão dos Baskerville', 'Arthur Conan Doyle', 'The Hound of the Baskervilles'), P('Garota Exemplar', 'Gillian Flynn'), L('Um Estudo em Vermelho', 'Arthur Conan Doyle', 'A Study in Scarlet'), P('O Silêncio dos Inocentes', 'Thomas Harris'), L('O Signo dos Quatro', 'Arthur Conan Doyle', 'The Sign of the Four'), P('Morte no Nilo', 'Agatha Christie')],
  biografia: [L('Autobiografia', 'Benjamin Franklin', 'The Autobiography of Benjamin Franklin'), P('Steve Jobs', 'Walter Isaacson'), L('Narrativa da Vida de Frederick Douglass', 'Frederick Douglass', 'Narrative of the Life of Frederick Douglass'), P('Eu Sou Malala', 'Malala Yousafzai'), P('Minha História', 'Michelle Obama'), P('O Diário de Anne Frank', 'Anne Frank')],
  historia: [L('História da Guerra do Peloponeso', 'Tucídides', 'History of the Peloponnesian War', 'Thucydides'), P('Sapiens', 'Yuval Noah Harari'), L('A Arte da Guerra', 'Sun Tzu', 'The Art of War', 'Sunzi'), P('1808', 'Laurentino Gomes'), P('Raízes do Brasil', 'Sérgio Buarque de Holanda'), P('Casa-Grande & Senzala', 'Gilberto Freyre')],
  negocios: [L('A Riqueza das Nações', 'Adam Smith', 'The Wealth of Nations'), P('Rápido e Devagar', 'Daniel Kahneman'), L('A Ciência de Ficar Rico', 'Wallace D. Wattles', 'The Science of Getting Rich'), P('A Startup Enxuta', 'Eric Ries'), P('Pai Rico, Pai Pobre', 'Robert Kiyosaki'), P('O Homem Mais Rico da Babilônia', 'George S. Clason')],
  autoajuda: [L('Meditações', 'Marco Aurélio', 'Meditations', 'Aurelius'), P('Hábitos Atômicos', 'James Clear'), P('Como Fazer Amigos e Influenciar Pessoas', 'Dale Carnegie'), L('Sobre a Vida Feliz', 'Sêneca', "Seneca's Morals of a Happy Life", 'Seneca'), P('Mindset', 'Carol S. Dweck'), P('O Poder do Hábito', 'Charles Duhigg')],
  ciencia: [L('A Origem das Espécies', 'Charles Darwin', 'On the Origin of Species'), P('Cosmos', 'Carl Sagan'), L('Relatividade', 'Albert Einstein', 'Relativity: The Special and General Theory'), P('Uma Breve História do Tempo', 'Stephen Hawking'), P('O Gene', 'Siddhartha Mukherjee'), P('O Mundo Assombrado pelos Demônios', 'Carl Sagan')],
  poesia: [L('Os Lusíadas', 'Luís de Camões', 'Os Lusíadas', 'Camões'), P('A Rosa do Povo', 'Carlos Drummond de Andrade'), L('Sonetos Completos', 'Antero de Quental', 'Os sonetos completos de Anthero de Quental', 'Quental'), L('Folhas de Relva', 'Walt Whitman', 'Leaves of Grass'), L('Cantos', 'Gonçalves Dias', 'Cantos: Collecção de poesias', 'Dias'), P('Antologia Poética', 'Vinicius de Moraes')],
  tecnico: [P('Código Limpo', 'Robert C. Martin'), P('O Programador Pragmático', 'Andrew Hunt e David Thomas'), P('Entendendo Algoritmos', 'Aditya Y. Bhargava'), P('Arquitetura Limpa', 'Robert C. Martin'), P('Padrões de Projeto', 'Erich Gamma e outros')],
  'romance-lit': [L('Orgulho e Preconceito', 'Jane Austen', 'Pride and Prejudice'), P('Pessoas Normais', 'Sally Rooney'), L('A Escrava Isaura', 'Bernardo Guimarães', 'A escrava Isaura'), L('O Morro dos Ventos Uivantes', 'Emily Brontë', 'Wuthering Heights'), L('Iracema', 'José de Alencar'), P('Como Eu Era Antes de Você', 'Jojo Moyes')],
  traducoes: [L('Os Miseráveis', 'Victor Hugo', 'Les Misérables'), L('Crime e Castigo', 'Fiódor Dostoiévski', 'Crime and Punishment', 'Dostoyevsky'), L('Anna Kariênina', 'Liev Tolstói', 'Anna Karenina', 'Tolstoy'), L('Dom Quixote', 'Miguel de Cervantes', 'Don Quixote'), L('O Conde de Monte Cristo', 'Alexandre Dumas', 'The Count of Monte Cristo'), P('O Estrangeiro', 'Albert Camus')],
  contos: [L('Papéis Avulsos (com O Alienista)', 'Machado de Assis', 'Papeis Avulsos'), P('Laços de Família', 'Clarice Lispector'), L('Histórias sem Data', 'Machado de Assis', 'Historias Sem Data'), P('Sagarana', 'João Guimarães Rosa'), L('Contos de Grimm', 'Irmãos Grimm', "Grimms' Fairy Tales", 'Grimm'), L('Contos', 'Eça de Queirós', 'Contos', 'Quei')],
  cronicas: [L('A Correspondência de Fradique Mendes', 'Eça de Queirós', 'A correspondência de Fradique Mendes', 'Quei'), P('Comédias da Vida Privada', 'Luis Fernando Verissimo'), L('Triste Fim de Policarpo Quaresma', 'Lima Barreto', 'Triste Fim de Polycarpo Quaresma'), P('200 Crônicas Escolhidas', 'Rubem Braga'), P('A Mulher do Vizinho', 'Fernando Sabino')],
  'aventura-lit': [L('A Ilha do Tesouro', 'Robert Louis Stevenson', 'Treasure Island'), P('As Aventuras de Pi', 'Yann Martel'), L('Vinte Mil Léguas Submarinas', 'Júlio Verne', 'Twenty Thousand Leagues under the Sea'), L('A Volta ao Mundo em 80 Dias', 'Júlio Verne', 'Around the World in Eighty Days'), L('Robinson Crusoé', 'Daniel Defoe', 'Robinson Crusoe'), P('O Alquimista', 'Paulo Coelho')],
  'terror-lit': [L('Frankenstein', 'Mary Shelley', 'Frankenstein'), P('O Iluminado', 'Stephen King'), L('Drácula', 'Bram Stoker', 'Dracula'), L('O Médico e o Monstro', 'Robert Louis Stevenson', 'The Strange Case of Dr. Jekyll and Mr. Hyde'), L('O Retrato de Dorian Gray', 'Oscar Wilde', 'The Picture of Dorian Gray'), P('It: A Coisa', 'Stephen King')],
  'ficcao-cientifica-lit': [L('A Máquina do Tempo', 'H. G. Wells', 'The Time Machine'), P('Duna', 'Frank Herbert'), L('A Guerra dos Mundos', 'H. G. Wells', 'The War of the Worlds'), P('Fundação', 'Isaac Asimov'), P('Neuromancer', 'William Gibson'), P('Admirável Mundo Novo', 'Aldous Huxley')],
  teatro: [L('Hamlet', 'William Shakespeare', 'Hamlet'), P('Auto da Compadecida', 'Ariano Suassuna'), L('Romeu e Julieta', 'William Shakespeare', 'Romeo and Juliet'), P('Vestido de Noiva', 'Nelson Rodrigues'), L('Quatro Autos de Gil Vicente', 'Gil Vicente', 'Four Plays of Gil Vicente')],
  filosofia: [L('A República', 'Platão', 'The Republic', 'Plato'), P('O Mundo de Sofia', 'Jostein Gaarder'), L('Assim Falou Zaratustra', 'Friedrich Nietzsche', 'Thus Spake Zarathustra'), L('O Príncipe', 'Nicolau Maquiavel', 'The Prince', 'Machiavelli'), L('Discurso do Método', 'René Descartes', 'Discourse on the Method'), P('O Mito de Sísifo', 'Albert Camus')],
  infantojuvenil: [L('As Aventuras de Tom Sawyer', 'Mark Twain', 'The Adventures of Tom Sawyer'), P('O Menino Maluquinho', 'Ziraldo'), L('Pinóquio', 'Carlo Collodi', 'The Adventures of Pinocchio'), L('O Jardim Secreto', 'Frances Hodgson Burnett', 'The Secret Garden'), L('Mulherzinhas', 'Louisa May Alcott', 'Little Women'), P('A Bolsa Amarela', 'Lygia Bojunga')],
  quadrinhos: [P('Maus', 'Art Spiegelman'), P('Persépolis', 'Marjane Satrapi'), P('Daytripper', 'Fábio Moon e Gabriel Bá'), P('Watchmen', 'Alan Moore e Dave Gibbons'), P('Turma da Mônica: Laços', 'Vitor e Lu Cafaggi')],
};

export interface LivroIndicado {
  titulo: string;
  autor: string;
  genero: string;
  capa: string | null;
  /** Versão gratuita que abre no leitor da plataforma, quando existe. */
  gratis: ItemGratis | null;
  /** Busca do título na Amazon (quando não é gratuito). */
  compra: string;
}

export const linkDeCompra = (titulo: string, autor: string) =>
  `https://www.amazon.com.br/s?${new URLSearchParams({ k: `${titulo} ${autor}`, i: 'stripbooks' })}`;

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const sobrenome = (autor: string) => normal(autor.split(/ e | and /)[0]).split(' ').filter((w) => w.length > 2).pop() ?? '';

// Confere se o resultado do acervo é mesmo a obra: sobrenome do autor e as
// palavras principais do título precisam bater.
function mesmaObra(achado: { titulo: string; autor: string | null }, i: Indicacao): boolean {
  const autorOk = normal(achado.autor ?? '').includes(normal(i.autorAcervo ?? sobrenome(i.autor)));
  const alvo = [i.original ?? '', i.titulo].map(normal).filter(Boolean);
  const t = normal(achado.titulo);
  const tituloOk = alvo.some((a) => {
    const palavras = a.split(' ').filter((w) => w.length > 3);
    return palavras.length === 0 ? t.includes(a) : palavras.filter((w) => t.includes(w)).length >= Math.ceil(palavras.length * 0.6);
  });
  return autorOk && tituloOk;
}

const IDIOMA_PG: Record<string, string> = { portuguese: 'pt', english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it' };

// Busca oficial do Projeto Gutenberg (OPDS): responde rápido, ao contrário do
// Gutendex, que às vezes leva dezenas de segundos.
// O Gutenberg derruba rajadas de pedidos: no máximo três buscas ao mesmo tempo.
let emAndamento = 0;
const fila: (() => void)[] = [];
async function comVez<T>(tarefa: () => Promise<T>): Promise<T> {
  if (emAndamento >= 3) await new Promise<void>((ok) => fila.push(ok));
  emAndamento++;
  try { return await tarefa(); } finally { emAndamento--; fila.shift()?.(); }
}

async function buscarNoGutenberg(termo: string): Promise<ItemGratis[]> {
  return comVez(() => buscarNoGutenbergAgora(termo));
}

async function buscarNoGutenbergAgora(termo: string): Promise<ItemGratis[]> {
  const res = await fetch(`https://www.gutenberg.org/ebooks/search.opds/?${new URLSearchParams({ query: termo })}`, {
    next: { revalidate: 604800 }, signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'nexo-social/1.0 (+https://nexo-social.drap.app.br)' },
  });
  if (!res.ok) throw new Error(`Gutenberg respondeu ${res.status}`);
  const xml = await res.text();
  const decod = (t: string) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).flatMap(([, e]) => {
    const id = Number(e.match(/<id>https?:\/\/www\.gutenberg\.org\/ebooks\/(\d+)\.opds<\/id>/)?.[1]);
    const bruto = decod(e.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
    if (!id || !bruto) return [];
    const lingua = bruto.match(/\((Portuguese|English|Spanish|French|German|Italian)\)$/)?.[1];
    const titulo = bruto.replace(/\s*\((Portuguese|English|Spanish|French|German|Italian)\)$/, '');
    const autor = decod(e.match(/<content type="text">([^<]*)<\/content>/)?.[1] ?? '') || null;
    return [{
      id: `gutenberg:${id}`, midia: { tipo: 'livro', gutenberg: id } as const, titulo, autor, ano: null,
      capa: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`, fonte: 'Projeto Gutenberg' as const,
      idioma: lingua ? IDIOMA_PG[lingua.toLowerCase()] : null, link: `https://www.gutenberg.org/ebooks/${id}`,
    }];
  });
}

const cache = new Map<string, { em: number; valor: ItemGratis | null }>();
const DOZE_HORAS = 12 * 3600 * 1000;

/** Versão gratuita de uma indicação: texto no Gutenberg; senão, audiolivro no LibriVox. */
async function versaoGratis(i: Indicacao): Promise<ItemGratis | null> {
  if (!i.livre) return null;
  const chave = `${i.titulo}|${i.autor}`;
  const salvo = cache.get(chave);
  if (salvo && Date.now() - salvo.em < DOZE_HORAS) return salvo.valor;
  let valor: ItemGratis | null = null;
  try {
    const autor = normal(i.autorAcervo ?? sobrenome(i.autor));
    // Primeiro pelo título em português (edição brasileira/portuguesa), depois pelo original.
    const termos = Array.from(new Set([`${i.titulo} ${autor}`, `${i.original ?? i.titulo} ${autor}`]));
    const livros = (await Promise.all(termos.map((t) => buscarNoGutenberg(t).catch(() => [] as ItemGratis[])))).flat();
    // Português primeiro; depois o inglês (o Gutenberg não marca o idioma dele); por último, outros.
    const peso = (l: ItemGratis) => (l.idioma === 'pt' ? 0 : !l.idioma || l.idioma === 'en' ? 1 : 2);
    const certos = livros.filter((l) => mesmaObra(l, i)).sort((a, b) => peso(a) - peso(b));
    valor = certos[0] ?? null;
    if (!valor) {
      const titulo = (i.original ?? i.titulo).replace(/[()":]/g, ' ');
      const audios = (await buscarNoArchive(`collection:(librivoxaudio) AND title:(${titulo})`, 6)).map((d) => doArchive(d, 'audio', 'LibriVox'));
      valor = audios.find((a) => mesmaObra(a, i)) ?? null;
    }
  } catch {
    // Acervo fora do ar: não guarda no cache, tenta de novo na próxima.
    return null;
  }
  cache.set(chave, { em: Date.now(), valor });
  return valor;
}

async function capaDaOpenLibrary(i: Indicacao): Promise<string | null> {
  try {
    const qs = new URLSearchParams({ title: i.titulo, author: i.autor.split(/ e /)[0], limit: '1', fields: 'cover_i' });
    const res = await fetch(`https://openlibrary.org/search.json?${qs}`, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(8000) });
    const cover = (await res.json())?.docs?.[0]?.cover_i;
    return cover ? `https://covers.openlibrary.org/b/id/${cover}-M.jpg` : null;
  } catch {
    return null;
  }
}

export async function livrosIndicados(generos: string[], porGenero = 4): Promise<LivroIndicado[]> {
  const escolhidos = (generos.length ? generos : ['ficcao-lit', 'traducoes']).filter((g) => INDICACOES[g]).slice(0, 3);
  // A cada dia, outra fatia da lista de cada gênero.
  const dia = Math.floor(Date.now() / 86400000);
  const lista = escolhidos.flatMap((g) => {
    const todos = INDICACOES[g];
    return Array.from({ length: Math.min(porGenero, todos.length) }, (_, k) => ({ g, i: todos[(dia + k) % todos.length] }));
  });
  return Promise.all(lista.map(async ({ g, i }) => {
    const [gratis, capa] = await Promise.all([versaoGratis(i), capaDaOpenLibrary(i)]);
    return { titulo: i.titulo, autor: i.autor, genero: g, capa: capa ?? gratis?.capa ?? null, gratis, compra: linkDeCompra(i.titulo, i.autor) };
  }));
}
