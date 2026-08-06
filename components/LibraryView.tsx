'use client';

import React from 'react';
import Link from 'next/link';
import Icon from './icons';
import FreeShelf from './FreeShelf';
import ReadingYear from './ReadingYear';

/**
 * Biblioteca: o que os acervos abertos liberaram no período e o registro
 * pessoal de leitura do ano.
 */
export default function LibraryView() {
  return (
    <div className="space-y-14">
      <header className="card-soft texture-grain relative overflow-hidden p-7 md:p-9">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-400">
          <Icon name="library" size={14} /> Biblioteca
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-zinc-50 md:text-4xl">
          Livros que li esse ano
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">
          Seu registro de leitura e a estante do que foi liberado de graça pelos acervos abertos — com audiolivros.
          A seleção troca sozinha toda semana e todo mês.
        </p>
      </header>

      <section id="registro" className="space-y-5">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-zinc-50">
            <span className="text-emerald-400">
              <Icon name="book" size={20} />
            </span>
            Seu ano de leitura
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Marque o que leu, o que está lendo e o que quer ler.</p>
        </div>
        <ReadingYear />
      </section>

      <section id="liberados" className="space-y-5">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-zinc-50">
            <span className="text-clay-300">
              <Icon name="download" size={20} />
            </span>
            Liberados de graça
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Obras em domínio público do Projeto Gutenberg e audiolivros do LibriVox — download e escuta livres.
          </p>
        </div>
        <FreeShelf />
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-zinc-50">Quer indicações mais afinadas?</h2>
          <p className="mt-0.5 text-sm text-zinc-300">
            Os gêneros do questionário mudam o que aparece aqui e em Interesses e hobbies.
          </p>
        </div>
        <Link
          href="/questionario"
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          Ajustar perfil <Icon name="arrowRight" size={16} />
        </Link>
      </section>
    </div>
  );
}
