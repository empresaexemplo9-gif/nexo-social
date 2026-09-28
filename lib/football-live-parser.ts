/* Dados públicos do próprio vídeo; nunca inferir ao vivo só pelo título. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function youtubeJson(html: string, variable: string): any | null {
  const marker = new RegExp('(?:var\\s+)?' + variable + '\\s*=\\s*');
  const found = marker.exec(html);
  if (!found) return null;
  const start = found.index + found[0].length;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; } }
  }
  return null;
}
export interface LiveCandidate { id: string; title: string; }
const FOOTBALL = /\s(?:x|vs\.?|versus)\s|futebol|brasileir|libertadores|sul-americana|copa do brasil|premier league|laliga|bundesliga|serie a|liga das nações/i;
const OTHER = /basquete|basketball|nba|nfl|futebol americano|vôlei|voleibol|volei|tênis|tennis|formula|fórmula|futsal|beach soccer|pr[ée][- ]jogo|p[oó]s[- ]jogo|mesa redonda|react|sem imagens/i;
export function liveCandidates(data: any): LiveCandidate[] {
  const result = new Map<string, LiveCandidate>();
  function visit(node: any) {
    if (!node || typeof node !== 'object') return;
    const v = node.videoRenderer ?? node.lockupViewModel;
    if (v) {
      const id = v.videoId ?? v.contentId;
      const title = v.title?.simpleText ?? v.title?.runs?.map((r: any) => r.text).join('') ?? v.metadata?.lockupMetadataViewModel?.title?.content ?? '';
      // Only the thumbnail's badges, never suggestions or animated "playing" labels.
      const badges = JSON.stringify(v.badges ?? []) + JSON.stringify(v.thumbnailOverlays ?? []) + JSON.stringify(v.contentImage?.thumbnailViewModel?.overlays ?? []);
      const current = /LIVE_NOW|"style":"LIVE"|BADGE_STYLE_LIVE|"text":"(?:AO VIVO|LIVE|Ao vivo)"/.test(badges);
      const upcoming = Boolean(v.upcomingEventData) || /"text":"(?:Em breve|UPCOMING|Upcoming)"/.test(badges);
      if (/^[\w-]{11}$/.test(id ?? '') && (current || upcoming) && FOOTBALL.test(title) && !OTHER.test(title)) result.set(id, { id, title });
      return;
    }
    for (const value of Object.values(node)) visit(value);
  }
  visit(data);
  return Array.from(result.values());
}
export function broadcastState(player: any): { state: 'live' | 'upcoming'; startsAt: string | null; embeddable: boolean } | null {
  const live = player?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails;
  const status = player?.playabilityStatus;
  if (live?.endTimestamp) return null;
  if (live?.isLiveNow === true && status?.status === 'OK') return { state: 'live', startsAt: live.startTimestamp ?? null, embeddable: status.playableInEmbed === true };
  const scheduled = status?.liveStreamability?.liveStreamabilityRenderer?.offlineSlate?.liveStreamOfflineSlateRenderer?.scheduledStartTime;
  if (status?.status === 'LIVE_STREAM_OFFLINE' && scheduled && Number.isFinite(Number(scheduled))) {
    const date = new Date(Number(scheduled) * 1000);
    if (!Number.isFinite(date.getTime())) return null;
    return { state: 'upcoming', startsAt: date.toISOString(), embeddable: status.playableInEmbed === true };
  }
  return null;
}
