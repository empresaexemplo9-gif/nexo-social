'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import YoutubeMusicPlayer from '../YoutubeMusicPlayer';
import { nextPlayable } from '@/lib/music-queue';

/** A seleção da Comunidade toca em ordem e volta ao início ao terminar. */
export default function YoutubeMusicQueue({ ids, title }: { ids: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [request, setRequest] = useState(0);
  const [unavailable, setUnavailable] = useState<Record<string, boolean>>({});
  const current = useRef({ ids, index, unavailable });
  current.current = { ids, index, unavailable };
  const next = useCallback(() => {
    const state = current.current;
    const k = nextPlayable(state.ids, state.index, state.unavailable);
    if (k === null) return;
    setIndex(k);
    setRequest(n => n + 1);
  }, []);
  const failed = unavailable[ids[index]];
  const canContinue = nextPlayable(ids, index, unavailable) !== null;
  useEffect(() => {
    if (!failed || !canContinue) return;
    const timer = setTimeout(next, 2500);
    return () => clearTimeout(timer);
  }, [failed, canContinue, index, next]);

  if (!ids.length) return <p role="status" className="p-4">Esta lista não tem músicas disponíveis.</p>;
  return <div>
    <YoutubeMusicPlayer videoId={ids[index]} title={title} request={request} onEnded={next}
      onError={() => setUnavailable(old => ({ ...old, [ids[index]]: true }))} />
    <div className="flex items-center justify-between gap-3 bg-zinc-900 p-3 text-xs text-zinc-100">
      <span>{index + 1} de {ids.length} · Reprodução contínua</span>
      <button type="button" disabled={!canContinue} onClick={next} className="min-h-11 shrink-0 px-2 underline disabled:opacity-40">Próxima música</button>
    </div>
    {failed && <p role="status" className="bg-zinc-900 p-3 text-xs text-zinc-300">{canContinue ? 'Esta música está indisponível. Pulando para a próxima…' : 'Nenhuma música desta lista está disponível para tocar aqui.'}</p>}
  </div>;
}
