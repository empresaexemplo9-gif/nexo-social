'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Icon from '../../icons';
import Avatar from '../../Avatar';
import Arte from './Arte';
import EscolherEscolas from './EscolherEscolas';
import { novoId, useCanalDeJogos, type JogoId, type MesaAnunciada } from '@/lib/jogos/canal';
import type { Escola } from '@/lib/jogos/arcanos/cartas';

// As mesas só carregam quando alguém entra em uma (são as partes pesadas).
const Arcanos = dynamic(() => import('./Arcanos'), { ssr: false });
const TrilhaDoSaber = dynamic(() => import('./TrilhaDoSaber'), { ssr: false });

type Eu = { userId: string; nome: string; avatar: string | null };

type NaMesa =
  | { jogo: 'trilha'; mesa: string; papel: 'host' | 'jogador' | 'espectador'; hostNome?: string }
  | { jogo: 'arcanos'; mesa: string; papel: 'host' | 'desafiante' | 'espectador'; escolas?: [Escola, Escola]; hostNome?: string };

interface Ranking {
  ativo: boolean;
  ranking: Record<JogoId, { userId: string; nome: string; avatar: string | null; vitorias: number; partidas: number }[]>;
  recentes: { id: string; jogo: JogoId; vencedor: string | null; jogadores: string[]; em: string; resumo: string | null }[];
}

export const JOGOS: Record<JogoId, { nome: string; tipo: string; resumo: string; pessoas: string; arte: string; fundo: string; tinta: string }> = {
  trilha: {
    nome: 'Trilha do Saber',
    tipo: 'Tabuleiro · conhecimentos e curiosidades',
    resumo: 'Todo mundo responde junto; quem acerta anda na trilha. 14 categorias, casas de estrela e ponte, e uma curiosidade a cada rodada.',
    pessoas: '1 a 10 pessoas',
    arte: 'owl',
    fundo: 'radial-gradient(ellipse at 30% 20%, #1f7a7c 0%, #0e3b3d 70%)',
    tinta: '#fbf3e0',
  },
  arcanos: {
    nome: 'Arcanos',
    tipo: 'Cartas · estratégia',
    resumo: 'Duelo de magia no estilo dos grandes jogos de cartas: cinco escolas, 60 cartas, criaturas, feitiços, ataque e bloqueio.',
    pessoas: '2 pessoas (o grupo pode assistir)',
    arte: 'spell-book',
    fundo: 'radial-gradient(ellipse at 30% 20%, #4a3421 0%, #1a110a 70%)',
    tinta: '#f5d77a',
  },
};

/** A sala de jogos de um grupo: quem está aqui, mesas abertas, criar mesa e o ranking. */
export default function SalaDeJogos({ groupId, eu, jogoInicial }: { groupId: string; eu: Eu; jogoInicial?: JogoId | null }) {
  const canal = useCanalDeJogos(groupId, eu);
  const [naMesa, setNaMesa] = useState<NaMesa | null>(null);
  const [escolhendo, setEscolhendo] = useState<{ para: 'criar' } | { para: 'aceitar'; mesa: MesaAnunciada } | null>(null);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [aba, setAba] = useState<JogoId>(jogoInicial ?? 'trilha');

  const carregarRanking = useCallback(() => {
    fetch(`/api/comunidade/grupos/${groupId}/jogos`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setRanking(j))
      .catch(() => undefined);
  }, [groupId]);
  useEffect(carregarRanking, [carregarRanking]);

  const sairDaMesa = () => {
    setNaMesa(null);
    carregarRanking();
  };

  const abrirTrilha = () => setNaMesa({ jogo: 'trilha', mesa: novoId(), papel: 'host' });
  const entrarNaMesa = (m: MesaAnunciada) => {
    if (m.jogo === 'trilha') setNaMesa({ jogo: 'trilha', mesa: m.id, papel: m.estado === 'aberta' ? 'jogador' : 'espectador', hostNome: m.hostNome });
    else if (m.estado === 'aberta' && m.host !== eu.userId) setEscolhendo({ para: 'aceitar', mesa: m });
    else setNaMesa({ jogo: 'arcanos', mesa: m.id, papel: 'espectador', hostNome: m.hostNome });
  };

  const outros = canal.presentes.filter((p) => p.userId !== eu.userId);
  const mesas = canal.mesas.filter((m) => m.host !== eu.userId);

  return (
    <section className="space-y-5" aria-label="Jogos do grupo">
      {/* Quem está na sala */}
      <div className="card-soft flex flex-wrap items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400">
          <Icon name="gamepad" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">Sala de jogos · ao vivo</p>
          <p className="text-xs text-zinc-500">
            {canal.estado === 'erro'
              ? 'Não deu para entrar na sala de jogos. Verifique a conexão (e se os jogos já foram ativados no banco).'
              : canal.estado === 'conectando'
                ? 'Entrando na sala…'
                : outros.length
                  ? `${outros.length} ${outros.length === 1 ? 'pessoa também está' : 'pessoas também estão'} aqui agora`
                  : 'Só você por aqui agora. Chame o grupo no chat!'}
          </p>
        </div>
        <div className="flex -space-x-2">
          {canal.presentes.slice(0, 8).map((p) => (
            <span key={p.userId} title={p.nome} className="rounded-full ring-2 ring-zinc-900">
              <Avatar nome={p.nome} path={p.avatar} tamanho={30} />
            </span>
          ))}
        </div>
      </div>

      {/* Mesas abertas */}
      {mesas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Mesas agora</p>
          {mesas.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: JOGOS[m.jogo].fundo, color: JOGOS[m.jogo].tinta }}>
                <Arte nome={JOGOS[m.jogo].arte} className="h-7 w-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-100">
                  {JOGOS[m.jogo].nome} · mesa de {m.hostNome.split(' ')[0]}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {m.estado === 'aberta' ? (m.jogo === 'arcanos' ? 'procurando desafiante' : 'aberta para entrar') : 'jogando agora'}
                  {m.detalhe ? ` · ${m.detalhe}` : ''}
                </span>
              </span>
              <button type="button" onClick={() => entrarNaMesa(m)} className="shrink-0 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">
                {m.estado === 'aberta' ? (m.jogo === 'arcanos' ? 'Aceitar duelo' : 'Entrar') : 'Assistir'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Os jogos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(JOGOS) as JogoId[]).map((id) => {
          const j = JOGOS[id];
          return (
            <article key={id} className="overflow-hidden rounded-3xl" style={{ background: j.fundo, boxShadow: '0 10px 24px rgba(0,0,0,.25)' }}>
              <div className="flex items-start gap-3 p-4">
                <Arte nome={j.arte} className="h-14 w-14 shrink-0" style={{ color: j.tinta, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.4))' }} />
                <div className="min-w-0">
                  <h3 className={`text-xl font-black text-white ${id === 'arcanos' ? 'fonte-arcana' : 'font-display uppercase tracking-wide'}`}>{j.nome}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: j.tinta }}>{j.tipo}</p>
                </div>
              </div>
              <p className="px-4 text-sm leading-relaxed text-white/85">{j.resumo}</p>
              <div className="flex items-center justify-between gap-2 p-4">
                <span className="text-[11px] text-white/60">{j.pessoas}</span>
                <button
                  type="button"
                  disabled={canal.estado !== 'ok'}
                  onClick={() => (id === 'trilha' ? abrirTrilha() : setEscolhendo({ para: 'criar' }))}
                  className="rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50"
                  style={{ background: j.tinta, color: '#1a120a' }}
                >
                  {id === 'trilha' ? 'Abrir mesa' : 'Abrir duelo'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Ranking */}
      <div className="card-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Arte nome="trophy-cup" className="h-5 w-5 text-emerald-400" /> Ranking do grupo
          </p>
          <div role="tablist" className="flex gap-1 rounded-xl border border-zinc-800 p-0.5">
            {(Object.keys(JOGOS) as JogoId[]).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${aba === id ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}>
                {JOGOS[id].nome}
              </button>
            ))}
          </div>
        </div>
        {!ranking ? (
          <p className="mt-3 text-xs text-zinc-500">Carregando…</p>
        ) : !ranking.ativo ? (
          <p className="mt-3 text-xs text-zinc-500">O ranking aparece quando o placar dos jogos for ativado no banco. As partidas funcionam normalmente.</p>
        ) : ranking.ranking[aba].length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">Ninguém jogou {JOGOS[aba].nome} ainda neste grupo. Abra a primeira mesa!</p>
        ) : (
          <ol className="mt-3 space-y-1.5">
            {ranking.ranking[aba].map((r, i) => (
              <li key={r.userId} className="flex items-center gap-2.5">
                <span className="w-5 text-center font-display text-sm font-bold text-zinc-500">{i + 1}</span>
                <Avatar nome={r.nome} path={r.avatar} tamanho={28} />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">{r.nome}</span>
                <span className="text-xs text-zinc-400">
                  <b className="text-zinc-100">{r.vitorias}</b> {r.vitorias === 1 ? 'vitória' : 'vitórias'} · {r.partidas} {r.partidas === 1 ? 'partida' : 'partidas'}
                </span>
              </li>
            ))}
          </ol>
        )}
        {ranking?.recentes.some((r) => r.jogo === aba) && (
          <ul className="mt-3 space-y-1 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
            {ranking.recentes.filter((r) => r.jogo === aba).slice(0, 4).map((r) => (
              <li key={r.id} className="truncate">
                {new Date(r.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {r.resumo ?? (r.vencedor ? `${r.vencedor} venceu` : r.jogadores.join(', '))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {escolhendo && (
        <EscolherEscolas
          titulo={escolhendo.para === 'criar' ? 'Abrir um duelo' : `Aceitar o duelo de ${escolhendo.mesa.hostNome.split(' ')[0]}`}
          botao={escolhendo.para === 'criar' ? 'Abrir mesa' : 'Aceitar'}
          onCancelar={() => setEscolhendo(null)}
          onEscolher={(escolas) => {
            if (escolhendo.para === 'criar') setNaMesa({ jogo: 'arcanos', mesa: novoId(), papel: 'host', escolas });
            else setNaMesa({ jogo: 'arcanos', mesa: escolhendo.mesa.id, papel: 'desafiante', escolas, hostNome: escolhendo.mesa.hostNome });
            setEscolhendo(null);
          }}
        />
      )}

      {naMesa?.jogo === 'trilha' && (
        <TrilhaDoSaber canal={canal} groupId={groupId} mesa={naMesa.mesa} papel={naMesa.papel} eu={eu} hostNome={naMesa.hostNome} aoSair={sairDaMesa} />
      )}
      {naMesa?.jogo === 'arcanos' && (
        <Arcanos canal={canal} groupId={groupId} mesa={naMesa.mesa} papel={naMesa.papel} eu={eu} escolas={naMesa.escolas} hostNome={naMesa.hostNome} aoSair={sairDaMesa} />
      )}
    </section>
  );
}
