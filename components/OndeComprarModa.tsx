'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { usePreferences } from '@/lib/preferences';
import { EVENTOS_DE_MODA, plataformasDeModa, proximaValida } from '@/lib/ingressos-moda';

/**
 * Onde comprar ingresso de evento de moda: as semanas de moda e festivais
 * com o canal oficial de venda de cada um, e as plataformas para achar o
 * resto — já na cidade do perfil.
 */
export default function OndeComprarModa() {
  const { prefs } = usePreferences();
  const cidade = prefs.city?.trim() || '';

  const eventos = useMemo(() => {
    const peso = (e: (typeof EVENTOS_DE_MODA)[number]) => (proximaValida(e) ? 2 : 0) + (cidade && e.cidade === cidade ? 1 : 0);
    return [...EVENTOS_DE_MODA].sort((a, b) => peso(b) - peso(a));
  }, [cidade]);

  return (
    <section id="ingressos" className="scroll-mt-20 space-y-5">
      <div>
        <p className="rotulo-hud">Ingressos</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Onde comprar ingressos de moda</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-300">
          Os eventos de moda quase não passam pelas bilheterias de show: as semanas de moda vendem pela Eventim, os autorais e as feiras
          pela Sympla, e alguns distribuem ingresso grátis no Instagram. Aqui está o canal oficial de cada um.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {eventos.map((e) => {
          const proxima = proximaValida(e) ? e.proxima : null;
          return (
            <article key={e.nome} className="card-soft levanta flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                  <Icon name="mapPin" size={11} /> {e.cidade}
                </span>
                {e.gratuito && <span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">Entrada gratuita</span>}
                {cidade && e.cidade === cidade && <span className="rounded-md bg-clay-500/15 px-2 py-0.5 text-[11px] font-semibold text-clay-400">Na sua cidade</span>}
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-zinc-50">{e.nome}</h3>
              {proxima && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-400">
                  <Icon name="calendar" size={14} /> {proxima.texto}
                </p>
              )}
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-300">{e.comoFunciona}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={e.ingresso.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-clay-500"
                >
                  <Icon name="ticket" size={14} /> {e.ingresso.acao ?? (e.gratuito ? 'Garantir' : 'Comprar')} — {e.ingresso.rotulo}
                </a>
                {e.oficial && (
                  <a
                    href={e.oficial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-clay-500 hover:text-clay-400"
                  >
                    {e.oficial.rotulo} <Icon name="external" size={11} />
                  </a>
                )}
                {e.materia && (
                  <Link href={`/revista/moda/${e.materia}`} className="text-xs font-semibold text-emerald-400 hover:text-clay-400">
                    Ler na Revista →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-4">
        <p className="text-xs font-semibold text-zinc-300">
          Para achar os outros eventos de moda{cidade ? ` em ${cidade}` : ''} — desfiles de escolas, bazares, feiras e cursos:
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {plataformasDeModa(cidade).map((p) => (
            <a
              key={p.nome}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 transition hover:border-clay-500"
            >
              <span>
                <span className="block text-sm font-semibold text-zinc-50 group-hover:text-clay-400">{p.nome}</span>
                <span className="block text-[11px] leading-snug text-zinc-500">{p.para}</span>
              </span>
              <Icon name="external" size={12} className="mt-1 shrink-0 text-zinc-500" />
            </a>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Datas e preços mudam a cada edição — o botão leva sempre à página oficial de venda. Desconfie de ingresso vendido fora desses canais.
        </p>
      </div>
    </section>
  );
}
