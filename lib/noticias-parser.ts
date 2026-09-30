// Leitor de feeds RSS 2.0 / RSS 1.0 / Atom, sem dependências. Fica separado de
// lib/noticias.ts (que importa 'server-only' e next/cache) para poder ser
// testado direto — ver tests/noticias.test.cjs.
//
// Feeds do mundo real são sujos: CDATA, HTML escapado uma ou duas vezes,
// entidades de HTML (&nbsp;, &eacute;…) no meio do XML, imagens em
// media:content, media:thumbnail, enclosure, <imagem-destaque> ou só no <img>
// do texto, links que passam por redirecionador, datas com fuso "-0300" ou
// mês em português. Tudo o que sai daqui é texto puro e URL http(s).

import type { FonteDeNoticia } from './noticias-fontes';

export interface Noticia {
  id: string;
  titulo: string;
  /** Linha fina do veículo, sem HTML, com no máximo 280 caracteres. */
  resumo: string;
  /** Matéria original (http/https). */
  link: string;
  imagem: string | null;
  /** Nome do veículo. */
  fonte: string;
  /** Página do veículo. */
  site: string;
  /** Data de publicação em ISO 8601. */
  publicadaEm: string;
}

/** Um item como saiu do feed, antes de passar pelo filtro da fonte — é o que fica em cache. */
export interface ItemDoFeed {
  titulo: string;
  resumo: string;
  link: string;
  imagem: string | null;
  publicadaEm: string;
  categorias: string[];
}

export const RESUMO_MAX = 280;
/** Notícia mais velha que isso não entra no "ao vivo". */
export const DIAS_NO_AR = 21;
const DIA_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Texto

const ENTIDADES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  shy: '', zwj: '', zwnj: '', lrm: '', rlm: '',
  hellip: '…', ndash: '–', mdash: '—', minus: '−', lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„',
  laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›', middot: '·', bull: '•', deg: '°', ordm: 'º', ordf: 'ª',
  copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', cent: '¢', yen: '¥', sect: '§', para: '¶', times: '×', divide: '÷',
  iexcl: '¡', iquest: '¿', frac12: '½', frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²', sup3: '³', micro: 'µ', plusmn: '±',
  szlig: 'ß', aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø', aring: 'å', Aring: 'Å',
};
const DIACRITICOS: Record<string, string> = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', cedil: '̧' };

function entidadeNomeada(nome: string): string | null {
  if (Object.prototype.hasOwnProperty.call(ENTIDADES, nome)) return ENTIDADES[nome];
  // &aacute; &Atilde; &ccedil; &ocirc;… — as letras acentuadas do português (e vizinhas).
  const m = /^([a-zA-Z])(acute|grave|circ|tilde|uml|cedil)$/.exec(nome);
  return m ? (m[1] + DIACRITICOS[m[2]]).normalize('NFC') : null;
}

/**
 * Decodifica entidades de HTML/XML numa passada só (então "&amp;lt;" vira
 * "&lt;", e não "<"). Diferente de `decodificarEntidades` (lib/midia.ts),
 * conhece os acentos nomeados e códigos acima de U+FFFF (emoji).
 */
export function decodificarHtml(s: string): string {
  return s.replace(/&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (inteira, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      const valido = n > 8 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) && !(n > 13 && n < 32);
      return valido ? String.fromCodePoint(n) : '';
    }
    return entidadeNomeada(e) ?? inteira;
  });
}

/** Conteúdo de texto de um elemento XML: seções CDATA ficam literais, o resto tem as entidades decodificadas. */
function textoXml(bruto: string): string {
  let saida = '';
  let ultimo = 0;
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  for (let m = re.exec(bruto); m; m = re.exec(bruto)) {
    saida += decodificarHtml(bruto.slice(ultimo, m.index)) + m[1];
    ultimo = re.lastIndex;
  }
  return saida + decodificarHtml(bruto.slice(ultimo));
}

function semMarcacao(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|iframe|object|embed|svg|math|template|figcaption|button|select|textarea)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(script|style)\b[\s\S]*$/i, ' ') // <script> sem fechamento: descarta o resto
    .replace(/<\/?(p|div|br|hr|li|ul|ol|h[1-6]|blockquote|figure|table|tr|td|th|section|article|header|footer)\b[^>]*>/gi, '\n')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

/** Linha de crédito de foto ("Reprodução/Instagram", "REUTERS/Fulano", "Foto: …"). */
const CREDITO = /^(?:foto:?\s|reprodu[çc][ãa]o|divulga[çc][ãa]o|arquivo|getty|reuters|afp|ap photo|ag[êe]ncia|[^\s]+\s?\/\s?[^\s]+)/i;

/** HTML → texto puro numa linha: sem tags, sem scripts, entidades decodificadas. */
export function textoPuro(html: string): string {
  // Duas voltas: há feeds que escapam o HTML duas vezes (&amp;lt;p&amp;gt;).
  const linhas = semMarcacao(decodificarHtml(semMarcacao(html)))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  // O g1 abre a descrição com a foto, a legenda e o crédito: fica só o texto.
  if (/^\s*<img\b/i.test(html) && linhas.length >= 3 && linhas[0].length <= 300 && linhas[1].length <= 90 && CREDITO.test(linhas[1])) {
    linhas.splice(0, 2);
  }
  // Assinatura na primeira linha ("Edição: Fulana", "Por: Fulano").
  if (linhas.length >= 2 && linhas[0].length <= 60 && /^(?:edi[çc][ãa]o|por|texto|reportagem|colabora[çc][ãa]o|fotos?)\s*:\s*\S/i.test(linhas[0])) {
    linhas.shift();
  }
  return linhas.join(' ');
}

/** Corta em até `max` caracteres, na última palavra inteira, com reticências. */
export function encurtar(s: string, max = RESUMO_MAX): string {
  if (s.length <= max) return s;
  let corte = s.slice(0, max - 1);
  if (/[\ud800-\udbff]$/.test(corte)) corte = corte.slice(0, -1);
  const espaco = corte.lastIndexOf(' ');
  if (espaco > max * 0.6) corte = corte.slice(0, espaco);
  return corte.replace(/[\s,;:.·–—-]+$/, '') + '…';
}

const RODAPE_DO_WORDPRESS = /\s*(?:O post|The post)\s[\s\S]{1,400}?\s(?:apareceu primeiro em|appeared first on)\s[\s\S]{0,200}$/i;
const RELACIONADAS = /\s*Not[ií]cias relacionadas:[\s\S]*$/i;
const LEIA_MAIS = /\s*(?:\[\s*(?:…|\.\.\.)\s*\]|\[?\s*(?:Leia mais|Continue lendo|Continuar lendo|Ler mais|Continue reading|Read more)\b[^\]\n]{0,120}\]?)\s*[»→›.…]*\s*$/i;

function limparResumo(texto: string, titulo: string): string {
  // Rodapé automático do WordPress ("O post X apareceu primeiro em Y.") e a
  // lista de relacionadas que a Agência Brasil manda junto com a matéria.
  let s = texto.replace(RODAPE_DO_WORDPRESS, '').replace(RELACIONADAS, '').trim();
  const semLeiaMais = s.replace(LEIA_MAIS, '').trim();
  if (semLeiaMais) s = semLeiaMais;
  if (s.startsWith(titulo)) s = s.slice(titulo.length).replace(/^[\s:.–—-]+/, '');
  return encurtar(s);
}

// ---------------------------------------------------------------------------
// XML (o suficiente de XML para feeds)

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cacheDeRe = new Map<string, RegExp>();

interface Elemento { atributos: string; conteudo: string }

/** Todos os elementos `nome` do bloco (com prefixo, se tiver: "media:content"). */
function elementos(bloco: string, nome: string): Elemento[] {
  let re = cacheDeRe.get(nome);
  if (!re) {
    const n = escapar(nome);
    re = new RegExp(`<${n}(\\s[^>]*?)?(?:/>|>([\\s\\S]*?)</${n}\\s*>)`, 'gi');
    cacheDeRe.set(nome, re);
  }
  const saida: Elemento[] = [];
  re.lastIndex = 0;
  for (let m = re.exec(bloco); m; m = re.exec(bloco)) saida.push({ atributos: m[1] ?? '', conteudo: m[2] ?? '' });
  return saida;
}

function primeiro(bloco: string, ...nomes: string[]): string | null {
  for (const nome of nomes) {
    for (const el of elementos(bloco, nome)) {
      const t = textoXml(el.conteudo).trim();
      if (t) return t;
    }
  }
  return null;
}

function atributo(atributos: string, nome: string): string | null {
  const m = new RegExp(`(?:^|\\s)${escapar(nome)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(atributos);
  return m ? decodificarHtml(m[1] ?? m[2] ?? m[3] ?? '').trim() : null;
}

const numero = (s: string | null) => {
  const n = s ? parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------------------
// URLs

/**
 * Só http(s). Resolve relativos contra `base`, desembrulha redirecionador de
 * feed (".../rss091/*https://…") e tira os utm_*. `javascript:`, `data:` e
 * afins voltam null.
 */
export function urlSegura(bruto: string | null | undefined, base?: string): string | null {
  if (!bruto) return null;
  let s = bruto.trim();
  const dentro = /\/\*(https?:\/\/.+)$/i.exec(s);
  if (dentro) s = dentro[1];
  try {
    const u = base ? new URL(s, base) : new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password || !u.hostname.includes('.')) return null;
    for (const chave of Array.from(u.searchParams.keys())) if (/^utm_/i.test(chave)) u.searchParams.delete(chave);
    return u.href;
  } catch {
    return null;
  }
}

function linkDoItem(bloco: string): string | null {
  const original = primeiro(bloco, 'feedburner:origLink');
  if (original) return original;
  for (const el of elementos(bloco, 'link')) {
    const href = atributo(el.atributos, 'href');
    if (href !== null) {
      // Atom: <link rel="alternate" href="…"/> (sem rel também é alternate).
      if ((atributo(el.atributos, 'rel') || 'alternate').toLowerCase() === 'alternate' && href) return href;
      continue;
    }
    const texto = textoXml(el.conteudo).trim();
    if (texto) return texto;
  }
  const guid = elementos(bloco, 'guid')[0];
  if (guid && atributo(guid.atributos, 'isPermaLink') !== 'false') {
    const t = textoXml(guid.conteudo).trim();
    if (/^https?:\/\//i.test(t)) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Imagem

interface CandidataAImagem { url: string | null; largura: number | null; altura: number | null; doTexto: boolean }

const PIXEL_HOSTS = /(^|\.)(feedburner\.com|feeds\.feedburner\.com|pixel\.wp\.com|stats\.wp\.com|s\.w\.org|gravatar\.com|doubleclick\.net|google-analytics\.com|facebook\.com|scorecardresearch\.com)$/i;
/** Imagens do texto que não são foto da matéria: logos, pixels de contagem, avatares, marcadores de lazy-load. */
const NOME_DE_ENFEITE = /(^|[/._-])(logo|logos|pixel|spacer|blank|tracker|tracking|avatar|gravatar|emoji|icon|icone|feed-?icon|placeholder|lazy)([/._-]|$)/i;

function imagemValida(c: CandidataAImagem, base: string | undefined): string | null {
  const url = urlSegura(c.url, base);
  if (!url) return null;
  const u = new URL(url);
  if (PIXEL_HOSTS.test(u.hostname) || /\.(svg|gif|ico)$/i.test(u.pathname)) return null;
  // Endereço com o domínio repetido no caminho (".com/www.site.com/wp-content/…") é quebrado.
  const dominio = u.hostname.replace(/^www\d?\./, '');
  const primeiroTrecho = u.pathname.split('/')[1] ?? '';
  if (primeiroTrecho.includes('.') && (primeiroTrecho === u.hostname || primeiroTrecho.endsWith(dominio))) return null;

  const blogger = /(^|\.)(blogger\.googleusercontent\.com|bp\.blogspot\.com)$/i.test(u.hostname);
  if (blogger) {
    // Blogger manda miniatura de 72 px: pede a de 1200.
    u.pathname = u.pathname.replace(/\/s\d{2,4}(-[a-z0-9-]*)?\//i, '/s1200/').replace(/=s\d{2,4}(-[a-z0-9-]*)?$/i, '=s1200');
  } else {
    if ((c.largura !== null && c.largura < 100) || (c.altura !== null && c.altura < 100)) return null;
    if (c.doTexto && NOME_DE_ENFEITE.test(u.pathname)) return null;
    // Miniatura do WordPress ("foto-180x120.jpg"): o original fica no mesmo lugar, sem o sufixo.
    if (u.pathname.includes('/wp-content/uploads/')) {
      u.pathname = u.pathname.replace(/-(\d{2,3})x(\d{2,3})(\.(?:jpe?g|png|webp|avif))$/i, (m, l, a, ext) => (Number(l) < 400 && Number(a) < 400 ? ext : m));
    }
  }
  if (u.protocol === 'http:') u.protocol = 'https:'; // senão o navegador bloqueia (conteúdo misto)
  return u.href;
}

const EXTENSAO_DE_IMAGEM = /\.(jpe?g|png|webp|avif)(?:$|[?#])/i;

function imagemDoItem(bloco: string, htmls: string[], base: string | undefined): string | null {
  const candidatas: CandidataAImagem[] = [];
  const media = (nome: string, exigirTipo: boolean) => {
    for (const el of elementos(bloco, nome)) {
      const url = atributo(el.atributos, 'url');
      const medium = (atributo(el.atributos, 'medium') || '').toLowerCase();
      const tipo = (atributo(el.atributos, 'type') || '').toLowerCase();
      const eImagem = medium === 'image' || tipo.startsWith('image/') || (!medium && !tipo && !!url && EXTENSAO_DE_IMAGEM.test(url));
      if (exigirTipo && !eImagem) continue;
      if (medium && medium !== 'image') continue;
      candidatas.push({ url, largura: numero(atributo(el.atributos, 'width')), altura: numero(atributo(el.atributos, 'height')), doTexto: false });
    }
  };
  media('media:content', true);
  media('media:thumbnail', false);
  for (const el of elementos(bloco, 'enclosure')) {
    const url = atributo(el.atributos, 'url');
    const tipo = (atributo(el.atributos, 'type') || '').toLowerCase();
    if (tipo.startsWith('image/') || (!tipo && url && EXTENSAO_DE_IMAGEM.test(url))) candidatas.push({ url, largura: null, altura: null, doTexto: false });
  }
  // Agência Brasil.
  const destaque = primeiro(bloco, 'imagem-destaque');
  if (destaque) candidatas.push({ url: destaque, largura: null, altura: null, doTexto: false });
  for (const html of htmls) {
    for (const m of Array.from(html.matchAll(/<img\b([^>]*)>/gi))) {
      const a = m[1];
      let src = atributo(a, 'src');
      if (!src || /^data:/i.test(src) || NOME_DE_ENFEITE.test(src)) src = atributo(a, 'data-src') || atributo(a, 'data-lazy-src') || atributo(a, 'data-original') || src;
      const estilo = atributo(a, 'style') || '';
      const px = (lado: string) => numero(new RegExp(`(?:^|;)\\s*${lado}\\s*:\\s*(\\d+)px`, 'i').exec(estilo)?.[1] ?? null);
      candidatas.push({
        url: src,
        largura: numero(atributo(a, 'width')) ?? px('width'),
        altura: numero(atributo(a, 'height')) ?? px('height'),
        doTexto: true,
      });
    }
  }
  for (const c of candidatas) {
    const url = imagemValida(c, base);
    if (url) return url;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Datas

const MESES_PT: Record<string, string> = {
  jan: 'Jan', fev: 'Feb', mar: 'Mar', abr: 'Apr', mai: 'May', jun: 'Jun',
  jul: 'Jul', ago: 'Aug', set: 'Sep', out: 'Oct', nov: 'Nov', dez: 'Dec',
};

/** RFC 822 ("Tue, 29 Sep 2026 20:47:16 -0300"), ISO 8601, e o RFC 822 "aportuguesado" ("Ter, 29 Set 2026…"). */
export function lerData(bruto: string | null | undefined): number | null {
  const s = (bruto || '').trim().replace(/\bBRST\b/, '-0200').replace(/\bBRT\b/, '-0300');
  if (!s) return null;
  let t = Date.parse(s);
  if (Number.isNaN(t)) {
    const traduzida = s
      .replace(/^[^\d,]*,\s*/, '')
      .replace(/\b([a-zA-Zç]{3})[a-zA-Zç]*\b/g, (m, p: string) => MESES_PT[p.toLowerCase()] ?? m);
    t = Date.parse(traduzida);
  }
  return Number.isNaN(t) ? null : t;
}

// ---------------------------------------------------------------------------
// Feed

/** Identificador curto e estável a partir do link (cyrb53). */
export function idDaNoticia(link: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < link.length; i++) {
    const c = link.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Itens de um feed RSS/Atom. Item sem título, sem link http(s) ou sem data válida fica de fora. */
export function lerItens(xml: string, base?: string): ItemDoFeed[] {
  const blocos = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1\s*>/gi) ?? [];
  const itens: ItemDoFeed[] = [];
  for (const bloco of blocos) {
    const titulo = textoPuro(primeiro(bloco, 'title') ?? '');
    const link = urlSegura(linkDoItem(bloco), base);
    const data = lerData(primeiro(bloco, 'published', 'pubDate', 'dc:date', 'updated', 'a10:updated', 'dc:created'));
    if (!titulo || !link || data === null) continue;
    const htmlDescricao = primeiro(bloco, 'description', 'summary') ?? '';
    const htmlCorpo = primeiro(bloco, 'content:encoded', 'content') ?? '';
    // Linha fina de verdade (g1) > descrição > começo do texto > legenda da foto.
    const resumo =
      textoPuro(primeiro(bloco, 'atom:subtitle') ?? '') ||
      textoPuro(htmlDescricao) ||
      textoPuro(htmlCorpo) ||
      textoPuro(primeiro(bloco, 'media:description') ?? '');
    const categorias = elementos(bloco, 'category')
      .map((el) => atributo(el.atributos, 'term') || textoPuro(textoXml(el.conteudo)))
      .filter(Boolean);
    itens.push({
      titulo,
      resumo: limparResumo(resumo, titulo),
      link,
      imagem: imagemDoItem(bloco, [htmlCorpo, htmlDescricao], base),
      publicadaEm: new Date(data).toISOString(),
      categorias,
    });
  }
  return itens;
}

type FonteParaLeitura = Pick<FonteDeNoticia, 'nome' | 'site'> & Partial<Pick<FonteDeNoticia, 'feed' | 'filtro' | 'excluir'>>;

function casa(re: RegExp | undefined, alvo: string): boolean {
  if (!re) return false;
  re.lastIndex = 0; // regex com /g guarda posição entre chamadas
  return re.test(alvo);
}

/** Aplica o filtro/exclusão da fonte (contra "link · categorias · título · resumo") e carimba o veículo. */
export function paraNoticias(itens: ItemDoFeed[], fonte: FonteParaLeitura): Noticia[] {
  return itens
    .filter((i) => {
      const alvo = [i.link, i.categorias.join(' · '), i.titulo, i.resumo].join('\n');
      return (!fonte.filtro || casa(fonte.filtro, alvo)) && !casa(fonte.excluir, alvo);
    })
    .map((i) => ({
      id: idDaNoticia(i.link),
      titulo: i.titulo,
      resumo: i.resumo,
      link: i.link,
      imagem: i.imagem,
      fonte: fonte.nome,
      site: fonte.site,
      publicadaEm: i.publicadaEm,
    }));
}

/** O feed inteiro de uma fonte, já filtrado — a função pura que os testes usam. */
export function lerFeed(xml: string, fonte: FonteParaLeitura): Noticia[] {
  return paraNoticias(lerItens(xml, fonte.feed || fonte.site), fonte);
}

/**
 * Decodifica o corpo do feed pelo `encoding` da declaração XML (ou pelo
 * charset do cabeçalho). A Folha, por exemplo, ainda manda ISO-8859-1.
 */
export function textoDoFeed(bytes: Uint8Array, contentType?: string | null): string {
  const inicio = new TextDecoder('utf-8').decode(bytes.subarray(0, 300));
  const rotulo = (
    /^\s*<\?xml[^>]*\bencoding\s*=\s*["']([\w.:-]+)["']/i.exec(inicio)?.[1] ||
    /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType || '')?.[1] ||
    'utf-8'
  ).toLowerCase();
  try {
    return new TextDecoder(rotulo).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

// ---------------------------------------------------------------------------
// Juntar as fontes

function chaveDoLink(link: string): string {
  try {
    const u = new URL(link);
    return `${u.hostname.replace(/^www\d?\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
  } catch {
    return link;
  }
}

const chaveDoTitulo = (titulo: string) =>
  titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Junta as listas de cada fonte: descarta o que passou de `dias` (ou vem do
 * futuro), tira repetidas (mesmo link ou mesmo título), limita quantas cada
 * veículo emplaca e alterna os veículos — mais novas primeiro.
 */
export function juntarNoticias(
  listas: Noticia[][],
  { agora = Date.now(), limite = 18, dias = DIAS_NO_AR }: { agora?: number | Date; limite?: number; dias?: number } = {},
): Noticia[] {
  const agoraMs = typeof agora === 'number' ? agora : agora.getTime();
  const corte = agoraMs - dias * DIA_MS;
  const datadas = listas
    .flat()
    .map((n) => ({ n, t: Date.parse(n.publicadaEm) }))
    .filter(({ t }) => Number.isFinite(t) && t >= corte && t <= agoraMs + DIA_MS)
    // Relógio adiantado do veículo: fica "agora", não "daqui a 2 h".
    .map(({ n, t }) => (t > agoraMs ? { n: { ...n, publicadaEm: new Date(agoraMs).toISOString() }, t: agoraMs } : { n, t }))
    .sort((a, b) => b.t - a.t);

  const vistas = new Set<string>();
  const unicas: { n: Noticia; t: number }[] = [];
  for (const d of datadas) {
    const link = `l:${chaveDoLink(d.n.link)}`;
    const titulo = chaveDoTitulo(d.n.titulo);
    const chaves = titulo.length >= 16 ? [link, `t:${titulo}`] : [link];
    if (chaves.some((c) => vistas.has(c))) continue;
    chaves.forEach((c) => vistas.add(c));
    unicas.push(d);
  }

  // Teto por veículo, que só sobe se faltar notícia das outras fontes.
  const fontes = new Set(unicas.map((d) => d.n.fonte)).size || 1;
  const escolhidas: { n: Noticia; t: number }[] = [];
  const porFonte = new Map<string, number>();
  const restantes = [...unicas];
  for (let teto = Math.ceil(limite / fontes); escolhidas.length < limite && restantes.length; teto++) {
    for (let i = 0; i < restantes.length && escolhidas.length < limite; ) {
      const d = restantes[i];
      const ja = porFonte.get(d.n.fonte) ?? 0;
      if (ja < teto) {
        escolhidas.push(d);
        porFonte.set(d.n.fonte, ja + 1);
        restantes.splice(i, 1);
      } else i++;
    }
  }

  // Mais novas primeiro, mas sem o mesmo veículo duas vezes seguidas quando dá.
  const fila = escolhidas.sort((a, b) => b.t - a.t).map((d) => d.n);
  const saida: Noticia[] = [];
  while (fila.length) {
    const anterior = saida[saida.length - 1]?.fonte;
    const i = fila.findIndex((n, j) => j < 4 && n.fonte !== anterior);
    saida.push(fila.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return saida;
}
