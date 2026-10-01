'use client';

import React, { useCallback, useEffect, useState } from 'react';
import PublicacaoCard from './PublicacaoCard';
import NovaPublicacao, { type Rascunho } from './NovaPublicacao';
import { MiniDoQuadro } from './Quadro';
import { QUADRO_DA_PUBLICACAO } from '@/lib/comunidade-quadros';
import { TIPOS_PUBLICACAO, type Publicacao, type TipoPublicacao } from '@/lib/mural-tipos';

type Escopo = 'todos' | 'contatos' | 'meus';

const ESCOPOS: { id: Escopo; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Tudo' },
  { id: 'contatos', rotulo: 'Meus contatos' },
  { id: 'meus', rotulo: 'Minhas' },
];

/**
 * O mural da comunidade: o que as pessoas publicaram e que você pode ver (o
 * banco filtra por quem publicou escolheu). Com `autor`, só as publicações
 * daquela pessoa (página dela), sem formulário.
 */
export default function MuralSocial({ autor, rascunho, comFormulario = true }: { autor?: string; rascunho?: Rascunho | null; comFormulario?: boolean }) {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [fim, setFim] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [escopo, setEscopo] = useState<Escopo>('todos');
  const [tipo, setTipo] = useState<TipoPublicacao | null>(null);

  const carregar = useCallback(
    async (antes?: string) => {
      setErro('');
      try {
        const p = new URLSearchParams();
        if (autor) p.set('autor', autor);
        else if (escopo !== 'todos') p.set('escopo', escopo);
        if (tipo) p.set('tipo', tipo);
        if (antes) p.set('antes', antes);
        const res = await fetch(`/api/mural?${p}`);
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || 'Falha ao carregar o mural.');
        setPublicacoes((atual) => (antes ? [...atual, ...(j.publicacoes || [])] : j.publicacoes || []));
        setFim(Boolean(j.fim));
      } catch (e) {
        setErro((e as Error).message);
      } finally {
        setCarregando(false);
      }
    },
    [autor, escopo, tipo],
  );

  useEffect(() => {
    setCarregando(true);
    void carregar();
  }, [carregar]);

  const vazio = autor
    ? 'Nada publicado por aqui ainda — ou nada que esteja aberto para você.'
    : escopo === 'contatos'
      ? 'Seus contatos ainda não publicaram nada. Que tal puxar a conversa?'
      : escopo === 'meus'
        ? 'Você ainda não publicou. Comece uma conversa, peça uma opinião ou conte uma experiência.'
        : 'O mural está vazio. Seja a primeira pessoa a puxar uma conversa.';

  return (
    <section className="space-y-4" aria-label="Mural" data-quadro="lambe">
      {comFormulario && !autor && (
        <NovaPublicacao key={rascunho ? JSON.stringify(rascunho) : 'nova'} inicial={rascunho} aoPublicar={(p) => setPublicacoes((atual) => [p, ...atual.filter((x) => x.id !== p.id)])} />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {!autor &&
          ESCOPOS.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={escopo === e.id}
              onClick={() => setEscopo(e.id)}
              className="q-chip q-chip--simples"
            >
              {e.rotulo}
            </button>
          ))}
        <span className="mx-1 hidden h-4 w-px bg-zinc-800 sm:inline-block" aria-hidden />
        {TIPOS_PUBLICACAO.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tipo === t.id}
            data-quadro={QUADRO_DA_PUBLICACAO[t.id]}
            onClick={() => setTipo(tipo === t.id ? null : t.id)}
            className="q-chip"
          >
            <MiniDoQuadro quadro={QUADRO_DA_PUBLICACAO[t.id]} className="!h-5 !w-5" /> {t.rotulo}
          </button>
        ))}
      </div>

      {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}

      {carregando ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-zinc-800/50" />)}
        </div>
      ) : publicacoes.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">{vazio}</p>
      ) : (
        <ul className="space-y-3">
          {publicacoes.map((p) => (
            <li key={p.id}>
              <PublicacaoCard p={p} aoApagar={(id) => setPublicacoes((atual) => atual.filter((x) => x.id !== id))} />
            </li>
          ))}
        </ul>
      )}

      {!fim && !carregando && (
        <button
          type="button"
          onClick={() => void carregar(publicacoes[publicacoes.length - 1]?.criadaEm)}
          className="w-full rounded-2xl border border-zinc-800 py-2.5 text-sm text-zinc-300 transition hover:text-zinc-50"
        >
          Ver publicações mais antigas
        </button>
      )}
    </section>
  );
}
