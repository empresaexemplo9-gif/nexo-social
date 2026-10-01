'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from './icons';
import Avatar from './Avatar';
import InlinePlayer, { type PlayRequest } from './InlinePlayer';
import { rotuloDoTipo, sugestoes, type SearchResult } from '@/lib/search';
import { getTopic } from '@/lib/data';
import { TIPOS_PUBLICACAO, type Publicacao } from '@/lib/mural-tipos';
import { tipoDaLista, type ListaResumo, type RodaResumo } from '@/lib/listas-tipos';

interface Video {
  id: string;
  title: string;
  channel: string;
  thumb: string | null;
  embedUrl: string;
}

/** O que a comunidade publicou, quem está nela e as matérias históricas. */
interface Conteudo {
  publicacoes: Publicacao[];
  listas: ListaResumo[];
  rodas: RodaResumo[];
  pessoas: { id: string; name: string; avatarPath: string | null; proximo: boolean }[];
  historicas: { tema: string; temaRotulo: string; slug: string; titulo: string; formato: string }[];
}

const SEM_CONTEUDO: Conteudo = { publicacoes: [], listas: [], rodas: [], pessoas: [], historicas: [] };

function tituloDaPublicacao(p: Publicacao): string {
  return p.titulo || p.assunto || (p.corpo ?? '').slice(0, 90) || 'Publicação';
}

export default function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const inicial = params.get('q') ?? '';

  const [termo, setTermo] = useState(inicial);
  const [resultados, setResultados] = useState<SearchResult[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoDisponivel, setVideoDisponivel] = useState(false);
  const [videoAviso, setVideoAviso] = useState('');
  const [buscandoVideo, setBuscandoVideo] = useState(false);
  const [tocando, setTocando] = useState<PlayRequest | null>(null);
  const [conteudo, setConteudo] = useState<Conteudo>(SEM_CONTEUDO);
  const campo = useRef<HTMLInputElement>(null);
  const ultima = useRef('');

  // Busca no catálogo e no que a comunidade publicou enquanto digita — nada
  // disso custa requisição externa.
  const buscarCatalogo = useCallback(async (q: string) => {
    ultima.current = q;
    if (q.trim().length < 2) {
      setResultados([]);
      setConteudo(SEM_CONTEUDO);
      return;
    }
    const [catalogo, comunidade] = await Promise.all([
      fetch(`/api/busca?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/busca/conteudo?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : SEM_CONTEUDO)).catch(() => SEM_CONTEUDO),
    ]);
    // Uma resposta lenta de um termo antigo não sobrescreve a do termo atual.
    if (ultima.current !== q) return;
    setResultados(catalogo.resultados ?? []);
    setVideoDisponivel(Boolean(catalogo.videoDisponivel));
    setConteudo({
      publicacoes: comunidade.publicacoes ?? [],
      listas: comunidade.listas ?? [],
      rodas: comunidade.rodas ?? [],
      pessoas: comunidade.pessoas ?? [],
      historicas: comunidade.historicas ?? [],
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscarCatalogo(termo), 200);
    return () => clearTimeout(t);
  }, [termo, buscarCatalogo]);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  // A busca por vídeo é sob demanda: 100 unidades da cota por clique.
  const buscarVideos = async () => {
    if (termo.trim().length < 2) return;
    setBuscandoVideo(true);
    setVideoAviso('');
    try {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(termo)}&video=1`);
      const json = await res.json().catch(() => ({}));
      setVideos(json.videos ?? []);
      if (json.videoAviso) setVideoAviso(json.videoAviso);
    } finally {
      setBuscandoVideo(false);
    }
  };

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    router.replace(`/busca?q=${encodeURIComponent(termo)}`);
    buscarVideos();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submeter} className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <Icon name="search" size={18} />
          </span>
          <input
            ref={campo}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Buscar temas, eventos, craques, clipes…"
            aria-label="Buscar"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 py-3.5 pl-12 pr-4 text-base text-zinc-100 placeholder-zinc-600 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {termo.trim().length < 2 && (
          <div className="flex flex-wrap gap-2">
            {sugestoes().map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTermo(s)}
                className="action-collage action-collage--seal rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      <div id="player-busca" className="scroll-mt-24">
        {tocando && <InlinePlayer req={tocando} onClose={() => setTocando(null)} />}
      </div>

      {/* Catálogo da plataforma */}
      {termo.trim().length >= 2 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Na plataforma {resultados.length > 0 && <span className="text-zinc-500">({resultados.length})</span>}
          </h2>
          {resultados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
              Nada encontrado no catálogo para “{termo}”.
            </p>
          ) : (
            <ul className="space-y-2">
              {resultados.map((r) => {
                const t = r.topic ? getTopic(r.topic) : null;
                return (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          t ? `${t.accent.bg} ${t.accent.text}` : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <Icon name={t?.icon ?? 'search'} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-50">{r.titulo}</span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {rotuloDoTipo(r.kind)}
                          {r.descricao && ` · ${r.descricao}`}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={15} className="shrink-0 text-zinc-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* O que as pessoas publicaram (só o que quem busca pode ver) e quem está na plataforma */}
      {termo.trim().length >= 2 && (conteudo.publicacoes.length > 0 || conteudo.listas.length > 0 || conteudo.rodas.length > 0 || conteudo.pessoas.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">Na comunidade</h2>
          {conteudo.publicacoes.length > 0 && (
            <ul className="space-y-2">
              {conteudo.publicacoes.map((p) => {
                const tipo = TIPOS_PUBLICACAO.find((t) => t.id === p.tipo);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/comunidade/publicacao/${p.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                        <Icon name={tipo?.icone ?? 'chat'} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-50">{tituloDaPublicacao(p)}</span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {tipo?.rotulo ?? 'Publicação'} · {p.autor.nome}
                          {p.opinioes > 0 && ` · ${p.opinioes} ${p.opinioes === 1 ? 'opinião' : 'opiniões'}`}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={15} className="shrink-0 text-zinc-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {(conteudo.listas.length > 0 || conteudo.rodas.length > 0) && (
            <ul className="space-y-2" aria-label="Listas e rodas de conversa">
              {conteudo.rodas.map((r) => (
                <li key={r.id}>
                  <Link href={`/comunidade/roda/${r.id}`} className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><Icon name="users" size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-50">{r.tema}</span>
                      <span className="block truncate text-[11px] text-zinc-500">Roda de conversa acontecendo · {r.participantes} {r.participantes === 1 ? 'pessoa' : 'pessoas'}</span>
                    </span>
                    <Icon name="chevronRight" size={15} className="shrink-0 text-zinc-600" />
                  </Link>
                </li>
              ))}
              {conteudo.listas.map((l) => {
                const tipo = tipoDaLista(l.tipo);
                return (
                  <li key={l.id}>
                    <Link href={`/comunidade/lista/${l.id}`} className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><Icon name={tipo.icone} size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-50">{l.titulo}</span>
                        <span className="block truncate text-[11px] text-zinc-500">Lista de {tipo.rotulo.toLowerCase()} · {l.autor.nome} · {l.itens} {l.itens === 1 ? 'item' : 'itens'}</span>
                      </span>
                      <Icon name="chevronRight" size={15} className="shrink-0 text-zinc-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {conteudo.pessoas.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Pessoas">
              {conteudo.pessoas.map((pessoa) => (
                <li key={pessoa.id}>
                  <Link
                    href={`/pessoa/${pessoa.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-800/70 bg-zinc-900/50 py-1 pl-1 pr-3 text-xs text-zinc-200 transition hover:border-zinc-700 hover:text-zinc-50"
                  >
                    <Avatar nome={pessoa.name} path={pessoa.avatarPath} tamanho={26} />
                    {pessoa.name}
                    {pessoa.proximo && <span className="text-[10px] text-emerald-400">contato</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {termo.trim().length >= 2 && conteudo.historicas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">Matérias históricas e curiosidades</h2>
          <ul className="space-y-2">
            {conteudo.historicas.map((h) => {
              const t = getTopic(h.tema);
              return (
                <li key={`${h.tema}/${h.slug}`}>
                  <Link
                    href={`/historicas/${h.tema}/${h.slug}`}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t ? `${t.accent.bg} ${t.accent.text}` : 'bg-zinc-800 text-zinc-400'}`}>
                      <Icon name={t?.icon ?? 'book'} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-50">{h.titulo}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{h.formato} · {h.temaRotulo}</span>
                    </span>
                    <Icon name="chevronRight" size={15} className="shrink-0 text-zinc-600" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Vídeos — sob demanda, porque consome cota */}
      {termo.trim().length >= 2 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-100">Vídeos e clipes</h2>
            <button
              onClick={buscarVideos}
              disabled={buscandoVideo}
              className="action-collage inline-flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-emerald-500 hover:text-zinc-950 disabled:opacity-60"
            >
              <Icon name="video" size={13} /> {buscandoVideo ? 'Buscando…' : 'Buscar vídeos'}
            </button>
          </div>

          {videoAviso && (
            <p className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-3 text-[11px] leading-relaxed text-clay-200">
              {videoAviso}
            </p>
          )}

          {videos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {videos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setTocando({ titulo: v.title, url: v.embedUrl, externo: `https://www.youtube.com/watch?v=${v.id}` });
                    document.getElementById('player-busca')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 text-left transition hover:border-emerald-800/60"
                >
                  <span className="relative flex aspect-video items-center justify-center bg-zinc-950/70">
                    {v.thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white transition group-hover:bg-black/15">
                      <Icon name="play" size={22} />
                    </span>
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 text-xs font-medium text-zinc-100 group-hover:text-emerald-300">
                      {v.title}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-zinc-500">{v.channel}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {videos.length === 0 && !videoAviso && !buscandoVideo && (
            <p className="text-xs leading-relaxed text-zinc-500">
              A busca no catálogo é instantânea. A de vídeos consome cota do YouTube, então acontece só quando você
              pede.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
