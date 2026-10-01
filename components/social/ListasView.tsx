'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../icons';
import ListaCard from './ListaCard';
import SeletorDeVisibilidade from './SeletorDeVisibilidade';
import { CAMPO } from './util';
import { TIPOS_LISTA, type ListaResumo, type TipoLista } from '@/lib/listas-tipos';
import type { Visibilidade } from '@/lib/mural-tipos';
import { LEMBRETE_DAS_REGRAS } from '@/lib/regras';
import { QUADRO_DA_LISTA } from '@/lib/comunidade-quadros';
import { MiniDoQuadro } from './Quadro';

/** Criar lista: nome, tipo, descrição e quem vê. Os itens entram na página dela. */
function NovaLista() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoLista>('musicas');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('todos');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Quem vê, de início: o padrão que a pessoa escolheu na página dela.
  useEffect(() => {
    if (!aberto) return;
    fetch('/api/perfil')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.visibilidadePadrao && setVisibilidade(j.visibilidadePadrao))
      .catch(() => undefined);
  }, [aberto]);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, titulo, descricao, visibilidade, grupoId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 403 && j.banido) {
        window.location.href = '/banido';
        return;
      }
      if (!res.ok) throw new Error(j.error || 'Não foi possível criar a lista.');
      router.push(`/comunidade/lista/${j.lista.id}?nova=1`);
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  };

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="card-soft flex w-full items-center gap-4 p-5 text-left transition hover:border-emerald-700/60"
      >
        <span className="q-botao flex h-12 w-12 shrink-0 items-center justify-center"><Icon name="plus" size={22} /></span>
        <span>
          <span className="block font-semibold text-zinc-50">Criar uma lista</span>
          <span className="block text-xs text-zinc-400">Playlist de músicas ou clipes, livros, filmes, séries, jogos — para todos, para os contatos ou para um grupo.</span>
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={criar} className="card-soft space-y-3 p-5" aria-label="Nova lista">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo da lista">
        {TIPOS_LISTA.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={tipo === t.id}
            data-quadro={QUADRO_DA_LISTA[t.id]}
            onClick={() => setTipo(t.id)}
            className="q-chip"
          >
            <MiniDoQuadro quadro={QUADRO_DA_LISTA[t.id]} /> {t.rotulo}
          </button>
        ))}
      </div>
      <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Nome da lista — ex.: Para correr, Lidos em 2026" aria-label="Nome da lista" className={CAMPO} />
      <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} maxLength={1000} placeholder="Do que é a lista? (opcional)" aria-label="Descrição" className={CAMPO} />
      <SeletorDeVisibilidade valor={visibilidade} grupoId={grupoId} aoMudar={(v, g) => { setVisibilidade(v); setGrupoId(g); }} />
      {visibilidade === 'todos' && <p className="text-[11px] text-zinc-500">Listas abertas a todos aparecem como sugestão para as outras pessoas.</p>}
      {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando || !titulo.trim() || (visibilidade === 'grupo' && !grupoId)}
          data-quadro={QUADRO_DA_LISTA[tipo]}
          className="q-botao inline-flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <Icon name="plus" size={15} /> {enviando ? 'Criando…' : 'Criar e pôr os itens'}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-xs text-zinc-500 hover:text-zinc-200">Cancelar</button>
        <span className="ml-auto text-[11px] text-zinc-500">{LEMBRETE_DAS_REGRAS}</span>
      </div>
    </form>
  );
}

function Secao({ titulo, explica, listas, vazio }: { titulo: string; explica?: string; listas: ListaResumo[] | null; vazio: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-zinc-50">{titulo}</h2>
        {explica && <p className="text-xs text-zinc-400">{explica}</p>}
      </div>
      {listas === null ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-zinc-800/50" />)}
        </div>
      ) : listas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">{vazio}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {listas.map((l) => <li key={l.id}><ListaCard lista={l} /></li>)}
        </ul>
      )}
    </section>
  );
}

/** A aba Listas da Comunidade: criar, sugestões da comunidade, dos contatos e as minhas. */
export default function ListasView() {
  const [sugestoes, setSugestoes] = useState<ListaResumo[] | null>(null);
  const [contatos, setContatos] = useState<ListaResumo[] | null>(null);
  const [minhas, setMinhas] = useState<ListaResumo[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const pegar = async (escopo: string) => {
      const res = await fetch(`/api/listas?escopo=${escopo}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Falha ao carregar as listas.');
      return (j.listas || []) as ListaResumo[];
    };
    try {
      const [a, b, c] = await Promise.all([pegar('sugestoes'), pegar('contatos'), pegar('minhas')]);
      setSugestoes(a);
      setContatos(b);
      setMinhas(c);
    } catch (e) {
      setErro((e as Error).message);
      setSugestoes([]);
      setContatos([]);
      setMinhas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="space-y-8" data-quadro="holo">
      <NovaLista />
      {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}
      <Secao titulo="Minhas listas" listas={minhas} vazio="Você ainda não criou nenhuma lista." />
      <Secao
        titulo="Sugestões da comunidade"
        explica="Listas que as pessoas abriram para todos. Dê o seu retorno em cada item ou na seleção inteira."
        listas={sugestoes}
        vazio="Ninguém abriu uma lista para todos ainda. Que tal ser a primeira pessoa?"
      />
      <Secao titulo="Dos meus contatos" listas={contatos} vazio="Seus contatos ainda não criaram listas." />
    </div>
  );
}
