import React from 'react';
import Link from 'next/link';
import Icon from '../icons';
import { getTopic } from '@/lib/data';
import type { ChamadaAtual, MateriaAtual } from '@/lib/revista-montagem';
import type { Imagem } from '@/lib/wikipedia';

const FUSO = 'America/Sao_Paulo';
const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: FUSO }).replace(' às', ',');
const diaCurto = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: FUSO });

function Figura({ img }: { img: Imagem }) {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-2xl bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.legenda ?? ''} loading="lazy" decoding="async" className="w-full object-cover" />
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-zinc-500">
        {img.legenda && <span className="text-zinc-400">{img.legenda} </span>}
        <span>
          — {img.autor ?? 'Wikimedia Commons'}
          {img.licenca ? `, ${img.licenca}` : ''}
        </span>
        {img.pagina && (
          <>
            {' '}
            <a href={img.pagina} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-emerald-400">
              (crédito)
            </a>
          </>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * A matéria atual no formato da Revista: a foto grande do veículo, o resumo
 * citado com link, o "Por que está em pauta", a repercussão, o "Para
 * entender" e o "Você sabia?" do verbete — e as fontes no fim.
 */
export default function MateriaAtualView({ m, mais }: { m: MateriaAtual; mais: ChamadaAtual[] }) {
  const t = getTopic(m.tema);
  const veiculos = new Set([m.fonte.nome, ...m.repercussao.map((r) => r.fonte)]).size;

  return (
    <article className="pb-16">
      {/* Capa */}
      <header className="relative overflow-hidden rounded-4xl border border-zinc-800 bg-zinc-900 shadow-soft">
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="relative min-h-[18rem] bg-zinc-800 lg:min-h-[32rem]">
            {m.capa && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.capa.url} alt="" fetchPriority="high" decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {m.capa && (
              <a
                href={m.capa.pagina ?? m.fonte.link}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/90 hover:text-white"
              >
                {m.capa.credito}
              </a>
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center p-7 md:p-10">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-clay-400">
              <Link href="/revista" className="hover:text-emerald-400">
                Revista
              </Link>{' '}
              ·{' '}
              <Link href={`/tema/${m.tema}#revista`} className="hover:text-emerald-400">
                {t?.label}
              </Link>{' '}
              · Em pauta
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-zinc-50 [overflow-wrap:anywhere] md:text-5xl">{m.titulo}</h1>
            {m.linhaFina && <p className="mt-4 text-lg leading-relaxed text-zinc-300">{m.linhaFina}</p>}
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span className="font-semibold text-zinc-300">{m.fonte.nome}</span>
              <time dateTime={m.fonte.publicadaEm}>{quando(m.fonte.publicadaEm)}</time>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={13} /> {m.leituraMin} min de leitura
              </span>
              {veiculos > 1 && <span>{veiculos} veículos no assunto</span>}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-10 grid max-w-6xl gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 text-[1.07rem] leading-[1.85] text-zinc-200">
          {/* O que aconteceu: o resumo do veículo, citado */}
          {m.abertura ? (
            <p className="first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-7xl first-letter:font-extrabold first-letter:leading-[0.8] first-letter:text-clay-500">
              {m.abertura}
            </p>
          ) : (
            <p className="text-zinc-400">{m.fonte.nome} não publicou um resumo desta notícia.</p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Resumo de {m.fonte.nome}
            {m.fonte.autor ? `, por ${m.fonte.autor}` : ''}
            {m.fonte.licenca ? ` (${m.fonte.licenca})` : ''}. O texto completo fica no site do veículo.
          </p>
          <a
            href={m.fonte.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Ler a matéria completa em {m.fonte.nome} <span aria-hidden="true">↗</span>
            <span className="sr-only"> (abre em nova aba)</span>
          </a>

          {m.emPauta.length > 0 && (
            <section className="my-10 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6">
              <p className="rotulo-hud">Por que está em pauta</p>
              <div className="mt-3 space-y-3 text-[0.98rem]">
                {m.emPauta.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {m.repercussao.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-3xl font-bold text-zinc-50">Mais sobre o assunto</h2>
              <ul className="mt-5 space-y-3">
                {m.repercussao.map((r) => (
                  <li key={r.link}>
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-soft levanta group block p-4 text-left"
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">
                        <span className={`font-semibold ${t?.accent.text ?? ''}`}>{r.fonte}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={r.publicadaEm}>{diaCurto(r.publicadaEm)}</time>
                      </span>
                      <span className="mt-1.5 block font-display text-lg font-bold leading-snug text-zinc-50 group-hover:text-emerald-400">
                        {r.titulo} <span aria-hidden="true" className="text-sm text-zinc-500">↗</span>
                      </span>
                      {r.resumo && <span className="mt-1 line-clamp-3 block text-sm leading-relaxed text-zinc-400">{r.resumo}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {m.contexto && (
            <section className="mt-12">
              <p className="rotulo-hud">Para entender</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-zinc-50">{m.contexto.nome}</h2>
              {m.contexto.descricao && <p className="mt-1 text-sm text-zinc-400">{m.contexto.descricao}</p>}
              {m.contexto.imagem && <Figura img={m.contexto.imagem} />}
              <div className="mt-4 space-y-5">
                {m.contexto.paragrafos.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <a href={m.contexto.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-emerald-400 hover:text-clay-400">
                O verbete completo na Wikipédia ↗
              </a>
            </section>
          )}

          {m.curiosidades.length > 0 && (
            <aside className="my-10 rounded-3xl bg-clay-500 p-6 text-zinc-900 shadow-warm">
              <p className="font-mao text-3xl leading-none">Você sabia?</p>
              <ol className="mt-4 space-y-3">
                {m.curiosidades.map((c, i) => (
                  <li key={i} className="flex gap-3 rounded-2xl bg-zinc-900/95 p-3.5 text-[0.95rem] leading-relaxed text-zinc-100">
                    <span className="font-display text-3xl font-extrabold leading-none text-clay-400">{i + 1}</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ol>
            </aside>
          )}

          {m.linhaDoTempo.length >= 3 && (
            <section className="my-10">
              <p className="rotulo-hud">Linha do tempo{m.contexto ? ` — ${m.contexto.nome}` : ''}</p>
              <ol className="relative mt-5 space-y-6 border-l-2 border-dashed border-emerald-400/40 pl-6">
                {m.linhaDoTempo.map((it) => (
                  <li key={it.ano} className="relative">
                    <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-4 border-zinc-950 bg-clay-500" />
                    <p className="font-display text-3xl font-extrabold leading-none text-emerald-400">{it.ano}</p>
                    <p className="mt-1.5 text-[0.98rem] leading-relaxed">{it.texto}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Fontes — sempre */}
          <footer className="mt-14 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 text-sm">
            <p className="rotulo-hud">Fontes e créditos</p>
            <ul className="mt-4 space-y-2">
              {m.fontes.map((f) => (
                <li key={f.url} className="flex flex-wrap items-baseline gap-x-2">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-400 hover:text-clay-400">
                    {f.rotulo}
                  </a>
                  <span className="text-xs text-zinc-500">{f.licenca}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">
              Os resumos e a foto de capa são dos veículos, citados com crédito e link para a matéria original. O “Por que está em
              pauta” é contado pela plataforma nas notícias do tema. O “Para entender” e o “Você sabia?” são adaptados da Wikipédia em
              português (CC BY-SA 4.0) e seguem a mesma licença; as imagens do Wikimedia Commons trazem autor e licença.
            </p>
          </footer>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {mais.length > 0 && (
            <div className="card-soft p-5">
              <p className="rotulo-hud">Mais da Revista de {t?.label}</p>
              <ul className="mt-3 space-y-3">
                {mais.map((c) => (
                  <li key={c.id}>
                    <Link href={`/revista/${c.tema}/${c.id}`} className="group flex gap-3">
                      {c.imagem && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imagem.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-16 w-20 shrink-0 rounded-lg bg-zinc-800 object-cover" />
                      )}
                      <span className="min-w-0">
                        <span className="block font-mono text-[9.5px] uppercase tracking-wider text-zinc-500">{c.fonte}</span>
                        <span className="line-clamp-3 text-sm font-semibold leading-snug text-zinc-100 group-hover:text-emerald-400">{c.titulo}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="card-soft space-y-2 p-5 text-sm">
            <Link href={`/historicas#${m.tema}`} className="flex items-center justify-between gap-2 font-semibold text-zinc-100 hover:text-emerald-400">
              Matérias históricas de {t?.label} <Icon name="arrowRight" size={15} />
            </Link>
            <Link href={`/tema/${m.tema}#noticias`} className="flex items-center justify-between gap-2 font-semibold text-zinc-100 hover:text-emerald-400">
              Notícias ao vivo de {t?.label} <Icon name="arrowRight" size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
