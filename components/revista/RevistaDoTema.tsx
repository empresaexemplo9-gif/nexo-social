'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import { useMidia } from '../midia/MidiaProvider';
import { getTopic, type CategorySlug } from '@/lib/data';

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
  videos: { id: string; titulo: string; canal: string; capa: string }[];
}

/** Guarda por sessão: voltar à página não refaz a edição. */
const guardadas = new Map<string, Edicao>();

const link = (c: Chamada) => `/revista/${c.tema}/${c.slug}`;

/**
 * A revista do dia de um tema: capa, chamadas, "Você sabia?", hoje na
 * história e vídeos dos canais oficiais. Carrega quando chega perto da tela.
 */
export default function RevistaDoTema({ tema, compacta = false }: { tema: CategorySlug; compacta?: boolean }) {
  const t = getTopic(tema);
  const { abrir } = useMidia();
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
        fetch(`/api/revista?tema=${tema}`)
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

  return (
    <div ref={caixa} className="space-y-6">
      {!edicao && !erro && (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          <div className="h-80 animate-pulse rounded-3xl bg-zinc-800/60 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-3xl bg-zinc-800/40" />
        </div>
      )}
      {erro && <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">A revista de {t.label} não carregou agora.</p>}

      {edicao?.capa && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Capa */}
          <Link href={link(edicao.capa)} className="card-soft levanta group relative overflow-hidden lg:col-span-2">
            <div className="grid h-full md:grid-cols-2">
              <div className="relative min-h-[14rem] overflow-hidden bg-zinc-800">
                {edicao.capa.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={edicao.capa.imagem} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                )}
                <span className="absolute left-3 top-3 rounded-md bg-clay-500 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-900">
                  Capa · {edicao.capa.rotuloDoFormato}
                </span>
              </div>
              <div className="flex flex-col p-6">
                <p className="rotulo-hud">Revista de {t.label}</p>
                <h3 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] text-zinc-50 group-hover:text-emerald-400">
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
          <aside className="relative flex flex-col gap-3 rounded-3xl bg-clay-500 p-6 text-zinc-900 shadow-warm">
            <p className="font-mao text-3xl leading-none">Você sabia?</p>
            {edicao.vocesabia.length ? (
              edicao.vocesabia.map((v, i) => (
                <Link key={i} href={`/revista/${tema}/${v.slug}`} className="group rounded-2xl bg-zinc-900/95 p-3.5 text-sm leading-relaxed text-zinc-100 transition hover:-rotate-1 hover:scale-[1.02]">
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
        <div className={`grid gap-4 sm:grid-cols-2 ${compacta ? 'xl:grid-cols-4' : 'xl:grid-cols-4'}`}>
          {edicao.chamadas.map((c) => (
            <Link key={c.slug} href={link(c)} className="card-soft levanta group flex flex-col overflow-hidden">
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

      {!compacta && edicao && (edicao.hojeNaHistoria.length > 0 || edicao.videos.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-3">
          {edicao.hojeNaHistoria.length > 0 && (
            <div className="card-soft p-5">
              <p className="rotulo-hud">Hoje na história</p>
              <ol className="mt-4 space-y-3">
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
          {edicao.videos.length > 0 && (
            <div className={edicao.hojeNaHistoria.length ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <p className="rotulo-hud">Vídeos dos canais oficiais</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {edicao.videos.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => abrir({ midia: { tipo: 'youtube', id: v.id }, titulo: v.titulo, autor: v.canal, fonte: 'YouTube', link: `https://www.youtube.com/watch?v=${v.id}` })}
                    className="card-soft levanta group overflow-hidden text-left"
                  >
                    <span className="relative block aspect-video bg-zinc-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.capa} alt="" loading="lazy" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white transition group-hover:bg-black/10">
                        <Icon name="play" size={22} />
                      </span>
                    </span>
                    <span className="block p-2.5">
                      <span className="line-clamp-2 text-xs font-semibold text-zinc-50">{v.titulo}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{v.canal}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
