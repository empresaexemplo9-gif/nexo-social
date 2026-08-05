import React from 'react';
import Link from 'next/link';
import { getTopic, type ContentItem } from '@/lib/data';

interface Props {
  item: ContentItem;
  /** Destino do clique. Padrão: página do tema com âncora no artigo. */
  href?: string;
}

export default function ContentCard({ item, href }: Props) {
  const topic = getTopic(item.topic);
  const target = href ?? `/tema/${item.topic}#${item.id}`;

  return (
    <Link
      href={target}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700 hover:-translate-y-0.5"
    >
      <div>
        <div className="relative h-44 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <span
            className={`absolute left-3 top-3 rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1 text-xs font-medium backdrop-blur-md ${topic?.accent.text ?? 'text-emerald-400'}`}
          >
            {topic?.label ?? item.topic}
          </span>
        </div>
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>{item.date}</span>
            <span>{item.readTime}</span>
          </div>
          <h3 className="text-base font-semibold leading-snug text-white transition group-hover:text-emerald-400">
            {item.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-400">{item.snippet}</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <span className="text-xs font-medium text-emerald-400">Ler em {topic?.label ?? 'tema'} →</span>
      </div>
    </Link>
  );
}
