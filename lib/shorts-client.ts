export interface FeedShort { id: string; titulo: string; canal: string; capa: string; de: string; }
const prefix = 'nexo:shorts:vistos:v2:';
export function seenShorts(owner: string): string[] {
  try { const list = JSON.parse(localStorage.getItem(prefix + owner) || '[]'); return Array.isArray(list) ? list.filter(id => typeof id === 'string').slice(-2000) : []; } catch { return []; }
}
export function markShortSeen(owner: string, id: string) {
  if (!/^[\w-]{11}$/.test(id)) return;
  try { localStorage.setItem(prefix + owner, JSON.stringify([...seenShorts(owner).filter(v => v !== id), id].slice(-2000))); } catch { /* Storage unavailable: current feed still deduplicates. */ }
}
export function nextShortRound() {
  try { const previous = Number(localStorage.getItem('nexo:shorts:rodada') || Math.floor(Math.random() * 10000)); const value = (previous + 1) % 10000; localStorage.setItem('nexo:shorts:rodada', String(value)); return value; } catch { return Math.floor(Math.random() * 10000); }
}
export async function loadShortFeed(chaves: string[], rodada: number, personalized = true) {
  const response = await fetch('/api/shorts?chaves=' + encodeURIComponent(chaves.join(',')) + '&rodada=' + rodada + '&personalizado=' + (personalized ? '1' : '0'), { cache: 'no-store' });
  if (!response.ok) throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'Não foi possível atualizar os Shorts.');
  const data = await response.json();
  const owner = data.owner;
  if (typeof owner !== 'string' || !Array.isArray(data.itens)) throw new Error('Resposta inválida ao atualizar os Shorts.');
  const seen = new Set(seenShorts(owner));
  const unique = Array.from(new Map<string, FeedShort>((data.itens as FeedShort[]).map(v => [v.id, v])).values());
  return { itens: unique.filter(v => !seen.has(v.id)), rotulos: data.rotulos ?? {}, owner, notice: data.notice ?? '' };
}
