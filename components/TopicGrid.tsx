'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { usePreferences } from '@/lib/preferences';
import { useGeolocation } from '@/lib/useGeolocation';
import { cityCoords, TOPICS, type CategorySlug, type EventItem } from '@/lib/data';
import { scoreEvents } from '@/lib/recommendations';
import { relativeLabel } from '@/lib/datetime';
import { formatDistance } from '@/lib/geo';

interface Props {
  events: EventItem[];
}

/**
 * Botões de nicho: cada tema abre, ali mesmo, as indicações daquele assunto.
 * Assim as sugestões ficam dentro do botão do nicho — sem poluir a home, que é
 * dedicada à agenda pessoal.
 */
export default function TopicGrid({ events }: Props) {
  const { prefs } = usePreferences();
  const { coords } = useGeolocation();
  const [open, setOpen] = useState<CategorySlug | null>(null);

  const origin = coords ?? cityCoords(prefs.city);

  const byTopic = useMemo(() => {
    const ranked = scoreEvents({
      interests: prefs.interests,
      origin,
      radiusKm: prefs.radiusKm || 50,
      events,
      contents: [],
    });
    const map = new Map<CategorySlug, typeof ranked>();
    for (const t of TOPICS) map.set(t.slug, []);
    for (const r of ranked) map.get(r.event.topic)?.push(r);
    return map;
  }, [events, prefs.interests, prefs.radiusKm, origin]);

  const ordered = useMemo(
    () =>
      [...TOPICS].sort((a, b) => {
        const ai = prefs.interests.includes(a.slug) ? 0 : 1;
        const bi = prefs.interests.includes(b.slug) ? 0 : 1;
        return ai - bi;
      }),
    [prefs.interests],
  );

  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((topic) => {
        const recs = byTopic.get(topic.slug) ?? [];
        const isOpen = open === topic.slug;
        const following = prefs.interests.includes(topic.slug);

        return (
          <div
            key={topic.slug}
            className={`overflow-hidden rounded-3xl border bg-gradient-to-br transition ${topic.accent.gradient} ${
              isOpen ? topic.accent.border : 'border-zinc-800/80'
            }`}
          >
            {/* Botão do nicho */}
            <button
              onClick={() => setOpen(isOpen ? null : topic.slug)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[0.03]"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${topic.accent.border} ${topic.accent.bg} ${topic.accent.text}`}>
                <Icon name={topic.icon} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-base font-semibold text-zinc-50">{topic.label}</span>
                  {following && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${topic.accent.bg} ${topic.accent.text}`}>
                      seguindo
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-zinc-400">
                  {recs.length === 0
                    ? topic.tagline
                    : `${recs.length} ${recs.length === 1 ? 'indicação' : 'indicações'} para você`}
                </span>
              </span>
              <Icon
                name="chevronRight"
                size={18}
                className={`shrink-0 text-zinc-500 transition ${isOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Indicações do nicho, dentro do próprio botão */}
            {isOpen && (
              <div className="border-t border-zinc-800/70 bg-zinc-950/40 p-4">
                {recs.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-zinc-400">
                    Ainda não há eventos deste tema por perto. Explore a página do assunto para ver os conteúdos.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recs.slice(0, 4).map((r) => (
                      <li key={r.event.id}>
                        <Link
                          href={`/evento/${r.event.id}`}
                          className="group flex items-start gap-3 rounded-2xl p-2.5 transition hover:bg-zinc-900/70"
                        >
                          <span className="mt-0.5 text-zinc-500">
                            <Icon name="calendar" size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-zinc-100 group-hover:text-emerald-300">
                              {r.event.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                              {r.event.startsAt ? relativeLabel(r.event.startsAt, r.event.endsAt) : r.event.date} • {r.event.city}
                              {typeof r.distanceKm === 'number' && ` • ${formatDistance(r.distanceKm)}`}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/tema/${topic.slug}`}
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${topic.accent.bg} ${topic.accent.text} hover:opacity-80`}
                >
                  Ver tudo de {topic.label} <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
