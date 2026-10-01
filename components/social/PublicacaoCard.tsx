'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import Estrelas from './Estrelas';
import Reacoes from './Reacoes';
import { SeloDeVisibilidade } from './SeletorDeVisibilidade';
import { dataCompleta, haQuanto } from './util';
import { useMidia } from '../midia/MidiaProvider';
import { ASSUNTO_TIPOS, TIPOS_PUBLICACAO, type Publicacao } from '@/lib/mural-tipos';
import { getTopic } from '@/lib/data';

/**
 * Uma publicação do mural. No mural o texto vem resumido (com "continuar
 * lendo"); na página da publicação, inteiro (`inteira`).
 */
export default function PublicacaoCard({
  p,
  inteira = false,
  aoApagar,
}: {
  p: Publicacao;
  inteira?: boolean;
  aoApagar?: (id: string) => void;
}) {
  const { abrir } = useMidia();
  const [apagando, setApagando] = useState(false);
  const tipo = TIPOS_PUBLICACAO.find((t) => t.id === p.tipo) ?? TIPOS_PUBLICACAO[0];
  const assuntoTipo = ASSUNTO_TIPOS.find((a) => a.id === p.assuntoTipo);
  const tema = p.tema ? getTopic(p.tema) : null;
  const link = `/comunidade/publicacao/${p.id}`;
  const longo = (p.corpo?.length ?? 0) > 420;

  const apagar = async () => {
    if (!window.confirm('Apagar esta publicação? As opiniões dela também somem.')) return;
    setApagando(true);
    const res = await fetch(`/api/mural/${p.id}`, { method: 'DELETE' });
    setApagando(false);
    if (res.ok) aoApagar?.(p.id);
    else window.alert((await res.json().catch(() => ({}))).error || 'Não foi possível apagar.');
  };

  return (
    <article className="card-soft p-5" aria-labelledby={`pub-${p.id}`}>
      <header className="flex items-start gap-3">
        <Link href={`/pessoa/${p.autor.id}`} className="relative shrink-0" aria-label={`Página de ${p.autor.nome}`}>
          <Avatar nome={p.autor.nome} path={p.autor.avatarPath} tamanho={42} />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-900 bg-emerald-500 text-zinc-950">
            <Icon name={tipo.icone} size={10} />
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
            <Link href={`/pessoa/${p.autor.id}`} className="font-semibold text-zinc-200 hover:text-emerald-400">{p.autor.nome}</Link>
            <span>{tipo.rotulo.toLowerCase()}</span>
            <time dateTime={p.criadaEm} title={dataCompleta(p.criadaEm)}>{haQuanto(p.criadaEm)}</time>
            <SeloDeVisibilidade valor={p.visibilidade} grupo={p.grupo} />
            {tema && <span className={tema.accent.text}>{tema.label}</span>}
          </p>
          {p.assunto && (
            <p className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                {assuntoTipo ? `${assuntoTipo.rotulo}: ` : ''}{p.assunto}
              </span>
              <Estrelas nota={p.nota} tamanho="text-sm" />
            </p>
          )}
          {p.titulo && (
            <h3 id={`pub-${p.id}`} className="mt-1.5 font-display text-xl font-bold leading-snug text-zinc-50">
              {inteira ? p.titulo : <Link href={link} className="hover:text-emerald-400">{p.titulo}</Link>}
            </h3>
          )}
        </div>
      </header>

      {p.corpo && (
        <div className="mt-3 text-[0.95rem] leading-relaxed text-zinc-200">
          <p className={`whitespace-pre-wrap ${!inteira && longo ? 'line-clamp-6' : ''}`}>{p.corpo}</p>
          {!inteira && longo && (
            <Link href={link} className="mt-1 inline-block text-xs font-semibold text-emerald-400 hover:text-clay-400">
              Continuar lendo
            </Link>
          )}
        </div>
      )}

      {p.youtubeId && (
        <button
          type="button"
          onClick={() => abrir({ midia: { tipo: 'youtube', id: p.youtubeId! }, titulo: p.titulo || p.assunto || 'Vídeo', autor: p.autor.nome, fonte: 'YouTube', link: `https://www.youtube.com/watch?v=${p.youtubeId}` })}
          className="group relative mt-3 block aspect-video w-full overflow-hidden rounded-2xl bg-zinc-800"
          aria-label="Assistir ao vídeo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${p.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white transition group-hover:bg-black/10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60"><Icon name="play" size={26} /></span>
          </span>
        </button>
      )}

      {p.url && (
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-700 hover:text-emerald-300">
          <Icon name="external" size={13} /> {p.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}
        </a>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800/70 pt-3">
        <Reacoes url={`/api/mural/${p.id}/reacao`} reacoes={p.reacoes} minha={p.minhaReacao} compacta={!inteira} />
        {!inteira && (
          <Link href={link} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300">
            <Icon name="chat" size={13} />
            {p.opinioes ? `${p.opinioes} ${p.opinioes === 1 ? 'opinião' : 'opiniões'}` : p.tipo === 'pergunta' || p.tipo === 'experiencia' ? 'Dar minha opinião' : 'Opinar'}
          </Link>
        )}
        {p.podeApagar && (
          <button
            type="button"
            onClick={() => void apagar()}
            disabled={apagando}
            aria-label="Apagar publicação"
            title="Apagar"
            className="ml-auto rounded-xl p-1.5 text-zinc-500 transition hover:text-clay-300 disabled:opacity-50"
          >
            <Icon name="trash" size={14} />
          </button>
        )}
      </footer>
    </article>
  );
}
