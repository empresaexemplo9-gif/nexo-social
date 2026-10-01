// Montagem da Revista — o que é notícia agora, no formato da casa. Funções
// puras (sem rede e sem cache), separadas de lib/revista.ts para poderem ser
// testadas direto: ver tests/revista.test.cjs.
//
// O caminho de uma matéria:
//   1. As notícias recentes do tema (feeds dos veículos, lib/noticias.ts) são
//      agrupadas por assunto: o mesmo nome próprio no título, ou as mesmas
//      palavras.
//   2. O assunto de cada grupo é o nome próprio mais citado que existe na
//      Wikipédia e combina com o tema e com as notícias (nada de "Lula" o
//      molusco numa notícia de cultura).
//   3. A foto é a maior que o veículo publica para a matéria (og:image da
//      página), não a miniatura do feed.
//   4. O texto junta o resumo do veículo (citado, com link), o "Por que está
//      em pauta" (contado pela plataforma: quantas notícias, quais veículos,
//      desde quando), a repercussão nos outros veículos, o "Para entender" e o
//      "Você sabia?" tirados do verbete — com todas as fontes no fim.

import type { CategorySlug } from './data';
import type { Imagem } from './wikipedia';
import { decodificarHtml, encurtar, textoPuro, urlSegura, type Noticia } from './noticias-parser';

// ---------------------------------------------------------------------------
// Tipos

export interface Foto {
  url: string;
  largura: number | null;
  altura: number | null;
  /** "Foto: reprodução/g1", "Foto: Fulana/Agência Brasil"… */
  credito: string;
  /** Onde a foto foi publicada (a matéria do veículo ou a página do arquivo). */
  pagina: string | null;
}

/** O que a página da matéria do veículo diz de si mesma (cabeçalho <meta>). */
export interface PaginaDaMateria {
  foto: { url: string; largura: number | null; altura: number | null } | null;
  descricao: string | null;
  autor: string | null;
}

/** O assunto da matéria na Wikipédia. */
export interface Entidade {
  /** Como o nome aparece nas notícias ("NBA"). */
  nome: string;
  /** Título do verbete ("National Basketball Association"). */
  titulo: string;
  descricao: string | null;
  /** Os primeiros parágrafos do verbete. */
  resumo: string;
  url: string;
  imagem: Imagem | null;
  curiosidades: string[];
  linhaDoTempo: { ano: number; texto: string }[];
}

export interface ItemDeRepercussao {
  fonte: string;
  titulo: string;
  resumo: string;
  link: string;
  publicadaEm: string;
}

export interface MateriaAtual {
  tema: CategorySlug;
  id: string;
  titulo: string;
  linhaFina: string | null;
  /** O resumo do veículo — citado, com link para a matéria completa. */
  abertura: string;
  fonte: { nome: string; site: string; link: string; publicadaEm: string; autor: string | null; licenca: string | null };
  capa: Foto | null;
  /** "Por que está em pauta": o que a plataforma contou nas notícias do tema. */
  emPauta: string[];
  repercussao: ItemDeRepercussao[];
  contexto: { nome: string; titulo: string; descricao: string | null; paragrafos: string[]; url: string; imagem: Imagem | null } | null;
  curiosidades: string[];
  linhaDoTempo: { ano: number; texto: string }[];
  leituraMin: number;
  fontes: { rotulo: string; url: string; licenca: string }[];
  montadaEm: string;
}

export interface ChamadaAtual {
  tema: CategorySlug;
  id: string;
  titulo: string;
  resumo: string;
  imagem: Foto | null;
  /** Segunda opção, se a foto do veículo não abrir (a do verbete). */
  reserva: string | null;
  fonte: string;
  publicadaEm: string;
  assunto: string | null;
  veiculos: number;
}

export interface EdicaoAtual {
  tema: CategorySlug;
  montadaEm: string;
  capa: ChamadaAtual | null;
  chamadas: ChamadaAtual[];
  vocesabia: { texto: string; de: string; id: string }[];
  videos: { id: string; titulo: string; canal: string; capa: string }[];
  fontes: string[];
}

// ---------------------------------------------------------------------------
// Palavras e nomes

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const VAZIAS = new Set(
  (
    'a o as os um uma uns umas de da do das dos em na no nas nos num numa por pela pelo pelas pelos para pra pro com sem sob sobre ' +
    'entre ate apos ante contra desde e ou mas que se como quando onde quem qual quais cujo ja nao sim mais menos muito muita muitos ' +
    'muitas pouco seu sua seus suas meu minha ele ela eles elas voce isso isto esse essa esses essas este esta estes estas aquele aquela ' +
    'ao aos foi era sao ser estar estao esta tem ter teve vai vao fica ficam diz dizem segundo novo nova novos novas veja saiba entenda ' +
    'confira hoje ontem amanha ano anos dia dias semana vez vezes ainda tambem so depois antes agora apenas sera serao pode podem ' +
    'durante nesta neste nessa nesse deste desta dessa desse aqui ali la isso tudo todo toda todos todas outro outra outros outras ' +
    'cada mesmo mesma onde porque pois assim entao enquanto feito feita faz fazer the of and in on at to for with is are'
  ).split(' '),
);

/** Palavras de um texto, sem acento, sem as vazias, reduzidas aos 6 primeiros caracteres. */
export function palavrasChave(texto: string): Set<string> {
  const saida = new Set<string>();
  for (const p of normalizar(texto).match(/[a-z0-9]+/g) ?? []) {
    if (p.length < 4 || VAZIAS.has(p) || /^\d+$/.test(p)) continue;
    saida.add(p.length > 6 ? p.slice(0, 6) : p);
  }
  return saida;
}

const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'della', 'di', 'du', 'la', 'le', 'van', 'von', 'der', 'of', 'the', 'in', 'y', '&', "n'"]);
const MAIUSCULA = /^(?:[A-ZÀ-ÖØ-Þ]|[a-z]{1,2}[A-Z])/;
const ARTIGOS = new Set(['o', 'a', 'os', 'as']);

/** Nomes que aparecem em toda parte e não dizem de que a notícia trata. */
const GENERICOS = new Set([
  'brasil', 'brasileiro', 'brasileira', 'brasileiros', 'brasileiras', 'eua', 'estados unidos', 'sao paulo', 'rio de janeiro', 'rio', 'sp', 'rj',
  'portugal', 'europa', 'china', 'mundo', 'governo', 'governo federal', 'prefeitura', 'congresso', 'stf', 'pf',
  'globo', 'tv globo', 'g1', 'ge', 'folha', 'estadao', 'o globo', 'veja', 'uol', 'agencia brasil', 'cnn', 'bbc', 'reuters', 'afp',
  'netflix', 'globoplay', 'youtube', 'instagram', 'tiktok', 'spotify', 'twitter', 'facebook', 'whatsapp', 'prime video', 'disney', 'max', 'hbo',
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'ia', 'covid', 'sus',
]);
/** Lugares: genéricos em quase todo tema, mas o assunto em Viagem. */
const LUGARES = new Set(['brasil', 'eua', 'estados unidos', 'sao paulo', 'rio de janeiro', 'rio', 'portugal', 'europa', 'china', 'mundo']);

/** Substantivos comuns que só são nome dentro de um nome maior ("Bienal do Livro", "Round 6"). */
const COMUNS = new Set(
  (
    'show filme serie festival album disco jogo game livro bienal premio copa campeonato torneio time clube museu teatro mostra feira ' +
    'semana temporada round parte volume capitulo edicao festa turne evento exposicao cinema musica moda arte cultura esporte tecnologia ' +
    'saude viagem gastronomia tour estadio arena parque hospital universidade escola instituto fundacao secretaria ministerio presidente ' +
    'governador prefeito cantor cantora ator atriz diretor diretora chef artista banda grupo cidade estado'
  ).split(' '),
);

/** Genérico mesmo com artigo na frente ("A Netflix"); palavra comum sozinha também. */
const generico = (chave: string) => {
  const nucleo = chave.replace(/^(o|a|os|as) /, '');
  return GENERICOS.has(nucleo) || COMUNS.has(nucleo);
};
const lugar = (chave: string) => LUGARES.has(chave.replace(/^(o|a|os|as) /, ''));

export interface Nome {
  texto: string;
  chave: string;
  /** Palavras do nome, sem contar os conectores. */
  palavras: number;
  /** Começa a frase: a maiúscula pode ser só da frase ("Show de…", "Anitta lança…"). */
  inicial: boolean;
}

/** Título "Em Caixa Alta Em Toda Palavra": os nomes do título não dizem nada. */
function emCaixaDeTitulo(palavras: string[]): boolean {
  const contaveis = palavras.filter((p) => !CONECTORES.has(p.toLowerCase()) && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(p));
  // Manchete cheia de nomes ("Kleber Mendonça Filho comemora indicação de O Agente Secreto") passa de 70%; caixa de título é quase tudo.
  return contaveis.length >= 5 && contaveis.filter((p) => MAIUSCULA.test(p)).length / contaveis.length >= 0.85;
}

/**
 * Os nomes próprios de um texto em português: sequências de palavras com
 * maiúscula, com "de/da/do/in…" no meio ("Festival de Cannes", "Rock in
 * Rio") e número no fim ("GTA 6"). De cada nome também saem as partes ("Show
 * de Taylor Swift" → "Show", "Taylor Swift"), a forma sem o artigo inicial
 * ("A Netflix" → "Netflix") e a forma sem o ano ("Rock in Rio 2026").
 */
export function nomesProprios(texto: string): Nome[] {
  const saida = new Map<string, Nome>();
  const guardar = (tokens: string[], inicial: boolean) => {
    while (tokens.length && CONECTORES.has(tokens[tokens.length - 1].toLowerCase())) tokens = tokens.slice(0, -1);
    while (tokens.length && CONECTORES.has(tokens[0].toLowerCase())) tokens = tokens.slice(1);
    if (!tokens.length) return;
    const palavras = tokens.filter((t, k) => !CONECTORES.has(t.toLowerCase()) && !(k === 0 && ARTIGOS.has(t.toLowerCase()))).length;
    const t = tokens.join(' ');
    const chave = normalizar(t);
    if (palavras === 0 || (palavras === 1 && tokens.length === 1 && (VAZIAS.has(chave) || chave.length < 2 || /^\d+$/.test(chave)))) return;
    const ja = saida.get(chave);
    if (!ja || (ja.inicial && !inicial)) saida.set(chave, { texto: t, chave, palavras, inicial });
  };

  for (const segmento of texto.split(/[.!?:;|()[\]{}“”"«»…]+|\s[-–—]\s/)) {
    const brutos = segmento.split(/\s+/).filter(Boolean);
    const tokens = brutos.map((b) => b.replace(/^[,'‘’`*#@]+|[,'‘’`*]+$/g, ''));
    // Vírgula fecha o nome: "O Agente Secreto, de Kleber Mendonça Filho".
    const virgula = brutos.map((b) => /,['’"”]*$/.test(b));
    if (emCaixaDeTitulo(tokens)) continue;
    for (let i = 0; i < tokens.length; ) {
      if (!tokens[i] || !MAIUSCULA.test(tokens[i])) {
        i++;
        continue;
      }
      let fim = i;
      for (let j = i + 1; j < tokens.length && !virgula[fim]; ) {
        if (MAIUSCULA.test(tokens[j])) fim = j++;
        else if (/^\d{1,4}$/.test(tokens[j]) && fim === j - 1) fim = j++;
        else if (CONECTORES.has(tokens[j]) && !virgula[j] && j + 1 < tokens.length && MAIUSCULA.test(tokens[j + 1])) j++;
        else break;
      }
      let run = tokens.slice(i, fim + 1);
      let inicial = i === 0;
      if (inicial && run.length > 1 && VAZIAS.has(normalizar(run[0]))) {
        // "O Agente Secreto" é título; "Em São Paulo" não é. Nos dois, o que vem depois é nome de verdade.
        if (ARTIGOS.has(normalizar(run[0]))) guardar(run, true);
        run = run.slice(1);
        inicial = false;
      } else if (inicial && run.length > 1 && !CONECTORES.has(run[1])) {
        // "Cantora Anitta lança…": a primeira palavra pode ser só a maiúscula da frase.
        guardar(run.slice(1), false);
      }
      guardar(run, inicial);
      if (run.length > 1 && /^\d{1,4}$/.test(run[run.length - 1])) guardar(run.slice(0, -1), inicial);
      // As partes entre conectores, e o começo até cada conector.
      const cortes = run.map((t, k) => (CONECTORES.has(t) ? k : -1)).filter((k) => k > 0);
      if (cortes.length) {
        let antes = 0;
        for (const c of [...cortes, run.length]) {
          guardar(run.slice(antes, c), inicial && antes === 0);
          if (c < run.length) guardar(run.slice(0, c), inicial);
          antes = c + 1;
        }
      }
      i = fim + 1;
    }
  }
  return Array.from(saida.values());
}

/** Os nomes de uma notícia, separando o que é nome com certeza (forte) do que pode ser só a maiúscula da frase. */
export function nomesDaNoticia(n: Pick<Noticia, 'titulo' | 'resumo'>): { titulo: Nome[]; resumo: Nome[]; fortes: Set<string>; fortesDoTitulo: Set<string> } {
  const titulo = nomesProprios(n.titulo);
  const resumo = nomesProprios(n.resumo);
  const confirmados = new Set([...titulo, ...resumo].filter((x) => !x.inicial).map((x) => x.chave));
  const forte = (x: Nome) => !generico(x.chave) && (x.palavras >= 2 || ((!x.inicial || confirmados.has(x.chave)) && x.chave.length >= 3));
  return {
    titulo,
    resumo,
    fortes: new Set([...titulo, ...resumo].filter(forte).map((x) => x.chave)),
    fortesDoTitulo: new Set(titulo.filter(forte).map((x) => x.chave)),
  };
}

// ---------------------------------------------------------------------------
// Agrupar por assunto

interface Ficha {
  n: Noticia;
  nomes: ReturnType<typeof nomesDaNoticia>;
  palavras: Set<string>;
}

function ficha(n: Noticia): Ficha {
  return { n, nomes: nomesDaNoticia(n), palavras: palavrasChave(`${n.titulo} ${n.resumo}`) };
}

function mesmoAssunto(a: Ficha, b: Ficha): boolean {
  // O mesmo nome no título das duas, ou o mesmo nome composto em qualquer parte.
  for (const k of Array.from(a.nomes.fortesDoTitulo)) if (b.nomes.fortesDoTitulo.has(k)) return true;
  for (const k of Array.from(a.nomes.fortes)) if (k.includes(' ') && b.nomes.fortes.has(k)) return true;
  // Ou as mesmas palavras: pelo menos 3, e metade das do texto menor.
  let comuns = 0;
  for (const p of Array.from(a.palavras)) if (b.palavras.has(p)) comuns++;
  return comuns >= 3 && comuns / Math.min(a.palavras.size, b.palavras.size) >= 0.5;
}

/** A notícia que abre o grupo: com foto, com resumo de verdade, e a mais nova. */
function nota(n: Noticia): number {
  return (n.imagem ? 2 : 0) + (n.resumo.length >= 120 ? 1 : 0);
}

export const MAX_POR_GRUPO = 6;

/** Agrupa as notícias por assunto. Cada grupo vem com a notícia principal primeiro. */
export function agruparPorAssunto(noticias: Noticia[]): Noticia[][] {
  const fichas = [...noticias].sort((a, b) => Date.parse(b.publicadaEm) - Date.parse(a.publicadaEm)).map(ficha);
  const grupos: Ficha[][] = [];
  for (const f of fichas) {
    const g = grupos.find((x) => x.length < MAX_POR_GRUPO && mesmoAssunto(x[0], f));
    if (g) g.push(f);
    else grupos.push([f]);
  }
  return grupos.map((g) => {
    const itens = g.map((x) => x.n);
    const principal = itens.reduce((m, x) => (nota(x) > nota(m) ? x : m), itens[0]);
    return [principal, ...itens.filter((x) => x !== principal)];
  });
}

/** O grupo da notícia `id`, com ela como principal — o endereço da matéria não muda quando o grupo cresce. */
export function grupoDaNoticia(noticias: Noticia[], id: string): Noticia[] | null {
  const g = agruparPorAssunto(noticias).find((x) => x.some((n) => n.id === id));
  if (!g) return null;
  const principal = g.find((n) => n.id === id)!;
  return [principal, ...g.filter((n) => n !== principal)];
}

/** Os grupos em ordem de capa: mais veículos falando, mais recente, com foto. */
export function ordenarGrupos(grupos: Noticia[][], agora: number = Date.now()): Noticia[][] {
  const pontos = (g: Noticia[]) => {
    const veiculos = new Set(g.map((n) => n.fonte)).size;
    const horas = (agora - Math.max(...g.map((n) => Date.parse(n.publicadaEm)))) / 3_600_000;
    return 3 * veiculos + Math.min(g.length, 4) + (horas <= 24 ? 3 : horas <= 72 ? 1.5 : 0) + (g[0].imagem ? 1 : 0);
  };
  return grupos
    .map((g) => ({ g, p: pontos(g) }))
    .sort((a, b) => b.p - a.p || Date.parse(b.g[0].publicadaEm) - Date.parse(a.g[0].publicadaEm))
    .map((x) => x.g);
}

// ---------------------------------------------------------------------------
// O assunto na Wikipédia

/**
 * Nomes do grupo para procurar na Wikipédia, do mais provável ao menos: o
 * que mais aparece (título da principal pesa mais) e, no empate, o mais longo.
 */
export function candidatosAoAssunto(grupo: Noticia[], tema: CategorySlug, max = 12): string[] {
  const pontos = new Map<string, { texto: string; p: number; palavras: number }>();
  grupo.forEach((n, i) => {
    const { titulo, resumo, fortes } = nomesDaNoticia(n);
    const somar = (lista: Nome[], peso: number) => {
      for (const x of lista) {
        if (generico(x.chave) && !(tema === 'viagem' && lugar(x.chave))) continue;
        if (!/^[^#<>[\]{}|_]{2,80}$/.test(x.texto) || x.chave.length < 3) continue;
        // Nome que pode ser só a maiúscula da frase ("Anitta lança…") entra com meio peso: a Wikipédia decide.
        const p = fortes.has(x.chave) || (tema === 'viagem' && lugar(x.chave)) ? peso : peso / 2;
        const atual = pontos.get(x.chave) ?? { texto: x.texto, p: 0, palavras: x.palavras };
        atual.p += p;
        pontos.set(x.chave, atual);
      }
    };
    somar(titulo, i === 0 ? 4 : 2);
    somar(resumo, i === 0 ? 2 : 1);
  });
  return Array.from(pontos.values())
    .sort((a, b) => b.p - a.p || b.palavras - a.palavras || b.texto.length - a.texto.length)
    .slice(0, max)
    .map((x) => x.texto);
}

/** O vocabulário que um verbete do tema costuma ter (radicais sem acento). */
export const VOCABULARIO: Record<CategorySlug, string[]> = {
  tecnologia: ['tecnolog', 'empresa', 'software', 'aplicativ', 'smartphone', 'computa', 'internet', 'inteligencia artificial', 'rede social', 'startup', 'chip', 'processador', 'sistema operacional', 'eletronic', 'digital', 'plataforma', 'dispositivo', 'satelite', 'foguete'],
  musica: ['cantor', 'banda', 'grupo musical', 'music', 'compositor', 'album', 'rapper', 'gravadora', 'festival', 'instrument', 'dupla', 'sertanej', 'samba', 'rock', 'funk', 'orquestra', 'cancao', 'canco', 'turne', 'show'],
  moda: ['moda', 'estilista', 'grife', 'marca', 'modelo', 'designer', 'vestu', 'roupa', 'desfile', 'fashion', 'costura', 'empresari', 'colecao', 'calcado', 'joia'],
  cultura: ['cultur', 'festival', 'teatro', 'museu', 'patrimonio', 'carnaval', 'artista', 'evento', 'festa', 'tradic', 'televis', 'novela', 'programa', 'ator', 'atriz', 'apresentador', 'reality'],
  esporte: ['futebol', 'clube', 'jogador', 'atleta', 'piloto', 'tenista', 'campeonato', 'selecao', 'esport', 'time', 'lutador', 'olimpi', 'competic', 'torneio', 'treinador', 'tecnico', 'estadio', 'liga', 'corrida', 'medalha'],
  cinema: ['filme', 'cinema', 'ator', 'atriz', 'diretor', 'diretora', 'cineasta', 'serie', 'televis', 'estudio', 'produtora', 'streaming', 'animac', 'roteir', 'festival', 'premio', 'longa-metragem'],
  livros: ['escritor', 'livro', 'romance', 'poeta', 'poetisa', 'autor', 'editora', 'literat', 'obra', 'premio', 'romancista', 'cronista', 'quadrinh', 'jornalista', 'academia brasileira de letras'],
  gastronomia: ['chef', 'restaurante', 'culinar', 'prato', 'cozinh', 'bebida', 'vinho', 'cafe', 'comida', 'alimento', 'gastronom', 'doce', 'cerveja', 'receita', 'ingrediente', 'fruta', 'queijo'],
  viagem: ['cidade', 'pais', 'ilha', 'praia', 'parque', 'turis', 'destino', 'capital', 'municipio', 'regiao', 'estado', 'arquipelago', 'montanha', 'patrimonio', 'aeroporto', 'companhia aerea', 'hotel', 'litoral', 'continente'],
  games: ['jogo', 'videogame', 'desenvolvedora', 'console', 'franquia', 'eletronic', 'game', 'publicadora', 'estudio', 'esport', 'personagem'],
  'bem-estar': ['saude', 'doenca', 'medic', 'vacina', 'exercicio', 'nutric', 'sindrome', 'tratamento', 'hospital', 'pesquisa', 'sono', 'alimenta', 'psicolog', 'mental', 'fisic', 'virus'],
  arte: ['artista', 'pintor', 'pintora', 'museu', 'exposic', 'escultor', 'fotograf', 'bienal', 'galeria', 'arte', 'obra', 'instalac', 'modernis'],
};

/**
 * O verbete achado é mesmo o assunto? O texto dele tem de falar a língua do
 * tema ou das notícias. Nome de uma palavra só precisa de mais prova — é o
 * que barra "Lula" (o molusco) numa notícia de cultura.
 */
export function verbeteCombina(
  verbete: { titulo: string; descricao: string | null; resumo: string },
  grupo: Pick<Noticia, 'titulo' | 'resumo'>[],
  tema: CategorySlug,
  nome: string,
): boolean {
  if (/^lista d[eo]s? /i.test(verbete.titulo) || /^\d+$/.test(verbete.titulo)) return false;
  const proprias = palavrasChave(`${verbete.titulo} ${nome}`);
  const texto = normalizar(`${verbete.descricao ?? ''} ${verbete.resumo.slice(0, 900)}`);
  const doVerbete = Array.from(palavrasChave(texto)).filter((p) => !proprias.has(p));
  const doGrupo = palavrasChave(grupo.map((n) => `${n.titulo} ${n.resumo}`).join(' '));
  const noGrupo = doVerbete.filter((p) => doGrupo.has(p)).length;
  const palavrasDoTexto = texto.match(/[a-z0-9-]+/g) ?? [];
  const doTema = (VOCABULARIO[tema] ?? []).filter((v) => (v.includes(' ') ? texto.includes(v) : palavrasDoTexto.some((p) => p.startsWith(v)))).length;
  const composto = nome.trim().split(/\s+/).filter((t) => !CONECTORES.has(t.toLowerCase())).length >= 2;
  return composto ? doTema + noGrupo >= 1 : doTema >= 2 || (doTema >= 1 && noGrupo >= 1) || noGrupo >= 3;
}

// ---------------------------------------------------------------------------
// A página da matéria no veículo

function atributo(tag: string, nome: string): string | null {
  const m = new RegExp(`\\s${nome}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag);
  return m ? decodificarHtml(m[1] ?? m[2] ?? m[3] ?? '').trim() : null;
}

/** Foto que é logotipo, padrão do site ou marcador — não serve de capa. */
const FOTO_PADRAO = /(^|[/._-])(logo|logos|logotipo|default|padrao|placeholder|fallback|share-?default|og-?default|avatar|icon|icone|sprite|blank)([/._-]|$)/i;

/** A maior versão de uma foto que o próprio endereço já entrega (WordPress, Blogger, Jetpack). */
export function fotoMaior(url: string): string {
  try {
    const u = new URL(url);
    if (/(^|\.)(blogger\.googleusercontent\.com|bp\.blogspot\.com)$/i.test(u.hostname)) {
      u.pathname = u.pathname.replace(/\/[swh]\d{2,4}(-[a-z0-9-]*)?\//i, '/s1600/').replace(/=[swh]\d{2,4}(-[a-z0-9-]*)?$/i, '=s1600');
    } else if (/^i[0-3]\.wp\.com$/i.test(u.hostname)) {
      for (const k of ['resize', 'fit', 'w', 'h']) u.searchParams.delete(k);
    } else if (u.pathname.includes('/wp-content/uploads/')) {
      u.pathname = u.pathname.replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp|avif))$/i, '$1');
    }
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.href;
  } catch {
    return url;
  }
}

/** "g1.globo.com" → "globo.com"; "agenciabrasil.ebc.com.br" → "ebc.com.br". */
function dominioBase(host: string): string {
  const partes = host.toLowerCase().replace(/\.$/, '').split('.');
  return partes.slice(/\.(com|org|net|gov|edu|art|blog|jor)\.br$/.test(host) ? -3 : -2).join('.');
}

/**
 * A página da matéria só é buscada no domínio do próprio veículo, por https
 * ou http com nome (nunca IP ou localhost): um feed adulterado não faz o
 * servidor abrir endereço interno.
 */
export function podeBuscarPagina(link: string, site: string): boolean {
  try {
    const u = new URL(link);
    const s = new URL(site);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (u.port && u.port !== '80' && u.port !== '443') return false;
    if (/^[\d.]+$/.test(u.hostname) || u.hostname.includes(':') || u.hostname.startsWith('[') || !u.hostname.includes('.')) return false;
    return dominioBase(u.hostname) === dominioBase(s.hostname);
  } catch {
    return false;
  }
}

/** Lê o <head> da matéria: a foto de compartilhamento (og:image), a descrição e o autor. */
export function lerPaginaDaMateria(html: string, base: string): PaginaDaMateria {
  const cabeca = html.slice(0, Math.max(0, html.search(/<\/head\s*>/i)) || html.length);
  const metas = new Map<string, string>();
  for (const m of Array.from(cabeca.matchAll(/<meta\b[^>]*>/gi))) {
    const chave = (atributo(m[0], 'property') || atributo(m[0], 'name') || atributo(m[0], 'itemprop') || '').toLowerCase();
    const valor = atributo(m[0], 'content');
    if (chave && valor && !metas.has(chave)) metas.set(chave, valor);
  }
  const imageSrc = /<link\b[^>]*\brel\s*=\s*["']?image_src["']?[^>]*>/i.exec(cabeca);
  const candidatas = [
    metas.get('og:image:secure_url'),
    metas.get('og:image'),
    metas.get('og:image:url'),
    metas.get('twitter:image'),
    metas.get('twitter:image:src'),
    metas.get('image'),
    imageSrc ? atributo(imageSrc[0], 'href') : null,
  ];
  const numero = (s: string | undefined) => {
    const n = s ? parseInt(s, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const largura = numero(metas.get('og:image:width'));
  const altura = numero(metas.get('og:image:height'));
  let foto: PaginaDaMateria['foto'] = null;
  for (const c of candidatas) {
    const url = urlSegura(c, base);
    if (!url) continue;
    const u = new URL(url);
    if (/\.(svg|gif|ico)$/i.test(u.pathname) || FOTO_PADRAO.test(u.pathname)) continue;
    if (largura !== null && largura < 400) continue;
    foto = { url: fotoMaior(url), largura, altura };
    break;
  }
  const descricao = textoPuro(metas.get('og:description') || metas.get('description') || metas.get('twitter:description') || '');
  const autor = metas.get('author') || metas.get('article:author') || null;
  return {
    foto,
    descricao: descricao ? encurtar(descricao, 420) : null,
    autor: autor && !/^https?:\/\//i.test(autor) && autor.length <= 80 ? textoPuro(autor) : null,
  };
}

// ---------------------------------------------------------------------------
// Texto

const FUSO = 'America/Sao_Paulo';
/** "28 de setembro" (com o ano, se não for o ano de `agora`). */
export function dataPorExtenso(iso: string, agora: number = Date.now()): string {
  const d = new Date(iso);
  const ano = d.toLocaleDateString('pt-BR', { year: 'numeric', timeZone: FUSO });
  const esteAno = new Date(agora).toLocaleDateString('pt-BR', { year: 'numeric', timeZone: FUSO });
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', ...(ano === esteAno ? {} : { year: 'numeric' }), timeZone: FUSO });
}

/** "g1", "g1 e Folha", "g1, Folha e Estadão". */
export function listaDeNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

const escaparRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** As notícias do tema que citam o nome (palavra inteira, sem acento). */
export function mencoes(noticias: Noticia[], nome: string): Noticia[] {
  const re = new RegExp(`(^|[^a-z0-9])${escaparRe(normalizar(nome))}([^a-z0-9]|$)`);
  return noticias.filter((n) => re.test(normalizar(`${n.titulo} ${n.resumo}`)));
}

/**
 * "Por que está em pauta": o que a plataforma contou. Quantas notícias do
 * tema citam o assunto, em quais veículos, quando saiu a primeira e a última.
 */
export function porQueEstaEmPauta(nome: string, rotuloDoTema: string, citam: Noticia[], dias: number, agora: number = Date.now()): string[] {
  if (!citam.length) return [];
  const ordem = [...citam].sort((a, b) => Date.parse(a.publicadaEm) - Date.parse(b.publicadaEm));
  const veiculos = Array.from(new Set(ordem.map((n) => n.fonte)));
  const primeira = ordem[0];
  const ultima = ordem[ordem.length - 1];
  if (ordem.length === 1) {
    return [`Entre as notícias de ${rotuloDoTema} dos últimos ${dias} dias, só ${primeira.fonte} tratou de ${nome} até agora — a matéria saiu em ${dataPorExtenso(primeira.publicadaEm, agora)}.`];
  }
  const saida = [
    `${nome} está em ${ordem.length} notícias de ${rotuloDoTema} dos últimos ${dias} dias, ${veiculos.length > 1 ? `de ${veiculos.length} veículos: ${listaDeNomes(veiculos)}` : `todas de ${veiculos[0]}`}.`,
  ];
  const d1 = dataPorExtenso(primeira.publicadaEm, agora);
  const d2 = dataPorExtenso(ultima.publicadaEm, agora);
  saida.push(
    d1 === d2
      ? `Todas saíram em ${d1} — a primeira por ${primeira.fonte}.`
      : `A primeira saiu em ${d1}, por ${primeira.fonte}; a mais recente, em ${d2}, por ${ultima.fonte}.`,
  );
  return saida;
}

/** Os primeiros parágrafos do verbete, até ~900 caracteres, cortados em frase inteira. */
export function paragrafosDeContexto(resumo: string, max = 900): string[] {
  const saida: string[] = [];
  let total = 0;
  for (const p of resumo.split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
    if (total + p.length <= max) {
      saida.push(p);
      total += p.length;
      continue;
    }
    if (!saida.length) {
      const frasesDoParagrafo = p.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(])/);
      let corte = '';
      for (const f of frasesDoParagrafo) {
        if ((corte + ' ' + f).length > max) break;
        corte = corte ? `${corte} ${f}` : f;
      }
      saida.push(corte || encurtar(p, max));
    }
    break;
  }
  return saida;
}

/** Agência Brasil publica em CC BY 4.0: texto e foto podem ser reproduzidos com crédito. */
export const licencaDaFonte = (nome: string): string | null => (/ag[êe]ncia brasil/i.test(nome) ? 'CC BY 4.0' : null);

export function montarMateriaAtual({
  tema,
  rotuloDoTema,
  grupo,
  pagina,
  entidade,
  todas,
  dias,
  agora = Date.now(),
}: {
  tema: CategorySlug;
  rotuloDoTema: string;
  grupo: Noticia[];
  pagina: PaginaDaMateria | null;
  entidade: Entidade | null;
  todas: Noticia[];
  dias: number;
  agora?: number;
}): MateriaAtual {
  const [principal, ...outras] = grupo;
  const licenca = licencaDaFonte(principal.fonte);

  // A maior foto: a da página da matéria; senão a do feed (já ampliada); senão a do verbete.
  const daPagina = pagina?.foto ?? null;
  const capa: Foto | null = daPagina
    ? { ...daPagina, credito: licenca ? `Foto: ${principal.fonte} (${licenca})` : `Foto: reprodução/${principal.fonte}`, pagina: principal.link }
    : principal.imagem
      ? { url: fotoMaior(principal.imagem), largura: null, altura: null, credito: licenca ? `Foto: ${principal.fonte} (${licenca})` : `Foto: reprodução/${principal.fonte}`, pagina: principal.link }
      : entidade?.imagem
        ? {
            url: entidade.imagem.url,
            largura: entidade.imagem.largura,
            altura: entidade.imagem.altura,
            credito: `Imagem de arquivo: ${entidade.imagem.autor ?? 'Wikimedia Commons'}${entidade.imagem.licenca ? `, ${entidade.imagem.licenca}` : ''}`,
            pagina: entidade.imagem.pagina,
          }
        : null;

  // O resumo mais completo que o veículo publicou.
  const abertura = [pagina?.descricao ?? '', principal.resumo].sort((a, b) => b.length - a.length)[0];

  const contexto = entidade
    ? {
        nome: entidade.nome,
        titulo: entidade.titulo,
        descricao: entidade.descricao,
        paragrafos: paragrafosDeContexto(entidade.resumo),
        url: entidade.url,
        imagem: capa && entidade.imagem && capa.url === entidade.imagem.url ? null : entidade.imagem,
      }
    : null;
  const usadas = new Set((contexto?.paragrafos ?? []).join(' ').split(/(?<=[.!?])\s+/).map((f) => f.slice(0, 80)));
  const curiosidades = (entidade?.curiosidades ?? []).filter((c) => !usadas.has(c.slice(0, 80))).slice(0, 5);
  // A linha do tempo não repete o que já saiu no "Para entender" e no "Você sabia?".
  curiosidades.forEach((c) => usadas.add(c.slice(0, 80)));
  const marcos = (entidade?.linhaDoTempo ?? []).filter((l) => !usadas.has(l.texto.slice(0, 80)));
  const linhaDoTempo = marcos.length >= 3 ? marcos.slice(0, 8) : [];

  const emPauta = entidade ? porQueEstaEmPauta(entidade.nome, rotuloDoTema, mencoes(todas, entidade.nome), dias, agora) : [];
  const repercussao = outras.slice(0, 5).map((n) => ({ fonte: n.fonte, titulo: n.titulo, resumo: n.resumo, link: n.link, publicadaEm: n.publicadaEm }));

  const linhaFina = entidade?.descricao
    ? `${entidade.nome}, ${entidade.descricao.replace(/\.$/, '')}.`
    : null;

  const fontes: MateriaAtual['fontes'] = [
    { rotulo: `${principal.fonte} — “${principal.titulo}”`, url: principal.link, licenca: licenca ?? 'resumo e foto citados, com link para a matéria' },
    ...outras.slice(0, 5).map((n) => ({ rotulo: `${n.fonte} — “${n.titulo}”`, url: n.link, licenca: licencaDaFonte(n.fonte) ?? 'título e resumo citados' })),
  ];
  if (entidade) {
    fontes.push({ rotulo: `Wikipédia — “${entidade.titulo}”`, url: entidade.url, licenca: 'CC BY-SA 4.0' });
    if (entidade.imagem?.pagina) fontes.push({ rotulo: `Imagem: ${entidade.imagem.autor ?? 'Wikimedia Commons'}`, url: entidade.imagem.pagina, licenca: entidade.imagem.licenca ?? 'ver página' });
  }

  const palavras = [abertura, ...emPauta, ...repercussao.map((r) => `${r.titulo} ${r.resumo}`), ...(contexto?.paragrafos ?? []), ...curiosidades, ...linhaDoTempo.map((l) => l.texto)]
    .join(' ')
    .split(/\s+/).length;

  return {
    tema,
    id: principal.id,
    titulo: principal.titulo,
    linhaFina,
    abertura,
    fonte: { nome: principal.fonte, site: principal.site, link: principal.link, publicadaEm: principal.publicadaEm, autor: pagina?.autor ?? null, licenca },
    capa,
    emPauta,
    repercussao,
    contexto,
    curiosidades,
    linhaDoTempo,
    leituraMin: Math.max(2, Math.round(palavras / 200)),
    fontes,
    montadaEm: new Date(agora).toISOString(),
  };
}

export function chamadaDaMateria(m: MateriaAtual): ChamadaAtual {
  return {
    tema: m.tema,
    id: m.id,
    titulo: m.titulo,
    resumo: encurtar(m.abertura, 240),
    imagem: m.capa,
    reserva: m.contexto?.imagem && m.contexto.imagem.url !== m.capa?.url ? m.contexto.imagem.url : null,
    fonte: m.fonte.nome,
    publicadaEm: m.fonte.publicadaEm,
    assunto: m.contexto?.nome ?? null,
    veiculos: new Set([m.fonte.nome, ...m.repercussao.map((r) => r.fonte)]).size,
  };
}

/**
 * A edição do tema: só matéria com foto. A capa é a primeira das três mais
 * fortes com foto grande (≥ 900 px, quando a página diz o tamanho); o "Você
 * sabia?" pega uma curiosidade de cada matéria.
 */
export function montarEdicao(
  tema: CategorySlug,
  materias: MateriaAtual[],
  videos: EdicaoAtual['videos'],
  agora: number = Date.now(),
): EdicaoAtual {
  const comFoto = materias.filter((m) => m.capa);
  const grande = (m: MateriaAtual) => (m.capa?.largura ?? 1200) >= 900;
  const iCapa = Math.max(0, comFoto.slice(0, 3).findIndex(grande));
  const capa = comFoto[iCapa] ?? null;
  const chamadas = comFoto.filter((_, i) => i !== iCapa).slice(0, 8);
  const vocesabia: EdicaoAtual['vocesabia'] = [];
  for (let rodada = 0; rodada < 2 && vocesabia.length < 3; rodada++) {
    for (const m of comFoto) {
      const texto = m.curiosidades[rodada];
      if (texto && m.contexto) vocesabia.push({ texto, de: m.contexto.nome, id: m.id });
      if (vocesabia.length >= 3) break;
    }
  }
  return {
    tema,
    montadaEm: new Date(agora).toISOString(),
    capa: capa ? chamadaDaMateria(capa) : null,
    chamadas: chamadas.map(chamadaDaMateria),
    vocesabia,
    videos,
    fontes: Array.from(new Set(comFoto.flatMap((m) => [m.fonte.nome, ...m.repercussao.map((r) => r.fonte)]))),
  };
}
