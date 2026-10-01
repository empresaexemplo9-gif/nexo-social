'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import PublicacaoCard from './PublicacaoCard';
import { CAMPO, dataCompleta, haQuanto } from './util';
import { supabase } from '@/lib/supabase';
import { LEMBRETE_DAS_REGRAS } from '@/lib/regras';
import type { Opiniao, Publicacao } from '@/lib/mural-tipos';

/** Uma opinião (e, embaixo, as respostas a ela). */
function UmaOpiniao({
  o,
  respostas,
  aoResponder,
  aoApagar,
}: {
  o: Opiniao;
  respostas: Opiniao[];
  aoResponder: (o: Opiniao) => void;
  aoApagar: (o: Opiniao) => void;
}) {
  return (
    <li className="space-y-2">
      <div className="flex gap-3">
        <Link href={`/pessoa/${o.autor.id}`} className="shrink-0"><Avatar nome={o.autor.nome} path={o.autor.avatarPath} tamanho={34} /></Link>
        <div className="min-w-0 flex-1 rounded-2xl bg-zinc-900/70 px-4 py-2.5">
          <p className="text-[11px] text-zinc-500">
            <Link href={`/pessoa/${o.autor.id}`} className="font-semibold text-zinc-200 hover:text-emerald-400">{o.autor.nome}</Link>{' '}
            · <time dateTime={o.criadaEm} title={dataCompleta(o.criadaEm)}>{haQuanto(o.criadaEm)}</time>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{o.corpo}</p>
          <p className="mt-1 flex gap-3 text-[11px]">
            <button type="button" onClick={() => aoResponder(o)} className="font-semibold text-zinc-400 hover:text-emerald-400">Responder</button>
            {o.podeApagar && <button type="button" onClick={() => aoApagar(o)} className="text-zinc-500 hover:text-clay-300">Apagar</button>}
          </p>
        </div>
      </div>
      {respostas.length > 0 && (
        <ul className="ml-11 space-y-2 border-l border-zinc-800 pl-3">
          {respostas.map((r) => (
            <UmaOpiniao key={r.id} o={r} respostas={[]} aoResponder={() => aoResponder(o)} aoApagar={aoApagar} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** A publicação inteira e a conversa em volta dela. */
export default function PublicacaoView({ id }: { id: string }) {
  const [pub, setPub] = useState<Publicacao | null>(null);
  const [opinioes, setOpinioes] = useState<Opiniao[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'sumiu'>('carregando');
  const [texto, setTexto] = useState('');
  const [respondendo, setRespondendo] = useState<Opiniao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/mural/${id}`, { cache: 'no-store' });
    if (!res.ok) return setEstado('sumiu');
    const j = await res.json();
    setPub(j.publicacao);
    setOpinioes(j.opinioes || []);
    setEstado('ok');
  }, [id]);

  useEffect(() => {
    void carregar();
    // Opinião nova de outra pessoa aparece sozinha.
    const sb = supabase;
    const canal = sb
      ?.channel(`opinioes:${id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicacao_comentarios', filter: `publicacao_id=eq.${id}` }, () => void carregar())
      .subscribe();
    return () => {
      if (canal && sb) sb.removeChannel(canal);
    };
  }, [id, carregar]);

  const opinar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`/api/mural/${id}/opinioes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpo: texto, respostaA: respondendo?.id ?? null }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 403 && j.banido) {
        window.location.href = '/banido';
        return;
      }
      if (!res.ok) throw new Error(j.error || 'Não foi possível opinar.');
      setOpinioes((atual) => [...atual.filter((o) => o.id !== j.opiniao.id), j.opiniao]);
      setTexto('');
      setRespondendo(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async (o: Opiniao) => {
    if (!window.confirm('Apagar esta opinião?')) return;
    const res = await fetch(`/api/mural/${id}/opinioes?id=${o.id}`, { method: 'DELETE' });
    if (res.ok) setOpinioes((atual) => atual.filter((x) => x.id !== o.id).map((x) => (x.respostaA === o.id ? { ...x, respostaA: null } : x)));
    else setErro((await res.json().catch(() => ({}))).error || 'Não foi possível apagar.');
  };

  if (estado === 'carregando') return <div className="h-60 animate-pulse rounded-3xl bg-zinc-800/50" aria-busy="true" />;
  if (estado === 'sumiu' || !pub) {
    return (
      <div className="card-soft space-y-3 p-8 text-center">
        <p className="text-sm text-zinc-300">Esta publicação não existe mais ou não está aberta para você.</p>
        <Link href="/comunidade" className="text-sm font-semibold text-emerald-400 hover:text-clay-400">Voltar ao mural</Link>
      </div>
    );
  }

  const raiz = opinioes.filter((o) => !o.respostaA || !opinioes.some((x) => x.id === o.respostaA));
  const respostasDe = (o: Opiniao) => opinioes.filter((x) => x.respostaA === o.id);

  return (
    <div className="space-y-6">
      <PublicacaoCard p={pub} inteira aoApagar={() => (window.location.href = '/comunidade')} />

      {pub.assunto && (
        <Link
          href={`/comunidade?${new URLSearchParams({ aba: 'rodas', tema: pub.assunto, ...(pub.assuntoTipo ? { assunto: pub.assuntoTipo } : {}) })}`}
          className="flex items-center gap-3 rounded-2xl border border-emerald-800/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 transition hover:border-emerald-600"
        >
          <Icon name="users" size={16} className="shrink-0" />
          <span className="min-w-0 flex-1">Quer conversar ao vivo sobre <b className="font-semibold">{pub.assunto}</b>? Abra uma roda de conversa.</span>
          <Icon name="arrowRight" size={15} className="shrink-0" />
        </Link>
      )}

      <section className="space-y-4" aria-labelledby="opinioes-titulo">
        <h2 id="opinioes-titulo" className="flex items-center gap-2 font-display text-2xl font-bold text-zinc-50">
          <Icon name="chat" size={20} className="text-emerald-400" /> Opiniões {opinioes.length > 0 && <span className="text-base text-zinc-500">({opinioes.length})</span>}
        </h2>

        <form onSubmit={opinar} className="card-soft space-y-2 p-4">
          {respondendo && (
            <p className="flex items-center justify-between gap-2 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
              <span className="truncate">Respondendo a <strong className="text-zinc-200">{respondendo.autor.nome}</strong>: {respondendo.corpo}</span>
              <button type="button" onClick={() => setRespondendo(null)} aria-label="Cancelar resposta" className="shrink-0 text-zinc-500 hover:text-zinc-200"><Icon name="close" size={13} /></button>
            </p>
          )}
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={pub.tipo === 'pergunta' || pub.tipo === 'experiencia' ? 'Qual é a sua opinião?' : 'O que você achou?'}
            className={CAMPO}
          />
          {erro && <p role="alert" className="text-xs text-clay-300">{erro}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={enviando || !texto.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50">
              <Icon name="send" size={14} /> {enviando ? 'Enviando…' : respondendo ? 'Responder' : 'Opinar'}
            </button>
            <span className="ml-auto text-[11px] text-zinc-500">{LEMBRETE_DAS_REGRAS}</span>
          </div>
        </form>

        {raiz.length === 0 ? (
          <p className="text-sm text-zinc-500">Ninguém opinou ainda. Comece a conversa.</p>
        ) : (
          <ul className="space-y-4">
            {raiz.map((o) => (
              <UmaOpiniao key={o.id} o={o} respostas={respostasDe(o)} aoResponder={setRespondendo} aoApagar={(x) => void apagar(x)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
