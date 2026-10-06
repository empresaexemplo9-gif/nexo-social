import { cartaNova, type CartaNova } from './grimorios';
import { alvosNovos, alvosAtaqueNovo, aliadosNovos, combatente, defensorNovo, manaLivreNova, podeReagirNovo, podeAtaqueNovo, podeCartaNova, type AcaoNova, type Combatente, type EstadoNovo, type LadoNovo } from './motor-grimorios';

function valorCarta(c: CartaNova, p?: Combatente) {
  return c.efeitos.reduce((n,f)=> {
    if(f.tipo==='dano') return n+f.valor*(f.mira==='inimigos'?2.3:1)+(p&&p.vida+p.escudo<=f.valor?8:0);
    if(f.tipo==='cura') return n+Math.min(f.valor,p?p.maxima-p.vida:0)*1.3;
    if(f.tipo==='escudo') return n+Math.min(f.valor,6-(p?.escudo??0))*0.45;
    if(f.tipo==='purificar') return n+(p?.efeitos.some((s)=>['atordoamento','congelamento','enraizamento','queimadura','desorientacao'].includes(s.tipo))?3:0);
    if(f.tipo==='bonus') return n+f.valor*0.7;
    if(f.tipo==='regeneracao') return n+(p&&p.vida<p.maxima?1.2:0);
    if(f.tipo==='removerEscudo') return n+Math.min(f.valor,p?.escudo??0)*0.6;
    return n+1;
  },0)-c.custo*0.12;
}
export function decidirGrimorios(e: EstadoNovo, lado: LadoNovo): AcaoNova | null {
  if(e.vencedor!==null) return null;
  const j=e.jogadores[lado];
  if(!j?.campo.length) return null;
  if(e.pendente) {
    if(!podeReagirNovo(e,lado)) return null;
    const ids=[...(e.pendente.alvo?[e.pendente.alvo]:[]),...e.pendente.alvosGrupo];
    const ameaçados=ids.map((id)=>combatente(e,id)).filter((p):p is Combatente=>!!p&&aliadosNovos(e,lado,p.dono)&&p.escudo<e.pendente!.dano).sort((a,b)=>a.vida-b.vida);
    for(const p of ameaçados) {
      const cartas=(j.mao??[]).map(cartaNova).filter((c)=>c.reacao&&podeCartaNova(e,lado,c.id)===null).sort((a,b)=>a.custo-b.custo);
      if(cartas[0]) return {t:'jogar',lado,carta:cartas[0].id,alvo:p.id};
    }
    return defensorNovo(e)===lado ? {t:'resolver',lado} : null;
  }
  if(e.ativo!==lado) return null;
  if(!j.comprou) {
    if(j.reservaQtd>0&&(j.fonte<6&&j.maoManaQtd===0||j.baralhoQtd===0)) return {t:'comprar',lado,pilha:'mana'};
    if(j.baralhoQtd>0) return {t:'comprar',lado,pilha:'magia'};
    if(j.reservaQtd>0) return {t:'comprar',lado,pilha:'mana'};
  }
  if(!j.jogouMana) {
    const mana=(j.maoMana??[]).map(cartaNova).sort((a,b)=>(b.cargas??0)-(a.cargas??0)).find((c)=>j.fonte+(c.cargas??0)<=12);
    if(mana) return {t:'mana',lado,carta:mana.id};
  }
  let melhor: {valor:number;acao:AcaoNova}|null=null;
  for(const id of Array.from(new Set(j.mao??[]))) {
    if(podeCartaNova(e,lado,id)) continue;
    const c=cartaNova(id);
    if(c.efeitos.some((f)=>f.tipo==='bonus') && !(j.mao??[]).some((k)=> {const s=cartaNova(k);return s.tipo==='feitico'&&s.conjurador===c.conjurador&&s.custo+c.custo<=manaLivreNova(j);})) continue;
    for(const alvo of c.alvo==='grupo'?[undefined]:alvosNovos(e,lado,c)) {
      const p=alvo?combatente(e,alvo):undefined;
      const valor=valorCarta(c,p)+(p&&c.tipo==='feitico'&&cartaNova(p.carta).funcao==='suporte'?0.7:0);
      if(valor>1.2&&(!melhor||valor>melhor.valor)) melhor={valor,acao:{t:'jogar',lado,carta:id,alvo}};
    }
  }
  if(melhor) return melhor.acao;
  const atacantes=j.campo.filter((p)=>podeAtaqueNovo(e,p)).sort((a,b)=>cartaNova(b.carta).ataque!-cartaNova(a.carta).ataque!);
  if(atacantes[0]) {
    const alvos=alvosAtaqueNovo(e,lado).map((id)=>combatente(e,id)!).sort((a,b)=>(a.vida+a.escudo)-(b.vida+b.escudo));
    if(alvos[0]) return {t:'atacar',lado,atacante:atacantes[0].id,alvo:alvos[0].id};
  }
  return {t:'passar',lado};
}
