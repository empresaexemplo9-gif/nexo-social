'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { ELEMENTOS, ELEMENTOS_ORDEM, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { GLOSSARIO_NOVO, cartaNova, grimorioNovo, type CartaNova } from '@/lib/jogos/arcanos/grimorios';

const BTN='rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35';
const NOMES: Record<string,string>={personagem:'Personagem',magia:'Magia',feitico:'Feitiço',mana:'Mana',tank:'Tank',mago:'Mago',suporte:'Suporte',guerreiro:'Guerreiro',arqueiro:'Arqueiro'};

export function ArteGrimorio({c,altura,prioridade=false}:{c:CartaNova;altura?:number;prioridade?:boolean}) {
  const a=c.arte, cols=a.colunas??1,rows=a.linhas??1,pos=a.posicao??0;
  return <div className="relative overflow-hidden bg-black/30" style={{height:altura}}><div className="relative w-full" style={{aspectRatio:a.proporcao??2/3}}>
    <Image src={a.src} alt={c.nome} width={1024} height={1536} priority={prioridade} loading={prioridade?undefined:'lazy'} unoptimized sizes="(max-width:640px) 180px, 280px" style={{position:'absolute',maxWidth:'none',width:`${cols*100}%`,height:`${rows*100}%`,left:`-${pos%cols*100}%`,top:`-${Math.floor(pos/cols)*100}%`,objectFit:'fill'}} />
  </div></div>;
}
export function CardGrimorio({c,compacto=false,tabuleiro=false}:{c:CartaNova;compacto?:boolean;tabuleiro?:boolean}) {
  const cor=ELEMENTOS[c.elemento];
  return <article data-carta-completa={tabuleiro?c.id:undefined} className="overflow-hidden rounded-xl border text-left shadow-lg" style={{borderColor:cor.clara+'88',background:`linear-gradient(155deg,${cor.escura},#0b0b13)`}}>
    <div className={tabuleiro?'flex flex-col gap-1 px-2 py-1 text-[8px] font-bold uppercase tracking-wide':'flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide'} style={{color:cor.clara}}><span>{NOMES[c.tipo]}{c.funcao?` · ${NOMES[c.funcao]}`:''}</span><span>{c.tipo==='mana'?`${c.cargas} mana`:c.tipo==='personagem'?`${c.ataque} ATQ · ${c.vida} VIDA`:`${c.custo} mana`}</span></div>
    <ArteGrimorio c={c} altura={tabuleiro?undefined:compacto?115:250} />
    <div className={tabuleiro?'space-y-1 p-2':'space-y-2 p-3'}><h3 className={tabuleiro?'font-display text-[10px] leading-tight font-bold text-white':'font-display text-sm font-bold text-white'}>{c.nome}</h3>
      {c.conjurador&&<p className="text-[11px]" style={{color:cor.clara}}>Conjurador: {cartaNova(c.conjurador).nome.split(',')[0]}</p>}
      {c.especial&&<p className={tabuleiro?'text-[8px] leading-3 font-bold text-[#fde68a]':'text-xs font-bold text-[#fde68a]'}>{c.especial.nome}</p>}
      <p className={tabuleiro?'text-[8px] leading-3 text-[#e4e4e7]':'text-xs leading-relaxed text-[#e4e4e7]'}>{c.texto}</p>
      {!compacto&&<p className={tabuleiro?'text-[8px] text-[#a1a1aa]':'text-[11px] text-[#a1a1aa]'}>{c.copias} cópia(s){c.reacao?' · Pode reagir antes do dano':''}</p>}
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
    <p><b>Até seis jogadores:</b> cada um por si (2 a 6), três times de dois ou dois times de três. Os modos em equipe precisam de seis jogadores. Cada elemento só pode ser escolhido por uma pessoa na sala, inclusive dentro do mesmo time.</p>
    <p>Os <b>dez personagens únicos de cada jogador começam no tabuleiro</b>, representados por suas cartas completas enquanto estiverem vivos. A mão, os decks, a mana em campo e o descarte ficam separados. Suportes têm 8 de vida, tanks 15 e as demais funções ficam entre esses valores. Vence a última pessoa ou equipe com pelo menos um personagem vivo. Um aliado eliminado participa da vitória do seu time.</p>
    <p><b>Equipes:</b> curas, escudos e benefícios para aliados podem alcançar personagens de qualquer grimório do seu time. Você usa sua própria carta, seu próprio conjurador e sua própria mana. Mãos e decks são privados; cartas não são transferidas. O turno segue a ordem dos jogadores vivos, pulando os eliminados.</p>
    <p><b>Duas pilhas:</b> 48 magias/feitiços e 24 manas (16 de uma carga e 8 de duas). A mão inicial contém cinco magias/feitiços e duas manas. Em <b>cada turno compre apenas uma carta</b>, escolhendo entre as duas pilhas.</p>
    <p><b>Mana:</b> depois de comprar, coloque no máximo uma mana na fonte por turno. Ela fornece uma ou duas cargas; a fonte comporta 12. Custos usam as cargas disponíveis e elas se renovam no início do seu turno. Mana gasta em reações também fica indisponível até essa renovação.</p>
    <p><b>Conjuração exclusiva:</b> cada magia/feitiço exige seu personagem vivo e livre de atordoamento ou congelamento, a carta na mão e mana suficiente. A carta informa custo, efeitos e conjurador. Não existe custo adicional do personagem.</p>
    <p><b>Ataques:</b> até dois ataques básicos por turno, de personagens diferentes. Tanks vivos protegem os demais personagens do próprio jogador; ataques podem escolher qualquer exército inimigo. Magias/feitiços podem alcançar qualquer alvo indicado. Você não pode atacar seu próprio time. O ataque básico não é somado ao dano do feitiço. Cada golpe fica entre 1 e 6; bônus nunca ultrapassam 6. Reduções podem anular o dano.</p>
    <p><b>Reação:</b> depois da declaração e antes do dano, os jogadores atingidos e seus companheiros podem conjurar escudos com seus suportes, inclusive fora do próprio turno. O defensor principal escolhe “Aplicar golpe”. Em efeitos sobre vários adversários, todos os times atingidos podem se proteger. Após 20 segundos, o anfitrião resolve o golpe. Ataques já declarados mantêm suas condições iniciais.</p>
    <p><b>Escudo:</b> permanece até ser consumido e acumula até 6 pontos. Dano 3 contra escudo 2 retira os dois pontos de escudo e 1 de vida. Um personagem só morre com vida zero; cura não supera o máximo e não ressuscita. Perder um personagem inutiliza suas cartas restantes.</p>
    <p><b>Habilidades especiais:</b> cada personagem tem um efeito exclusivo impresso na carta. O texto distingue primeiro uso na partida e uma vez por turno. Efeitos de controle não se acumulam; atordoamento/congelamento não renovam um controle já ativo. Após recuperar-se, o personagem recebe Tenacidade.</p>
    <p><b>Grupos:</b> efeitos coletivos alcançam no máximo três personagens, conforme a carta. A ordem do campo desempata alvos igualmente feridos. Se as pilhas acabarem, ataques e cartas já na mão continuam disponíveis.</p>
    <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(GLOSSARIO_NOVO).map(([n,t])=><div key={n} className="rounded-xl bg-white/5 p-3"><dt className="mb-1 font-bold capitalize text-[#fde68a]">{n}</dt><dd>{t}</dd></div>)}</dl>
  </div>;
}
