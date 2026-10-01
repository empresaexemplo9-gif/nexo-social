import 'server-only';

// Wikipédia em português e Wikimedia Commons: a API pública, as imagens com
// autor e licença. Usado pelas Matérias históricas (o verbete inteiro) e pela
// Revista (o "Para entender" de cada matéria atual).

import { decodificarEntidades } from './midia';

export const WIKI = 'https://pt.wikipedia.org';
// A Wikimedia pede um User-Agent que identifique quem chama.
const CABECALHOS = { 'User-Agent': 'nexo-social/1.0 (https://nexo-social.drap.app.br; revista)', 'Api-User-Agent': 'nexo-social/1.0' };
export const UM_DIA = 86400;

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

export async function wikipedia(params: Record<string, string>, revalidate = UM_DIA, espera = 12000): Promise<any> {
  const qs = new URLSearchParams({ ...params, format: 'json', formatversion: '2', origin: '*' });
  const res = await fetch(`${WIKI}/w/api.php?${qs}`, { next: { revalidate }, signal: AbortSignal.timeout(espera), headers: CABECALHOS });
  if (!res.ok) throw new Error(`Wikipédia respondeu ${res.status}`);
  return res.json();
}

/** Uma rota da API REST (resumo da página, "hoje na história"…); null se não responder. */
export async function wikipediaRest(caminho: string, revalidate = UM_DIA): Promise<any | null> {
  try {
    const res = await fetch(`${WIKI}/api/rest_v1/${caminho}`, { next: { revalidate }, signal: AbortSignal.timeout(10000), headers: CABECALHOS });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export const semHtml = (s: string | undefined | null) =>
  s ? decodificarEntidades(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : null;

/** "Yves Saint Laurent (estilista)" → "Yves Saint Laurent": a desambiguação não vai para a capa. */
export const tituloDeCapa = (t: string) => t.replace(/\s*\([^)]*\)$/, '');

/** Nome do arquivo no Commons, igual para o original e para as miniaturas. */
export function arquivoDaImagem(url: string): string {
  const partes = url.split('?')[0].split('/');
  const i = partes.indexOf('thumb');
  const nome = i >= 0 ? partes[i + 3] ?? '' : partes[partes.length - 1] ?? '';
  try {
    return decodeURIComponent(nome);
  } catch {
    return nome;
  }
}

/** Imagens do verbete no Commons, sem ícones, mapas, bandeiras e logotipos. */
export async function imagensDoVerbete(titulo: string, n = 5, largura = 1200): Promise<Imagem[]> {
  const j = await wikipedia({
    action: 'query',
    generator: 'images',
    titles: titulo,
    gimlimit: '40',
    redirects: '1',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: String(largura),
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
