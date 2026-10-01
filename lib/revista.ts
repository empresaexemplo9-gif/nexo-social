import 'server-only';

// Revista nexo: o que é notícia agora em cada tema, no formato da casa.
//
//   Pauta   — as notícias recentes dos veículos de cada tema (g1, Folha,
//             Estadão, Agência Brasil, revistas especializadas… — ver
//             lib/noticias-fontes.ts), agrupadas por assunto.
//   Foto    — a maior que o veículo publica para a matéria (og:image).
//   Texto   — o resumo do veículo, citado e com link; o "Por que está em
//             pauta", contado pela plataforma; a repercussão nos outros
//             veículos; o "Para entender" e o "Você sabia?" do verbete do
//             assunto na Wikipédia (CC BY-SA), com a imagem do Commons.
//   Vídeo   — os mais recentes dos canais oficiais do tema.
//
// As peças são montadas em lib/revista-montagem.ts (funções puras, testadas).
// O que já tem história fica nas Matérias históricas (lib/historicas.ts).

import { unstable_cache } from 'next/cache';
import { getTopic, type CategorySlug } from './data';
import { noticiasRecentes } from './noticias';
import { CANAIS } from './shorts';
import { canalPorHandle, videosDoCanal } from './youtube-aberto';
import { UM_DIA, WIKI, semHtml, wikipedia, type Imagem } from './wikipedia';
import { dividirSecoes, garimparCuriosidades, montarLinhaDoTempo } from './wiki-texto';
import {
  agruparPorAssunto,
  candidatosAoAssunto,
  grupoDaNoticia,
  lerPaginaDaMateria,
  montarEdicao,
  montarMateriaAtual,
  ordenarGrupos,
  podeBuscarPagina,
  verbeteCombina,
  type EdicaoAtual,
  type Entidade,
  type MateriaAtual,
  type PaginaDaMateria,
} from './revista-montagem';
import type { Noticia } from './noticias-parser';

export type { ChamadaAtual, EdicaoAtual, MateriaAtual } from './revista-montagem';

const AGENTE = 'nexo-social/1.0 (+https://nexo-social.drap.app.br; revista)';
/** Só o <head> interessa; página maior que isso sem fechar o <head> é desistência. */
const CABECA_MAX = 700_000;
/** Matérias montadas por edição (as que têm foto viram capa e chamadas). */
const MATERIAS_POR_EDICAO = 10;

// ---------------------------------------------------------------------------
// Vídeos

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
// A página da matéria no veículo

function charsetDe(contentType: string | null, inicio: string): string {
  return (
    /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType || '')?.[1] ||
    /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(inicio)?.[1] ||
    'utf-8'
  ).toLowerCase();
}

/** Lê a resposta até fechar o <head> (ou até CABECA_MAX) e para de baixar. */
async function lerCabeca(res: Response): Promise<string> {
  const partes: Uint8Array[] = [];
  let total = 0;
  const juntar = () => {
    const tudo = new Uint8Array(total);
    let pos = 0;
    for (const p of partes) {
      tudo.set(p, pos);
      pos += p.byteLength;
    }
    return tudo;
  };
  if (res.body) {
    const leitor = res.body.getReader();
    const ascii = new TextDecoder('latin1');
    let rabo = '';
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      partes.push(value);
      total += value.byteLength;
      const pedaco = rabo + ascii.decode(value);
      if (/<\/head\s*>|<body[\s>]/i.test(pedaco) || total > CABECA_MAX) {
        await leitor.cancel().catch(() => undefined);
        break;
      }
      rabo = pedaco.slice(-16);
    }
  } else {
    const tudo = new Uint8Array(await res.arrayBuffer());
    partes.push(tudo.subarray(0, CABECA_MAX));
    total = Math.min(tudo.byteLength, CABECA_MAX);
  }
  const bytes = juntar();
  const rotulo = charsetDe(res.headers.get('content-type'), new TextDecoder('latin1').decode(bytes.subarray(0, 4096)));
  try {
    return new TextDecoder(rotulo).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * O <head> da matéria: a foto grande (og:image), a descrição e o autor. Fica
 * guardado uma semana — a foto de uma matéria publicada não muda. Falha de
 * rede não é guardada (lança, e a próxima visita tenta de novo).
 */
const paginaDaMateria = unstable_cache(
  async (link: string): Promise<PaginaDaMateria> => {
    const sinal = AbortSignal.timeout(6000);
    let alvo = link;
    // Redirecionamento seguido à mão: cada salto tem de ficar no domínio do veículo.
    for (let saltos = 0; ; saltos++) {
      const res = await fetch(alvo, {
        cache: 'no-store',
        redirect: 'manual',
        signal: sinal,
        headers: { 'User-Agent': AGENTE, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'Accept-Language': 'pt-BR,pt;q=0.9' },
      });
      const destino = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (destino) {
        const proximo = new URL(destino, alvo).href;
        if (saltos >= 3 || !podeBuscarPagina(proximo, link)) throw new Error('A página redirecionou para fora do veículo');
        alvo = proximo;
        continue;
      }
      if (!res.ok) throw new Error(`A página respondeu ${res.status}`);
      if (!/html/i.test(res.headers.get('content-type') || 'text/html')) throw new Error('A página não é HTML');
      return lerPaginaDaMateria(await lerCabeca(res), alvo);
    }
  },
  ['revista-pagina-v1'],
  { revalidate: 7 * UM_DIA },
);

// ---------------------------------------------------------------------------
// O assunto na Wikipédia

interface Verbete {
  titulo: string;
  descricao: string | null;
  resumo: string;
  url: string;
}

/** Vários títulos numa consulta só: o verbete de cada um (seguindo redirecionamento), sem desambiguação. */
async function verbetes(titulos: string[]): Promise<Map<string, Verbete>> {
  const j = await wikipedia(
    {
      action: 'query',
      titles: titulos.join('|'),
      redirects: '1',
      prop: 'extracts|description|pageprops|info',
      exintro: '1',
      explaintext: '1',
      exlimit: 'max',
      ppprop: 'disambiguation',
      inprop: 'url',
    },
    UM_DIA,
    8000,
  );
  const normalizados = new Map<string, string>((j?.query?.normalized ?? []).map((n: any) => [n.from, n.to]));
  const redirecionados = new Map<string, string>((j?.query?.redirects ?? []).map((r: any) => [r.from, r.to]));
  const paginas = new Map<string, any>((j?.query?.pages ?? []).map((p: any) => [p.title, p]));
  const saida = new Map<string, Verbete>();
  for (const t of titulos) {
    const n = normalizados.get(t) ?? t;
    const pg = paginas.get(redirecionados.get(n) ?? n);
    if (!pg || pg.missing || pg.invalid || pg.ns !== 0 || pg.pageprops?.disambiguation !== undefined || !pg.extract) continue;
    saida.set(t, {
      titulo: pg.title,
      descricao: pg.description ? String(pg.description) : null,
      resumo: String(pg.extract).trim(),
      url: pg.fullurl ?? `${WIKI}/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}`,
    });
  }
  return saida;
}

/** Foto principal do verbete que serve de foto de revista: nada de bandeira, mapa, brasão ou logotipo. */
const NAO_E_FOTO = /(flag|bandeira|map|mapa|locator|localiza|brasão|brasao|coat|signature|assinatura|logo|símbolo|simbolo|seal|selo|ícone|icone|icon)/i;

async function fotoDoArquivo(arquivo: string): Promise<Imagem | null> {
  if (NAO_E_FOTO.test(arquivo)) return null;
  const j = await wikipedia({
    action: 'query',
    titles: `File:${arquivo}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '1920',
  });
  const info = j?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info || !/image\/(jpeg|png|webp)/.test(info.mime ?? '') || (info.width ?? 0) < 500) return null;
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
}

/** O verbete inteiro: curiosidades, linha do tempo e a foto. Guardado por um dia. */
const detalhesDoVerbete = unstable_cache(
  async (titulo: string): Promise<Pick<Entidade, 'curiosidades' | 'linhaDoTempo' | 'imagem'>> => {
    const j = await wikipedia(
      { action: 'query', titles: titulo, redirects: '1', prop: 'extracts|pageimages', explaintext: '1', exsectionformat: 'wiki', piprop: 'name' },
      UM_DIA,
      10000,
    );
    const pg = j?.query?.pages?.[0];
    const { abertura, secoes } = dividirSecoes(String(pg?.extract ?? ''));
    const texto = abertura.join(' ');
    const imagem = pg?.pageimage ? await fotoDoArquivo(String(pg.pageimage)).catch(() => null) : null;
    return { curiosidades: garimparCuriosidades(secoes, texto, 6), linhaDoTempo: montarLinhaDoTempo(secoes, texto), imagem };
  },
  ['revista-verbete-v1'],
  { revalidate: UM_DIA },
);

/** O assunto do grupo: o primeiro candidato que existe na Wikipédia e combina com o tema e as notícias. */
async function assuntoDoGrupo(tema: CategorySlug, grupo: Noticia[]): Promise<Entidade | null> {
  const candidatos = candidatosAoAssunto(grupo, tema);
  if (!candidatos.length) return null;
  const achados = await verbetes(candidatos);
  for (const nome of candidatos) {
    const v = achados.get(nome);
    if (!v || !verbeteCombina(v, grupo, tema, nome)) continue;
    const detalhes = await detalhesDoVerbete(v.titulo).catch(() => ({ curiosidades: [], linhaDoTempo: [], imagem: null }));
    return { nome, ...v, ...detalhes };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Matéria e edição

/**
 * A matéria da notícia `id`. Fica guardada 6 h; depois que a notícia sai dos
 * feeds, a montagem lança e o cache segue servindo a última versão — o link
 * compartilhado não quebra.
 */
export const materiaAtual = unstable_cache(
  async (tema: CategorySlug, id: string): Promise<MateriaAtual> => {
    const { itens, dias } = await noticiasRecentes(tema);
    const grupo = grupoDaNoticia(itens, id);
    if (!grupo) throw new Error('A notícia saiu da pauta');
    const [pagina, entidade] = await Promise.all([
      podeBuscarPagina(grupo[0].link, grupo[0].site) ? paginaDaMateria(grupo[0].link).catch(() => null) : null,
      assuntoDoGrupo(tema, grupo).catch(() => null),
    ]);
    return montarMateriaAtual({ tema, rotuloDoTema: getTopic(tema)?.label ?? tema, grupo, pagina, entidade, todas: itens, dias });
  },
  ['revista-materia-atual-v1'],
  { revalidate: 6 * 3600 },
);

/**
 * A edição do tema: os assuntos mais fortes do momento, cada um virando
 * matéria. Renova a cada meia hora; se os feeds caírem todos, lança e a
 * última edição continua no ar.
 */
export const edicaoAtual = unstable_cache(
  async (tema: CategorySlug): Promise<EdicaoAtual> => {
    const { itens } = await noticiasRecentes(tema);
    if (!itens.length) throw new Error('Sem notícias do tema agora');
    const grupos = ordenarGrupos(agruparPorAssunto(itens)).slice(0, MATERIAS_POR_EDICAO);
    const [materias, videos] = await Promise.all([
      Promise.all(grupos.map((g) => materiaAtual(tema, g[0].id).catch(() => null))),
      videosDoTema(tema, 6).catch(() => []),
    ]);
    return montarEdicao(tema, materias.filter((m): m is MateriaAtual => Boolean(m)), videos);
  },
  ['revista-edicao-atual-v1'],
  { revalidate: 1800 },
);
