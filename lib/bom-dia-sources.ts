import 'server-only';
import { unstable_cache } from 'next/cache';
import { createAnonServerClient } from './supabase-server';
import { dayKey, dayNumber } from './bom-dia';
import { chooseDiscoveries, parseBreakfast, parseVideoFeed, recentDiscoveries, type Discovery } from './bom-dia-feed';

export interface BomDiaEditorial { recipeTitle: string; recipeDescription: string; tip: string; publishedAt: string }
export interface BomDiaSources {
  items: Discovery[];
  sources: { name: string; url: string; ok: boolean; checkedAt: string | null }[];
  editorial: BomDiaEditorial | null;
}
const SOURCES = [
  { name: 'Panelinha · café da manhã', url: 'https://panelinha.com.br/home/cafe-da-manha', feed: 'https://panelinha.com.br/home/cafe-da-manha', parse: parseBreakfast },
  // ID conferido no link de inscrição do próprio panelinha.com.br.
  { name: 'Panelinha · vídeos', url: 'https://www.youtube.com/channel/UCfSPnAlDUTiIOAvNOI-a4yQ', feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCfSPnAlDUTiIOAvNOI-a4yQ',
    parse: (xml: string) => parseVideoFeed(xml, 'Panelinha', 'Cozinha e alimentação', /receita|cozinh|alimenta|comida|massa|feij[aã]o|arroz|salada|legume|fruta|bolo|sopa|p[aã]o|caf[eé]|aveia|granola|microbiota/i) },
  // Canal canônico de youtube.com/@sescsp.
  { name: 'Sesc São Paulo', url: 'https://www.youtube.com/@sescsp', feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCESs365L1Ccnq4q3J5yZ7nQ',
    parse: (xml: string) => parseVideoFeed(xml, 'Sesc São Paulo', 'Movimento e bem-estar', /gin[aá]st|treino|caminhad|alongamento|mobilidade|atividade f[ií]sica|exerc[ií]cio|bem.estar|sa[uú]de/i) },
];
const fetchSource = unstable_cache(async (index: number) => {
  const source = SOURCES[index];
  const response = await fetch(source.feed, { cache: 'no-store', signal: AbortSignal.timeout(6500), headers: { 'User-Agent': 'NexoSocial/1.0 (+https://nexo-social.drap.app.br)', Accept: 'application/atom+xml, text/html;q=0.9' } });
  if (!response.ok) throw Error('Fonte indisponível');
  const raw = await response.text();
  if (raw.length > 2_000_000) throw Error('Resposta da fonte muito grande');
  const items = source.parse(raw);
  if (!items.length && !raw.includes('<feed')) throw Error('Formato da fonte não reconhecido');
  return { items, checkedAt: new Date().toISOString() };
}, ['bom-dia-sources-v1'], { revalidate: 3600 });

export async function fetchBomDiaEditorial(now = new Date()): Promise<BomDiaEditorial | null> {
  try {
    const sb = createAnonServerClient();
    if (!sb) return null;
    const { data, error } = await sb.from('bom_dia')
      .select('recipe_title,recipe_description,quick_tip,created_at').is('tenant_id', null)
      .gte('created_at', new Date(now.getTime() - 7 * 86400000).toISOString())
      .lte('created_at', now.toISOString()).order('created_at', { ascending: false }).limit(1)
      .abortSignal(AbortSignal.timeout(4000)).maybeSingle();
    if (error || !data) return null;
    return { recipeTitle: data.recipe_title, recipeDescription: data.recipe_description || '', tip: data.quick_tip || '', publishedAt: data.created_at };
  } catch { return null; }
}

export async function getBomDiaSources(round = 0, now = new Date()): Promise<BomDiaSources> {
  const [results, editorial] = await Promise.all([
    Promise.allSettled(SOURCES.map((_, i) => fetchSource(i))), fetchBomDiaEditorial(now),
  ]);
  const sequence = dayNumber(dayKey(now)) + round;
  const items = results.flatMap(result => result.status === 'fulfilled'
    ? chooseDiscoveries(recentDiscoveries(result.value.items, now), sequence, 3) : []);
  return { items: recentDiscoveries(items, now), editorial, sources: SOURCES.map((source, i) => ({
    name: source.name, url: source.url, ok: results[i].status === 'fulfilled',
    checkedAt: results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<{ checkedAt: string }>).value.checkedAt : null,
  })) };
}
