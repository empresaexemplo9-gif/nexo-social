'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { formatEventDateLong } from '@/lib/datetime';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Sino de notificações — só aparece para quem está autenticado. */
export default function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agenda/notifications');
      if (!res.ok) {
        setAvailable(false);
        return;
      }
      const json = await res.json();
      setItems(json.notifications || []);
      setUnread(json.unread || 0);
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Atualiza periodicamente para novos convites/recados aparecerem sozinhos.
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  if (!available) return null;

  const markAll = async () => {
    await fetch('/api/agenda/notifications', { method: 'PATCH' });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
        aria-label="Notificações"
      >
        <Icon name="alert" size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold text-zinc-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-soft">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-100">Notificações</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] text-emerald-400 hover:underline">
                  marcar como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-zinc-500">Nada por aqui ainda.</p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || '/agenda'}
                    onClick={() => setOpen(false)}
                    className={`block border-b border-zinc-800/60 px-4 py-3 transition hover:bg-zinc-800/50 ${
                      n.readAt ? '' : 'bg-emerald-950/10'
                    }`}
                  >
                    <p className="text-xs font-semibold text-zinc-100">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-zinc-600">{formatEventDateLong(n.createdAt)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
