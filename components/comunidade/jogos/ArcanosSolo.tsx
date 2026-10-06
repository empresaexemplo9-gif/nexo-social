'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ArcanosGrimorios, { CardGrimorio, GaleriaGrimorios, RegrasGrimorios } from './ArcanosGrimorios';
import { ELEMENTOS, ELEMENTOS_ORDEM, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { personagensDoGrimorio } from '@/lib/jogos/arcanos/grimorios';
import { criarSalaLocal, iniciarRoboDosGrimorios, ROBO_DO_ARCANOS } from '@/lib/jogos/sala-local';

const EU = { userId: 'visitante-arcanos', nome: 'Você', avatar: null };
const BTN = 'rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20';
export default function ArcanosSolo() {
  const [elemento, setElemento] = useState<Elemento>('fogo');
  const [partida, setPartida] = useState(0), [jogando, setJogando] = useState(false);
  const [catalogo, setCatalogo] = useState(false), [regras, setRegras] = useState(false);
  const sala = useMemo(() => criarSalaLocal([EU, ROBO_DO_ARCANOS]), [partida]);
  const mesa = `arcanos-solo-${partida}`;
  useEffect(() => {
    if (!jogando) return;
    return iniciarRoboDosGrimorios(sala.get(ROBO_DO_ARCANOS.userId)!, mesa);
  }, [jogando, sala, mesa]);
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCatalogo(false); setRegras(false); } };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, []);
  return <main className="min-h-screen bg-[#090b14] pb-24 text-white">
    {jogando ? <ArcanosGrimorios key={partida} canal={sala.get(EU.userId)!} mesa={mesa} papel="host" eu={EU} elemento={elemento} local aoSair={() => setJogando(false)} aoRevanche={() => setPartida(n => n + 1)} /> :
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.25em] text-amber-200">DRAP · Duelo dos elementos</p><h1 className="font-display text-4xl font-bold">Arcanos — os seis grimórios</h1></div><Link className={BTN} href="/comunidade?aba=jogos">Jogar com a comunidade</Link></div>
        <p className="max-w-3xl text-zinc-300">Escolha seu grimório e enfrente o Mestre Arcano. São 60 personagens exclusivos, com suas próprias habilidades, magias e feitiços. Vence quem mantém pelo menos um personagem vivo após eliminar todos os adversários.</p>
        <div className="flex flex-wrap gap-3"><button className={BTN} onClick={() => setCatalogo(true)}>Consultar todas as cartas</button><button className={BTN} onClick={() => setRegras(true)}>Ler as regras</button></div>
        <fieldset><legend className="mb-4 text-lg font-semibold">Escolha seu grimório</legend><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{ELEMENTOS_ORDEM.map(el => <label key={el} className="cursor-pointer rounded-xl border p-2" style={{ borderColor: el === elemento ? ELEMENTOS[el].clara : '#ffffff30' }}><div className="mb-2 flex items-center gap-2"><input type="radio" name="elemento" checked={elemento === el} onChange={() => setElemento(el)} /><span>{ELEMENTOS[el].nome}</span></div><CardGrimorio c={personagensDoGrimorio(el)[0]} compacto /></label>)}</div></fieldset>
        <p className="text-sm text-zinc-300">Cada grimório: 10 personagens em campo · 48 magias/feitiços · 24 cartas de mana.</p>
        <button className="rounded-xl bg-amber-300 px-6 py-4 font-bold text-zinc-950 hover:bg-amber-200" onClick={() => { setPartida(n => n + 1); setJogando(true); }}>Jogar contra o computador</button>
      </div>}
    {catalogo && <GaleriaGrimorios aoFechar={() => setCatalogo(false)} />}
    {regras && <div role="dialog" aria-modal="true" aria-label="Regras dos grimórios" className="fixed inset-0 z-[100] overflow-auto bg-[#090b14] p-5"><div className="mx-auto max-w-4xl"><div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold">Regras dos grimórios</h2><button className={BTN} onClick={() => setRegras(false)}>Fechar regras</button></div><RegrasGrimorios /></div></div>}
  </main>;
}
