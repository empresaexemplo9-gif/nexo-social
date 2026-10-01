'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import { SeloDeVisibilidade } from './SeletorDeVisibilidade';
import { haQuanto } from './util';
import { tipoDaLista, type ListaResumo } from '@/lib/listas-tipos';
import { REACOES } from '@/lib/mural-tipos';

/** Capa da lista: os vídeos dela em mosaico (ou o ícone do tipo). */
export function CapaDaLista({ lista, className = '' }: { lista: Pick<ListaResumo, 'tipo' | 'capas'>; className?: string }) {
  const tipo = tipoDaLista(lista.tipo);
  if (!lista.capas.length) {
    return (
      <span className={`flex items-center justify-center bg-gradient-to-br from-emerald-500/25 via-zinc-900 to-clay-500/20 text-emerald-300 ${className}`}>
        <Icon name={tipo.icone} size={30} />
      </span>
    );
  }
  const capas = lista.capas.length >= 4 ? lista.capas.slice(0, 4) : [lista.capas[0]];
  return (
    <span className={`grid overflow-hidden bg-zinc-950 ${capas.length === 4 ? 'grid-cols-2 grid-rows-2' : ''} ${className}`}>
      {capas.map((id) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
      ))}
    </span>
  );
}

/** Uma lista no cartão: capa, nome, de quem é, quantos itens e o que acharam. */
export default function ListaCard({ lista, compacta = false }: { lista: ListaResumo; compacta?: boolean }) {
  const tipo = tipoDaLista(lista.tipo);
  const total = Object.values(lista.reacoes).reduce((a, b) => a + (b ?? 0), 0);
  const principais = REACOES.filter((r) => (lista.reacoes[r.id] ?? 0) > 0).slice(0, 3);
  return (
    <Link
      href={`/comunidade/lista/${lista.id}`}
      className={`card-soft levanta group flex overflow-hidden ${compacta ? 'w-60 shrink-0 flex-col' : 'flex-row'}`}
    >
      <CapaDaLista lista={lista} className={compacta ? 'aspect-video w-full' : 'aspect-square w-24 shrink-0 self-start sm:w-36'} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          <Icon name={tipo.icone} size={12} /> {tipo.rotulo} · {lista.itens} {lista.itens === 1 ? 'item' : 'itens'}
        </span>
        <span className="line-clamp-2 font-display text-lg font-bold leading-tight text-zinc-50 group-hover:text-emerald-300">{lista.titulo}</span>
        {!compacta && lista.descricao && <span className="line-clamp-2 text-xs text-zinc-400">{lista.descricao}</span>}
        <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[11px] text-zinc-500">
          <Avatar nome={lista.autor.nome} path={lista.autor.avatarPath} tamanho={18} />
          <span className="font-medium text-zinc-300">{lista.souAutor ? 'Você' : lista.autor.nome}</span>
          {!compacta && <SeloDeVisibilidade valor={lista.visibilidade} grupo={lista.grupo} />}
          <span>{haQuanto(lista.atualizadaEm)}</span>
          {total > 0 && (
            <span aria-label={`${total} reações`}>
              {principais.map((r) => r.emoji).join('')} {total}
            </span>
          )}
          {lista.comentarios > 0 && (
            <span className="inline-flex items-center gap-0.5"><Icon name="chat" size={11} /> {lista.comentarios}</span>
          )}
        </span>
      </span>
    </Link>
  );
}
