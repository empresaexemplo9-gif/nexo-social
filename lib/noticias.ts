import 'server-only';
import { unstable_cache } from 'next/cache';
import type { CategorySlug } from './data';
import { FONTES_DE_NOTICIA } from './noticias-fontes';
import { DIAS_NO_AR, juntarNoticias, lerItens, paraNoticias, textoDoFeed, type ItemDoFeed, type Noticia } from './noticias-parser';

// "Notícias ao vivo" de cada tema: baixa os feeds das fontes do tema em
// paralelo, guarda cada feed por 15 minutos e junta tudo. Fonte fora do ar,
// lenta (> 7 s) ou que devolve outra coisa que não RSS/Atom é ignorada — as
// outras seguram a seção.

export type { Noticia } from './noticias-parser';
export { lerFeed } from './noticias-parser';

export interface NoticiasDoTema {
  itens: Noticia[];
  fontes: { nome: string; site: string; ok: boolean }[];
}

const AGENTE = 'nexo-social/1.0 (+https://nexo-social.drap.app.br; noticias)';
const TAMANHO_MAX = 2_000_000;
/** Itens guardados por feed (já sem os velhos) — sobra para os filtros por editoria. */
const ITENS_POR_FEED = 100;

/** Lê o corpo até TAMANHO_MAX bytes; passou disso, desiste (e não baixa o resto). */
async function lerCorpo(res: Response): Promise<Uint8Array> {
  const declarado = Number(res.headers.get('content-length'));
  if (declarado > TAMANHO_MAX) throw new Error('Feed grande demais');
  if (!res.body) {
    const tudo = new Uint8Array(await res.arrayBuffer());
    if (tudo.byteLength > TAMANHO_MAX) throw new Error('Feed grande demais');
    return tudo;
  }
  const leitor = res.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > TAMANHO_MAX) {
      await leitor.cancel().catch(() => undefined);
      throw new Error('Feed grande demais');
    }
    partes.push(value);
  }
  const tudo = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    tudo.set(p, pos);
    pos += p.byteLength;
  }
  return tudo;
}

/**
 * Um feed, em cache por endereço: o mesmo feed usado em dois temas (Estadão
 * Cultura em Cultura e em Livros, Veja SP em Gastronomia e em Arte) é baixado
 * uma vez só. O filtro de cada fonte é aplicado depois, fora do cache.
 */
const itensDoFeed = unstable_cache(
  async (feed: string): Promise<ItemDoFeed[]> => {
    const res = await fetch(feed, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
      headers: {
        'User-Agent': AGENTE,
        Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
      },
    });
    if (!res.ok) throw new Error(`Feed respondeu ${res.status}`);
    const xml = textoDoFeed(await lerCorpo(res), res.headers.get('content-type'));
    if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new Error('A fonte não devolveu RSS/Atom');
    const corte = Date.now() - DIAS_NO_AR * 86_400_000;
    return lerItens(xml, feed)
      .filter((i) => Date.parse(i.publicadaEm) >= corte)
      .sort((a, b) => Date.parse(b.publicadaEm) - Date.parse(a.publicadaEm))
      .slice(0, ITENS_POR_FEED);
  },
  ['noticias-feed-v1'],
  { revalidate: 900 },
);

/** As notícias mais recentes do tema, de todas as fontes dele, alternando os veículos. */
export async function noticiasDoTema(tema: CategorySlug, limite = 18): Promise<NoticiasDoTema> {
  const fontes = FONTES_DE_NOTICIA[tema] ?? [];
  const resultados = await Promise.allSettled(fontes.map((f) => itensDoFeed(f.feed)));
  const listas = resultados.map((r, i) => (r.status === 'fulfilled' ? paraNoticias(r.value, fontes[i]) : []));
  return {
    itens: juntarNoticias(listas, { limite }),
    fontes: fontes.map((f, i) => ({ nome: f.nome, site: f.site, ok: resultados[i].status === 'fulfilled' })),
  };
}
