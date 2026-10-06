'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ELEMENTOS, ELEMENTOS_ORDEM, ehElemento, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { CARTAS_NOVAS, GRIMORIOS, GLOSSARIO_NOVO, cartaNova, grimorioNovo, type CartaNova } from '@/lib/jogos/arcanos/grimorios';
import { aplicarNova, alvosNovos, alvosAtaqueNovo, combatente, embaralharNovo, manaLivreNova, novaPartidaGrimorios, outroNovo, podeAtaqueNovo, podeCartaNova, publicoNovo, type AcaoNova, type Combatente, type EstadoNovo, type LadoNovo, type ParticipanteNovo } from '@/lib/jogos/arcanos/motor-grimorios';
import type { CanalDeJogos } from '@/lib/jogos/sala-local';
import type { Mensagem } from '@/lib/jogos/canal';

interface Props { canal: CanalDeJogos; groupId?: string|null; mesa:string; papel:'host'|'desafiante'|'espectador'; eu:{userId:string;nome:string;avatar:string|null}; elemento?:Elemento; hostNome?:string; local?:boolean; aoSair:()=>void; aoRevanche?:()=>void; fecharRef?:React.MutableRefObject<(()=>void)|null> }
const BTN='rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35';
const NOMES: Record<string,string>={personagem:'Personagem',magia:'Magia',feitico:'Feitiço',mana:'Mana',tank:'Tank',mago:'Mago',suporte:'Suporte',guerreiro:'Guerreiro',arqueiro:'Arqueiro'};

export function ArteGrimorio({c,altura,prioridade=false}:{c:CartaNova;altura?:number;prioridade?:boolean}) {
  const a=c.arte, cols=a.colunas??1,rows=a.linhas??1,pos=a.posicao??0;
  return <div className="relative overflow-hidden bg-black/30" style={{height:altura}}><div className="relative w-full" style={{aspectRatio:a.proporcao??2/3}}>
    <Image src={a.src} alt={c.nome} width={1024} height={1536} priority={prioridade} loading={prioridade?undefined:'lazy'} unoptimized sizes="(max-width:640px) 180px, 280px" style={{position:'absolute',maxWidth:'none',width:`${cols*100}%`,height:`${rows*100}%`,left:`-${pos%cols*100}%`,top:`-${Math.floor(pos/cols)*100}%`,objectFit:'fill'}} />
  </div></div>;
}
export function CardGrimorio({c,compacto=false}:{c:CartaNova;compacto?:boolean}) {
  const cor=ELEMENTOS[c.elemento];
  return <article className="overflow-hidden rounded-xl border text-left shadow-lg" style={{borderColor:cor.clara+'88',background:`linear-gradient(155deg,${cor.escura},#0b0b13)`}}>
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide" style={{color:cor.clara}}><span>{NOMES[c.tipo]}{c.funcao?` · ${NOMES[c.funcao]}`:''}</span><span>{c.tipo==='mana'?`${c.cargas} mana`:c.tipo==='personagem'?`${c.ataque} ATQ · ${c.vida} VIDA`:`${c.custo} mana`}</span></div>
    <ArteGrimorio c={c} altura={compacto?115:250} />
    <div className="space-y-2 p-3"><h3 className="font-display text-sm font-bold text-white">{c.nome}</h3>
      {c.conjurador&&<p className="text-[11px]" style={{color:cor.clara}}>Conjurador: {cartaNova(c.conjurador).nome.split(',')[0]}</p>}
      {c.especial&&<p className="text-xs font-bold text-[#fde68a]">{c.especial.nome}</p>}
      <p className="text-xs leading-relaxed text-[#e4e4e7]">{c.texto}</p>
      {!compacto&&<p className="text-[11px] text-[#a1a1aa]">{c.copias} cópia(s){c.reacao?' · Pode reagir antes do dano':''}</p>}
    </div>
  </article>;
}
export function GaleriaGrimorios({aoFechar}:{aoFechar:()=>void}) {
  const [el,setEl]=useState<Elemento>('fogo'),[tipo,setTipo]=useState('todos'),[funcao,setFuncao]=useState('todos'),[conjurador,setConjurador]=useState('todos');
  const g=grimorioNovo(el);const personagens=g.cartas.filter(c=>c.tipo==='personagem');
  const cartas=g.cartas.filter(c=>(tipo==='todos'||c.tipo===tipo)&&(funcao==='todos'||c.funcao===funcao||c.conjurador&&cartaNova(c.conjurador).funcao===funcao)&&(conjurador==='todos'||c.id===conjurador||c.conjurador===conjurador));
  return <div className="fixed inset-0 z-[100] overflow-auto bg-[#090b14] p-4 text-white sm:p-6" role="dialog" aria-modal="true" aria-label="Os seis grimórios">
    <div className="mx-auto max-w-7xl"><div className="sticky top-0 z-10 mb-5 rounded-2xl border border-white/10 bg-[#121522]/95 p-4 backdrop-blur"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.25em] text-[#fde68a]">DRAP · Arcanos</p><h2 className="font-display text-2xl font-bold">Os seis grimórios</h2></div><button className={BTN} onClick={aoFechar}>Fechar catálogo</button></div>
      <div className="my-3 flex flex-wrap gap-2">{ELEMENTOS_ORDEM.map(e=><button key={e} className={BTN} style={{borderColor:el===e?ELEMENTOS[e].clara:undefined,background:el===e?ELEMENTOS[e].escura:undefined}} aria-pressed={el===e} onClick={()=>{setEl(e);setConjurador('todos');}}>{ELEMENTOS[e].nome}</button>)}</div>
      <p className="text-sm text-[#d4d4d8]">{g.nome}. {g.estrategia}</p><p className="mt-1 text-xs text-[#a1a1aa]">10 personagens · 48 magias/feitiços · 24 cartas de mana · 44 títulos distintos</p>
      <div className="mt-3 flex flex-wrap gap-2">{[['Tipo',tipo,setTipo,[['todos','Todos'],...['personagem','magia','feitico','mana'].map(t=>[t,NOMES[t]])]],['Função',funcao,setFuncao,[['todos','Todas'],...['tank','mago','suporte','guerreiro','arqueiro'].map(t=>[t,NOMES[t]])]],['Conjurador',conjurador,setConjurador,[['todos','Todos'],...personagens.map(c=>[c.id,c.nome.split(',')[0]])]]].map(([label,value,set,opts])=><label key={String(label)} className="text-xs text-[#d4d4d8]">{String(label)}<select className="ml-2 rounded-lg border border-white/20 bg-[#1b2033] p-2" aria-label={String(label)} value={String(value)} onChange={e=>(set as (v:string)=>void)(e.target.value)}>{(opts as string[][]).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>)}<span className="self-center text-xs text-[#a1a1aa]">{cartas.length} cartas</span></div>
    </div><div className="grid grid-cols-1 gap-4 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{cartas.map(c=><CardGrimorio key={c.id} c={c}/>)}</div></div>
  </div>;
}
export function RegrasGrimorios() {
  return <div className="space-y-4 text-sm leading-relaxed text-[#e4e4e7]">
    <p>Escolha um elemento. Os <b>dez personagens únicos começam no campo</b>, com a vida indicada em cada carta. Suportes têm 8 de vida, tanks 15 e as demais funções ficam entre esses valores. Vence quem elimina todos os personagens adversários e mantém pelo menos um vivo.</p>
    <p><b>Duas pilhas:</b> 48 magias/feitiços e 24 manas (16 de uma carga e 8 de duas). A mão inicial contém cinco magias/feitiços e duas manas. Em <b>cada turno compre apenas uma carta</b>, escolhendo entre as duas pilhas.</p>
    <p><b>Mana:</b> depois de comprar, coloque no máximo uma mana na fonte por turno. Ela fornece uma ou duas cargas; a fonte comporta 12. Custos usam as cargas disponíveis e elas se renovam no início do seu turno. Mana gasta em reações também fica indisponível até essa renovação.</p>
    <p><b>Conjuração exclusiva:</b> cada magia/feitiço exige seu personagem vivo e livre de atordoamento ou congelamento, a carta na mão e mana suficiente. A carta informa custo, efeitos e conjurador. Não existe custo adicional do personagem.</p>
    <p><b>Ataques:</b> até dois ataques básicos por turno, de personagens diferentes. Tanks vivos protegem os aliados dos ataques básicos; magias/feitiços podem alcançar qualquer alvo indicado. O ataque básico não é somado ao dano do feitiço. Cada golpe fica entre 1 e 6; bônus nunca ultrapassam 6. Reduções podem anular o dano.</p>
    <p><b>Reação:</b> depois da declaração e antes do dano, o defensor pode conjurar escudos com seus suportes, inclusive fora do próprio turno. Depois, escolha “Aplicar golpe”. Se não houver resposta em 20 segundos, o golpe é resolvido. Ataques já declarados mantêm suas condições iniciais.</p>
    <p><b>Escudo:</b> permanece até ser consumido e acumula até 6 pontos. Dano 3 contra escudo 2 retira os dois pontos de escudo e 1 de vida. Um personagem só morre com vida zero; cura não supera o máximo e não ressuscita. Perder um personagem inutiliza suas cartas restantes.</p>
    <p><b>Habilidades especiais:</b> cada personagem tem um efeito exclusivo impresso na carta. O texto distingue primeiro uso na partida e uma vez por turno. Efeitos de controle não se acumulam; atordoamento/congelamento não renovam um controle já ativo. Após recuperar-se, o personagem recebe Tenacidade.</p>
    <p><b>Grupos:</b> efeitos coletivos alcançam no máximo três personagens, conforme a carta. A ordem do campo desempata alvos igualmente feridos. Se as pilhas acabarem, ataques e cartas já na mão continuam disponíveis.</p>
    <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(GLOSSARIO_NOVO).map(([n,t])=><div key={n} className="rounded-xl bg-white/5 p-3"><dt className="mb-1 font-bold capitalize text-[#fde68a]">{n}</dt><dd>{t}</dd></div>)}</dl>
  </div>;
}

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
  const lado=e?.eu??0,meu=e?.jogadores[lado],rival=e?.jogadores[outroNovo(lado)],vez=e?.eu!==null&&e?.ativo===lado&&!e?.pendente;
  const alvoEscolhido=(id:string)=> {
    if(!e||e.eu===null||!selecionada)return;
    if(selecionada.tipo==='ataque')jogar({t:'atacar',lado:e.eu,atacante:selecionada.id,alvo:id});
    else jogar({t:'jogar',lado:e.eu,carta:selecionada.id,alvo:id});
  };
  const campo=(ps:Combatente[],aliado:boolean)=> <div className="grid min-w-[370px] grid-cols-5 gap-2">{ps.map(p=> {
    const c=cartaNova(p.carta);const escolhido=selecionada?.id===p.id;
    const alvo=!!e&&!!selecionada&&(selecionada.tipo==='ataque'?alvosAtaqueNovo(e,lado).includes(p.id):alvosNovos(e,lado,cartaNova(selecionada.id)).includes(p.id));
    return <article key={p.id} className="relative overflow-hidden rounded-xl border bg-[#111827]" style={{borderColor:escolhido?'#ffdc77':alvo?'#90ffd3':ELEMENTOS[c.elemento].cor+'88',boxShadow:alvo?'0 0 12px #90ffd344':undefined}}>
      <button className="block w-full text-left" aria-label={`${c.nome.split(',')[0]}, vida ${p.vida}, escudo ${p.escudo}${alvo?', escolher alvo':''}`} onClick={()=>{if(alvo)alvoEscolhido(p.id);else if(aliado&&e&&e.eu!==null&&podeAtaqueNovo(e,p)){setSelecionada({tipo:'ataque',id:p.id});setAviso('Escolha um tank inimigo para o ataque básico.');}else setZoom(c);}}>
        <ArteGrimorio c={c} altura={95}/><div className="px-1.5 py-1"><p className="truncate text-xs font-bold">{c.nome.split(',')[0]}</p><p className="flex justify-between text-[11px]"><span className="text-[#fecdd3]">♥ {p.vida}/{p.maxima}</span><span className="text-[#a5f3fc]">◇ {p.escudo}</span></p><p className="text-[10px] text-[#a1a1aa]">ATQ {c.ataque}{p.atacou?' · usado':''}</p></div>
      </button><button className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-xs" aria-label={`Ver carta de ${c.nome.split(',')[0]}`} onClick={()=>setZoom(c)}>ⓘ</button>
      {p.efeitos.length>0&&<div className="flex flex-wrap gap-1 px-1 pb-1">{p.efeitos.map(s=><span key={s.tipo} title={GLOSSARIO_NOVO[s.tipo]} className="rounded bg-[#4c1d95]/70 px-1 text-[8px]">{s.tipo}</span>)}</div>}
    </article>;
  })}</div>;
  return <div className="h-full overflow-y-auto bg-[radial-gradient(ellipse_at_top,#28313d,#0a0912_65%)] p-3 text-white sm:p-5">
    <div className="mx-auto max-w-6xl"><header className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs uppercase tracking-[.2em] text-[#fde68a]">DRAP · Arcanos</p><h1 className="font-display text-xl font-bold">Duelo dos seis grimórios</h1></div><div className="flex gap-2"><button className={BTN} onClick={()=>setCatalogo(true)}>Cartas</button><button className={BTN} onClick={()=>setRegras(true)}>Regras</button><button className={BTN} onClick={sair}>Sair</button></div></header>
    {!e?<div className="rounded-2xl border border-white/20 p-8 text-center"><p>{papel==='host'?(local?'Preparando o adversário…':'Esperando alguém aceitar o duelo…'):papel==='desafiante'?`Chamando ${hostNome??'o anfitrião'}…`:'Entrando para assistir…'}</p><p className="mt-3 text-sm text-[#a1a1aa]">Explore os personagens e suas habilidades no catálogo de cartas.</p></div>:<>
      <section className="mb-3 rounded-xl border border-white/10 bg-black/30 p-3"><div className="flex flex-wrap justify-between gap-2"><b>{rival!.nome} · {ELEMENTOS[rival!.elemento].nome}</b><span className="text-xs text-[#d4d4d8]">{rival!.campo.length} vivos · Mana {manaLivreNova(rival!)}/{rival!.fonte} · {rival!.maoQtd} cartas · {rival!.maoManaQtd} manas na mão</span></div><div className="mt-3 overflow-x-auto">{campo(rival!.campo,false)}</div></section>
      <div className="my-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100/20 bg-[#211c25] p-3"><p className="font-bold text-[#fef3c7]">{e.vencedor!==null?e.vencedor==='empate'?'Empate':`${e.jogadores[e.vencedor].nome} venceu`:e.pendente?`Reação ao golpe de ${e.pendente.dano} pontos`:`Turno ${e.turno} · ${e.jogadores[e.ativo].nome}`}<span className="ml-2 text-xs font-normal text-[#a1a1aa]">{e.vencedor===null?e.pendente?`${Math.max(0,Math.ceil((reacaoDeadline.current-agora)/1000))}s para reagir`:`${Math.max(0,Math.ceil((deadline.current-agora)/1000))}s`:''}</span></p>
        {e.eu!==null&&e.vencedor===null&&(e.pendente?<button className={BTN} disabled={e.pendente.lado===lado} onClick={()=>jogar({t:'resolver',lado})}>Aplicar golpe</button>:<button className={BTN} disabled={!vez||!meu!.comprou&&(meu!.baralhoQtd+meu!.reservaQtd)>0} onClick={()=>jogar({t:'passar',lado})}>Encerrar turno</button>)}
      </div>
      {e.pendente&&<p className="mb-3 rounded-xl bg-[#083344]/70 p-3 text-sm">{e.pendente.carta?cartaNova(e.pendente.carta).nome:'Ataque básico'} → {e.pendente.alvo?cartaNova(combatente(e,e.pendente.alvo)!.carta).nome.split(',')[0]:'grupo'}. O defensor pode escolher uma carta de escudo e um aliado antes de aplicar o dano.</p>}
      <section className="rounded-xl border border-white/10 bg-black/30 p-3"><div className="flex flex-wrap justify-between gap-2"><b>{meu!.nome} · {ELEMENTOS[meu!.elemento].nome}</b><span className="text-xs text-[#d4d4d8]">{meu!.campo.length} vivos · Mana {manaLivreNova(meu!)}/{meu!.fonte} · Ataques {meu!.ataques}/2</span></div><div className="mt-3 overflow-x-auto">{campo(meu!.campo,e.eu!==null)}</div></section>
      {e.eu!==null&&e.vencedor===null&&<section className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3"><div className="flex flex-wrap items-center gap-2"><button className={BTN} disabled={!vez||meu!.comprou||meu!.baralhoQtd===0} onClick={()=>jogar({t:'comprar',lado,pilha:'magia'})}>Comprar magia/feitiço · {meu!.baralhoQtd}</button><button className={BTN} disabled={!vez||meu!.comprou||meu!.reservaQtd===0} onClick={()=>jogar({t:'comprar',lado,pilha:'mana'})}>Comprar mana · {meu!.reservaQtd}</button><span className="text-xs text-[#d4d4d8]">{meu!.comprou?'Compra feita neste turno':'Escolha uma das duas pilhas'}</span>{selecionada&&<button className={BTN} onClick={()=>{setSelecionada(null);setAviso('');}}>Cancelar seleção</button>}</div>
      <div className="my-3 flex flex-wrap gap-2">{(meu!.maoMana??[]).map((id,i)=><button key={`${id}:${i}`} className={BTN} disabled={!vez||!meu!.comprou||meu!.jogouMana||meu!.fonte+cartaNova(id).cargas!>12} onClick={()=>jogar({t:'mana',lado,carta:id})}>+{cartaNova(id).cargas} mana · {cartaNova(id).nome}</button>)}</div>
      <div className="flex items-start gap-3 overflow-x-auto pb-3">{(meu!.mao??[]).map((id,i)=>{const c=cartaNova(id),erro=podeCartaNova(e,lado,id);return <div key={`${id}:${i}`} className="w-44 shrink-0"><button className="w-full rounded-xl text-left" aria-label={`Usar ${c.nome}`} disabled={!!erro} style={{opacity:erro?.includes('morreu') ? .45 : 1,outline:selecionada?.id===id?'2px solid #facc15':undefined}} onClick={()=>{if(c.alvo==='grupo'||c.alvo==='si')jogar({t:'jogar',lado,carta:id,alvo:c.alvo==='si'?meu!.campo.find(p=>p.carta===c.conjurador)?.id:undefined});else {setSelecionada({tipo:'carta',id});setAviso(`Escolha um ${c.alvo==='aliado'?'aliado':'inimigo'} para ${c.nome}.`);}}}><CardGrimorio c={c} compacto/></button><button className="mt-1 w-full text-xs text-[#a1a1aa] underline" onClick={()=>setZoom(c)}>{erro??'Ver carta completa'}</button></div>;})}</div></section>}
      {e.vencedor!==null&&<div className="my-4 rounded-2xl border border-amber-200/30 bg-[#451a03]/30 p-5 text-center"><h2 className="font-display text-2xl">{e.vencedor==='empate'?'Empate':`${e.jogadores[e.vencedor].nome} venceu`}</h2><p className="my-3">{e.vencedor==='empate'?'Nenhum personagem sobreviveu.':`${e.jogadores[e.vencedor].campo.length} personagem(ns) permaneceram em campo.`}</p>{aoRevanche&&<button className={BTN} onClick={aoRevanche}>Jogar novamente</button>}</div>}
      <details className="mt-4 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm">Registro do duelo</summary><ol className="mt-3 space-y-1 text-xs text-[#a1a1aa]">{e.log.map((s,i)=><li key={i}>{s}</li>)}</ol></details>
    </>}{aviso&&<p role="status" className="sticky bottom-2 mt-3 rounded-xl border border-amber-300/40 bg-[#302515] p-3 text-sm text-[#fef3c7]">{aviso}</p>}</div>
    {catalogo&&<GaleriaGrimorios aoFechar={()=>setCatalogo(false)}/>}
    {(zoom||regras)&&<div className="fixed inset-0 z-[110] flex items-start justify-center overflow-auto bg-black/90 p-5" role="dialog" aria-modal="true" aria-label={zoom?.nome??'Regras dos grimórios'}><div className={zoom?'w-full max-w-sm':'w-full max-w-3xl'}><button className={BTN+' mb-3'} onClick={()=>{setZoom(null);setRegras(false);}}>Fechar</button>{zoom?<CardGrimorio c={zoom}/>:<RegrasGrimorios/>}</div></div>}
  </div>;
}
