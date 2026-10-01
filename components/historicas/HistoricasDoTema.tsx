'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from '../revista/RevistaDoTema.module.css';
import Icon from '../icons';
import { getTopic, type CategorySlug } from '@/lib/data';
import { FORMATOS, PAUTA, slugDaPauta } from '@/lib/historicas-pauta';

interface Chamada {
  tema: CategorySlug;
  slug: string;
  rotuloDoFormato: string;
  titulo: string;
  resumo: string;
  imagem: string | null;
}
interface Edicao {
  capa: Chamada | null;
  chamadas: Chamada[];
  vocesabia: { texto: string; de: string; slug: string }[];
  hojeNaHistoria: { ano: number; texto: string }[];
}

/** Guarda por sessão: voltar à página não refaz a edição. */
const guardadas = new Map<string, Edicao>();

const link = (tema: CategorySlug, slug: string) => `/historicas/${tema}/${slug}`;

/**
 * Matérias históricas e curiosidades de um tema: a capa do dia, as chamadas,
 * o "Você sabia?", hoje na história e (com `acervo`) a lista de tudo o que o
 * tema tem. Carrega quando chega perto da tela.
 */
export default function HistoricasDoTema({ tema, compacta = false, acervo = false }: { tema: CategorySlug; compacta?: boolean; acervo?: boolean }) {
  const t = getTopic(tema);
  const caixa = useRef<HTMLDivElement>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(guardadas.get(tema) ?? null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (edicao) return;
    const el = caixa.current;
    if (!el) return;
    let vivo = true;
    const obs = new IntersectionObserver(
      (e) => {
        if (!e[0].isIntersecting) return;
        obs.disconnect();
        fetch(`/api/historicas?tema=${tema}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((j: Edicao) => {
            guardadas.set(tema, j);
            if (vivo) setEdicao(j);
          })
          .catch(() => vivo && setErro(true));
      },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => {
      vivo = false;
      obs.disconnect();
    };
  }, [tema, edicao]);

  if (!t) return null;
  const todas = PAUTA[tema] ?? [];

  return (
    <div ref={caixa} className={`${styles.revista} space-y-6`}>
      {!edicao && !erro && (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          <div className="h-80 animate-pulse rounded-3xl bg-zinc-800/60 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-3xl bg-zinc-800/40" />
        </div>
      )}
      {erro && <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">As matérias históricas de {t.label} não carregaram agora.</p>}

      {edicao?.capa && (
        <div className={styles.destaques}>
          {/* Capa */}
          <Link href={link(tema, edicao.capa.slug)} className={`${styles.capa} card-soft levanta group relative overflow-hidden`}>
            <div className={styles.capaInterior}>
              <div className={`${styles.imagem} relative overflow-hidden bg-zinc-800`}>
                {edicao.capa.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={edicao.capa.imagem} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                )}
                <span className="absolute left-3 top-3 rounded-md bg-clay-500 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-900">
                  Capa · {edicao.capa.rotuloDoFormato}
                </span>
              </div>
              <div className="flex min-w-0 flex-col p-6">
                <p className="rotulo-hud">História de {t.label}</p>
                <h3 className={`${styles.titulo} mt-3 font-display text-4xl font-extrabold leading-[0.95] text-zinc-50 group-hover:text-emerald-400`}>
                  {edicao.capa.titulo}
                </h3>
                <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-zinc-300">{edicao.capa.resumo}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-emerald-400 group-hover:text-clay-400">
                  Ler a matéria <Icon name="arrowRight" size={15} className="transition group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>

          {/* Você sabia? */}
          <aside className="relative min-w-0 flex flex-col gap-3 rounded-3xl bg-clay-500 p-6 text-zinc-900 shadow-warm">
            <p className="font-mao text-3xl leading-none">Você sabia?</p>
            {edicao.vocesabia.length ? (
              edicao.vocesabia.map((v, i) => (
                <Link key={i} href={link(tema, v.slug)} className="group rounded-2xl bg-zinc-900/95 p-3.5 text-sm leading-relaxed text-zinc-100 transition hover:-rotate-1 hover:scale-[1.02]">
                  {v.texto}
                </Link>
              ))
            ) : (
              <p className="text-sm">As curiosidades da capa aparecem aqui.</p>
            )}
          </aside>
        </div>
      )}

      {edicao && edicao.chamadas.length > 0 && (
        <div className={styles.chamadas}>
          {edicao.chamadas.map((c) => (
            <Link key={c.slug} href={link(tema, c.slug)} className="card-soft levanta group flex flex-col overflow-hidden">
              <span className="relative block aspect-[16/10] overflow-hidden bg-zinc-800">
                {c.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imagem} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                )}
                <span className="absolute left-2 top-2 rounded-md bg-zinc-900/95 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-zinc-300">
                  {c.rotuloDoFormato}
                </span>
              </span>
              <span className="flex flex-1 flex-col p-4">
                <span className="font-display text-xl font-bold leading-tight text-zinc-50 group-hover:text-emerald-400">{c.titulo}</span>
                <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-zinc-400">{c.resumo}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {!compacta && edicao && edicao.hojeNaHistoria.length > 0 && (
        <div className="card-soft p-5">
          <p className="rotulo-hud">Hoje na história</p>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {edicao.hojeNaHistoria.map((h, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display text-2xl font-extrabold leading-none text-clay-400">{h.ano}</span>
                <span className="text-sm leading-relaxed text-zinc-300">{h.texto}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[10px] text-zinc-500">Fonte: Wikipédia (CC BY-SA 4.0)</p>
        </div>
      )}

      {acervo && todas.length > 0 && (
        <details className="group/acervo card-soft p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
            <span>
              Todo o acervo de {t.label} <span className="font-normal text-zinc-500">· {todas.length} matérias</span>
            </span>
            <Icon name="chevronDown" size={16} className="shrink-0 text-zinc-500 transition group-open/acervo:rotate-180" />
          </summary>
          <ul className="mt-4 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {todas.map((x) => (
              <li key={x.verbete} className="min-w-0">
                <Link
                  href={link(tema, slugDaPauta(x.verbete))}
                  className="group flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
                >
                  <span className="truncate group-hover:text-emerald-400">{x.verbete.replace(/ \(.+\)$/, '')}</span>
                  <span className="shrink-0 font-mono text-[9.5px] uppercase text-zinc-500">{FORMATOS[x.formato].rotulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
