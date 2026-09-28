'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import YoutubeLivePlayer from './YoutubeLivePlayer';
import { formatEventDateLong } from '@/lib/datetime';
interface Broadcast { id: string; title: string; channel: string; url: string; state: 'live' | 'upcoming'; startsAt: string | null; embeddable: boolean; }
interface Result { broadcasts: Broadcast[]; checkedAt: string; partial: boolean; channels: { name: string; handle: string }[]; }
export default function FootballLive() {
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState('all');
  const [selected, setSelected] = useState<Broadcast | null>(null);
  const [now, setNow] = useState(Date.now());
  const sequence = useRef(0);
  const player = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    try {
      const res = await fetch('/api/esporte/transmissoes', { cache: 'no-store' });
      if (!res.ok) throw new Error(); const json = await res.json();
      if (!Array.isArray(json.broadcasts) || !Array.isArray(json.channels)) throw new Error();
      if (current === sequence.current) { setData(json); setError(false); setNow(Date.now()); setSelected(previous => previous && json.broadcasts.some((v: Broadcast) => v.id === previous.id && v.state === 'live') ? previous : null); }
    } catch { if (current === sequence.current) setError(true); }
    finally { if (current === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { setNow(Date.now()); if (document.visibilityState === 'visible') void load(); };
    const timer = setInterval(refresh, 60000); document.addEventListener('visibilitychange', refresh);
    return () => { ++sequence.current; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  useEffect(() => { if (selected) player.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [selected?.id]);
  const stale = error || Boolean(data && now - Date.parse(data.checkedAt) > 180000);
  const lives = data?.broadcasts.filter(v => v.state === 'live') ?? [];
  const options = lives.filter(v => channel === 'all' || v.channel === channel);
  if (stale || !lives.length) return null;
  return <section id="ao-vivo-canais" aria-label="Transmissões de futebol" className="card-soft scroll-mt-24 space-y-4 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold text-zinc-50">Futebol: escolha a transmissão</h2><p className="mt-1 text-sm text-zinc-400">Canais oficiais gratuitos. Disponibilidade e reprodução dependem dos direitos de cada jogo e região.</p></div>
      <button onClick={() => void load()} disabled={loading} className="action-collage rounded-lg px-3 py-2 text-sm">{loading ? 'Verificando…' : 'Atualizar transmissões'}</button>
    </div>
    <p role="status" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-200">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${!stale && lives.length ? 'bg-red-600 motion-safe:animate-pulse' : 'bg-zinc-600'}`} />
      {stale ? 'Não foi possível confirmar o ao vivo agora' : !data ? 'Consultando os canais…' : lives.length ? `${lives.length} transmissão(ões) ao vivo verificada(s)` : 'Nenhuma transmissão ao vivo confirmada neste momento'}
    </p>
    {data && <p className="text-xs text-zinc-500">Última consulta: {new Date(data.checkedAt).toLocaleTimeString('pt-BR')}. Atualização automática a cada minuto.{data.partial && ' Alguns vídeos ou canais não puderam ser confirmados.'}</p>}
    {data && <div className="flex flex-wrap gap-2" aria-label="Filtrar transmissões por canal">
      {['all', ...data.channels.map(c => c.name)].map(name => <button key={name} aria-pressed={channel === name} onClick={() => setChannel(name)} className="action-collage rounded-lg px-3 py-2 text-xs">{name === 'all' ? 'Todos os canais' : name}</button>)}
    </div>}
    {selected && <div ref={player}><YoutubeLivePlayer id={selected.id} title={selected.title} onClose={() => setSelected(null)} /></div>}
    <div className="grid gap-3 md:grid-cols-2">
      {options.map(v => <article key={v.id} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <p className="text-xs font-bold text-zinc-300">{v.state === 'live' ? stale ? 'Status desatualizado' : '● AO VIVO' : `AGENDADO · ${v.startsAt ? formatEventDateLong(v.startsAt) : 'Horário a confirmar'}`}</p>
        <h3 className="font-semibold text-zinc-50">{v.title}</h3><p className="text-xs text-zinc-400">{v.channel}</p>
        {v.embeddable && v.state === 'live' && !stale ? <button onClick={() => setSelected(v)} aria-pressed={selected?.id === v.id} className="action-patch action-patch--red rounded-lg px-4 py-2 text-sm">{selected?.id === v.id ? 'Selecionada' : 'Assistir aqui'}</button> : <a href={v.url} target="_blank" rel="noopener noreferrer" className="action-collage inline-block rounded-lg px-3 py-2 text-sm">{v.state === 'upcoming' ? 'Ver programação no canal' : 'Ver no canal oficial'}</a>}
      </article>)}
    </div>
    {data && !options.length && <p className="text-sm text-zinc-400">Não há jogos confirmados para este filtro. Consulte a programação dos canais abaixo.</p>}
    <div className="flex flex-wrap gap-3">{(data?.channels ?? [{ name: 'CazéTV', handle: 'CazeTV' }, { name: 'ge tv', handle: 'getv' }, { name: 'Canal GOAT', handle: 'canalgoat' }]).map(c => <a key={c.handle} href={`https://www.youtube.com/@${c.handle}/streams`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 underline">Programação · {c.name}</a>)}</div>
  </section>;
}
