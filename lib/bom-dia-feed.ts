/** Somente títulos e links públicos; nenhum HTML externo é renderizado na UI. */
export interface Discovery {
  title: string; url: string; source: string; kind: string; publishedAt: string | null;
}
function plain(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => { const code = Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''; })
    .replace(/\s+/g, ' ').trim().slice(0, 240);
}
export function parseBreakfast(html: string): Discovery[] {
  const items: Discovery[] = [];
  const seen = new Set<string>();
  for (const match of Array.from(html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi))) {
    const raw = match[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = raw?.[1] ?? raw?.[2] ?? raw?.[3];
    if (!href) continue;
    let url: URL;
    try { url = new URL(href, 'https://panelinha.com.br'); } catch { continue; }
    if (url.protocol !== 'https:' || url.hostname !== 'panelinha.com.br' || !url.pathname.startsWith('/receita/') || url.username || url.password) continue;
    const title = plain(match[2].match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] ?? '');
    if (!title || seen.has(url.href)) continue;
    seen.add(url.href);
    items.push({ title, url: url.href, source: 'Panelinha · café da manhã', kind: 'Receita', publishedAt: null });
    if (items.length >= 80) break;
  }
  return items;
}
export function parseVideoFeed(xml: string, source: string, kind: string, relevant: RegExp): Discovery[] {
  const items: Discovery[] = [];
  for (const match of Array.from(xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g))) {
    const entry = match[1];
    const id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const title = plain(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !title || !published || !Number.isFinite(Date.parse(published)) || !relevant.test(title)) continue;
    items.push({ title, url: `https://www.youtube.com/watch?v=${id}`, source, kind, publishedAt: new Date(published).toISOString() });
  }
  return items;
}
export function recentDiscoveries(items: Discovery[], now = new Date()): Discovery[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.url)) return false;
    if (item.publishedAt) {
      const time = Date.parse(item.publishedAt);
      if (!Number.isFinite(time) || time > now.getTime() || now.getTime() - time > 90 * 86400000) return false;
    }
    seen.add(item.url); return true;
  }).sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '') || 0);
}
export function chooseDiscoveries(items: Discovery[], sequence: number, count: number): Discovery[] {
  if (!items.length) return [];
  return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[((sequence + i) % items.length + items.length) % items.length]);
}
