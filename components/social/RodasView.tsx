'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../icons';
import Avatar from '../Avatar';
import SeletorDeVisibilidade, { SeloDeVisibilidade } from './SeletorDeVisibilidade';
import { CAMPO, haQuanto } from './util';
import { RODA_ENCERRA_PARADA_HORAS, RODA_FICA_DIAS, type RodaResumo } from '@/lib/listas-tipos';
import { ASSUNTO_TIPOS, type AssuntoTipo, type Visibilidade } from '@/lib/mural-tipos';
import { LEMBRETE_DAS_REGRAS } from '@/lib/regras';

/** Abrir uma roda: sobre o quê, para quem. */
function NovaRoda({ inicial }: { inicial?: { tema?: string; assuntoTipo?: AssuntoTipo } | null }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(Boolean(inicial?.tema));
  const [tema, setTema] = useState(inicial?.tema ?? '');
  const [descricao, setDescricao] = useState('');
  const [assuntoTipo, setAssuntoTipo] = useState<AssuntoTipo | ''>(inicial?.assuntoTipo ?? '');
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('todos');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const abrir = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/rodas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema, descricao, assuntoTipo: assuntoTipo || null, visibilidade, grupoId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 403 && j.banido) {
        window.location.href = '/banido';
        return;
      }
      if (!res.ok) throw new Error(j.error || 'Não foi possível abrir a roda.');
      router.push(`/comunidade/roda/${j.id}`);
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  };

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="card-soft flex w-full items-center gap-4 p-5 text-left transition hover:border-emerald-700/60">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950"><Icon name="chat" size={22} /></span>
        <span>
          <span className="block font-semibold text-zinc-50">Abrir uma roda de conversa</span>
          <span className="block text-xs text-zinc-400">
            Sobre um livro que você leu, um show, um jogo… A conversa some quando a roda termina, e quem participou pode se adicionar aos contatos.
          </span>
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={abrir} className="card-soft space-y-3 p-5" aria-label="Nova roda de conversa">
      <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <select value={assuntoTipo} onChange={(e) => setAssuntoTipo(e.target.value as AssuntoTipo | '')} aria-label="Sobre o quê" className={CAMPO}>
          <option value="">Assunto livre</option>
          {ASSUNTO_TIPOS.map((a) => <option key={a.id} value={a.id}>{a.rotulo}</option>)}
        </select>
        <input required value={tema} onChange={(e) => setTema(e.target.value)} maxLength={160} placeholder="Tema — ex.: O final de Torto Arado" aria-label="Tema da roda" className={CAMPO} />
      </div>
      <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} maxLength={1000} placeholder="Para puxar a conversa (opcional) — ex.: vale spoiler!" aria-label="Descrição" className={CAMPO} />
      <SeletorDeVisibilidade valor={visibilidade} grupoId={grupoId} aoMudar={(v, g) => { setVisibilidade(v); setGrupoId(g); }} />
      {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando || !tema.trim() || (visibilidade === 'grupo' && !grupoId)}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          <Icon name="chat" size={15} /> {enviando ? 'Abrindo…' : 'Abrir a roda'}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-xs text-zinc-500 hover:text-zinc-200">Cancelar</button>
        <span className="ml-auto text-[11px] text-zinc-500">{LEMBRETE_DAS_REGRAS}</span>
      </div>
    </form>
  );
}

/** Uma roda no cartão: tema, quem abriu, quem está e há quanto tempo conversam. */
export function RodaCard({ roda }: { roda: RodaResumo }) {
  const assunto = ASSUNTO_TIPOS.find((a) => a.id === roda.assuntoTipo);
  return (
    <Link href={`/comunidade/roda/${roda.id}`} className="card-soft levanta group flex h-full flex-col gap-2 p-4">
      <span className="flex items-center gap-2 text-[11px] text-zinc-500">
        {roda.aberta ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden /> Acontecendo
          </span>
        ) : (
          <span className="font-semibold text-zinc-400">Terminou {roda.encerradaEm ? haQuanto(roda.encerradaEm) : ''}</span>
        )}
        {assunto && <span>· {assunto.rotulo}</span>}
        <SeloDeVisibilidade valor={roda.visibilidade} grupo={roda.grupo} />
      </span>
      <span className="line-clamp-2 font-display text-lg font-bold leading-tight text-zinc-50 group-hover:text-emerald-300">{roda.tema}</span>
      {roda.descricao && <span className="line-clamp-2 text-xs text-zinc-400">{roda.descricao}</span>}
      <span className="mt-auto flex items-center gap-2 pt-1">
        <span className="flex -space-x-2">
          {roda.rostos.map((p) => <Avatar key={p.id} nome={p.nome} path={p.avatarPath} tamanho={24} className="ring-2 ring-zinc-900" />)}
        </span>
        <span className="text-[11px] text-zinc-500">
          {roda.participantes} {roda.participantes === 1 ? 'pessoa' : 'pessoas'}
          {roda.aberta && ` · ativa ${haQuanto(roda.ultimaAtividade)}`}
          {roda.participo && ' · você está'}
        </span>
      </span>
    </Link>
  );
}

/** A aba Rodas da Comunidade. */
export default function RodasView({ inicial }: { inicial?: { tema?: string; assuntoTipo?: AssuntoTipo } | null }) {
  const [abertas, setAbertas] = useState<RodaResumo[] | null>(null);
  const [encerradas, setEncerradas] = useState<RodaResumo[]>([]);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/rodas', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Falha ao carregar as rodas.');
      setAbertas(j.abertas || []);
      setEncerradas(j.encerradas || []);
    } catch (e) {
      setErro((e as Error).message);
      setAbertas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="space-y-8">
      <NovaRoda key={inicial?.tema ?? 'nova'} inicial={inicial} />
      {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-zinc-50">Rodas acontecendo</h2>
          <p className="text-xs text-zinc-400">
            Entre, converse e, no fim, adicione quem quiser aos contatos. Roda sem mensagem por {RODA_ENCERRA_PARADA_HORAS} h termina sozinha.
          </p>
        </div>
        {abertas === null ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
            {[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-zinc-800/50" />)}
          </div>
        ) : abertas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">Nenhuma roda acontecendo agora. Abra uma!</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {abertas.map((r) => <li key={r.id}><RodaCard roda={r} /></li>)}
          </ul>
        )}
      </section>
      {encerradas.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-zinc-50">Rodas de que você participou</h2>
            <p className="text-xs text-zinc-400">A conversa já sumiu; por {RODA_FICA_DIAS} dias dá para ver quem estava e se adicionar aos contatos.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {encerradas.map((r) => <li key={r.id}><RodaCard roda={r} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
