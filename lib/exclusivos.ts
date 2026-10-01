// Itens exclusivos: planos de fundo, adesivos e bottons que o superadministrador
// envia (db/exclusivos.sql). Organizados por tema/banda (collection), edição e
// tipo. As imagens ficam no site (public/colecao — a coleção embutida) ou no
// bucket `exclusivos` (o que o superadministrador sobe pelo painel).

export type TipoExclusivo = 'sticker' | 'wallpaper' | 'button';
export const TIPOS_EXCLUSIVOS: TipoExclusivo[] = ['wallpaper', 'sticker', 'button'];

export const NOME_DO_TIPO: Record<TipoExclusivo, { um: string; varios: string; pasta: string }> = {
  wallpaper: { um: 'Plano de fundo', varios: 'Planos de fundo', pasta: 'fundos' },
  sticker: { um: 'Adesivo', varios: 'Adesivos', pasta: 'adesivos' },
  button: { um: 'Botton', varios: 'Bottons', pasta: 'bottons' },
};

export interface ItemExclusivo {
  id: string;
  title: string;
  kind: TipoExclusivo;
  /** O tema ou a banda ("Linkin Park"). */
  collection: string;
  /** A edição dentro do tema ("Edição especial"); vazia quando não há. */
  edition: string;
  imagePath: string;
  url: string;
  /** Miniatura leve (planos de fundo); senão, a própria imagem. */
  thumbUrl: string;
  sortOrder: number;
  createdAt?: string;
}

export const ehTipoExclusivo = (v: unknown): v is TipoExclusivo => v === 'sticker' || v === 'wallpaper' || v === 'button';

/** Caminho da coleção embutida (public/colecao/<tema>/<tipo>/<arquivo>.webp). */
export const CAMINHO_DA_COLECAO = /^\/colecao\/[a-z0-9-]+\/(fundos|adesivos|bottons)\/[a-z0-9-]+\.webp$/;
/** Caminho de um arquivo enviado ao bucket `exclusivos`. */
export const CAMINHO_DO_BUCKET = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)+$/;

/** O endereço público de um item: o da coleção embutida, ou o do bucket. */
export function urlDoItem(caminho: string, urlDoBucket: (p: string) => string): string {
  if (CAMINHO_DA_COLECAO.test(caminho)) return caminho;
  if (!CAMINHO_DO_BUCKET.test(caminho) || caminho.includes('..')) return '';
  return urlDoBucket(caminho);
}

/** Linha do banco → item para o navegador. */
export function itemParaCliente(a: any, urlDoBucket: (p: string) => string): ItemExclusivo {
  const url = urlDoItem(String(a.image_path ?? ''), urlDoBucket);
  const mini = a.thumb_path ? urlDoItem(String(a.thumb_path), urlDoBucket) : '';
  return {
    id: a.id,
    title: a.title,
    kind: a.kind,
    collection: a.collection,
    edition: a.edition ?? '',
    imagePath: a.image_path,
    url,
    thumbUrl: mini || url,
    sortOrder: a.sort_order ?? 0,
    createdAt: a.created_at,
  };
}

/** Os itens por tema (na ordem do catálogo), e dentro de cada tema por tipo e edição. */
export function porTema(itens: ItemExclusivo[]) {
  const temas: { tema: string; tipos: { tipo: TipoExclusivo; edicoes: { edicao: string; itens: ItemExclusivo[] }[] }[] }[] = [];
  for (const it of itens) {
    let t = temas.find((x) => x.tema === it.collection);
    if (!t) temas.push((t = { tema: it.collection, tipos: [] }));
    let k = t.tipos.find((x) => x.tipo === it.kind);
    if (!k) t.tipos.push((k = { tipo: it.kind, edicoes: [] }));
    let e = k.edicoes.find((x) => x.edicao === it.edition);
    if (!e) k.edicoes.push((e = { edicao: it.edition, itens: [] }));
    e.itens.push(it);
  }
  for (const t of temas) t.tipos.sort((a, b) => TIPOS_EXCLUSIVOS.indexOf(a.tipo) - TIPOS_EXCLUSIVOS.indexOf(b.tipo));
  return temas;
}

/** Para pastas: "DRAP · Inauguração" → "drap-inauguracao". */
export const fatiar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'geral';
