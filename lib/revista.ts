import 'server-only';

// Revista nexo: matérias no formato da plataforma, montadas de fontes reais,
// seguras e gratuitas.
//
//   Texto   — Wikipédia em português (API pública, licença CC BY-SA 4.0).
//   Imagens — Wikimedia Commons, com autor e licença de cada uma.
//   Vídeo   — canais oficiais no YouTube (busca com a chave; sem ela, o RSS
//             público dos canais curados do tema).
//
// O que é da plataforma é o formato: a capa, a linha fina, o "Você sabia?"
// garimpado do próprio texto, a linha do tempo com os anos citados, o
// destaque em citação, a ordem das seções e o tempo de leitura. Toda matéria
// termina com as fontes e as licenças — como pede a CC BY-SA.

import { unstable_cache } from 'next/cache';
import { diaDeHoje, embaralhar, sorteador } from './descoberta-musical';
import { PAUTA, FORMATOS, TERMOS_DA_HISTORIA, slugDaPauta, type FormatoDeMateria, type Pauta } from './revista-pauta';
import type { CategorySlug } from './data';
import { CANAIS } from './shorts';
import { canalPorHandle, videosDoCanal } from './youtube-aberto';
import { searchVideos } from './youtube';
import { decodificarEntidades } from './midia';

const WIKI = 'https://pt.wikipedia.org';
// A Wikimedia pede um User-Agent que identifique quem chama.
const CABECALHOS = { 'User-Agent': 'nexo-social/1.0 (https://nexo-social-two.vercel.app; revista)', 'Api-User-Agent': 'nexo-social/1.0' };
const UM_DIA = 86400;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface Imagem {
  url: string;
  largura: number | null;
  altura: number | null;
  legenda: string | null;
  autor: string | null;
  licenca: string | null;
  /** Página do arquivo no Commons (crédito e licença completos). */
  pagina: string | null;
}

export interface Secao {
  titulo: string;
  paragrafos: string[];
}

export interface Materia {
  tema: CategorySlug;
  slug: string;
  formato: FormatoDeMateria;
  rotuloDoFormato: string;
  titulo: string;
  /** Linha fina: a descrição curta do verbete. */
  linhaFina: string | null;
  /** Abertura: o primeiro parágrafo. */
  abertura: string;
  capa: Imagem | null;
  secoes: Secao[];
  curiosidades: string[];
  linhaDoTempo: { ano: number; texto: string }[];
  citacao: string | null;
  imagens: Imagem[];
  video: { id: string; titulo: string; canal: string } | null;
  leituraMin: number;
  fontes: { rotulo: string; url: string; licenca: string }[];
}

export interface Chamada {
  tema: CategorySlug;
  slug: string;
  formato: FormatoDeMateria;
  rotuloDoFormato: string;
  titulo: string;
  resumo: string;
  imagem: string | null;
}

export interface Edicao {
  tema: CategorySlug;
  capa: Chamada | null;
  chamadas: Chamada[];
  vocesabia: { texto: string; de: string; slug: string }[];
  hojeNaHistoria: { ano: number; texto: string }[];
  videos: { id: string; titulo: string; canal: string; capa: string }[];
}

// ---------------------------------------------------------------------------
// Wikipédia
// ---------------------------------------------------------------------------

async function api(params: Record<string, string>, revalidate = UM_DIA): Promise<any> {
  const qs = new URLSearchParams({ ...params, format: 'json', formatversion: '2', origin: '*' });
  const res = await fetch(`${WIKI}/w/api.php?${qs}`, { next: { revalidate }, signal: AbortSignal.timeout(12000), headers: CABECALHOS });
  if (!res.ok) throw new Error(`Wikipédia respondeu ${res.status}`);
  return res.json();
}

const semHtml = (s: string | undefined | null) =>
  s ? decodificarEntidades(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : null;

/** "Yves Saint Laurent (estilista)" → "Yves Saint Laurent": a desambiguação não vai para a capa. */
const tituloDeCapa = (t: string) => t.replace(/\s*\([^)]*\)$/, '');

/** Nome do arquivo no Commons, igual para o original e para as miniaturas. */
function arquivoDaImagem(url: string): string {
  const partes = url.split('?')[0].split('/');
  const i = partes.indexOf('thumb');
  const nome = i >= 0 ? partes[i + 3] ?? '' : partes[partes.length - 1] ?? '';
  try {
    return decodeURIComponent(nome);
  } catch {
    return nome;
  }
}

/** Seções que não viram matéria: referências, links, notas… */
const SECOES_FORA = /^(ver também|referências|ligações externas|bibliografia|notas|fontes|leitura adicional|galeria|discografia|filmografia|obras|prêmios e indicações|notas e referências)$/i;

function dividirSecoes(texto: string): { abertura: string[]; secoes: Secao[] } {
  const linhas = texto.split('\n');
  const abertura: string[] = [];
  const secoes: Secao[] = [];
  let atual: Secao | null = null;
  let nivel = 0;
  for (const bruta of linhas) {
    const linha = bruta.trim();
    const titulo = linha.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (titulo) {
      nivel = titulo[1].length;
      // Subseções (===) entram na seção de cima, com o título como parágrafo curto.
      if (nivel === 2) {
        atual = { titulo: titulo[2], paragrafos: [] };
        secoes.push(atual);
      } else if (atual) {
        atual.paragrafos.push(`§ ${titulo[2]}`);
      }
      continue;
    }
    if (!linha) continue;
    (atual ? atual.paragrafos : abertura).push(linha);
  }
  return {
    abertura,
    secoes: secoes
      .filter((s) => !SECOES_FORA.test(s.titulo))
      .map((s) => ({ ...s, paragrafos: s.paragrafos.filter((p, i, arr) => !(p.startsWith('§ ') && (arr[i + 1] ?? '').startsWith('§ '))) }))
      .filter((s) => s.paragrafos.some((p) => !p.startsWith('§ '))),
  };
}

function frases(texto: string): string[] {
  return texto
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(])/)
    .map((f) => f.trim())
    .filter((f) => f.length >= 50 && f.length <= 280 && !f.includes('§'));
}

/** "Você sabia?": frases com número, ano ou superlativo — o fato curioso. */
function garimparCuriosidades(secoes: Secao[], abertura: string, n = 5): string[] {
  const curiosa = /(\b1[0-9]{3}\b|\b20[0-2][0-9]\b|primeir[oa]|maior|menor|mais antig|recorde|únic[oa]|milh(ão|ões)|bilh|curios|inusitad|famos)/i;
  const porSecao = secoes.map((s) => frases(s.paragrafos.join(' ')).filter((f) => curiosa.test(f)));
  const escolhidas: string[] = [];
  const vistas = new Set<string>([abertura.slice(0, 80)]);
  // Primeiro uma por seção (variedade); depois completa com as que sobraram.
  for (let rodada = 0; rodada < 3 && escolhidas.length < n; rodada++) {
    for (const lista of porSecao) {
      const f = lista[rodada];
      if (!f || vistas.has(f.slice(0, 80))) continue;
      vistas.add(f.slice(0, 80));
      escolhidas.push(f);
      if (escolhidas.length >= n) break;
    }
  }
  return escolhidas;
}

/** Linha do tempo: frases que começam por (ou trazem) um ano, em ordem. */
function montarLinhaDoTempo(secoes: Secao[], abertura: string): { ano: number; texto: string }[] {
  const itens = new Map<number, string>();
  for (const f of frases([abertura, ...secoes.flatMap((s) => s.paragrafos)].join(' '))) {
    const m = f.match(/^(?:Em|No ano de|Desde|A partir de|Até)?\s*(?:\w+ de )?(1[0-9]{3}|20[0-2][0-9])\b/) ?? f.match(/\b(1[5-9][0-9]{2}|20[0-2][0-9])\b/);
    if (!m) continue;
    const ano = Number(m[1]);
    if (!itens.has(ano)) itens.set(ano, f);
  }
  return Array.from(itens.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 12)
    .map(([ano, texto]) => ({ ano, texto }));
}

function escolherCitacao(secoes: Secao[]): string | null {
  const pool = secoes.slice(1).flatMap((s) => frases(s.paragrafos.join(' '))).filter((f) => f.length >= 90 && f.length <= 200 && !/[()\[\]]/.test(f));
  return pool[Math.floor(pool.length / 2)] ?? null;
}

/** Imagens do verbete no Commons, sem ícones, mapas, bandeiras e logotipos. */
async function imagensDoVerbete(titulo: string, n = 5): Promise<Imagem[]> {
  const j = await api({
    action: 'query',
    generator: 'images',
    titles: titulo,
    gimlimit: '40',
    redirects: '1',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '1200',
  });
  const paginas: any[] = j?.query?.pages ?? [];
  return paginas
    .filter((pg) => {
      const info = pg?.imageinfo?.[0];
      if (!info || !/image\/(jpeg|png|webp)/.test(info.mime ?? '')) return false;
      if ((info.width ?? 0) < 500 || (info.height ?? 0) < 350) return false;
      return !/(logo|icon|ícone|flag|bandeira|map|mapa|brasão|coat|signature|assinatura|symbol|símbolo|seal|selo|disambig|wikiquote|commons)/i.test(pg.title ?? '');
    })
    .slice(0, n)
    .map((pg) => {
      const info = pg.imageinfo[0];
      const meta = info.extmetadata ?? {};
      return {
        url: info.thumburl ?? info.url,
        largura: info.thumbwidth ?? info.width ?? null,
        altura: info.thumbheight ?? info.height ?? null,
        legenda: semHtml(meta.ImageDescription?.value)?.slice(0, 220) ?? null,
        autor: semHtml(meta.Artist?.value)?.slice(0, 120) ?? null,
        licenca: meta.LicenseShortName?.value ?? null,
        pagina: info.descriptionurl ?? null,
      };
    });
}

/**
 * Busca do vídeo de um verbete. Fica guardada por um mês: o vídeo certo de
 * "Bossa nova" não muda, e quando a busca cai na API cada uma custa 100 unidades.
 */
const buscarVideo = unstable_cache(
  async (titulo: string): Promise<Materia['video']> => {
    const [v] = await searchVideos(`${titulo} documentário`, 1, { videoDuration: 'medium' });
    return v ? { id: v.id, titulo: decodificarEntidades(v.title), canal: decodificarEntidades(v.channel) } : null;
  },
  ['revista-video-v1'],
  { revalidate: 30 * UM_DIA },
);

/** Vídeo da matéria: busca no YouTube; se não achar, o último vídeo de um canal oficial do tema. */
async function videoDaMateria(tema: CategorySlug, titulo: string): Promise<Materia['video']> {
  try {
    const v = await buscarVideo(titulo);
    if (v) return v;
  } catch {
    // segue para os canais do tema
  }
  return (await videosDoTema(tema, 1))[0] ?? null;
}

/** Vídeos recentes dos canais oficiais curados do tema (sem chave). */
export async function videosDoTema(tema: CategorySlug, n = 6): Promise<{ id: string; titulo: string; canal: string; capa: string }[]> {
  const handles = CANAIS[`tema:${tema}`] ?? [];
  const listas = await Promise.all(
    handles.map(async (h) => {
      const id = await canalPorHandle(h);
      return id ? (await videosDoCanal(id, 'longos', 21600)).slice(0, 3) : [];
    }),
  );
  const todos = listas.flat().sort((a, b) => (b.publicado ?? '').localeCompare(a.publicado ?? ''));
  return todos.slice(0, n).map((v) => ({ id: v.id, titulo: v.titulo, canal: v.canal, capa: v.capa }));
}

// ---------------------------------------------------------------------------
// Matéria completa
// ---------------------------------------------------------------------------

export async function montarMateria(tema: CategorySlug, pauta: Pauta): Promise<Materia | null> {
  const j = await api({
    action: 'query',
    prop: 'extracts|pageimages|info|description',
    explaintext: '1',
    exsectionformat: 'wiki',
    piprop: 'original|thumbnail',
    pithumbsize: '1400',
    inprop: 'url',
    redirects: '1',
    titles: pauta.verbete,
  });
  const pg = j?.query?.pages?.[0];
  if (!pg || pg.missing || !pg.extract) return null;

  const { abertura: blocosDeAbertura, secoes: todas } = dividirSecoes(pg.extract);
  const abertura = blocosDeAbertura.join(' ');
  if (!abertura) return null;

  // Formato decide o miolo: perfil e dossiê levam mais seções; curiosidades e
  // linha do tempo, menos texto corrido e mais destaque.
  const maxSecoes = pauta.formato === 'dossie' ? 7 : pauta.formato === 'perfil' ? 6 : 4;
  const secoes = todas.slice(0, maxSecoes).map((s) => ({ ...s, paragrafos: s.paragrafos.slice(0, 6) }));

  const [imagens, video] = await Promise.all([
    imagensDoVerbete(pg.title, 5).catch(() => [] as Imagem[]),
    videoDaMateria(tema, pg.title).catch(() => null),
  ]);

  const original = pg.original ?? pg.thumbnail;
  // O crédito da imagem principal vem da lista de imagens, quando é a mesma.
  const mesma = original?.source ? imagens.find((i) => arquivoDaImagem(i.url) === arquivoDaImagem(original.source)) : undefined;
  const capa: Imagem | null = original
    ? {
        url: pg.thumbnail?.source ?? original.source,
        largura: pg.thumbnail?.width ?? original.width ?? null,
        altura: pg.thumbnail?.height ?? original.height ?? null,
        legenda: mesma?.legenda ?? null,
        autor: mesma?.autor ?? null,
        licenca: mesma?.licenca ?? null,
        pagina: mesma?.pagina ?? null,
      }
    : imagens[0] ?? null;

  const palavras = [abertura, ...secoes.flatMap((s) => s.paragrafos)].join(' ').split(/\s+/).length;
  const fontes: Materia['fontes'] = [
    { rotulo: `Wikipédia — “${pg.title}”`, url: pg.fullurl ?? `${WIKI}/wiki/${encodeURIComponent(pg.title)}`, licenca: 'CC BY-SA 4.0' },
    ...imagens
      .filter((i) => i.pagina)
      .map((i) => ({ rotulo: `Imagem: ${i.autor ?? 'Wikimedia Commons'}`, url: i.pagina!, licenca: i.licenca ?? 'ver página' })),
  ];
  if (video) fontes.push({ rotulo: `Vídeo: ${video.canal}`, url: `https://www.youtube.com/watch?v=${video.id}`, licenca: 'YouTube (player oficial)' });

  return {
    tema,
    slug: slugDaPauta(pauta.verbete),
    formato: pauta.formato,
    rotuloDoFormato: FORMATOS[pauta.formato].rotulo,
    titulo: tituloDeCapa(pg.title),
    linhaFina: pg.description ? pg.description.charAt(0).toUpperCase() + pg.description.slice(1) : null,
    abertura,
    capa,
    secoes,
    curiosidades: garimparCuriosidades(todas, abertura, pauta.formato === 'curiosidades' ? 8 : 4),
    linhaDoTempo: montarLinhaDoTempo(todas, abertura),
    citacao: escolherCitacao(secoes),
    imagens: imagens.filter((i) => !capa || arquivoDaImagem(i.url) !== arquivoDaImagem(capa.url)),
    video,
    leituraMin: Math.max(2, Math.round(palavras / 200)),
    fontes,
  };
}

// ---------------------------------------------------------------------------
// Edição do dia de um tema
// ---------------------------------------------------------------------------

/** Chamada leve (resumo da API REST), para capas e listas. */
async function chamada(tema: CategorySlug, pauta: Pauta): Promise<Chamada | null> {
  try {
    const res = await fetch(`${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(pauta.verbete.replace(/ /g, '_'))}`, {
      next: { revalidate: UM_DIA },
      signal: AbortSignal.timeout(10000),
      headers: CABECALHOS,
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j?.extract) return null;
    return {
      tema,
      slug: slugDaPauta(pauta.verbete),
      formato: pauta.formato,
      rotuloDoFormato: FORMATOS[pauta.formato].rotulo,
      titulo: tituloDeCapa(j.title ?? pauta.verbete),
      resumo: String(j.extract).slice(0, 320),
      imagem: j.thumbnail?.source ?? j.originalimage?.source ?? null,
    };
  } catch {
    return null;
  }
}

/** "Hoje na história" da Wikipédia, filtrado pelo tema quando dá. */
async function hojeNaHistoria(tema: CategorySlug): Promise<{ ano: number; texto: string }[]> {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const dd = String(agora.getDate()).padStart(2, '0');
  const termos = TERMOS_DA_HISTORIA[tema] ?? [];
  if (!termos.length) return [];
  try {
    const res = await fetch(`${WIKI}/api/rest_v1/feed/onthisday/events/${mm}/${dd}`, {
      next: { revalidate: UM_DIA },
      signal: AbortSignal.timeout(10000),
      headers: CABECALHOS,
    });
    if (!res.ok) return [];
    const j = await res.json();
    // Começo de palavra: "moda" não pode casar com "incomodar".
    const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doTemaRe = new RegExp(`(?<!\\p{L})(${termos.map(escapar).join('|')})`, 'iu');
    const eventos: { year: number; text: string }[] = j?.events ?? [];
    const doTema = eventos.filter((e) => doTemaRe.test(e.text ?? ''));
    return doTema.slice(0, 4).map((e) => ({ ano: e.year, texto: e.text }));
  } catch {
    return [];
  }
}

/**
 * A revista do tema no dia: capa, chamadas, "Você sabia?", hoje na história
 * e vídeos. A pauta vira por dia — todo mundo vê a mesma edição no dia.
 */
export async function edicaoDoTema(tema: CategorySlug): Promise<Edicao> {
  const pauta = PAUTA[tema] ?? [];
  const rand = sorteador(`${diaDeHoje()}:revista:${tema}`);
  const doDia = embaralhar([...pauta], rand).slice(0, 5);

  const [chamadas, capaCompleta, historia, videos] = await Promise.all([
    Promise.all(doDia.map((x) => chamada(tema, x))),
    doDia[0] ? montarMateria(tema, doDia[0]).catch(() => null) : Promise.resolve(null),
    hojeNaHistoria(tema),
    videosDoTema(tema, 6).catch(() => []),
  ]);
  const validas = chamadas.filter((c): c is Chamada => Boolean(c));

  return {
    tema,
    capa: validas[0] ?? null,
    chamadas: validas.slice(1),
    vocesabia: (capaCompleta?.curiosidades ?? []).slice(0, 3).map((texto) => ({ texto, de: capaCompleta!.titulo, slug: capaCompleta!.slug })),
    hojeNaHistoria: historia,
    videos,
  };
}
