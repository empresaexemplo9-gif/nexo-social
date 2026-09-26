'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import EventCard from '../EventCard';
import Icon from '../icons';
import { SectionHeader } from '../InterestsView';
import { getTopic, type CategorySlug, type EventItem } from '@/lib/data';

/** Widget de interesse: os próximos eventos de um tema. */
export default function EventosDoTema({ tema, events }: { tema: CategorySlug; events: EventItem[] }) {
  const t = getTopic(tema);
  const proximos = useMemo(() => {
    const agora = Date.now();
    return events
      .filter((e) => e.topic === tema && (!e.startsAt || new Date(e.endsAt ?? e.startsAt).getTime() >= agora))
      .sort((a, b) => (a.startsAt ? Date.parse(a.startsAt) : Infinity) - (b.startsAt ? Date.parse(b.startsAt) : Infinity))
      .slice(0, 6);
  }, [events, tema]);

  if (!t) return null;

  return (
    <section className="space-y-4">
      <SectionHeader
        label="Seu interesse"
        title={`Eventos de ${t.label}`}
        icon={t.icon}
        subtitle="Os próximos, do mais perto no tempo ao mais distante."
        action={
          <Link href={`/tema/${tema}`} className="shrink-0 font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-clay-400">
            ver o tema →
          </Link>
        }
      />
      {proximos.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {proximos.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">
          Nenhum evento de {t.label} na agenda agora — assim que aparecer, ele vem para cá.
        </p>
      )}
      {tema === 'moda' && (
        <Link
          href="/tema/moda#ingressos"
          className="inline-flex items-center gap-1.5 rounded-xl border border-clay-500/50 px-3.5 py-2 text-xs font-semibold text-clay-400 transition hover:bg-clay-500 hover:text-zinc-900"
        >
          <Icon name="ticket" size={14} /> Onde comprar ingressos de moda (SPFW, Rio Fashion Week, Casa de Criadores…)
        </Link>
      )}
    </section>
  );
}
