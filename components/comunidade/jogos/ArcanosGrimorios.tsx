'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import CampoDeBatalha from './CampoDeBatalha';
import { CardGrimorio, GaleriaGrimorios, RegrasGrimorios } from './CartasGrimorios';
export { ArteGrimorio, CardGrimorio, GaleriaGrimorios, RegrasGrimorios } from './CartasGrimorios';
import { ehElemento, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { grimorioNovo, type CartaNova } from '@/lib/jogos/arcanos/grimorios';
import { aplicarNova, embaralharNovo, novaPartidaGrimorios, outroNovo, publicoNovo, type AcaoNova, type EstadoNovo, type LadoNovo, type ParticipanteNovo } from '@/lib/jogos/arcanos/motor-grimorios';
import type { CanalDeJogos } from '@/lib/jogos/sala-local';
import type { Mensagem } from '@/lib/jogos/canal';

interface Props { canal: CanalDeJogos; groupId?: string|null; mesa:string; papel:'host'|'desafiante'|'espectador'; eu:{userId:string;nome:string;avatar:string|null}; elemento?:Elemento; hostNome?:string; local?:boolean; aoSair:()=>void; aoRevanche?:()=>void; fecharRef?:React.MutableRefObject<(()=>void)|null> }
const BTN='rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20';

export default function ArcanosGrimorios({canal,mesa,papel,eu,elemento,hostNome,local=false,aoSair,aoRevanche,fecharRef}:Props) {
  const [e,setE]=useState<EstadoNovo|null>(null),[aviso,setAviso]=useState(''),[catalogo,setCatalogo]=useState(false),[regras,setRegras]=useState(false),[zoom,setZoom]=useState<CartaNova|null>(null),[selecionada,setSelecionada]=useState<{tipo:'carta'|'ataque';id:string}|null>(null),[agora,setAgora]=useState(Date.now());
  const ref=useRef<EstadoNovo|null>(null),oponente=useRef<string|null>(null),fila=useRef(new Map<number,AcaoNova>()),deadline=useRef(Date.now()+100000),reacaoDeadline=useRef(0),timeoutSeq=useRef(-1);
  const definir=useCallback((v:EstadoNovo)=> {
    if(ref.current?.turno!==v.turno) deadline.current=Date.now()+100000;
    if(v.pendente&&!ref.current?.pendente) reacaoDeadline.current=Date.now()+20000;
    ref.current=v;setE(v);setSelecionada(null);
  },[]);
  const iniciar=useCallback((ps:[ParticipanteNovo,ParticipanteNovo])=> {
    const i=ps.findIndex(p=>p.userId===eu.userId);if(i<0)return;
    const v=novaPartidaGrimorios(ps,i as LadoNovo,embaralharNovo(ps[i].elemento));definir(v);canal.enviar(mesa,'arc2:publico',{estado:publicoNovo(v)});
  },[eu.userId,canal.enviar,mesa,definir]);
  const jogar=useCallback((a:AcaoNova)=> {
    const atual=ref.current;if(!atual||atual.eu===null||a.lado!==atual.eu)return;
    const r=aplicarNova(atual,a);if(!r.ok){setAviso(r.erro);return;}
    setAviso('');definir(r.estado);canal.enviar(mesa,'arc2:acao',{seq:atual.seq,acao:a});canal.enviar(mesa,'arc2:publico',{estado:publicoNovo(r.estado)});
  },[canal.enviar,mesa,definir]);
  const sair=useCallback(()=>{const atual=ref.current;if(atual&&atual.eu!==null&&atual.vencedor===null)jogar({t:'desistir',lado:atual.eu});void canal.anunciar(null);aoSair();},[jogar,canal.anunciar,aoSair]);
  useEffect(()=>{if(fecharRef)fecharRef.current=sair;return()=>{if(fecharRef)fecharRef.current=null;};},[fecharRef,sair]);
  useEffect(()=> {
    if(papel==='host'&&elemento) void canal.anunciar({id:mesa,jogo:'arcanos',host:eu.userId,hostNome:eu.nome,estado:'aberta',jogadores:[eu.userId],detalhe:grimorioNovo(elemento).nome});
    const chamar=()=>{if(!ref.current){if(papel==='desafiante'&&elemento)canal.enviar(mesa,'arc2:aceitar',{nome:eu.nome,elemento});if(papel==='espectador')canal.enviar(mesa,'arc2:pedir');}};
    const off=canal.ouvir((m:Mensagem)=> {
      if(m.mesa!==mesa)return;const atual=ref.current;
      if(m.tipo==='arc2:aceitar'&&papel==='host'&&elemento&&!atual&&ehElemento(m.elemento)&&m.de!==eu.userId) {
        if(oponente.current&&oponente.current!==m.de)return;oponente.current=m.de;
        const a:ParticipanteNovo={userId:eu.userId,nome:eu.nome,elemento},b:ParticipanteNovo={userId:m.de,nome:String(m.nome??'Desafiante').slice(0,40),elemento:m.elemento};
        const ps:[ParticipanteNovo,ParticipanteNovo]=Math.random()<.5?[a,b]:[b,a];canal.enviar(mesa,'arc2:inicio',{participantes:ps});iniciar(ps);
        void canal.anunciar({id:mesa,jogo:'arcanos',host:eu.userId,hostNome:eu.nome,estado:'jogando',jogadores:[eu.userId,m.de],detalhe:`${eu.nome} × ${b.nome}`});
      } else if(m.tipo==='arc2:inicio'&&papel==='desafiante'&&!atual) {
        const ps=m.participantes as [ParticipanteNovo,ParticipanteNovo];if(!Array.isArray(ps)||ps.length!==2||!ps.every(p=>p&&ehElemento(p.elemento))||!ps.some(p=>p.userId===eu.userId)||!ps.some(p=>p.userId===m.de))return;
        oponente.current=m.de;iniciar(ps);
      } else if(m.tipo==='arc2:acao'&&atual&&atual.eu!==null) {
        const a=m.acao as AcaoNova,seq=Number(m.seq);if(!a||a.lado!==outroNovo(atual.eu)||m.de!==atual.jogadores[a.lado].userId||!Number.isInteger(seq)||seq<atual.seq||seq>atual.seq+30)return;
        fila.current.set(seq,a);let next=atual;
        while(fila.current.has(next.seq)){const acao=fila.current.get(next.seq)!;fila.current.delete(next.seq);const r=aplicarNova(next,acao);if(!r.ok){setAviso('A jogada recebida não pôde ser validada. Saia e abra uma nova mesa.');break;}next=r.estado;}
        if(next!==atual){definir(next);canal.enviar(mesa,'arc2:publico',{estado:publicoNovo(next)});}
      } else if(m.tipo==='arc2:publico'&&papel==='espectador') {
        const v=m.estado as EstadoNovo;if(v?.versao===2&&(!atual||v.seq>atual.seq)&&v.jogadores.some(j=>j.userId===m.de))definir(publicoNovo(v));
      } else if(m.tipo==='arc2:pedir'&&atual&&atual.eu!==null)canal.enviar(mesa,'arc2:publico',{estado:publicoNovo(atual)});
    });
    chamar();const t=setInterval(chamar,4000);return()=>{off();clearInterval(t);};
  },[canal.ouvir,canal.enviar,canal.anunciar,mesa,papel,elemento,eu.userId,eu.nome,iniciar,definir]);
  useEffect(()=>{const t=setInterval(()=>setAgora(Date.now()),500);return()=>clearInterval(t);},[]);
  useEffect(()=> {
    const v=ref.current;if(!v||v.eu===null||v.vencedor!==null)return;
    if(v.pendente&&v.eu===outroNovo(v.pendente.lado)&&agora>=reacaoDeadline.current&&timeoutSeq.current!==v.seq){timeoutSeq.current=v.seq;jogar({t:'resolver',lado:v.eu});}
    else if(!v.pendente&&v.eu===v.ativo&&agora>=deadline.current&&timeoutSeq.current!==v.seq){timeoutSeq.current=v.seq;
      const j=v.jogadores[v.eu];if(!j.comprou&&(j.baralhoQtd||j.reservaQtd))jogar({t:'comprar',lado:v.eu,pilha:j.baralhoQtd?'magia':'mana'});else jogar({t:'passar',lado:v.eu});
    }
  },[agora,jogar]);
  const alvoEscolhido=useCallback((id:string)=> {
    if(!e||e.eu===null||!selecionada)return;
    if(selecionada.tipo==='ataque')jogar({t:'atacar',lado:e.eu,atacante:selecionada.id,alvo:id});
    else jogar({t:'jogar',lado:e.eu,carta:selecionada.id,alvo:id});
  },[e,selecionada,jogar]);
  useEffect(()=> {
    const fechar=(evento:KeyboardEvent)=> {if(evento.key==='Escape'){setCatalogo(false);setZoom(null);setRegras(false);setSelecionada(null);setAviso('');}};
    document.addEventListener('keydown',fechar);return()=>document.removeEventListener('keydown',fechar);
  },[]);
  const segundos=Math.max(0,Math.min(e?.pendente?20:100,Math.ceil(((e?.pendente?reacaoDeadline.current:deadline.current)-agora)/1000)));
  return <div className="h-full overflow-y-auto text-white">
    {e?<CampoDeBatalha estado={e} selecionada={selecionada} segundos={segundos} onJogar={jogar} onSelecionar={setSelecionada} onAlvo={alvoEscolhido} onInspecionar={setZoom} onAviso={setAviso} onCartas={()=>setCatalogo(true)} onRegras={()=>setRegras(true)} onSair={sair} onRevanche={aoRevanche}/>:<div className="min-h-[500px] bg-cover bg-center p-6" style={{backgroundImage:'linear-gradient(#07101999,#071019dd),url(/jogos/arcanos/campos/'+(elemento??'fogo')+'.png)'}}><header className="flex justify-between gap-3"><h1 className="font-display text-xl">Arcanos · Campo de batalha</h1><div className="flex gap-2"><button className={BTN} onClick={()=>setCatalogo(true)}>Cartas</button><button className={BTN} onClick={()=>setRegras(true)}>Regras</button><button className={BTN} onClick={sair}>Sair</button></div></header><div role="status" className="mx-auto mt-32 max-w-lg rounded-2xl border border-amber-100/30 bg-black/60 p-7 text-center"><p>{papel==='host'?(local?'Preparando o adversário…':'Esperando alguém aceitar o duelo…'):papel==='desafiante'?'Chamando '+(hostNome??'o anfitrião')+'…':'Entrando para assistir…'}</p><p className="mt-3 text-sm text-[#d3dee6]">Explore os personagens e suas habilidades no catálogo de cartas.</p></div></div>}
    {aviso&&<p role="status" className="fixed bottom-3 left-3 right-3 z-[80] mx-auto max-w-2xl rounded-xl border border-amber-300/40 bg-[#302515] px-4 py-3 text-sm text-[#fef3c7] shadow-xl">{aviso}</p>}
    {catalogo&&<GaleriaGrimorios aoFechar={()=>setCatalogo(false)}/>}
    {(zoom||regras)&&<div className="fixed inset-0 z-[110] flex items-start justify-center overflow-auto bg-black/90 p-5" role="dialog" aria-modal="true" aria-label={zoom?.nome??'Regras dos grimórios'}><div className={zoom?'w-full max-w-sm':'w-full max-w-3xl'}><button className={BTN+' mb-3'} onClick={()=>{setZoom(null);setRegras(false);}}>Fechar</button>{zoom?<CardGrimorio c={zoom}/>:<RegrasGrimorios/>}</div></div>}
  </div>;
}
