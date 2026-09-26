'use client';

import React from 'react';
import Icon from '../icons';
import { useMidia } from '../midia/MidiaProvider';
import type { Midia } from '@/lib/midia';

export interface ItemGratisCliente {
  id: string;
  midia: Midia;
  titulo: string;
  autor: string | null;
  ano: string | null;
  capa: string | null;
  fonte: string;
  idioma: string | null;
  link: string;
}

const ACAO: Record<Midia['tipo'], { rotulo: string; icone: 'play' | 'book' | 'headphones' }> = {
  youtube: { rotulo: 'Assistir', icone: 'play' },
  archive: { rotulo: 'Assistir', icone: 'play' },
  livro: { rotulo: 'Ler aqui', icone: 'book' },
  audiolivro: { rotulo: 'Ouvir', icone: 'headphones' },
};

/**
 * Cartão de conteúdo gratuito: capa, título, origem e o botão que abre no
 * reprodutor da plataforma. No hover a capa aproxima e o botão acende.
 */
export default function CartaoGratis({ item, formato = 'video' }: { item: ItemGratisCliente; formato?: 'video' | 'retrato' }) {
  const { abrir } = useMidia();
  const acao =
    item.midia.tipo === 'archive' && item.midia.formato === 'audio'
      ? { rotulo: 'Ouvir', icone: 'headphones' as const }
      : item.midia.tipo === 'archive' && item.midia.formato === 'texto'
        ? { rotulo: 'Ler aqui', icone: 'book' as const }
        : ACAO[item.midia.tipo];

  return (
    <button
      type="button"
      onClick={() =>
        abrir({ midia: item.midia, titulo: item.titulo, autor: item.autor, capa: item.capa, fonte: item.fonte, link: item.link })
      }
      className="card-soft levanta group flex h-full w-full flex-col overflow-hidden text-left"
    >
      <span className={`relative block w-full overflow-hidden bg-zinc-800 ${formato === 'retrato' ? 'aspect-[3/4]' : 'aspect-video'}`}>
        {item.capa ? (
          // Capas de domínios variados (archive.org, gutenberg.org, ytimg)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.capa}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80 transition group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900/95 text-emerald-400 shadow-soft transition duration-300 group-hover:scale-110 group-hover:bg-clay-500 group-hover:text-zinc-900">
            <Icon name={acao.icone} size={20} />
          </span>
        </span>
        <span className="absolute left-2 top-2 rounded-md bg-zinc-900/95 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-zinc-300">
          {item.fonte}
        </span>
        {item.idioma && item.idioma !== 'pt' && (
          <span className="absolute right-2 top-2 rounded-md bg-zinc-50/80 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-zinc-900">
            {item.idioma}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col p-3.5">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-50 group-hover:text-emerald-400">{item.titulo}</span>
        <span className="mt-1 truncate text-xs text-zinc-400">{[item.autor, item.ano].filter(Boolean).join(' · ') || ' '}</span>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-emerald-400 group-hover:text-clay-400">
          <Icon name={acao.icone} size={13} /> {acao.rotulo}
        </span>
      </span>
    </button>
  );
}
