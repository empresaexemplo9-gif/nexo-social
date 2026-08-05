import React from 'react';
import Link from 'next/link';
import { TOPICS, type CategorySlug } from '@/lib/data';

interface Props {
  /** Ordena os temas destacando os interesses do usuário. */
  highlight?: CategorySlug[];
}

export default function TopicGrid({ highlight = [] }: Props) {
  const ordered = [...TOPICS].sort((a, b) => {
    const ai = highlight.includes(a.slug) ? 0 : 1;
    const bi = highlight.includes(b.slug) ? 0 : 1;
    return ai - bi;
  });

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {ordered.map((topic) => {
        const isHighlighted = highlight.includes(topic.slug);
        return (
          <Link
            key={topic.slug}
            href={`/tema/${topic.slug}`}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition hover:-translate-y-0.5 ${topic.accent.gradient} ${
              isHighlighted ? topic.accent.border : 'border-zinc-800'
            }`}
          >
            {isHighlighted && (
              <span className={`absolute right-3 top-3 text-xs font-medium ${topic.accent.text}`}>
                ★ seu interesse
              </span>
            )}
            <div className="text-3xl">{topic.icon}</div>
            <div className="mt-6">
              <h3 className="text-base font-semibold text-white">{topic.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{topic.tagline}</p>
              <span className={`mt-3 inline-block text-xs font-medium ${topic.accent.text}`}>
                Explorar {topic.label} →
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
