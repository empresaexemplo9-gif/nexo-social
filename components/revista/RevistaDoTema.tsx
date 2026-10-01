'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './RevistaDoTema.module.css';
import Icon from '../icons';
import { useMidia } from '../midia/MidiaProvider';
import { getTopic, type CategorySlug } from '@/lib/data';
import type { ChamadaAtual, EdicaoAtual } from '@/lib/revista-montagem';

/** Guarda por sessão: voltar à página não refaz a edição (enquanto tiver menos de 20 min). */
const guardadas = new Map<string, { e: EdicaoAtual; em: number }>();
const VINTE_MIN = 20 * 60_000;

const link = (c: ChamadaAtual) => `/revista/${c.tema}/${c.id}`;

/** "agora", "há 12 min", "há 3 h", "ontem", "há 4 dias". */
function ha(iso: string, agora: number): string {
  const s = Math.max(0, (agora - Date.parse(iso)) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ontem';
  return `há ${Math.floor(s / 86400)} dias`;
}

/** A foto da chamada; se a do veículo não abrir, a do verbete; se nenhuma, o fundo. */
function Foto({ c, className, prioridade = false }: { c: ChamadaAtual; className: string; prioridade?: boolean }) {
  const opcoes = [c.imagem?.url, c.reserva].filter((x): x is string => Boolean(x));
  const [i, setI] = useState(0);
  const src = opcoes[i];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading={prioridade ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setI((x) => x + 1)}
      className={className}
    />
  );
}

/**
 * A Revista de um tema, agora: a capa (o assunto mais forte do momento),
 * as chamadas, o "Você sabia?" dos assuntos e os vídeos dos canais
 * oficiais. Carrega quando chega perto da tela.
 */
export default function RevistaDoTema({ tema, compacta = false }: { tema: CategorySlug; compacta?: boolean }) {
  const t = getTopic(tema);
  const { abrir } = useMidia();
  const caixa = useRef<HTMLDivElement>(null);
  const fresca = useCallback(() => {
    const g = guardadas.get(tema);
    return g && Date.now() - g.em < VINTE_MIN ? g.e : null;
  }, [tema]);
  const [edicao, setEdicao] = useState<EdicaoAtual | null>(fresca);
  const [erro, setErro] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (edicao) return;
    const el = caixa.current;
    if (!el) return;
    let vivo = true;
    const carregar = () =>
      fetch(`/api/revista?tema=${tema}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j: EdicaoAtual) => {
          if (!j || !Array.isArray(j.chamadas)) throw new Error('Resposta inesperada');
          guardadas.set(tema, { e: j, em: Date.now() });
          if (vivo) {
            setEdicao(j);
            setAgora(Date.now());
          }
        })
        .catch(() => vivo && setErro(true));
    if (typeof IntersectionObserver === 'undefined') {
      void carregar();
      return () => {
        vivo = false;
      };
    }
    const obs = new IntersectionObserver(
      (e) => {
        if (!e[0].isIntersecting) return;
        obs.disconnect();
        void carregar();
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
  const vazia = edicao && !edicao.capa && !edicao.chamadas.length;

  return (
    <div ref={caixa} className={`${styles.revista} space-y-6`}>
      {!edicao && !erro && (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label={`Carregando a Revista de ${t.label}`}>
          <div className="h-80 animate-pulse rounded-3xl bg-zinc-800/60 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-3xl bg-zinc-800/40" />
        </div>
      )}
      {erro && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">
          A Revista de {t.label} não carregou agora.{' '}
          <Link href={`/historicas#${tema}`} className="font-semibold text-emerald-400 hover:text-clay-400">
            Veja as matérias históricas →
          </Link>
        </p>
      )}
      {vazia && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">
          Nenhuma matéria nova de {t.label} com foto nos últimos dias.{' '}
          <Link href={`/historicas#${tema}`} className="font-semibold text-emerald-400 hover:text-clay-400">
            Veja as matérias históricas →
          </Link>
        </p>
      )}

      {edicao?.capa && (
        <div className={`${styles.destaques} ${edicao.vocesabia.length ? '' : styles.so}`}>
          {/* Capa */}
          <Link href={link(edicao.capa)} className={`${styles.capa} card-soft levanta group relative overflow-hidden`}>
            <div className={styles.capaInterior}>
              <div className={`${styles.imagem} relative overflow-hidden bg-zinc-800`}>
                <Foto key={edicao.capa.id} c={edicao.capa} prioridade className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-md bg-clay-500 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-900">
                  Capa · em pauta
                </span>
              </div>
              <div className="flex min-w-0 flex-col p-6">
                <p className="rotulo-hud">
                  {edicao.capa.fonte} · {ha(edicao.capa.publicadaEm, agora)}
                </p>
                <h3 className={`${styles.titulo} mt-3 font-display text-3xl font-extrabold leading-[1] text-zinc-50 group-hover:text-emerald-400 md:text-4xl`}>
                  {edicao.capa.titulo}
                </h3>
                <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-zinc-300">{edicao.capa.resumo}</p>
                <span className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  {edicao.capa.assunto && <span className="rounded-full border border-zinc-700 px-2 py-0.5">Para entender: {edicao.capa.assunto}</span>}
                  {edicao.capa.veiculos > 1 && <span className="rounded-full border border-zinc-700 px-2 py-0.5">{edicao.capa.veiculos} veículos</span>}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-emerald-400 group-hover:text-clay-400">
                  Ler a matéria <Icon name="arrowRight" size={15} className="transition group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>

          {/* Você sabia? — dos assuntos da edição; sem curiosidade, a capa fica com a largura toda */}
          {edicao.vocesabia.length > 0 && (
            <aside className="relative min-w-0 flex flex-col gap-3 rounded-3xl bg-clay-500 p-6 text-zinc-900 shadow-warm">
              <p className="font-mao text-3xl leading-none">Você sabia?</p>
              {edicao.vocesabia.map((v, i) => (
                <Link
                  key={i}
                  href={`/revista/${tema}/${v.id}`}
                  className="group rounded-2xl bg-zinc-900/95 p-3.5 text-sm leading-relaxed text-zinc-100 transition hover:-rotate-1 hover:scale-[1.02]"
                >
                  <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-wider text-clay-400">{v.de}</span>
                  {v.texto}
                </Link>
              ))}
            </aside>
          )}
        </div>
      )}

      {edicao && edicao.chamadas.length > 0 && (
        <div className={styles.chamadas}>
          {(compacta ? edicao.chamadas.slice(0, 4) : edicao.chamadas).map((c) => (
            <Link key={c.id} href={link(c)} className="card-soft levanta group flex flex-col overflow-hidden">
              <span className="relative block aspect-[16/10] overflow-hidden bg-zinc-800">
                <Foto c={c} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                {c.veiculos > 1 && (
                  <span className="absolute left-2 top-2 rounded-md bg-zinc-900/95 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-zinc-300">
                    {c.veiculos} veículos
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  <span className={`font-semibold ${t.accent.text}`}>{c.fonte}</span> · {ha(c.publicadaEm, agora)}
                </span>
                <span className="mt-1.5 font-display text-lg font-bold leading-tight text-zinc-50 group-hover:text-emerald-400">{c.titulo}</span>
                <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-zinc-400">{c.resumo}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {!compacta && edicao && edicao.videos.length > 0 && (
        <div>
          <p className="rotulo-hud">Vídeos dos canais oficiais</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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

      {!compacta && edicao && edicao.fontes.length > 0 && (
        <p className="text-xs leading-relaxed text-zinc-500">
          Nesta edição: {edicao.fontes.join(', ')}. Contexto e curiosidades da Wikipédia (CC BY-SA 4.0).{' '}
          <Link href={`/historicas#${tema}`} className="font-semibold text-emerald-400 hover:text-clay-400">
            Matérias históricas de {t.label} →
          </Link>
        </p>
      )}
    </div>
  );
}
