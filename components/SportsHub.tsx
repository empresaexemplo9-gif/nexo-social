'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from './icons';
import { formatEventDateLong, relativeLabel } from '@/lib/datetime';
import InlinePlayer, { type PlayRequest } from './InlinePlayer';
import { youtubeEmbed, youtubeSearch, type Broadcaster, type Legend } from '@/lib/sports-media';
import { ticketSearchForMatch } from '@/lib/tickets-links';
import type { Competition, Match, SportDef, SportId, SportsBoard } from '@/lib/sports';

interface Board extends SportsBoard {
  modalidades: SportDef[];
  transmissoes: Broadcaster[];
  lendas: Legend[];
}

const KIND_LABEL: Record<string, string> = {
  'ao-vivo': 'Ao vivo grátis',
  'melhores-momentos': 'Melhores momentos',
  acervo: 'Acervo',
};

// ---------------------------------------------------------------------------
// Cartão de partida
// ---------------------------------------------------------------------------

function Side({ name, logo, score, winner }: { name: string; logo: string | null; score: number | null; winner: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {logo ? (
        // Escudos vêm de vários domínios das fontes — <img> evita configurar
        // cada host no next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-600">
          <Icon name="trophy" size={13} />
        </span>
      )}
      <span className={`truncate text-sm ${winner ? 'font-semibold text-zinc-50' : 'text-zinc-300'}`}>{name}</span>
      {score !== null && (
        <span className={`ml-auto shrink-0 text-base tabular-nums ${winner ? 'font-bold text-zinc-50' : 'text-zinc-400'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match, onPlay }: { match: Match; onPlay: (req: PlayRequest) => void }) {
  const aoVivo = match.state === 'ao-vivo';
  const encerrado = match.state === 'encerrado';
  const casaVenceu = encerrado && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const foraVenceu = encerrado && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        aoVivo ? 'border-red-800/60 bg-red-950/15' : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] uppercase tracking-wide text-zinc-500">{match.competition}</span>
        {aoVivo ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            AO VIVO
          </span>
        ) : (
          <span className="shrink-0 text-[10px] text-zinc-500">
            {encerrado ? 'Encerrado' : relativeLabel(match.startsAt)}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <Side name={match.home} logo={match.homeLogo} score={match.homeScore} winner={casaVenceu} />
        {match.away && <Side name={match.away} logo={match.awayLogo} score={match.awayScore} winner={foraVenceu} />}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-2.5">
        <span className="truncate text-[11px] text-zinc-500">
          {match.detail || formatEventDateLong(match.startsAt)}
          {match.venue && ` · ${match.venue}`}
        </span>
        {/* Jogo futuro: onde procurar ingresso. A agenda esportiva não vende,
            então é busca direcionada, não link de compra. */}
        {!encerrado && match.home && (
          <a
            href={ticketSearchForMatch(match.home, match.competition)[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            <Icon name="ticket" size={11} /> Ingressos
          </a>
        )}
        {match.highlightUrl && youtubeEmbed(match.highlightUrl) && (
          <button
            onClick={() => onPlay({ titulo: `${match.home} x ${match.away}`, url: match.highlightUrl!, externo: match.highlightUrl! })}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-100 transition hover:bg-emerald-500 hover:text-zinc-950"
          >
            <Icon name="play" size={11} /> Melhores momentos
          </button>
        )}
      </div>
    </article>
  );
}

function MatchGrid({ matches, onPlay, vazio }: { matches: Match[]; onPlay: (req: PlayRequest) => void; vazio: string }) {
  if (matches.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">{vazio}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} onPlay={onPlay} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hub
// ---------------------------------------------------------------------------

export default function SportsHub({ inicial = 'futebol' }: { inicial?: SportId }) {
  const [sport, setSport] = useState<SportId>(inicial);
  const [board, setBoard] = useState<Board | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [erro, setErro] = useState('');
  const [tocando, setTocando] = useState<PlayRequest | null>(null);
  const [aba, setAba] = useState<'agora' | 'proximos' | 'resultados'>('agora');

  const load = useCallback(async (s: SportId) => {
    setState('loading');
    setErro('');
    setTocando(null);
    try {
      const res = await fetch(`/api/esporte?modalidade=${s}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBoard(json);
      setState('ok');
      setAba(json.aoVivo?.length || json.hoje?.length ? 'agora' : 'proximos');
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar o quadro esportivo.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(sport);
  }, [sport, load]);

  const play = (req: PlayRequest) => {
    setTocando(req);
    if (typeof window !== 'undefined') {
      document.getElementById('player-esporte')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const modalidades = board?.modalidades ?? [];
  // Nenhuma competição da modalidade tem fonte de placar automático.
  const semPlacar = Boolean(board && board.competicoes.every((c) => !c.espnPath && !c.sportsdbLeague));

  return (
    <div className="space-y-8">
      {/* Modalidades */}
      <div className="flex flex-wrap gap-2">
        {(modalidades.length ? modalidades : []).map((m) => (
          <button
            key={m.id}
            onClick={() => setSport(m.id)}
            className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-semibold transition ${
              sport === m.id
                ? 'bg-emerald-500 text-zinc-950'
                : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-zinc-50'
            }`}
          >
            <Icon name={m.icon} size={14} /> {m.label}
          </button>
        ))}
      </div>

      {state === 'loading' && <p className="text-sm text-zinc-400">Carregando o placar…</p>}

      {state === 'error' && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/25 p-5 text-sm text-red-200">
          <p className="font-semibold">Não foi possível carregar o quadro.</p>
          <p className="mt-1 text-xs">{erro}</p>
          <button onClick={() => load(sport)} className="mt-3 rounded-xl border border-red-800 px-3 py-1.5 text-xs">
            Tentar de novo
          </button>
        </div>
      )}

      {state === 'ok' && board && (
        <>
          {/* Player */}
          <div id="player-esporte" className="scroll-mt-24">
            {tocando && <InlinePlayer req={tocando} onClose={() => setTocando(null)} />}
          </div>

          {/* Partidas */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`flex gap-2 ${semPlacar ? 'hidden' : ''}`}>
                {(
                  [
                    ['agora', `Agora e hoje${board.aoVivo.length ? ` (${board.aoVivo.length} ao vivo)` : ''}`],
                    ['proximos', `Próximos (${board.proximos.length})`],
                    ['resultados', `Resultados (${board.resultados.length})`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setAba(id)}
                    className={`rounded-2xl px-3.5 py-2 text-xs font-semibold transition ${
                      aba === id ? 'bg-zinc-100 text-zinc-950' : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-zinc-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => load(sport)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-200"
              >
                <Icon name="refresh" size={13} /> Atualizar
              </button>
            </div>

            {board.fonte !== 'live' && board.avisos.length > 0 && (
              <div className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-4 text-xs text-clay-200">
                <p className="mb-1 flex items-center gap-2 font-semibold">
                  <Icon name="alert" size={13} /> Placar parcialmente indisponível
                </p>
                {board.avisos.map((a) => (
                  <p key={a} className="text-[11px] leading-relaxed">
                    {a}
                  </p>
                ))}
                <p className="mt-1.5 text-[11px] text-clay-300/80">
                  As transmissões e o acervo abaixo continuam funcionando normalmente.
                </p>
              </div>
            )}

            {semPlacar ? (
              // Modalidades sem fonte automática de placar (esports, por
              // exemplo): dizer isso é mais honesto que uma grade vazia.
              <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center">
                <p className="text-sm text-zinc-300">Esta modalidade ainda não tem placar automático na plataforma.</p>
                <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-zinc-500">
                  Os campeonatos abaixo têm calendário e transmissão ao vivo gratuita nos canais oficiais — é por lá que
                  dá para acompanhar agora.
                </p>
              </div>
            ) : (
              <>
                {aba === 'agora' && (
                  <MatchGrid
                    matches={[...board.aoVivo, ...board.hoje]}
                    onPlay={play}
                    vazio="Nenhuma partida ao vivo ou marcada para hoje nesta modalidade."
                  />
                )}
                {aba === 'proximos' && (
                  <MatchGrid matches={board.proximos} onPlay={play} vazio="Nenhuma partida futura na agenda das fontes." />
                )}
                {aba === 'resultados' && (
                  <MatchGrid matches={board.resultados} onPlay={play} vazio="Nenhum resultado recente disponível." />
                )}
              </>
            )}
          </section>

          {/* Replays com melhores momentos */}
          {board.replays.length > 0 && (
            <section className="space-y-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
                  <Icon name="play" size={17} className="text-emerald-400" /> Replays e melhores momentos
                </h3>
                <p className="mt-0.5 text-sm text-zinc-400">Toque para assistir aqui mesmo, sem sair da plataforma.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {board.replays.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => play({ titulo: `${m.home} x ${m.away}`, url: m.highlightUrl!, externo: m.highlightUrl! })}
                    className="group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 text-left transition hover:border-emerald-800/60"
                  >
                    <span className="relative flex aspect-video items-center justify-center bg-zinc-950/70">
                      {m.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-zinc-100 transition group-hover:bg-black/20">
                        <Icon name="play" size={26} />
                      </span>
                    </span>
                    <span className="block p-3">
                      <span className="block truncate text-xs font-semibold text-zinc-100">
                        {m.home} {m.homeScore ?? ''} x {m.awayScore ?? ''} {m.away}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{m.competition}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Transmissões gratuitas */}
          <section className="space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
                <Icon name="broadcast" size={17} className="text-clay-300" /> Onde assistir de graça
              </h3>
              <p className="mt-0.5 text-sm text-zinc-400">
                Só canais oficiais do detentor dos direitos, que transmitem aberto e gratuito.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {board.transmissoes.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:border-emerald-800/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-sm font-semibold text-zinc-50">{b.label}</h4>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        b.kind === 'ao-vivo' ? 'bg-red-500/15 text-red-300' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {KIND_LABEL[b.kind]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{b.note}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {/* Canal com handle pode ter a transmissão embutida aqui. */}
                    {b.youtube && (
                      <button
                        onClick={() => play({ titulo: `${b.label} — ao vivo`, canal: b.youtube, externo: b.url })}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-100 transition hover:bg-emerald-500 hover:text-zinc-950"
                      >
                        <Icon name="play" size={11} /> Assistir aqui
                      </button>
                    )}
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                    >
                      {b.youtube ?? 'Abrir no site'} <Icon name="external" size={11} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lendas do dia */}
          <section className="space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
                <Icon name="trophy" size={17} className="text-clay-300" /> Craques históricos
              </h3>
              <p className="mt-0.5 text-sm text-zinc-400">
                A seleção muda todo dia. Toque para assistir aqui mesmo.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {board.lendas.map((l) => (
                <button
                  key={l.id}
                  onClick={() =>
                    play({ titulo: `${l.name} — melhores momentos`, busca: l.query, externo: youtubeSearch(l.query) })
                  }
                  className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-left transition hover:border-clay-700/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-zinc-50 group-hover:text-clay-300">{l.name}</h4>
                      <p className="truncate text-[11px] text-zinc-500">{l.era}</p>
                    </div>
                    <Icon name="play" size={14} className="shrink-0 text-zinc-600 group-hover:text-clay-300" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{l.note}</p>
                  <p className="mt-2 truncate text-[11px] text-zinc-600">{l.teams}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Competições cobertas */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-100">Competições acompanhadas</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {board.competicoes.map((c: Competition) => (
                <a
                  key={c.id}
                  href={c.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-[11px] text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                >
                  {c.label}
                </a>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
              Placar e agenda vêm da ESPN e do TheSportsDB, atualizados a cada poucos minutos. Nada é espelhado: os
              vídeos tocam pelo player oficial do YouTube, do próprio detentor dos direitos.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
