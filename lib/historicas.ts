import 'server-only';

// Matérias históricas e curiosidades: o acervo da plataforma, montado de
// fontes reais, seguras e gratuitas — o que já tem história, com as imagens da
// época. (A Revista, em lib/revista.ts, fica com o que é notícia agora.)
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
import { PAUTA, FORMATOS, TERMOS_DA_HISTORIA, slugDaPauta, type FormatoDeMateria, type Pauta } from './historicas-pauta';
import type { CategorySlug } from './data';
import { searchVideos } from './youtube';
import { videosDoTema } from './revista';
import { decodificarEntidades } from './midia';
import { UM_DIA, WIKI, arquivoDaImagem, imagensDoVerbete, tituloDeCapa, wikipedia, wikipediaRest, type Imagem } from './wikipedia';
import { dividirSecoes, escolherCitacao, garimparCuriosidades, montarLinhaDoTempo, type Secao } from './wiki-texto';

export type { Imagem } from './wikipedia';
export type { Secao } from './wiki-texto';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Matéria completa
// ---------------------------------------------------------------------------

export async function montarMateria(tema: CategorySlug, pauta: Pauta): Promise<Materia | null> {
  const j = await wikipedia({
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
  const j = await wikipediaRest(`page/summary/${encodeURIComponent(pauta.verbete.replace(/ /g, '_'))}`);
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
}

/** "Hoje na história" da Wikipédia, filtrado pelo tema quando dá. */
async function hojeNaHistoria(tema: CategorySlug): Promise<{ ano: number; texto: string }[]> {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const dd = String(agora.getDate()).padStart(2, '0');
  const termos = TERMOS_DA_HISTORIA[tema] ?? [];
  if (!termos.length) return [];
  const j = await wikipediaRest(`feed/onthisday/events/${mm}/${dd}`);
  // Começo de palavra: "moda" não pode casar com "incomodar".
  const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const doTemaRe = new RegExp(`(?<!\\p{L})(${termos.map(escapar).join('|')})`, 'iu');
  const eventos: { year: number; text: string }[] = j?.events ?? [];
  const doTema = eventos.filter((e) => doTemaRe.test(e.text ?? ''));
  return doTema.slice(0, 4).map((e) => ({ ano: e.year, texto: e.text }));
}

/**
 * As matérias históricas do tema no dia: capa, chamadas, "Você sabia?" e hoje
 * na história. A pauta vira por dia — todo mundo vê a mesma edição.
 */
export async function edicaoDoTema(tema: CategorySlug): Promise<Edicao> {
  const pauta = PAUTA[tema] ?? [];
  const rand = sorteador(`${diaDeHoje()}:revista:${tema}`);
  const doDia = embaralhar([...pauta], rand).slice(0, 5);

  const [chamadas, capaCompleta, historia] = await Promise.all([
    Promise.all(doDia.map((x) => chamada(tema, x))),
    doDia[0] ? montarMateria(tema, doDia[0]).catch(() => null) : Promise.resolve(null),
    hojeNaHistoria(tema),
  ]);
  const validas = chamadas.filter((c): c is Chamada => Boolean(c));

  return {
    tema,
    capa: validas[0] ?? null,
    chamadas: validas.slice(1),
    vocesabia: (capaCompleta?.curiosidades ?? []).slice(0, 3).map((texto) => ({ texto, de: capaCompleta!.titulo, slug: capaCompleta!.slug })),
    hojeNaHistoria: historia,
  };
}
