'use client';
import React from 'react';
import { ELEMENTOS, ELEMENTOS_ORDEM, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { MODOS_NOVOS, type ModoNovo } from '@/lib/jogos/arcanos/motor-grimorios';
import type { LobbyGrimorios } from '@/lib/jogos/arcanos/mesa-grimorios';
const BTN = 'rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white disabled:opacity-30';
export default function LobbyDosGrimorios({ lobby, eu, host, local, espectador, onElemento, onEquipe, onModo, onIniciar }: {
  lobby: LobbyGrimorios | null; eu: string; host: boolean; local: boolean; espectador: boolean;
  onElemento: (el: Elemento) => void; onEquipe: (n: number) => void; onModo: (m: ModoNovo) => void; onIniciar: () => void;
}) {
  const propria = lobby?.participantes.find(p => p.userId === eu);
  return <section className="mx-auto mt-8 max-w-3xl space-y-5 rounded-2xl border border-amber-100/30 bg-black/70 p-5">
    <h2 className="font-display text-2xl">{local ? 'Preparando os jogadores…' : 'Sala dos grimórios'}</h2>
    <p>Até seis jogadores. Cada elemento é exclusivo nesta sala.</p>
    {lobby && <>
      <div className="flex flex-wrap gap-3"><label>Modo de jogo<select aria-label="Modo de jogo" className="ml-2 rounded-lg bg-[#1c2937] p-2" value={lobby.modo} disabled={!host || local} onChange={v => onModo(v.target.value as ModoNovo)}>{Object.entries(MODOS_NOVOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label><span className="self-center text-amber-100">{lobby.participantes.length}/{lobby.capacidade} jogadores</span></div>
      <ul className="grid gap-2 sm:grid-cols-2">{lobby.participantes.map(p => <li key={p.userId} className="rounded-xl border p-3" style={{ borderColor: ELEMENTOS[p.elemento].clara + '88' }}><strong>{p.nome}</strong><span className="ml-2" style={{ color: ELEMENTOS[p.elemento].clara }}>{ELEMENTOS[p.elemento].nome}</span>{lobby.modo !== 'livre' && <span className="ml-2 text-sm text-amber-100">Time {(p.equipe ?? 0) + 1}</span>}</li>)}</ul>
      {!local && !espectador && <fieldset><legend className="mb-2">{propria ? 'Seu grimório · trocar elemento' : 'Escolha um grimório disponível'}</legend><div className="flex flex-wrap gap-2">{ELEMENTOS_ORDEM.map(el => { const ocupado = lobby.participantes.find(p => p.elemento === el && p.userId !== eu); return <button key={el} className={BTN} disabled={!!ocupado} aria-pressed={propria?.elemento === el} title={ocupado ? `Escolhido por ${ocupado.nome}` : ELEMENTOS[el].nome} onClick={() => onElemento(el)}>{ELEMENTOS[el].nome}{ocupado ? ' · ocupado' : ''}</button>; })}</div></fieldset>}
      {!local && propria && lobby.modo !== 'livre' && <label>Seu time<select aria-label="Seu time" className="ml-3 rounded-lg bg-[#1c2937] p-2" value={propria.equipe} onChange={v => onEquipe(Number(v.target.value))}>{Array.from({ length: lobby.modo === 'duplas' ? 3 : 2 }, (_, i) => <option key={i} value={i} disabled={propria.equipe !== i && lobby.participantes.filter(p => p.equipe === i).length >= (lobby.modo === 'duplas' ? 2 : 3)}>Time {i + 1}</option>)}</select></label>}
      {!local && host && <button className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-black disabled:opacity-40" disabled={lobby.modo === 'livre' ? lobby.participantes.length < 2 : lobby.participantes.length !== 6} onClick={onIniciar}>Iniciar partida</button>}
      {!local && !host && <p role="status">Aguardando o anfitrião iniciar a partida.</p>}
    </>}
  </section>;
}
