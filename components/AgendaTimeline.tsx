'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import BotoesResposta from './BotoesResposta';
import { useAgenda } from '@/lib/agenda';
import type { Appointment } from '@/lib/compromissos';
import type { EventItem } from '@/lib/data';
import { formatEventDateLong, isUpcoming } from '@/lib/datetime';
import { EVENTO_CONVITES, responderConvite } from '@/lib/convites';

type LoadState = 'loading' | 'ok' | 'anon' | 'error';

export default function AgendaTimeline({ events }: { events: EventItem[] }) {
  const { saved, ready } = useAgenda();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [now, setNow] = useState(() => new Date());
  const request = useRef(0);
  const responding = useRef(false);

  const load = useCallback(async () => {
    const current = ++request.current;
    try {
      const res = await fetch('/api/agenda/appointments', { cache: 'no-store' });
      if (current !== request.current) return;
      if (res.status === 401) {
        setAppointments([]);
        setState('anon');
        return;
      }
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (current !== request.current) return;
      if (!Array.isArray(json.appointments)) throw new Error();
      setAppointments(json.appointments);
      setState('ok');
    } catch {
      if (current !== request.current) return;
      setAppointments([]);
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => { setNow(new Date()); void load(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener(EVENTO_CONVITES, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(visible, 60000);
    return () => {
      ++request.current;
      window.clearInterval(timer);
      window.removeEventListener(EVENTO_CONVITES, refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [load]);

  const respond = async (id: string, status: 'confirmado' | 'recusado') => {
    if (responding.current) return;
    responding.current = true;
    setBusy(id);
    setFeedback('');
    try {
      const result = await responderConvite({ type: 'convite_compromisso', appointmentId: id }, status === 'confirmado');
      if (!result.ok) {
        setFeedback(result.error || 'Não foi possível responder. Tente novamente.');
      } else {
        setAppointments((items) => items.map((item) => item.id === id ? { ...item, myStatus: status } : item));
        setFeedback(status === 'confirmado' ? 'Você concordou com o compromisso.' : 'Você não concordou com o compromisso.');
      }
    } finally {
      responding.current = false;
      setBusy(null);
    }
  };

  // Convites permanecem visíveis até a resposta, mesmo após a data marcada.
  const pending = appointments.filter((a) => a.role === 'convidado' && a.myStatus === 'pendente');
  const scheduled = appointments.filter((a) =>
    (a.role === 'dono' || a.myStatus === 'confirmado') && isUpcoming(a.startsAt, a.endsAt ?? undefined, now),
  );
  const savedEvents = ready ? events.filter((event) => saved.includes(event.id) &&
    (!event.startsAt || isUpcoming(event.startsAt, event.endsAt, now))) : [];
  const items = [
    ...scheduled.map((a) => ({ key: `appointment:${a.id}`, title: a.title, startsAt: a.startsAt,
      date: formatEventDateLong(a.startsAt), location: [a.location, a.city].filter(Boolean).join(' — '),
      href: '/agenda', kind: a.role === 'dono' ? 'Compromisso' : 'Confirmado' })),
    ...savedEvents.map((event) => ({ key: `event:${event.id}`, title: event.title, startsAt: event.startsAt,
      date: event.startsAt ? formatEventDateLong(event.startsAt) : event.date,
      location: [event.venue, event.city].filter(Boolean).join(' — '), href: `/evento/${event.id}`, kind: 'Evento salvo' })),
  ].sort((a, b) => (a.startsAt ? Date.parse(a.startsAt) : Infinity) - (b.startsAt ? Date.parse(b.startsAt) : Infinity));

  return (
    <section id="agenda-home" aria-labelledby="agenda-home-title" className="card-soft space-y-5 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="rotulo-hud"><Icon name="calendarCheck" size={14} /> Compromissos e datas marcadas</p>
          <h2 id="agenda-home-title" className="mt-2 text-3xl font-semibold text-zinc-50">Sua agenda</h2>
          <p className="mt-1 text-sm text-zinc-400">Seus próximos compromissos, convites e eventos salvos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/agenda#novo-compromisso" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300">Marcar compromisso</Link>
          <Link href="/agenda" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-emerald-400">Abrir agenda</Link>
        </div>
      </div>

      {state === 'loading' && <p role="status" className="text-sm text-zinc-400">Carregando seus compromissos…</p>}
      {state === 'anon' && <p className="text-sm text-zinc-400"><Link href="/conta" className="font-semibold text-emerald-400 underline">Entre na sua conta</Link> para ver seus compromissos e convites.</p>}
      {state === 'error' && <div role="alert" className="text-sm text-clay-300">Não foi possível carregar seus compromissos. <button type="button" onClick={() => { setState('loading'); void load(); }} className="font-semibold underline">Tentar novamente</button></div>}
      {feedback && <p role="status" className="text-sm text-zinc-300">{feedback}</p>}

      {pending.length > 0 && <div className="space-y-3">
        <h3 className="text-sm font-semibold text-clay-300">Convites aguardando sua resposta ({pending.length})</h3>
        <ul className="grid gap-3 lg:grid-cols-2">
          {pending.map((a) => <li key={a.id} className="min-w-0 space-y-3 rounded-2xl border border-clay-700/40 bg-zinc-900/60 p-4">
            <div>
              <h4 className="break-words font-semibold text-zinc-50">{a.title}</h4>
              <p className="mt-1 text-sm text-emerald-400">{formatEventDateLong(a.startsAt)}</p>
              {a.location && <p className="mt-1 break-words text-xs text-zinc-400">{a.location}</p>}
              <p className="mt-1 text-xs text-zinc-400">Convite de {a.ownerName || 'um participante'}</p>
            </div>
            <BotoesResposta status={a.myStatus} busy={busy !== null} onResponder={(status) => void respond(a.id, status)} />
          </li>)}
        </ul>
      </div>}

      {items.length > 0 && <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">Próximas datas</h3>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => <li key={item.key} className="min-w-0">
            <Link href={item.href} className="block h-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-emerald-600">
              <p className="text-xs font-medium text-emerald-400">{item.date}</p>
              <h4 className="mt-2 break-words font-semibold text-zinc-50">{item.title}</h4>
              {item.location && <p className="mt-1 break-words text-xs text-zinc-400">{item.location}</p>}
              <p className="mt-2 text-xs text-zinc-500">{item.kind}</p>
            </Link>
          </li>)}
        </ul>
        {items.length > 6 && <p className="text-sm text-zinc-400">Mostrando as próximas 6 datas. <Link href="/agenda" className="text-emerald-400 underline">Ver todos os compromissos</Link></p>}
      </div>}
      {state === 'ok' && ready && items.length === 0 && pending.length === 0 && <p className="text-sm text-zinc-400">Nenhum compromisso próximo. Marque uma data para começar sua agenda.</p>}
    </section>
  );
}
