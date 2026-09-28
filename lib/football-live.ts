import 'server-only';
import { broadcastState, liveCandidates, youtubeJson } from './football-live-parser';
export const FOOTBALL_CHANNELS = [
  { name: 'CazéTV', handle: 'CazeTV' },
  { name: 'ge tv', handle: 'getv' },
  { name: 'Canal GOAT', handle: 'canalgoat' },
];
const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR,pt;q=0.9' };
export async function footballBroadcasts() {
  let failures = 0;
  const channels = await Promise.all(FOOTBALL_CHANNELS.map(async channel => {
    try {
      const res = await fetch(`https://www.youtube.com/@${channel.handle}/streams`, { headers, next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error();
      const data = youtubeJson(await res.text(), 'ytInitialData');
      if (!data) throw new Error();
      const candidates = liveCandidates(data).slice(0, 6);
      return (await Promise.all(candidates.map(async candidate => {
        try {
          const watch = await fetch(`https://www.youtube.com/watch?v=${candidate.id}`, { headers, next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
          if (!watch.ok) throw new Error();
          const player = youtubeJson(await watch.text(), 'ytInitialPlayerResponse');
          if (!player) throw new Error();
          const state = broadcastState(player);
          if (!state) { failures++; return null; }
          return { ...candidate, ...state, channel: channel.name, channelUrl: `https://www.youtube.com/@${channel.handle}/streams`, url: `https://www.youtube.com/watch?v=${candidate.id}` };
        } catch { failures++; return null; }
      }))).filter(item => item !== null);
    } catch { failures++; return []; }
  }));
  const broadcasts = Array.from(new Map(channels.flat().map(item => [item.id, item])).values())
    .sort((a, b) => (a.state === b.state ? (a.startsAt ?? '').localeCompare(b.startsAt ?? '') : a.state === 'live' ? -1 : 1));
  return { broadcasts, checkedAt: new Date().toISOString(), partial: failures > 0, channels: FOOTBALL_CHANNELS };
}
