'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ArcanosGrimorios, { CardGrimorio, GaleriaGrimorios, RegrasGrimorios } from './ArcanosGrimorios';
import { ELEMENTOS, ELEMENTOS_ORDEM, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { MODOS_NOVOS, type ModoNovo } from '@/lib/jogos/arcanos/motor-grimorios';
import { personagensDoGrimorio } from '@/lib/jogos/arcanos/grimorios';
import { criarSalaLocal, iniciarRoboDosGrimorios, ROBOS_DOS_GRIMORIOS } from '@/lib/jogos/sala-local';

const EU = { userId: 'visitante-arcanos', nome: 'Você', avatar: null };
const BTN = 'rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20';
export default function ArcanosSolo() {
  const [elemento, setElemento] = useState<Elemento>('fogo');
  const [modo,setModo]=useState<ModoNovo>('livre'),[jogadores,setJogadores]=useState(2);
  const quantidade=modo==='livre'?jogadores:6;
  const [partida, setPartida] = useState(0), [jogando, setJogando] = useState(false);
  const [catalogo, setCatalogo] = useState(false), [regras, setRegras] = useState(false);
  const sala = useMemo(() => criarSalaLocal([EU, ...ROBOS_DOS_GRIMORIOS.slice(0,quantidade-1)]), [partida,quantidade]);
  const mesa = `arcanos-solo-${partida}`;
  useEffect(() => {
    if (!jogando) return;
    const livres=ELEMENTOS_ORDEM.filter(el=>el!==elemento);
    const parar=ROBOS_DOS_GRIMORIOS.slice(0,quantidade-1).map((r,i)=>iniciarRoboDosGrimorios(sala.get(r.userId)!,mesa,livres[i],r,EU.userId));
    return ()=>parar.forEach(f=>f());
  }, [jogando, sala, mesa, quantidade, elemento]);
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCatalogo(false); setRegras(false); } };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, []);
  return <main className="min-h-screen bg-[#090b14] pb-24 text-white">
    {jogando ? <ArcanosGrimorios key={partida} canal={sala.get(EU.userId)!} mesa={mesa} papel="host" eu={EU} elemento={elemento} modo={modo} jogadores={quantidade} local aoSair={() => setJogando(false)} aoRevanche={() => setPartida(n => n + 1)} /> :
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.25em] text-[#fde68a]">DRAP · Duelo dos elementos</p><h1 className="font-display text-4xl font-bold">Arcanos — os seis grimórios</h1></div><Link className={BTN} href="/comunidade?aba=jogos">Jogar com a comunidade</Link></div>
        <p className="max-w-3xl text-[#d4d4d8]">Escolha seu grimório e jogue com até cinco computadores. São 60 personagens exclusivos, com suas próprias habilidades, magias e feitiços. Vence quem mantém pelo menos um personagem vivo após eliminar todos os adversários.</p>
        <div className="flex flex-wrap gap-3"><button className={BTN} onClick={() => setCatalogo(true)}>Consultar todas as cartas</button><button className={BTN} onClick={() => setRegras(true)}>Ler as regras</button></div>
        <div className="flex flex-wrap gap-5 rounded-xl border border-white/20 p-4"><label>Modo de jogo<select aria-label="Modo de jogo" className="ml-2 rounded-lg bg-[#1c2937] p-2" value={modo} onChange={v=>setModo(v.target.value as ModoNovo)}>{Object.entries(MODOS_NOVOS).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label><label>Jogadores<select aria-label="Número de jogadores" className="ml-2 rounded-lg bg-[#1c2937] p-2" value={quantidade} disabled={modo!=='livre'} onChange={v=>setJogadores(Number(v.target.value))}>{[2,3,4,5,6].map(n=><option key={n} value={n}>{n} jogadores</option>)}</select></label><p className="text-sm text-[#d4d4d8]">Elementos exclusivos. Nos times, curas e escudos alcançam seus aliados.</p></div><fieldset><legend className="mb-4 text-lg font-semibold">Escolha seu grimório</legend><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{ELEMENTOS_ORDEM.map(el => <label key={el} className="cursor-pointer rounded-xl border p-2" style={{ borderColor: el === elemento ? ELEMENTOS[el].clara : '#ffffff30' }}><div className="mb-2 flex items-center gap-2"><input type="radio" name="elemento" checked={elemento === el} onChange={() => setElemento(el)} /><span>{ELEMENTOS[el].nome}</span></div><CardGrimorio c={personagensDoGrimorio(el)[0]} compacto /></label>)}</div></fieldset>
        <p className="text-sm text-[#d4d4d8]">Cada grimório: 10 personagens em campo · 48 magias/feitiços · 24 cartas de mana.</p>
        <div className="relative isolate overflow-hidden rounded-2xl border border-amber-100/25 p-6 sm:p-8"><Image src={`/jogos/arcanos/campos/${elemento}.png`} alt={`Campo de batalha do grimório de ${ELEMENTOS[elemento].nome}`} fill sizes="(max-width:640px) 100vw, 1200px" unoptimized className="-z-20 object-cover object-center" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/65 to-black/25" /><p className="mb-2 text-xs uppercase tracking-widest text-[#fde68a]">Seu campo de batalha · {ELEMENTOS[elemento].nome}</p><h2 className="font-display text-2xl font-bold">Seu exército está pronto</h2><p className="my-3 max-w-md text-sm text-[#e4e4e7]">Cartas na mão, decks separados, personagens em cartas completas no tabuleiro e fontes de mana. Escolha sua estratégia e entre na arena.</p><button className="rounded-xl bg-[#fcd34d] px-6 py-4 font-bold text-[#09090b] hover:bg-[#fde68a]" onClick={() => { setPartida(n => n + 1); setJogando(true); }}>Jogar contra o computador</button></div>
      </div>}
    {catalogo && <GaleriaGrimorios aoFechar={() => setCatalogo(false)} />}
    {regras && <div role="dialog" aria-modal="true" aria-label="Regras dos grimórios" className="fixed inset-0 z-[100] overflow-auto bg-[#090b14] p-5"><div className="mx-auto max-w-4xl"><div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold">Regras dos grimórios</h2><button className={BTN} onClick={() => setRegras(false)}>Fechar regras</button></div><RegrasGrimorios /></div></div>}
  </main>;
}
