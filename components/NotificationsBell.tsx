'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { formatEventDateLong } from '@/lib/datetime';
import { supabase } from '@/lib/supabase';
import { EVENTO_CONVITES, responderConvite } from '@/lib/convites';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  appointmentId: string | null;
  groupId: string | null;
  /** Convite sem resposta: fica aqui, com positivo/negativo, até a pessoa responder. */
  pending: boolean;
}

/**
 * Sino de notificações — só aparece para quem está autenticado.
 *
 * Convites (para compromisso ou grupo) chegam em tempo real e ficam no topo,
 * com os botões positivo e negativo, até a pessoa responder; "marcar como
 * lidas" não os tira daqui.
 *
 * `lateral`: o sino está na barra lateral esquerda, então a lista abre ao lado
 * dele (para a direita e para cima), e não embaixo — senão sairia da tela.
 */
export default function NotificationsBell({ lateral = false, rotulo }: { lateral?: boolean; rotulo?: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [erro, setErro] = useState('');

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
    // Reserva do tempo real: atualiza de tempos em tempos e ao voltar para a aba.
    const t = setInterval(load, 60000);
    const aoVoltar = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener(EVENTO_CONVITES, load);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener(EVENTO_CONVITES, load);
    };
  }, [load]);

  // Tempo real: um convite novo aparece na hora, sem esperar a próxima volta.
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let canal: ReturnType<typeof sb.channel> | null = null;
    let ativo = true;
    sb.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!ativo || !uid) return;
      // Tópico único por sino: a barra lateral e a barra do celular montam um
      // cada, e dois canais com o mesmo tópico se atropelam.
      canal = sb
        .channel(`notificacoes:${uid}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => load())
        .subscribe();
    });
    return () => {
      ativo = false;
      if (canal) sb.removeChannel(canal);
    };
  }, [load]);

  if (!available) return null;

  const markAll = async () => {
    await fetch('/api/agenda/notifications', { method: 'PATCH' });
    load();
  };

  const marcarLida = (n: Notification) => {
    if (n.readAt || n.pending) return;
    fetch('/api/agenda/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: n.id }),
    }).then(load, () => undefined);
  };

  const responder = async (n: Notification, positivo: boolean) => {
    setRespondendo(n.id);
    setErro('');
    // Deu certo: o aviso de responderConvite recarrega o sino (e a agenda aberta).
    const r = await responderConvite(n, positivo);
    if (!r.ok) setErro(r.error || 'Não deu para responder agora.');
    setRespondendo(null);
  };

  const pendentes = items.filter((n) => n.pending);
  const lidasOuNao = items.filter((n) => !n.pending);
  const temNaoLidas = lidasOuNao.some((n) => !n.readAt);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-3 rounded-xl p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50 ${rotulo ? 'w-full px-3 text-sm' : ''}`}
        aria-label={unread ? `Notificações: ${unread} novas` : 'Notificações'}
        title="Notificações"
      >
        <Icon name="alert" size={18} className="shrink-0" />
        {rotulo && <span className="truncate">{rotulo}</span>}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold text-zinc-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-hidden />
          <div
            className={`absolute z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-soft ${
              lateral ? 'bottom-0 left-full ml-3' : 'right-0 mt-2'
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-100">Notificações</span>
              {temNaoLidas && (
                <button onClick={markAll} className="text-[11px] text-emerald-400 hover:underline">
                  marcar como lidas
                </button>
              )}
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              {erro && <p className="border-b border-zinc-800/60 bg-clay-950/20 px-4 py-2 text-[11px] text-clay-300">{erro}</p>}

              {pendentes.length > 0 && (
                <div className="border-b border-zinc-800">
                  <p className="px-4 pt-3 font-mono text-[10px] uppercase tracking-wider text-clay-400">Aguardando sua resposta</p>
                  {pendentes.map((n) => (
                    <div key={n.id} className="border-b border-zinc-800/40 bg-clay-950/10 px-4 py-3 last:border-0">
                      <Link href={n.link || '/agenda'} onClick={() => setOpen(false)} className="block">
                        <p className="text-xs font-semibold text-zinc-100">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-zinc-600">{formatEventDateLong(n.createdAt)}</p>
                      </Link>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => responder(n, true)}
                          disabled={respondendo === n.id}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                          <Icon name="thumbUp" size={14} /> {n.type === 'convite_grupo' ? 'Participar' : 'Concordo'}
                        </button>
                        <button
                          onClick={() => responder(n, false)}
                          disabled={respondendo === n.id}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-clay-600 hover:text-clay-300 disabled:opacity-60"
                        >
                          <Icon name="thumbDown" size={14} /> {n.type === 'convite_grupo' ? 'Recusar' : 'Não concordo'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-zinc-500">Nada por aqui ainda.</p>
              ) : (
                lidasOuNao.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || '/agenda'}
                    onClick={() => {
                      marcarLida(n);
                      setOpen(false);
                    }}
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
