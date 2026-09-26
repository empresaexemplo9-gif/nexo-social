'use client';

import React, { useState } from 'react';
import Icon from '../icons';
import { useMidia } from './MidiaProvider';
import type { ItemGratisCliente } from '../descobrir/CartaoGratis';

interface Resposta {
  livros: ItemGratisCliente[];
  audiolivros: ItemGratisCliente[];
  buscaExterna: string | null;
}

/**
 * "Ler ou ouvir grátis" de um título qualquer do registro de leitura: procura
 * o livro no Gutenberg, o audiolivro no LibriVox e, se não houver, no YouTube —
 * e abre no reprodutor da plataforma.
 */
export default function GratisDoTitulo({ titulo, autor }: { titulo: string; autor: string | null }) {
  const { abrir } = useMidia();
  const [estado, setEstado] = useState<'parado' | 'buscando' | 'ok' | 'erro'>('parado');
  const [r, setR] = useState<Resposta | null>(null);

  const buscar = async () => {
    setEstado('buscando');
    try {
      const qs = new URLSearchParams({ titulo, ...(autor ? { autor } : {}) });
      const res = await fetch(`/api/gratis?${qs}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setR(j);
      setEstado('ok');
    } catch {
      setEstado('erro');
    }
  };

  if (estado === 'parado' || estado === 'buscando') {
    return (
      <button
        type="button"
        onClick={() => void buscar()}
        disabled={estado === 'buscando'}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 transition hover:bg-emerald-400 hover:text-zinc-950 disabled:opacity-60"
      >
        <Icon name="play" size={11} /> {estado === 'buscando' ? 'Procurando versões grátis…' : 'Ler ou ouvir grátis'}
      </button>
    );
  }

  if (estado === 'erro') return <span className="text-[11px] text-zinc-500">Não deu para procurar agora.</span>;

  const itens = [...(r?.livros ?? []), ...(r?.audiolivros ?? [])];
  return (
    <div className="w-full space-y-1.5">
      {itens.length === 0 && !r?.buscaExterna && <p className="text-[11px] text-zinc-500">Nenhuma versão gratuita encontrada.</p>}
      {itens.slice(0, 6).map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => abrir({ midia: it.midia, titulo: it.titulo, autor: it.autor, capa: it.capa, fonte: it.fonte, link: it.link })}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-zinc-300 transition hover:bg-zinc-800"
        >
          <Icon name={it.midia.tipo === 'livro' ? 'book' : it.midia.tipo === 'youtube' ? 'play' : 'headphones'} size={13} className="shrink-0 text-emerald-400" />
          <span className="min-w-0 flex-1 truncate">
            {it.midia.tipo === 'livro' ? 'Ler' : 'Ouvir'}: {it.titulo}
          </span>
          <span className="shrink-0 font-mono text-[9.5px] uppercase text-zinc-500">{it.fonte}</span>
        </button>
      ))}
      {r?.buscaExterna && (
        <a
          href={r.buscaExterna}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 text-[11px] font-medium text-emerald-400 hover:text-clay-400"
        >
          Procurar audiolivro no YouTube <Icon name="external" size={11} />
        </a>
      )}
    </div>
  );
}
