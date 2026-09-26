import React from 'react';
import Link from 'next/link';
import Icon from '../icons';
import { getTopic } from '@/lib/data';
import { PAUTA, slugDaPauta, FORMATOS } from '@/lib/revista-pauta';
import type { Imagem, Materia, Secao } from '@/lib/revista';

function Figura({ img, larga = false }: { img: Imagem; larga?: boolean }) {
  return (
    <figure className={`my-8 ${larga ? '' : 'mx-auto max-w-2xl'}`}>
      <div className="overflow-hidden rounded-2xl bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.legenda ?? ''} loading="lazy" className="w-full object-cover" />
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-zinc-500">
        {img.legenda && <span className="text-zinc-400">{img.legenda} </span>}
        {(img.autor || img.licenca) && (
          <span>
            — {img.autor ?? 'Wikimedia Commons'}
            {img.licenca ? `, ${img.licenca}` : ''}
          </span>
        )}
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

function BlocoDeSecao({ s }: { s: Secao }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl font-bold text-zinc-50">{s.titulo}</h2>
      <div className="mt-4 space-y-5">
        {s.paragrafos.map((p, i) =>
          p.startsWith('§ ') ? (
            <h3 key={i} className="pt-2 text-sm font-bold uppercase tracking-wider text-clay-400">
              {p.slice(2)}
            </h3>
          ) : (
            <p key={i}>{p}</p>
          ),
        )}
      </div>
    </section>
  );
}

function VoceSabia({ itens, numerado = false }: { itens: string[]; numerado?: boolean }) {
  if (!itens.length) return null;
  return (
    <aside className="my-10 rounded-3xl bg-clay-500 p-6 text-zinc-900 shadow-warm">
      <p className="font-mao text-3xl leading-none">Você sabia?</p>
      <ol className="mt-4 space-y-3">
        {itens.map((c, i) => (
          <li key={i} className="flex gap-3 rounded-2xl bg-zinc-900/95 p-3.5 text-[0.95rem] leading-relaxed text-zinc-100">
            {numerado && <span className="font-display text-3xl font-extrabold leading-none text-clay-400">{i + 1}</span>}
            <span>{c}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function LinhaDoTempo({ itens }: { itens: Materia['linhaDoTempo'] }) {
  if (itens.length < 3) return null;
  return (
    <section className="my-10">
      <p className="rotulo-hud">Linha do tempo</p>
      <ol className="relative mt-5 space-y-6 border-l-2 border-dashed border-emerald-400/40 pl-6">
        {itens.map((it) => (
          <li key={it.ano} className="relative">
            <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-4 border-zinc-950 bg-clay-500" />
            <p className="font-display text-3xl font-extrabold leading-none text-emerald-400">{it.ano}</p>
            <p className="mt-1.5 text-[0.98rem] leading-relaxed">{it.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * A matéria no formato da revista: capa, linha fina, abertura com capitular,
 * o miolo de acordo com o formato, citação em destaque, imagens creditadas,
 * vídeo e as fontes no fim.
 */
export default function MateriaView({ m }: { m: Materia }) {
  const t = getTopic(m.tema);
  const mais = (PAUTA[m.tema] ?? []).filter((x) => slugDaPauta(x.verbete) !== m.slug).slice(0, 4);
  const [img1, img2, img3] = m.imagens;
  const metade = Math.ceil(m.secoes.length / 2);

  return (
    <article className="pb-16">
      {/* Capa */}
      <header className="relative overflow-hidden rounded-4xl border border-zinc-800 bg-zinc-900 shadow-soft">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[18rem] bg-zinc-800 lg:min-h-[30rem]">
            {m.capa && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.capa.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {m.capa?.autor && (
              <span className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-0.5 text-[10px] text-white/85">Foto: {m.capa.autor}</span>
            )}
          </div>
          <div className="flex flex-col justify-center p-7 md:p-10">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-clay-400">
              <Link href={`/revista`} className="hover:text-emerald-400">
                Revista
              </Link>{' '}
              ·{' '}
              <Link href={`/tema/${m.tema}#revista`} className="hover:text-emerald-400">
                {t?.label}
              </Link>{' '}
              · {m.rotuloDoFormato}
            </p>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.92] tracking-tight text-zinc-50 md:text-6xl">{m.titulo}</h1>
            {m.linhaFina && <p className="mt-4 text-lg leading-relaxed text-zinc-300">{m.linhaFina}</p>}
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={13} /> {m.leituraMin} min de leitura
              </span>
              <span>{FORMATOS[m.formato].apoio}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-10 grid max-w-6xl gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 text-[1.07rem] leading-[1.85] text-zinc-200">
          {/* Abertura com capitular */}
          <p className="first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-7xl first-letter:font-extrabold first-letter:leading-[0.8] first-letter:text-clay-500">
            {m.abertura}
          </p>

          {m.video && (
            <figure className="my-8">
              <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${m.video.id}?rel=0&modestbranding=1`}
                  title={m.video.titulo}
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                  className="h-full w-full"
                />
              </div>
              <figcaption className="mt-2 text-xs text-zinc-500">
                Vídeo: {m.video.titulo} — {m.video.canal}
              </figcaption>
            </figure>
          )}

          {m.formato === 'linha-do-tempo' && <LinhaDoTempo itens={m.linhaDoTempo} />}
          {m.formato === 'curiosidades' && <VoceSabia itens={m.curiosidades} numerado />}
          {m.formato === 'perfil' && m.curiosidades.length > 0 && (
            <aside className="my-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="rotulo-hud">Em poucas linhas</p>
              <ul className="mt-4 space-y-2.5 text-[0.95rem]">
                {m.curiosidades.map((c, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {m.secoes.slice(0, metade).map((s, i) => (
            <React.Fragment key={s.titulo}>
              <BlocoDeSecao s={s} />
              {i === 0 && img1 && <Figura img={img1} />}
            </React.Fragment>
          ))}

          {m.citacao && (
            <blockquote className="my-12 border-l-4 border-clay-500 pl-6 font-display text-3xl font-bold leading-tight text-zinc-50">
              “{m.citacao}”
            </blockquote>
          )}

          {m.secoes.slice(metade).map((s, i) => (
            <React.Fragment key={s.titulo}>
              <BlocoDeSecao s={s} />
              {i === 0 && img2 && <Figura img={img2} />}
            </React.Fragment>
          ))}

          {m.formato === 'dossie' && <VoceSabia itens={m.curiosidades} />}
          {m.formato === 'dossie' && <LinhaDoTempo itens={m.linhaDoTempo.slice(0, 8)} />}
          {img3 && <Figura img={img3} larga />}

          {/* Fontes — sempre, como pede a licença */}
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
              Texto adaptado do verbete da Wikipédia em português, sob a licença Creative Commons Atribuição-CompartilhaIgual 4.0 — esta
              matéria segue a mesma licença. Imagens do Wikimedia Commons, com autor e licença de cada uma.
            </p>
          </footer>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {m.formato !== 'linha-do-tempo' && m.linhaDoTempo.length >= 3 && m.formato !== 'dossie' && (
            <div className="card-soft p-5">
              <p className="rotulo-hud">Marcos</p>
              <ol className="mt-3 space-y-2.5">
                {m.linhaDoTempo.slice(0, 6).map((it) => (
                  <li key={it.ano} className="flex gap-3 text-xs leading-relaxed text-zinc-400">
                    <span className="font-display text-lg font-bold leading-none text-emerald-400">{it.ano}</span>
                    <span className="line-clamp-3">{it.texto}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="card-soft p-5">
            <p className="rotulo-hud">Mais da revista de {t?.label}</p>
            <ul className="mt-3 space-y-2">
              {mais.map((x) => (
                <li key={x.verbete}>
                  <Link
                    href={`/revista/${m.tema}/${slugDaPauta(x.verbete)}`}
                    className="group flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800"
                  >
                    <span className="truncate group-hover:text-emerald-400">{x.verbete.replace(/ \(.+\)$/, '')}</span>
                    <span className="shrink-0 font-mono text-[9.5px] uppercase text-zinc-500">{FORMATOS[x.formato].rotulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}
