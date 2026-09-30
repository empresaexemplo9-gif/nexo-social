'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../../icons';
import Avatar from '../../Avatar';
import Arte from './Arte';
import PalcoDeJogos from './PalcoDeJogos';
import { useCanalDeJogos, type JogoId } from '@/lib/jogos/canal';

type Eu = { userId: string; nome: string; avatar: string | null };

interface Ranking {
  ativo: boolean;
  ranking: Record<JogoId, { userId: string; nome: string; avatar: string | null; vitorias: number; partidas: number }[]>;
  recentes: { id: string; jogo: JogoId; vencedor: string | null; jogadores: string[]; em: string; resumo: string | null }[];
}

export const JOGOS: Record<JogoId, { nome: string }> = {
  trilha: { nome: 'Trilha do Saber' },
  arcanos: { nome: 'Arcanos' },
};

/** A sala de jogos de um grupo: quem está aqui, o palco dos jogos e o ranking. */
export default function SalaDeJogos({ groupId, eu, jogoInicial }: { groupId: string; eu: Eu; jogoInicial?: JogoId | null }) {
  const canal = useCanalDeJogos(groupId, eu);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [aba, setAba] = useState<JogoId>(jogoInicial ?? 'trilha');

  const carregarRanking = useCallback(() => {
    fetch(`/api/comunidade/grupos/${groupId}/jogos`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setRanking(j))
      .catch(() => undefined);
  }, [groupId]);
  useEffect(carregarRanking, [carregarRanking]);

  const outros = canal.presentes.filter((p) => p.userId !== eu.userId);

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
              ? 'A sala ao vivo não conectou. Dá para jogar sozinho ou contra o computador no palco abaixo.'
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

      {/* O palco: um espaço só, o ambiente muda com o jogo */}
      <PalcoDeJogos eu={eu} canal={canal} groupId={groupId} jogoInicial={jogoInicial} aoTerminar={carregarRanking} />

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

    </section>
  );
}
