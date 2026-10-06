'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import CampoDeBatalha from './CampoDeBatalha';
import MiniaturaEmDetalhe from './MiniaturaEmDetalhe';
import { CardGrimorio, GaleriaGrimorios, RegrasGrimorios } from './CartasGrimorios';
export { ArteGrimorio, CardGrimorio, GaleriaGrimorios, RegrasGrimorios } from './CartasGrimorios';
import { type Elemento } from '@/lib/jogos/arcanos/cartas';
import { type CartaNova } from '@/lib/jogos/arcanos/grimorios';
import { type AcaoNova, type EstadoNovo } from '@/lib/jogos/arcanos/motor-grimorios';
import type { CanalDeJogos } from '@/lib/jogos/sala-local';
import { criarMesaGrimorios, type LobbyGrimorios } from '@/lib/jogos/arcanos/mesa-grimorios';
import type { ModoNovo } from '@/lib/jogos/arcanos/motor-grimorios';
import LobbyDosGrimorios from './LobbyDosGrimorios';

interface Props { canal: CanalDeJogos; groupId?: string|null; mesa:string; papel:'host'|'desafiante'|'espectador'; eu:{userId:string;nome:string;avatar:string|null}; elemento?:Elemento; hostNome?:string; hostId?:string; modo?:ModoNovo; jogadores?:number; local?:boolean; aoSair:()=>void; aoRevanche?:()=>void; fecharRef?:React.MutableRefObject<(()=>void)|null> }
const BTN='rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20';

export default function ArcanosGrimorios({canal,mesa,papel,eu,elemento,hostNome,hostId,modo='livre',jogadores=2,local=false,aoSair,aoRevanche,fecharRef}:Props) {
  const [lobby,setLobby]=useState<LobbyGrimorios|null>(null);
  const controle=useRef<ReturnType<typeof criarMesaGrimorios>|null>(null);
  const [e,setE]=useState<EstadoNovo|null>(null),[aviso,setAviso]=useState(''),[catalogo,setCatalogo]=useState(false),[regras,setRegras]=useState(false),[zoom,setZoom]=useState<CartaNova|null>(null),[selecionada,setSelecionada]=useState<{tipo:'carta'|'ataque';id:string}|null>(null),[agora,setAgora]=useState(Date.now());
  const ref=useRef<EstadoNovo|null>(null),deadline=useRef(Date.now()+100000),reacaoDeadline=useRef(0),timeoutSeq=useRef(-1);
  const definir=useCallback((v:EstadoNovo)=> {
    if(ref.current?.turno!==v.turno) deadline.current=Date.now()+100000;
    if(v.pendente&&!ref.current?.pendente) reacaoDeadline.current=Date.now()+20000;
    ref.current=v;setE(v);setSelecionada(null);
  },[]);
  const jogar=useCallback((a:AcaoNova)=>controle.current?.jogar(a),[]);
  const sair=useCallback(()=>{const atual=ref.current;if(atual&&atual.eu!==null&&atual.vencedor===null&&atual.jogadores[atual.eu].campo.length)jogar({t:'desistir',lado:atual.eu});void canal.anunciar(null);aoSair();},[jogar,canal.anunciar,aoSair]);
  useEffect(()=>{if(fecharRef)fecharRef.current=sair;return()=>{if(fecharRef)fecharRef.current=null;};},[fecharRef,sair]);
  const host=papel==='host'?eu.userId:hostId??canal.mesas.find(m=>m.id===mesa)?.host??'';
  useEffect(()=> {
    if(!host){setAviso('Não foi possível identificar o anfitrião desta mesa.');return;}
    const c=criarMesaGrimorios({canal,mesa,eu,host,elemento,modo,capacidade:local?jogadores:6,espectador:papel==='espectador',onEstado:definir,onAviso:setAviso,onLobby:setLobby});
    controle.current=c;return()=>{c.fechar();controle.current=null;};
  },[canal.ouvir,canal.enviar,canal.anunciar,mesa,eu.userId,eu.nome,host,elemento,local,modo,jogadores,papel,definir]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(local&&papel==='host'&&lobby&&!lobby.iniciada&&lobby.participantes.length===lobby.capacidade)controle.current?.iniciar();},[local,papel,lobby]);
  useEffect(()=>{const t=setInterval(()=>setAgora(Date.now()),500);return()=>clearInterval(t);},[]);
  useEffect(()=> {
    const v=ref.current;if(!v||v.vencedor!==null)return;
    if(agora>=(v.pendente?reacaoDeadline.current:deadline.current)&&timeoutSeq.current!==v.seq){timeoutSeq.current=v.seq;controle.current?.resolverPrazo();}
  },[agora,papel]);
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
    {e?<CampoDeBatalha estado={e} selecionada={selecionada} segundos={segundos} onJogar={jogar} onSelecionar={setSelecionada} onAlvo={alvoEscolhido} onInspecionar={setZoom} onAviso={setAviso} onCartas={()=>setCatalogo(true)} onRegras={()=>setRegras(true)} onSair={sair} onRevanche={aoRevanche}/>:<div className="min-h-[500px] bg-cover bg-center p-6" style={{backgroundImage:'linear-gradient(#07101999,#071019dd),url(/jogos/arcanos/campos/'+(elemento??'fogo')+'.png)'}}><header className="flex justify-between gap-3"><h1 className="font-display text-xl">Arcanos · Campo de batalha</h1><div className="flex gap-2"><button className={BTN} onClick={()=>setCatalogo(true)}>Cartas</button><button className={BTN} onClick={()=>setRegras(true)}>Regras</button><button className={BTN} onClick={sair}>Sair</button></div></header><LobbyDosGrimorios lobby={lobby} eu={eu.userId} host={papel==='host'} local={local} espectador={papel==='espectador'} onElemento={el=>controle.current?.escolher(el)} onEquipe={n=>controle.current?.equipe(n)} onModo={m=>controle.current?.configurar(m,6)} onIniciar={()=>controle.current?.iniciar()}/></div>}
    {aviso&&<p role="status" className="fixed bottom-3 left-3 right-3 z-[80] mx-auto max-w-2xl rounded-xl border border-amber-300/40 bg-[#302515] px-4 py-3 text-sm text-[#fef3c7] shadow-xl">{aviso}</p>}
    {catalogo&&<GaleriaGrimorios aoFechar={()=>setCatalogo(false)}/>}
    {(zoom||regras)&&<div className="fixed inset-0 z-[110] flex items-start justify-center overflow-auto bg-black/90 p-5" role="dialog" aria-modal="true" aria-label={zoom?.nome??'Regras dos grimórios'}><div className={zoom?.tipo==='personagem'?'w-full max-w-3xl':zoom?'w-full max-w-sm':'w-full max-w-3xl'}><button className={BTN+' mb-3'} onClick={()=>{setZoom(null);setRegras(false);}}>Fechar</button>{zoom?<div className={zoom.tipo==='personagem'?'grid gap-5 sm:grid-cols-2':''}><CardGrimorio c={zoom}/>{zoom.tipo==='personagem'&&<MiniaturaEmDetalhe carta={zoom}/>}</div>:<RegrasGrimorios/>}</div></div>}
  </div>;
}
