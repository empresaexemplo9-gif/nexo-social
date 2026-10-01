'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import { SeloDeVisibilidade } from './SeletorDeVisibilidade';
import { haQuanto } from './util';
import { tipoDaLista, type ListaResumo } from '@/lib/listas-tipos';
import { REACOES } from '@/lib/mural-tipos';
import { capaDoQuadro, QUADRO_DA_LISTA } from '@/lib/comunidade-quadros';

/** Capa da lista: os vídeos dela em mosaico (ou o quadro do mural do tipo de lista). */
export function CapaDaLista({ lista, className = '' }: { lista: Pick<ListaResumo, 'tipo' | 'capas'>; className?: string }) {
  const tipo = tipoDaLista(lista.tipo);
  if (!lista.capas.length) {
    return (
      <span className={`relative flex items-end overflow-hidden bg-zinc-950 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={capaDoQuadro(QUADRO_DA_LISTA[lista.tipo] ?? 'grafite')} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <span className="relative m-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white">
          <Icon name={tipo.icone} size={15} />
        </span>
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
      data-quadro={QUADRO_DA_LISTA[lista.tipo] ?? 'grafite'}
      className={`card-soft q-moldura levanta group flex overflow-hidden ${compacta ? 'w-60 shrink-0 flex-col' : 'flex-row'}`}
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
