'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import Reacoes from './Reacoes';
import { CapaDaLista } from './ListaCard';
import SeletorDeVisibilidade, { SeloDeVisibilidade } from './SeletorDeVisibilidade';
import { CAMPO, dataCompleta, haQuanto } from './util';
import { useMidia } from '../midia/MidiaProvider';
import { decodificarEntidades } from '@/lib/midia';
import { tipoDaLista, type ComentarioDeLista, type ItemDeLista, type ListaCompleta } from '@/lib/listas-tipos';
import type { Visibilidade } from '@/lib/mural-tipos';
import { LEMBRETE_DAS_REGRAS } from '@/lib/regras';
import { QUADRO_DA_LISTA } from '@/lib/comunidade-quadros';

const banidoVai = (res: Response, j: { banido?: boolean }) => {
  if (res.status === 403 && j.banido) {
    window.location.href = '/banido';
    return true;
  }
  return false;
};

/** Comentários da lista inteira (itemId nulo) ou de um item, com o campo para comentar. */
function Comentarios({
  listaId,
  itemId,
  comentarios,
  aoMudar,
  convite,
}: {
  listaId: string;
  itemId: string | null;
  comentarios: ComentarioDeLista[];
  aoMudar: (fn: (atual: ComentarioDeLista[]) => ComentarioDeLista[]) => void;
  convite: string;
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const comentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`/api/listas/${listaId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, corpo: texto }),
      });
      const j = await res.json().catch(() => ({}));
      if (banidoVai(res, j)) return;
      if (!res.ok) throw new Error(j.error || 'Não foi possível comentar.');
      aoMudar((atual) => [...atual, j.comentario]);
      setTexto('');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async (c: ComentarioDeLista) => {
    if (!window.confirm('Apagar este comentário?')) return;
    const res = await fetch(`/api/listas/${listaId}/comentarios?id=${c.id}`, { method: 'DELETE' });
    if (res.ok) aoMudar((atual) => atual.filter((x) => x.id !== c.id));
  };

  return (
    <div className="space-y-3">
      {comentarios.length > 0 && (
        <ul className="space-y-2.5">
          {comentarios.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Link href={`/pessoa/${c.autor.id}`} className="shrink-0"><Avatar nome={c.autor.nome} path={c.autor.avatarPath} tamanho={28} /></Link>
              <div className="min-w-0 flex-1 rounded-2xl bg-zinc-900/70 px-3.5 py-2">
                <p className="text-[11px] text-zinc-500">
                  <Link href={`/pessoa/${c.autor.id}`} className="font-semibold text-zinc-200 hover:text-emerald-400">{c.autor.nome}</Link>{' '}
                  · <time dateTime={c.criadoEm} title={dataCompleta(c.criadoEm)}>{haQuanto(c.criadoEm)}</time>
                  {c.podeApagar && (
                    <button type="button" onClick={() => void apagar(c)} className="ml-2 text-zinc-500 hover:text-clay-300">Apagar</button>
                  )}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{c.corpo}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={comentar} className="flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={1}
          maxLength={1000}
          placeholder={convite}
          aria-label={convite}
          className={`${CAMPO} min-h-[2.75rem] resize-y`}
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          aria-label="Enviar comentário"
          className="q-botao flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <Icon name="send" size={16} />
        </button>
      </form>
      {erro && <p role="alert" className="text-xs text-clay-300">{erro}</p>}
    </div>
  );
}

interface Video {
  id: string;
  title: string;
  channel: string;
  thumb: string | null;
}

/** Pôr item: à mão (com link opcional) ou buscando o vídeo no YouTube. */
function NovoItem({ lista, aoPor }: { lista: ListaCompleta; aoPor: (i: ItemDeLista) => void }) {
  const tipo = tipoDaLista(lista.tipo);
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [url, setUrl] = useState('');
  const [nota, setNota] = useState('');
  const [busca, setBusca] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const por = async (dados: { titulo: string; subtitulo?: string; url?: string; youtubeId?: string; nota?: string }) => {
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`/api/listas/${lista.id}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const j = await res.json().catch(() => ({}));
      if (banidoVai(res, j)) return false;
      if (!res.ok) throw new Error(j.error || 'Não foi possível pôr o item.');
      aoPor(j.item);
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setEnviando(false);
    }
  };

  const porAMao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await por({ titulo, subtitulo, url, nota })) {
      setTitulo('');
      setSubtitulo('');
      setUrl('');
      setNota('');
    }
  };

  // A busca de vídeos usa a cota do YouTube: só quando a pessoa pede.
  const buscarVideos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busca.trim().length < 2) return;
    setBuscando(true);
    setAviso('');
    try {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(busca)}&video=1`);
      const j = await res.json().catch(() => ({}));
      setVideos(j.videos ?? []);
      if (j.videoAviso) setAviso(j.videoAviso);
      else if (!(j.videos ?? []).length) setAviso('Nenhum vídeo encontrado.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <section className="card-soft space-y-4 p-5" aria-labelledby="novo-item-titulo">
      <h2 id="novo-item-titulo" className="flex items-center gap-2 text-base font-semibold text-zinc-50">
        <Icon name="plus" size={16} className="text-emerald-400" /> Pôr na lista
      </h2>

      {tipo.video && (
        <div className="space-y-2">
          <form onSubmit={buscarVideos} className="flex gap-2">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} type="search" placeholder="Buscar no YouTube — ex.: Pitty Admirável Chip Novo" aria-label="Buscar vídeo no YouTube" className={CAMPO} />
            <button type="submit" disabled={buscando || busca.trim().length < 2} className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-zinc-800 px-4 text-xs font-semibold text-zinc-100 transition hover:bg-emerald-500 hover:text-zinc-950 disabled:opacity-50">
              <Icon name="search" size={14} /> {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {aviso && <p className="text-[11px] text-clay-200">{aviso}</p>}
          {videos.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {videos.map((v) => (
                <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumb || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" className="aspect-video w-24 shrink-0 rounded-lg object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-xs font-medium text-zinc-100">{decodificarEntidades(v.title)}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{decodificarEntidades(v.channel)}</span>
                  </span>
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={async () => {
                      if (await por({ titulo: decodificarEntidades(v.title).slice(0, 200), subtitulo: decodificarEntidades(v.channel).slice(0, 200), youtubeId: v.id })) {
                        setVideos((atual) => atual.filter((x) => x.id !== v.id));
                      }
                    }}
                    aria-label={`Pôr "${decodificarEntidades(v.title)}" na lista`}
                    className="q-botao flex h-9 w-9 shrink-0 items-center justify-center"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-zinc-500">Ou escreva à mão:</p>
        </div>
      )}

      <form onSubmit={porAMao} className="space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder={tipo.titulo} aria-label={tipo.titulo} className={CAMPO} />
          <input value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} maxLength={200} placeholder={`${tipo.subtitulo} (opcional)`} aria-label={tipo.subtitulo} className={CAMPO} />
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" maxLength={1000} placeholder={tipo.video ? 'Link do YouTube (opcional) — aí toca aqui dentro' : 'Link (opcional)'} aria-label="Link" className={CAMPO} />
        <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Por que entrou na lista? (opcional)" aria-label="Por que entrou na lista" className={CAMPO} />
        {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={enviando || !titulo.trim()} className="q-botao inline-flex items-center gap-2 px-4 py-2 text-sm">
            <Icon name="plus" size={14} /> {enviando ? 'Pondo…' : 'Pôr na lista'}
          </button>
          <span className="ml-auto text-[11px] text-zinc-500">{LEMBRETE_DAS_REGRAS}</span>
        </div>
      </form>
    </section>
  );
}

/** Um item: tocar, reagir e comentar; para quem criou, subir, descer e tirar. */
function Item({
  lista,
  item,
  n,
  total,
  comentarios,
  aoMudarComentarios,
  aoMover,
  aoTirar,
}: {
  lista: ListaCompleta;
  item: ItemDeLista;
  n: number;
  total: number;
  comentarios: ComentarioDeLista[];
  aoMudarComentarios: (fn: (atual: ComentarioDeLista[]) => ComentarioDeLista[]) => void;
  aoMover: (passo: -1 | 1) => void;
  aoTirar: () => void;
}) {
  const { abrir } = useMidia();
  const [conversa, setConversa] = useState(false);
  const tocar = () =>
    item.youtubeId &&
    abrir({ midia: { tipo: 'youtube', id: item.youtubeId }, titulo: item.titulo, autor: item.subtitulo, fonte: 'YouTube', link: `https://www.youtube.com/watch?v=${item.youtubeId}` });

  return (
    <li className="card-soft p-3.5 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="w-6 shrink-0 pt-1 text-right font-display text-lg font-bold text-zinc-600" aria-hidden>{n}</span>
        {item.youtubeId ? (
          <button type="button" onClick={tocar} aria-label={`Tocar ${item.titulo}`} className="group relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-950 sm:w-36">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${item.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white transition group-hover:bg-black/10"><Icon name="play" size={20} /></span>
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-zinc-50">{item.titulo}</p>
          {item.subtitulo && <p className="text-xs text-zinc-400">{item.subtitulo}</p>}
          {item.nota && <p className="mt-1 text-xs italic leading-relaxed text-zinc-300">“{item.nota}”</p>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300">
              Abrir o link <Icon name="external" size={11} />
            </a>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Reacoes url={`/api/listas/${lista.id}/reacao`} extra={{ itemId: item.id }} reacoes={item.reacoes} minha={item.minhaReacao} compacta />
            <button
              type="button"
              onClick={() => setConversa((v) => !v)}
              aria-expanded={conversa}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 transition hover:text-zinc-100"
            >
              <Icon name="chat" size={11} /> {comentarios.length ? `${comentarios.length} ${comentarios.length === 1 ? 'comentário' : 'comentários'}` : 'Comentar'}
            </button>
          </div>
        </div>
        {lista.souAutor && (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button type="button" disabled={n === 1} onClick={() => aoMover(-1)} aria-label="Subir" className="rounded-lg p-1 text-zinc-500 hover:text-zinc-100 disabled:opacity-30"><Icon name="chevronUp" size={15} /></button>
            <button type="button" disabled={n === total} onClick={() => aoMover(1)} aria-label="Descer" className="rounded-lg p-1 text-zinc-500 hover:text-zinc-100 disabled:opacity-30"><Icon name="chevronDown" size={15} /></button>
            <button type="button" onClick={aoTirar} aria-label="Tirar da lista" className="rounded-lg p-1 text-zinc-500 hover:text-clay-300"><Icon name="trash" size={14} /></button>
          </div>
        )}
      </div>
      {conversa && (
        <div className="mt-3 border-t border-zinc-800 pt-3 sm:ml-9">
          <Comentarios listaId={lista.id} itemId={item.id} comentarios={comentarios} aoMudar={aoMudarComentarios} convite={`O que você achou de "${item.titulo}"?`} />
        </div>
      )}
    </li>
  );
}

/** Editar nome, descrição e quem vê (quem criou). */
function EditarLista({ lista, aoSalvar, aoFechar }: { lista: ListaCompleta; aoSalvar: (l: ListaCompleta) => void; aoFechar: () => void }) {
  const [titulo, setTitulo] = useState(lista.titulo);
  const [descricao, setDescricao] = useState(lista.descricao ?? '');
  const [visibilidade, setVisibilidade] = useState<Visibilidade>(lista.visibilidade);
  const [grupoId, setGrupoId] = useState<string | null>(lista.grupo?.id ?? null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      const res = await fetch(`/api/listas/${lista.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, visibilidade, grupoId }),
      });
      const j = await res.json().catch(() => ({}));
      if (banidoVai(res, j)) return;
      if (!res.ok) throw new Error(j.error || 'Não foi possível salvar.');
      aoSalvar(j.lista);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="card-soft space-y-3 p-5" aria-label="Editar a lista">
      <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} aria-label="Nome da lista" className={CAMPO} />
      <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} maxLength={1000} placeholder="Do que é a lista? (opcional)" aria-label="Descrição" className={CAMPO} />
      <SeletorDeVisibilidade valor={visibilidade} grupoId={grupoId} aoMudar={(v, g) => { setVisibilidade(v); setGrupoId(g); }} />
      {erro && <p role="alert" className="text-xs text-clay-300">{erro}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={salvando || !titulo.trim() || (visibilidade === 'grupo' && !grupoId)} className="q-botao px-4 py-2 text-sm">
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={aoFechar} className="text-xs text-zinc-500 hover:text-zinc-200">Cancelar</button>
      </div>
    </form>
  );
}

/** A página de uma lista. */
export default function ListaView({ id }: { id: string }) {
  const { abrir } = useMidia();
  const [lista, setLista] = useState<ListaCompleta | null>(null);
  const [comentarios, setComentarios] = useState<ComentarioDeLista[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'sumiu'>('carregando');
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/listas/${id}`, { cache: 'no-store' });
    if (!res.ok) return setEstado('sumiu');
    const j = await res.json();
    setLista(j.lista);
    setComentarios(j.lista.comentariosDaLista || []);
    setEstado('ok');
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (estado === 'carregando') return <div className="h-64 animate-pulse rounded-3xl bg-zinc-800/50" aria-busy="true" />;
  if (estado === 'sumiu' || !lista) {
    return (
      <div className="card-soft space-y-3 p-8 text-center">
        <p className="text-sm text-zinc-300">Esta lista não existe mais ou não está aberta para você.</p>
        <Link href="/comunidade?aba=listas" className="text-sm font-semibold text-emerald-400 hover:text-clay-400">Ver outras listas</Link>
      </div>
    );
  }

  const tipo = tipoDaLista(lista.tipo);
  const itens = lista.itensDaLista;
  const videos = itens.filter((i) => i.youtubeId).map((i) => i.youtubeId!) as string[];

  const mudarItens = (fn: (atual: ItemDeLista[]) => ItemDeLista[]) =>
    setLista((l) => {
      if (!l) return l;
      const itensDaLista = fn(l.itensDaLista);
      return { ...l, itensDaLista, itens: itensDaLista.length };
    });

  const mover = async (i: number, passo: -1 | 1) => {
    const nova = [...itens];
    const [it] = nova.splice(i, 1);
    nova.splice(i + passo, 0, it);
    const antes = itens;
    mudarItens(() => nova);
    const res = await fetch(`/api/listas/${lista.id}/itens`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordem: nova.map((x) => x.id) }),
    });
    if (!res.ok) {
      mudarItens(() => antes);
      setErro('Não foi possível mudar a ordem.');
    }
  };

  const tirar = async (item: ItemDeLista) => {
    if (!window.confirm(`Tirar "${item.titulo}" da lista?`)) return;
    const res = await fetch(`/api/listas/${lista.id}/itens?item=${item.id}`, { method: 'DELETE' });
    if (res.ok) mudarItens((atual) => atual.filter((x) => x.id !== item.id));
    else setErro((await res.json().catch(() => ({}))).error || 'Não foi possível tirar o item.');
  };

  const apagar = async () => {
    if (!window.confirm('Apagar a lista inteira? Os itens, as reações e os comentários somem junto.')) return;
    const res = await fetch(`/api/listas/${lista.id}`, { method: 'DELETE' });
    if (res.ok) window.location.href = '/comunidade?aba=listas';
    else setErro((await res.json().catch(() => ({}))).error || 'Não foi possível apagar.');
  };

  const tocarTudo = () =>
    abrir({
      midia: { tipo: 'youtube', id: videos[0], fila: videos.slice(1) },
      titulo: lista.titulo,
      autor: lista.autor.nome,
      fonte: 'YouTube',
      link: `https://www.youtube.com/watch?v=${videos[0]}`,
    });

  return (
    <div className="space-y-6" data-quadro={QUADRO_DA_LISTA[lista.tipo]}>
      <header className="card-soft q-moldura overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <CapaDaLista lista={lista} className="aspect-video w-full sm:aspect-square sm:w-56 sm:shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              <Icon name={tipo.icone} size={12} /> Lista · {tipo.rotulo} · {itens.length} {itens.length === 1 ? 'item' : 'itens'}
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight text-zinc-50">{lista.titulo}</h1>
            {lista.descricao && <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{lista.descricao}</p>}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
              <Link href={`/pessoa/${lista.autor.id}`} className="inline-flex items-center gap-1.5 font-semibold text-zinc-200 hover:text-emerald-400">
                <Avatar nome={lista.autor.nome} path={lista.autor.avatarPath} tamanho={20} /> {lista.autor.nome}
              </Link>
              <SeloDeVisibilidade valor={lista.visibilidade} grupo={lista.grupo} />
              <span>atualizada {haQuanto(lista.atualizadaEm)}</span>
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
              {videos.length > 0 && (
                <button type="button" onClick={tocarTudo} className="q-botao inline-flex items-center gap-2 px-4 py-2 text-sm">
                  <Icon name="play" size={15} /> Tocar {videos.length > 1 ? `tudo (${videos.length})` : ''}
                </button>
              )}
              {lista.souAutor && (
                <button type="button" onClick={() => setEditando((v) => !v)} className="inline-flex items-center gap-1.5 rounded-2xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500">
                  Editar
                </button>
              )}
              {lista.podeApagar && (
                <button type="button" onClick={() => void apagar()} className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs text-zinc-500 hover:text-clay-300">
                  <Icon name="trash" size={13} /> Apagar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {editando && <EditarLista lista={lista} aoSalvar={(l) => { setLista(l); setEditando(false); }} aoFechar={() => setEditando(false)} />}
      {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}

      {lista.souAutor && <NovoItem lista={lista} aoPor={(i) => mudarItens((atual) => [...atual, i])} />}

      {itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          {lista.souAutor ? 'A lista está vazia. Ponha o primeiro item aí em cima.' : 'Esta lista ainda está vazia.'}
        </p>
      ) : (
        <ol className="space-y-2.5" aria-label="Itens da lista">
          {itens.map((item, i) => (
            <Item
              key={item.id}
              lista={lista}
              item={item}
              n={i + 1}
              total={itens.length}
              comentarios={comentarios.filter((c) => c.itemId === item.id)}
              aoMudarComentarios={setComentarios}
              aoMover={(passo) => void mover(i, passo)}
              aoTirar={() => void tirar(item)}
            />
          ))}
        </ol>
      )}

      <section className="card-soft space-y-4 p-5" aria-labelledby="sobre-a-selecao">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sobre-a-selecao" className="flex items-center gap-2 font-display text-2xl font-bold text-zinc-50">
            <Icon name="chat" size={20} className="text-emerald-400" /> Sobre a seleção
          </h2>
          <Reacoes url={`/api/listas/${lista.id}/reacao`} reacoes={lista.reacoes} minha={lista.minhaReacao} />
        </div>
        <Comentarios
          listaId={lista.id}
          itemId={null}
          comentarios={comentarios.filter((c) => !c.itemId)}
          aoMudar={setComentarios}
          convite={lista.souAutor ? 'Conte mais sobre a seleção…' : 'O que você achou da seleção inteira?'}
        />
        <p className="text-[11px] text-zinc-500">{LEMBRETE_DAS_REGRAS}</p>
      </section>
    </div>
  );
}
