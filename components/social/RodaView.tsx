'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import { SeloDeVisibilidade } from './SeletorDeVisibilidade';
import { CAMPO, dataCompleta, haQuanto } from './util';
import { supabase } from '@/lib/supabase';
import { RODA_ENCERRA_PARADA_HORAS, RODA_FICA_DIAS, type ParticipanteDaRoda, type RodaCompleta } from '@/lib/listas-tipos';
import { ASSUNTO_TIPOS } from '@/lib/mural-tipos';
import { LEMBRETE_DAS_REGRAS } from '@/lib/regras';

/** Alguém da roda, com o botão de contato (o que importa no fim da conversa). */
function Pessoa({ p, aoMudar }: { p: ParticipanteDaRoda; aoMudar: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  const contato = async (acao: 'pedir' | 'aceitar') => {
    setOcupado(true);
    setAviso('');
    try {
      const res =
        acao === 'pedir'
          ? await fetch('/api/comunidade/contatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: p.id }) })
          : await fetch('/api/comunidade/contatos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.conexaoId, action: 'accept' }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Não deu certo.');
      aoMudar();
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-2.5">
      <Link href={`/pessoa/${p.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar nome={p.nome} path={p.avatarPath} tamanho={34} />
        <span className="truncate text-sm font-medium text-zinc-100">{p.vinculo === 'eu' ? 'Você' : p.nome}</span>
      </Link>
      {p.vinculo === 'aceito' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300"><Icon name="check" size={12} /> Contato</span>}
      {p.vinculo === 'enviado' && <span className="text-[11px] text-zinc-500">Pedido enviado</span>}
      {p.vinculo === 'recebido' && p.conexaoId && (
        <button type="button" disabled={ocupado} onClick={() => void contato('aceitar')} className="rounded-xl bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-950 disabled:opacity-50">
          Aceitar contato
        </button>
      )}
      {p.vinculo === 'nenhum' && (
        <button type="button" disabled={ocupado} onClick={() => void contato('pedir')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-950 disabled:opacity-50">
          <Icon name="plus" size={12} /> Adicionar
        </button>
      )}
      {aviso && <span role="status" className="text-[11px] text-clay-300">{aviso}</span>}
    </li>
  );
}

/** A roda: conversa ao vivo enquanto está aberta; no fim, quem participou. */
export default function RodaView({ id }: { id: string }) {
  const [roda, setRoda] = useState<RodaCompleta | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'sumiu'>('carregando');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const fim = useRef<HTMLLIElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/rodas/${id}`, { cache: 'no-store' });
    if (!res.ok) return setEstado('sumiu');
    setRoda((await res.json()).roda);
    setEstado('ok');
  }, [id]);

  useEffect(() => {
    void carregar();
    // Mensagem nova, alguém entrando ou a roda terminando: aparece sozinho.
    const recarregar = () => {
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(() => void carregar(), 250);
    };
    const sb = supabase;
    const canal = sb
      ?.channel(`roda:${id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roda_mensagens', filter: `roda_id=eq.${id}` }, recarregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roda_participantes', filter: `roda_id=eq.${id}` }, recarregar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rodas', filter: `id=eq.${id}` }, recarregar)
      .subscribe();
    return () => {
      if (espera.current) clearTimeout(espera.current);
      if (canal && sb) sb.removeChannel(canal);
    };
  }, [id, carregar]);

  const totalDeMensagens = roda?.mensagens.length ?? 0;
  useEffect(() => {
    if (totalDeMensagens) fim.current?.scrollIntoView({ block: 'nearest' });
  }, [totalDeMensagens]);

  const agir = async (acao: 'entrar' | 'sair' | 'encerrar') => {
    if (acao === 'encerrar' && !window.confirm('Encerrar a roda? A conversa some para todos, e cada um vê quem participou para se adicionar aos contatos.')) return;
    if (acao === 'sair' && !window.confirm('Sair da roda?')) return;
    setOcupado(true);
    setErro('');
    try {
      const res = await fetch(`/api/rodas/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Não deu certo.');
      if (!j.roda) {
        window.location.href = '/comunidade?aba=rodas';
        return;
      }
      setRoda(j.roda);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const falar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`/api/rodas/${id}/mensagens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ corpo: texto }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 403 && j.banido) {
        window.location.href = '/banido';
        return;
      }
      if (!res.ok) throw new Error(j.error || 'Não foi possível enviar.');
      setRoda((r) => (r ? { ...r, mensagens: [...r.mensagens.filter((m) => m.id !== j.mensagem.id), j.mensagem] } : r));
      setTexto('');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  if (estado === 'carregando') return <div className="h-72 animate-pulse rounded-3xl bg-zinc-800/50" aria-busy="true" />;
  if (estado === 'sumiu' || !roda) {
    return (
      <div className="card-soft space-y-3 p-8 text-center">
        <p className="text-sm text-zinc-300">Esta roda já terminou ou não está aberta para você.</p>
        <Link href="/comunidade?aba=rodas" className="text-sm font-semibold text-emerald-400 hover:text-clay-400">Ver as rodas acontecendo</Link>
      </div>
    );
  }

  const assunto = ASSUNTO_TIPOS.find((a) => a.id === roda.assuntoTipo);
  const outros = roda.pessoas.filter((p) => p.vinculo !== 'eu');

  return (
    <div className="space-y-6">
      <header className="card-soft space-y-2 p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          {roda.aberta ? (
            <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden /> Roda de conversa acontecendo
            </span>
          ) : (
            <span className="font-semibold uppercase tracking-wider text-zinc-400">Roda encerrada {roda.encerradaEm ? haQuanto(roda.encerradaEm) : ''}</span>
          )}
          {assunto && <span>· {assunto.rotulo}</span>}
          <SeloDeVisibilidade valor={roda.visibilidade} grupo={roda.grupo} />
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight text-zinc-50">{roda.tema}</h1>
        {roda.descricao && <p className="whitespace-pre-wrap text-sm text-zinc-300">{roda.descricao}</p>}
        <p className="text-[11px] text-zinc-500">
          Aberta por <Link href={`/pessoa/${roda.criador.id}`} className="font-semibold text-zinc-300 hover:text-emerald-400">{roda.souCriador ? 'você' : roda.criador.nome}</Link>
          {' '}· {roda.participantes} {roda.participantes === 1 ? 'pessoa' : 'pessoas'}
        </p>
        {roda.aberta && (
          <div className="flex flex-wrap gap-2 pt-2">
            {!roda.participo && (
              <button type="button" disabled={ocupado} onClick={() => void agir('entrar')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50">
                <Icon name="plus" size={15} /> Entrar na roda
              </button>
            )}
            {roda.participo && !roda.souCriador && (
              <button type="button" disabled={ocupado} onClick={() => void agir('sair')} className="rounded-2xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500">
                Sair da roda
              </button>
            )}
            {roda.souCriador && (
              <button type="button" disabled={ocupado} onClick={() => void agir('encerrar')} className="inline-flex items-center gap-1.5 rounded-2xl border border-clay-700/70 px-4 py-2 text-xs font-semibold text-clay-200 hover:bg-clay-950/40">
                <Icon name="check" size={13} /> Encerrar a roda
              </button>
            )}
          </div>
        )}
      </header>

      {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}

      {roda.aberta ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <section className="card-soft flex min-h-[24rem] flex-col p-4" aria-label="Conversa">
            {!roda.participo ? (
              <p className="m-auto max-w-sm text-center text-sm text-zinc-400">Entre na roda para ler e participar da conversa.</p>
            ) : (
              <>
                <ul className="flex-1 space-y-2.5 overflow-y-auto pb-3" aria-live="polite">
                  {roda.mensagens.length === 0 && <li className="py-10 text-center text-sm text-zinc-500">Ninguém falou ainda. Puxe a conversa!</li>}
                  {roda.mensagens.map((m) => (
                    <li key={m.id} className={`flex gap-2 ${m.minha ? 'flex-row-reverse' : ''}`}>
                      {!m.minha && <Avatar nome={m.autor.nome} path={m.autor.avatarPath} tamanho={28} />}
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${m.minha ? 'bg-emerald-500/90 text-zinc-950' : 'bg-zinc-900/80 text-zinc-100'}`}>
                        {!m.minha && <p className="text-[11px] font-semibold text-emerald-300">{m.autor.nome}</p>}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.corpo}</p>
                        <p className={`mt-0.5 text-right text-[10px] ${m.minha ? 'text-zinc-800' : 'text-zinc-500'}`}>
                          <time dateTime={m.criadaEm} title={dataCompleta(m.criadaEm)}>{haQuanto(m.criadaEm)}</time>
                        </p>
                      </div>
                    </li>
                  ))}
                  <li ref={fim} aria-hidden />
                </ul>
                <form onSubmit={falar} className="flex items-end gap-2 border-t border-zinc-800 pt-3">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder="Sua mensagem…"
                    aria-label="Mensagem"
                    className={`${CAMPO} min-h-[2.75rem] resize-none`}
                  />
                  <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50">
                    <Icon name="send" size={16} />
                  </button>
                </form>
                <p className="pt-1.5 text-[10px] text-zinc-500">
                  A conversa some quando a roda termina (ou depois de {RODA_ENCERRA_PARADA_HORAS} h sem mensagem). {LEMBRETE_DAS_REGRAS}
                </p>
              </>
            )}
          </section>
          <aside className="space-y-2" aria-label="Quem está na roda">
            <h2 className="text-sm font-semibold text-zinc-100">Na roda</h2>
            <ul className="space-y-1.5">
              {roda.pessoas.map((p) => <Pessoa key={p.id} p={p} aoMudar={() => void carregar()} />)}
            </ul>
          </aside>
        </div>
      ) : (
        <section className="card-soft space-y-4 p-5 sm:p-6" aria-labelledby="fim-da-roda">
          <div>
            <h2 id="fim-da-roda" className="font-display text-2xl font-bold text-zinc-50">A roda terminou</h2>
            <p className="text-sm text-zinc-400">
              A conversa sumiu, como combinado. Gostou de conversar com alguém? Adicione aos contatos — esta lista fica aqui por {RODA_FICA_DIAS} dias.
            </p>
          </div>
          {outros.length === 0 ? (
            <p className="text-sm text-zinc-500">Ninguém mais entrou nesta roda.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {outros.map((p) => <Pessoa key={p.id} p={p} aoMudar={() => void carregar()} />)}
            </ul>
          )}
          <Link href="/comunidade?aba=rodas" className="inline-block text-sm font-semibold text-emerald-400 hover:text-clay-400">Ver outras rodas →</Link>
        </section>
      )}
    </div>
  );
}
