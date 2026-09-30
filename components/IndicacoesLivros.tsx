'use client';

import React, { useEffect, useState } from 'react';
import Icon from './icons';
import { useMidia } from './midia/MidiaProvider';
import { genreLabel, BOOK_GENRES } from '@/lib/taxonomy';
import type { ItemGratisCliente } from './descobrir/CartaoGratis';

interface LivroIndicado {
  titulo: string;
  autor: string;
  genero: string;
  capa: string | null;
  gratis: ItemGratisCliente | null;
  compra: string;
}

const IDIOMA: Record<string, string> = { en: 'em inglês', es: 'em espanhol', fr: 'em francês', de: 'em alemão', it: 'em italiano' };

/**
 * Livros indicados pelos gêneros da pessoa. Grátis → abre no leitor (ou no
 * player de audiolivro) do próprio Nexo. Pago → aviso claro de compra e link
 * para a Amazon em outra aba, sem sair da plataforma.
 */
export default function IndicacoesLivros({ generos }: { generos: string[] }) {
  const { abrir } = useMidia();
  const [livros, setLivros] = useState<LivroIndicado[] | null>(null);
  const [erro, setErro] = useState(false);
  const chave = generos.slice(0, 3).join(',');

  useEffect(() => {
    let vivo = true;
    setLivros(null);
    setErro(false);
    fetch(`/api/livros/indicados?generos=${encodeURIComponent(chave)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => vivo && setLivros(j.livros ?? []))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [chave]);

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <Icon name="book" size={17} className="text-clay-400" /> Livros
      </h3>
      {erro && <p className="text-sm text-zinc-500">Não deu para carregar as indicações agora.</p>}
      {!livros && !erro && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => <li key={i} className="h-32 animate-pulse rounded-xl bg-zinc-900/70" />)}
        </ul>
      )}
      {livros && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {livros.map((l) => {
            const g = l.gratis;
            const ouvir = g && g.midia.tipo !== 'livro' && !(g.midia.tipo === 'archive' && g.midia.formato === 'texto');
            return (
              <li key={`${l.genero}-${l.titulo}`} className="flex gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3">
                <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                  {l.capa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.capa} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-zinc-600"><Icon name="book" size={22} /></span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{genreLabel(BOOK_GENRES, l.genero)}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">{l.titulo}</p>
                  <p className="truncate text-xs text-zinc-400">{l.autor}</p>
                  <div className="mt-auto pt-2">
                    {g ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                          <Icon name="check" size={10} /> Grátis no Nexo{g.idioma && IDIOMA[g.idioma] ? ` · ${IDIOMA[g.idioma]}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => abrir({ midia: g.midia, titulo: g.titulo, autor: g.autor, capa: g.capa ?? l.capa, fonte: g.fonte, link: g.link })}
                          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300"
                        >
                          <Icon name={ouvir ? 'headphones' : 'book'} size={13} /> {ouvir ? 'Ouvir agora' : 'Ler agora'}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                          Para comprar · não é gratuito
                        </span>
                        <a
                          href={l.compra}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-950"
                          title="Abre a Amazon em outra aba; o Nexo continua aberto aqui."
                        >
                          Comprar na Amazon <Icon name="external" size={12} />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {livros && livros.some((l) => !l.gratis) && (
        <p className="text-[11px] text-zinc-500">Os links de compra abrem a Amazon em outra aba — você continua no Nexo.</p>
      )}
    </div>
  );
}
