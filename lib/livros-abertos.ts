import 'server-only';
import type { ItemGratis } from './gratis';

const ESTRANGEIROS = ['Victor Hugo', 'Jules Verne', 'Mary Shelley', 'Edgar Allan Poe', 'William Shakespeare', 'Jane Austen', 'Dostoevsky', 'Dostoievski', 'Tolstoy', 'Tolstoi', 'Daniel Defoe', 'Robert Louis Stevenson'];
const TEMAS: Record<string, string[]> = {
  contos: ['short stories', 'contos'], cronicas: ['chronicles', 'crônicas'],
  'aventura-lit': ['adventure', 'aventura'], 'terror-lit': ['horror', 'gothic', 'terror'],
  'ficcao-cientifica-lit': ['science fiction', 'ficção científica'], teatro: ['drama', 'teatro', 'plays'],
  filosofia: ['philosophy', 'filosofia'], infantojuvenil: ['juvenile', 'children', 'infantil'],
  'ficcao-lit': ['fiction', 'romance', 'ficção'], 'fantasia-lit': ['fantasy', 'fantasia'],
  policial: ['detective', 'mystery', 'policial'], biografia: ['biography', 'biografia'],
  historia: ['history', 'história'], negocios: ['economics', 'business', 'economia'],
  autoajuda: ['conduct of life', 'self-help'], ciencia: ['science', 'ciência'],
  poesia: ['poetry', 'poesia'], tecnico: ['technology', 'engineering', 'tecnologia'],
  'romance-lit': ['love stories', 'romance'], quadrinhos: ['comics', 'comic books', 'quadrinhos'],
};
const idValido = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,199}$/.test(id);
const primeiro = (v: unknown): string | null => typeof v === 'string' ? v : Array.isArray(v) ? primeiro(v[0]) : null;
const idioma = (v: unknown): string | null => {
  const s = primeiro(v)?.toLowerCase();
  return s ? ({por:'pt',portuguese:'pt',eng:'en',english:'en',spa:'es',fre:'fr'}[s] ?? s.slice(0,2)) : null;
};
async function json(url: string) {
  const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'NexoSocial/1.0 (https://nexo-social-two.vercel.app)', Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Catálogo respondeu ${response.status}`);
  return response.json();
}
function livro(id: string, titulo: string, autor: string | null, lang: unknown, fonte: ItemGratis['fonte'], ano?: unknown): ItemGratis {
  return { id: `ia:${id}`, titulo, autor, idioma: idioma(lang), fonte,
    ano: ano == null ? null : String(ano).slice(0,4),
    capa: `https://archive.org/services/img/${encodeURIComponent(id)}`,
    link: `https://archive.org/details/${encodeURIComponent(id)}`,
    midia: { tipo: 'archive', id, formato: 'texto' } };
}

/** Somente a edição que a fonte confirma aberta; empréstimos não são leitura livre. */
export async function livrosOpenLibrary(chave: string, portugues: boolean): Promise<ItemGratis[]> {
  if (chave === 'traducoes') portugues = true;
  const temas = TEMAS[chave] ?? TEMAS['ficcao-lit'];
  const assunto = chave === 'traducoes' ? `author:(${ESTRANGEIROS.map(t => `"${t}"`).join(' OR ')})` : `subject:(${temas.map(t => `"${t}"`).join(' OR ')})`;
  const q = `${assunto} AND ebook_access:public${portugues ? ' AND language:por' : ''}`;
  const qs = new URLSearchParams({ q, limit: '24', fields: 'key,title,author_name,first_publish_year,ia,availability,ebook_access,language', lang: portugues ? 'pt' : 'en' });
  const data = await json(`https://openlibrary.org/search.json?${qs}`);
  if (!Array.isArray(data.docs)) throw new Error('Resposta inválida da Open Library');
  const candidatos = data.docs.filter((d: any) => d.ebook_access === 'public' && d.availability?.status === 'open' && d.availability?.is_readable === true && !d.availability?.is_restricted && idValido(d.availability?.identifier)).slice(0, 8);
  const livros = await Promise.all(candidatos.map(async (d: any) => {
    const id = d.availability.identifier;
    const meta = await json(`https://archive.org/metadata/${encodeURIComponent(id)}`);
    const m = meta.metadata;
    // O idioma do registro da obra pode ser diferente do exemplar digitalizado.
    if (!m || m.mediatype !== 'texts' || [true, 'true'].includes(m['access-restricted-item']) || (portugues && idioma(m.language) !== 'pt')) return null;
    if (!Array.isArray(meta.files) || !meta.files.some((f: any) => !f.private && /(?:Text PDF|Image Container PDF|Single Page Processed JP2 ZIP)/.test(f.format ?? ''))) return null;
    return livro(id, primeiro(m.title) ?? d.title, primeiro(m.creator) ?? primeiro(d.author_name), m.language, 'Open Library', m.year);
  }).map((p: Promise<ItemGratis | null>) => p.catch(() => null)));
  return livros.filter((l): l is ItemGratis => l !== null);
}

/** Coleções/licenças abertas, excluindo itens restritos e livros de empréstimo. */
export async function livrosInternetArchive(chave: string, portugues: boolean): Promise<ItemGratis[]> {
  if (chave === 'traducoes') portugues = true;
  const temas = TEMAS[chave] ?? TEMAS['ficcao-lit'];
  const assunto = chave === 'traducoes' ? `creator:(${ESTRANGEIROS.map(t => `"${t}"`).join(' OR ')})` : `subject:(${temas.map(t => `"${t}"`).join(' OR ')})`;
  const q = `mediatype:texts AND ${assunto} AND (licenseurl:*publicdomain* OR collection:gutenberg) AND (year:[* TO 1930] OR collection:machado-de-assis OR collection:gutenberg) AND -collection:printdisabled${portugues ? ' AND language:(por OR portuguese OR pt)' : ''}`;
  const qs = new URLSearchParams({ q, rows: '80', output: 'json', 'sort[]': 'downloads desc' });
  for (const f of ['identifier','title','creator','language','year','licenseurl','collection','access-restricted-item','format']) qs.append('fl[]', f);
  const data = await json(`https://archive.org/advancedsearch.php?${qs}`);
  if (!Array.isArray(data.response?.docs)) throw new Error('Resposta inválida do Internet Archive');
  return data.response.docs.flatMap((d: any) => {
    const collections: string[] = Array.isArray(d.collection) ? d.collection : [d.collection];
    const license = primeiro(d.licenseurl) ?? '';
    const acervoHistorico = collections.includes('gutenberg') || collections.includes('machado-de-assis') || (Number(d.year) > 0 && Number(d.year) <= 1930);
    const livre = collections.includes('gutenberg') || /^https?:\/\/(www\.)?creativecommons\.org\/(publicdomain|licenses)\//.test(license);
    const formatos: string[] = Array.isArray(d.format) ? d.format : [d.format];
    if (!formatos.some(f => /^(Text PDF|Image Container PDF|Single Page Processed JP2 ZIP)$/.test(f ?? ''))) return [];
    if (!acervoHistorico || !livre || !idValido(d.identifier) || !primeiro(d.title) || collections.includes('printdisabled') || [true,'true'].includes(d['access-restricted-item'])) return [];
    return [livro(d.identifier, primeiro(d.title)!, primeiro(d.creator), d.language, 'Internet Archive', d.year)];
  });
}

/** Resolve somente PDFs públicos do Archive; nenhuma URL arbitrária é aceita. */
export async function arquivoDoLivro(id: string): Promise<{ url: string; nome: string; tamanho: number }> {
  if (!idValido(id)) throw new Error('Livro inválido.');
  const data = await json(`https://archive.org/metadata/${encodeURIComponent(id)}`);
  const m = data.metadata;
  if (!m || m.mediatype !== 'texts' || [true, 'true'].includes(m['access-restricted-item']) || m.collection?.includes('printdisabled')) throw new Error('Este exemplar não oferece download livre.');
  const files = (Array.isArray(data.files) ? data.files : []).filter((f: any) => !f.private && ['Text PDF', 'Image Container PDF'].includes(f.format) && typeof f.name === 'string' && f.name.toLowerCase().endsWith('.pdf') && Number(f.size) > 0 && Number(f.size) <= 40 * 1024 * 1024).sort((a: any,b: any) => Number(a.size)-Number(b.size));
  if (!files.length) throw new Error('PDF indisponível ou maior que 40 MB. Use o leitor digital abaixo.');
  const file = files[0];
  return { url: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(file.name)}`, nome: `${id}.pdf`, tamanho: Number(file.size) };
}
