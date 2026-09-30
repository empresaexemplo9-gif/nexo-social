'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../icons';
import Avatar from '../Avatar';
import type { Comentario } from '@/lib/comunidade-tipos';

/** "agora", "5 min", "3 h", "ontem", "12/09". */
function quando(iso: string): string {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Comentários de uma publicação do Mural: lista, responder a um comentário
 * (com citação) e comentar. Usado no Mural do grupo e no card da home.
 */
export default function Comentarios({
  groupId,
  postId,
  compacto = false,
  aoMudar,
}: {
  groupId: string;
  postId: string;
  compacto?: boolean;
  /** Novo total, para o contador de quem mostra a publicação. */
  aoMudar?: (total: number) => void;
}) {
  const endpoint = `/api/comunidade/grupos/${groupId}/posts/${postId}/comentarios`;
  const [lista, setLista] = useState<Comentario[] | null>(null);
  const [texto, setTexto] = useState('');
  const [respondendo, setRespondendo] = useState<Comentario | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const campo = useRef<HTMLTextAreaElement>(null);
  const fim = useRef<HTMLLIElement>(null);
  const aoMudarRef = useRef(aoMudar);
  aoMudarRef.current = aoMudar;

  const carregar = useCallback(async () => {
    const res = await fetch(endpoint, { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(j.error || 'Falha ao carregar os comentários.');
      setLista((l) => l ?? []);
      return;
    }
    setErro('');
    setLista(j.comentarios ?? []);
    aoMudarRef.current?.((j.comentarios ?? []).length);
  }, [endpoint]);

  useEffect(() => {
    void carregar();
    const t = window.setInterval(() => document.visibilityState === 'visible' && void carregar(), 15000);
    return () => window.clearInterval(t);
  }, [carregar]);

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: t, replyTo: respondendo?.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Não foi possível comentar.');
      setTexto('');
      setRespondendo(null);
      await carregar();
      requestAnimationFrame(() => fim.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async (c: Comentario) => {
    if (!window.confirm('Apagar este comentário?')) return;
    const res = await fetch(`${endpoint}?comentario=${c.id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(j.error || 'Não deu para apagar.');
    setLista((l) => {
      const nova = (l ?? []).filter((x) => x.id !== c.id).map((x) => (x.replyTo?.id === c.id ? { ...x, replyTo: null } : x));
      aoMudarRef.current?.(nova.length);
      return nova;
    });
    setRespondendo((r) => (r?.id === c.id ? null : r));
  };

  const responder = (c: Comentario) => {
    setRespondendo(c);
    requestAnimationFrame(() => campo.current?.focus());
  };

  const tamanho = compacto ? 26 : 30;

  return (
    <div className={`space-y-3 ${compacto ? '' : 'border-t border-zinc-800 pt-3'}`}>
      {lista === null ? (
        <p className="text-xs text-zinc-500">Carregando comentários…</p>
      ) : lista.length === 0 && !erro ? (
        <p className="text-xs text-zinc-500">Ninguém comentou ainda. Seja a primeira pessoa.</p>
      ) : (
        <ul className={`space-y-2.5 ${compacto ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
          {lista.map((c) => (
            <li key={c.id} className="group/com flex gap-2">
              <Avatar nome={c.authorName} path={c.authorAvatar} tamanho={tamanho} />
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl bg-zinc-900 px-3 py-2">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-zinc-100">{c.authorName}</span>
                    <span className="shrink-0 text-[10px] text-zinc-500">{quando(c.createdAt)}</span>
                  </p>
                  {c.replyTo && (
                    <p className="mt-1 rounded-lg border-l-4 border-emerald-400 bg-zinc-950/50 px-2 py-1 text-[11px] text-zinc-400">
                      <b className="font-semibold text-emerald-400">{c.replyTo.authorName}</b> <span className="line-clamp-2">{c.replyTo.texto}</span>
                    </p>
                  )}
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-200">{c.body}</p>
                </div>
                <p className="mt-0.5 flex gap-3 pl-3 text-[11px] font-semibold text-zinc-500">
                  <button type="button" onClick={() => responder(c)} className="hover:text-emerald-400">Responder</button>
                  {c.podeApagar && (
                    <button type="button" onClick={() => void apagar(c)} className="opacity-0 transition hover:text-clay-300 focus:opacity-100 group-hover/com:opacity-100 [@media(hover:none)]:opacity-100">
                      Apagar
                    </button>
                  )}
                </p>
              </div>
            </li>
          ))}
          <li ref={fim} aria-hidden className="h-0" />
        </ul>
      )}

      {erro && <p className="text-xs text-clay-300">{erro}</p>}

      <form onSubmit={enviar} className="space-y-1.5">
        {respondendo && (
          <div className="flex items-center gap-2 rounded-xl border-l-4 border-emerald-400 bg-zinc-900 py-1 pl-3 pr-1">
            <Icon name="reply" size={13} className="shrink-0 text-emerald-400" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-400">
              Respondendo a <b className="text-emerald-400">{respondendo.authorName}</b>: {respondendo.body}
            </span>
            <button type="button" onClick={() => setRespondendo(null)} aria-label="Cancelar resposta" className="rounded-full p-1 text-zinc-500 hover:text-zinc-100">
              <Icon name="close" size={13} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && respondendo) setRespondendo(null);
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void enviar();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={respondendo ? `Responder a ${respondendo.authorName}…` : 'Escreva um comentário…'}
            aria-label="Comentário"
            className="max-h-28 min-h-[2.25rem] min-w-0 flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
          />
          <button disabled={!texto.trim() || enviando} aria-label="Enviar comentário"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-40">
            <Icon name="send" size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
