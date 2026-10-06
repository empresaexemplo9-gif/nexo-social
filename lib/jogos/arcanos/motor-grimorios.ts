import { cartaNova, personagensDoGrimorio, pilhaNova, REGRAS_NOVAS, type CartaNova, type Especial, type Gatilho, type EfeitoNovo } from './grimorios';
import { ehElemento, type Elemento } from './cartas';

export type LadoNovo = 0 | 1;
export type ParticipanteNovo = { userId: string; nome: string; elemento: Elemento };
export type EstadoDeEfeito = { tipo: string; valor: number; vence: number; restantes?: number };
export type Combatente = { id: string; carta: string; dono: LadoNovo; vida: number; maxima: number; escudo: number; atacou: boolean; bonus: number; efeitos: EstadoDeEfeito[]; usoEspecial: number; especialUsado: boolean };
export type JogadorNovo = ParticipanteNovo & { campo: Combatente[]; mortos: string[]; mao: string[] | null; maoQtd: number; baralho: string[] | null; baralhoQtd: number; maoMana: string[] | null; maoManaQtd: number; reserva: string[] | null; reservaQtd: number; fonte: number; gasta: number; manaEmJogo: string[]; comprou: boolean; jogouMana: boolean; ataques: number };
export type AcaoNova = { t: 'comprar'; lado: LadoNovo; pilha: 'magia' | 'mana' } | { t: 'mana'; lado: LadoNovo; carta: string } | { t: 'jogar'; lado: LadoNovo; carta: string; alvo?: string } | { t: 'atacar'; lado: LadoNovo; atacante: string; alvo: string } | { t: 'resolver' | 'passar' | 'desistir'; lado: LadoNovo };
type Fotografia = { vida: number; escudo: number; maxima: number; negativo: boolean; tank: boolean };
export type PendenteNovo = { lado: LadoNovo; conjurador: string; alvo?: string; carta?: string; basico: boolean; efeitos: EfeitoNovo[]; dano: number; fotoSi: Fotografia; fotoAlvo?: Fotografia; alvosGrupo: string[] };
export type EstadoNovo = { versao: 2; jogadores: [JogadorNovo, JogadorNovo]; eu: LadoNovo | null; ativo: LadoNovo; turno: number; seq: number; vencedor: LadoNovo | 'empate' | null; pendente: PendenteNovo | null; log: string[] };
export type ResultadoNovo = { ok: true; estado: EstadoNovo; acao: AcaoNova } | { ok: false; erro: string };
export const outroNovo = (l: LadoNovo): LadoNovo => l === 0 ? 1 : 0;
export const manaLivreNova = (j: JogadorNovo) => Math.max(0, j.fonte - j.gasta);
export const combatente = (e: EstadoNovo, id: string) => e.jogadores.flatMap((j) => j.campo).find((p) => p.id === id && p.vida > 0);
const negativos = new Set(['atordoamento', 'congelamento', 'enraizamento', 'desorientacao', 'vulnerabilidade', 'queimadura']);
const tem = (p: Combatente, tipo: string) => p.efeitos.some((x) => x.tipo === tipo);
export const impedidoNovo = (p: Combatente) => tem(p, 'atordoamento') || tem(p, 'congelamento');
const foto = (p: Combatente): Fotografia => ({ vida: p.vida, escudo: p.escudo, maxima: p.maxima, negativo: p.efeitos.some((x) => negativos.has(x.tipo)), tank: cartaNova(p.carta).funcao === 'tank' });
function falha(s: string): never { throw new Error(s); }
const registrar = (e: EstadoNovo, s: string) => { e.log.push(s); e.log = e.log.slice(-70); };
export function embaralharNovo(el: Elemento): { baralho: string[]; reserva: string[] } {
  const shuffle = (xs: string[]) => {
    for (let i = xs.length - 1; i > 0; i--) { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); const j = a[0] % (i + 1); [xs[i], xs[j]] = [xs[j], xs[i]]; }
    return xs;
  };
  return { baralho: shuffle(pilhaNova(el)), reserva: shuffle(pilhaNova(el, true)) };
}
export function novaPartidaGrimorios(ps: [ParticipanteNovo, ParticipanteNovo], eu: LadoNovo | null, deck?: { baralho: string[]; reserva: string[] }): EstadoNovo {
  if (!ps.every((p) => ehElemento(p.elemento)) || ps[0].userId === ps[1].userId) falha('Participantes inválidos.');
  const jogadores = ps.map((p, lado) => {
    const conhecido = eu === lado;
    const baralho = conhecido ? [...(deck?.baralho ?? pilhaNova(p.elemento))] : null;
    const reserva = conhecido ? [...(deck?.reserva ?? pilhaNova(p.elemento, true))] : null;
    return { ...p, campo: personagensDoGrimorio(p.elemento).map((c) => ({ id: `${lado}:${c.id}`, carta: c.id, dono: lado as LadoNovo, vida: c.vida!, maxima: c.vida!, escudo: 0, atacou: false, bonus: 0, efeitos: [], usoEspecial: 0, especialUsado: false })), mortos: [], mao: baralho?.splice(0, REGRAS_NOVAS.maoInicial) ?? null, maoQtd: REGRAS_NOVAS.maoInicial, baralho, baralhoQtd: REGRAS_NOVAS.magiasFeiticos - REGRAS_NOVAS.maoInicial, maoMana: reserva?.splice(0, REGRAS_NOVAS.manaInicial) ?? null, maoManaQtd: REGRAS_NOVAS.manaInicial, reserva, reservaQtd: REGRAS_NOVAS.cartasDeMana - REGRAS_NOVAS.manaInicial, fonte: 0, gasta: 0, manaEmJogo: [], comprou: false, jogouMana: false, ataques: 0 };
  }) as unknown as [JogadorNovo, JogadorNovo];
  return { versao: 2, jogadores, eu, ativo: 0, turno: 1, seq: 0, vencedor: null, pendente: null, log: ['Os dez personagens de cada grimório começam em campo. Escolha sua compra.'] };
}
export function publicoNovo(e: EstadoNovo): EstadoNovo {
  const p = structuredClone(e); p.eu = null;
  for (const j of p.jogadores) { j.mao = null; j.baralho = null; j.maoMana = null; j.reserva = null; }
  return p;
}
const proximoFim = (e: EstadoNovo, dono: LadoNovo) => e.turno + (e.ativo === dono ? 2 : 1);
function tirarEstado(p: Combatente, tipo: string) { p.efeitos = p.efeitos.filter((x) => x.tipo !== tipo); }
function estado(e: EstadoNovo, p: Combatente, tipo: string, valor: number) {
  if (p.vida <= 0) return;
  if (['atordoamento', 'congelamento', 'enraizamento'].includes(tipo)) {
    if (tem(p, 'determinacao')) { tirarEstado(p, 'determinacao'); registrar(e, 'Determinação bloqueou o controle.'); return; }
    if (['atordoamento', 'congelamento'].includes(tipo) && (tem(p, 'tenacidade') || impedidoNovo(p))) return;
  }
  const atual = p.efeitos.find((x) => x.tipo === tipo);
  const item: EstadoDeEfeito = { tipo, valor: Math.max(valor, atual?.valor ?? 0), vence: proximoFim(e, p.dono), ...(['regeneracao','queimadura'].includes(tipo) ? { restantes: 2 } : {}) };
  tirarEstado(p, tipo); p.efeitos.push(item);
}
function liberarControle(e: EstadoNovo, p: Combatente) {
  tirarEstado(p, 'atordoamento'); tirarEstado(p, 'congelamento'); estado(e, p, 'tenacidade', 1);
}
type Contexto = { carta?: CartaNova; si?: Fotografia; alvo?: Fotografia; absorvido?: number; letal?: boolean; reacao?: boolean; dano?: number };
function condicaoEspecial(e: EstadoNovo, p: Combatente, a: Especial, alvo: Combatente | undefined, ctx: Contexto) {
  const s = ctx.si ?? foto(p); const t = ctx.alvo ?? (alvo ? foto(alvo) : undefined);
  switch (a.condicao) {
    case 'sempre': return true;
    case 'alvoEscudo': return !!t && t.escudo > 0;
    case 'alvoSemEscudo': return !!t && t.escudo === 0;
    case 'alvoFerido': return !!t && t.vida < t.maxima;
    case 'alvoVidaCheia': return !!t && t.vida === t.maxima;
    case 'alvoMeiaVida': return !!t && t.vida <= t.maxima / 2;
    case 'alvoControlado': return !!t?.negativo;
    case 'alvoTank': return !!t?.tank;
    case 'siEscudo': return s.escudo > 0;
    case 'siSemEscudo': return s.escudo === 0;
    case 'siFerido': return s.vida < s.maxima;
    case 'siMeiaVida': return s.vida <= s.maxima / 2;
    case 'siVidaCheia': return s.vida === s.maxima;
    case 'custo4': return (ctx.carta?.custo ?? 0) >= 4;
    case 'absorcao': return (ctx.absorvido ?? 0) > 0;
    case 'letal': return !!ctx.letal;
    case 'reacao': return !!ctx.reacao;
    case 'enraiza': return !!ctx.carta?.efeitos.some((f) => f.tipo === 'enraizamento');
    case 'cura': return !!ctx.carta?.efeitos.some((f) => f.tipo === 'cura');
    case 'turnoInimigo': return e.ativo !== p.dono;
  }
}
function especial(e: EstadoNovo, p: Combatente, gatilho: Gatilho, alvo?: Combatente, ctx: Contexto = {}): number {
  if (p.vida <= 0) return 0;
  const a = cartaNova(p.carta).especial!;
  if (a.gatilho !== gatilho || (a.limite === 'turno' ? p.usoEspecial === e.turno : p.especialUsado) || !condicaoEspecial(e,p,a,alvo,ctx)) return 0;
  p.usoEspecial = e.turno; p.especialUsado = true;
  const dest = a.destino === 'si' ? p : a.destino === 'alvo' ? alvo : [...e.jogadores[p.dono].campo].filter((q) => q.vida > 0).sort((x,y) => (y.maxima-y.vida)-(x.maxima-x.vida))[0];
  registrar(e, `${cartaNova(p.carta).nome.split(',')[0]} ativou ${a.nome}.`);
  if (a.operacao === 'dano') return a.valor;
  if (!dest || dest.vida <= 0) return 0;
  if (a.operacao === 'escudo') dest.escudo = Math.min(6, dest.escudo + a.valor);
  if (a.operacao === 'cura') dest.vida = Math.min(dest.maxima, dest.vida + a.valor);
  if (a.operacao === 'bonus') dest.bonus += a.valor;
  if (a.operacao === 'removerEscudo') dest.escudo = Math.max(0, dest.escudo - a.valor);
  return 0;
}
function mortes(e: EstadoNovo) {
  for (const j of e.jogadores) {
    for (const p of j.campo.filter((x) => x.vida <= 0)) { if (!j.mortos.includes(p.carta)) j.mortos.push(p.carta); registrar(e, `${cartaNova(p.carta).nome.split(',')[0]} morreu.`); }
    j.campo = j.campo.filter((x) => x.vida > 0);
  }
  const vivos = e.jogadores.map((j) => j.campo.length);
  if (!vivos[0] || !vivos[1]) {
    e.vencedor = !vivos[0] && !vivos[1] ? 'empate' : vivos[0] ? 0 : 1;
    e.pendente = null;
    registrar(e,e.vencedor === 'empate' ? 'Empate: nenhum personagem permaneceu em campo.' : `${e.jogadores[e.vencedor].nome} venceu com ${vivos[e.vencedor]} personagem(ns) em campo.`);
  }
}
function dano(e: EstadoNovo, p: Combatente, valor: number, caster?: Combatente, ctx: Contexto = {}) {
  if (p.vida <= 0) return;
  const before = foto(p); let v = Math.max(0, Math.min(6,valor));
  if (tem(p,'vulnerabilidade')) { v = Math.min(6,v + 1); tirarEstado(p,'vulnerabilidade'); }
  if (tem(p,'evasao')) { v = Math.max(0,v - 2); tirarEstado(p,'evasao'); }
  const absorvido = Math.min(p.escudo,v); p.escudo -= absorvido;
  const perda = Math.min(p.vida,v-absorvido); p.vida -= perda;
  registrar(e,`${cartaNova(p.carta).nome.split(',')[0]}: escudo −${absorvido}, vida −${perda}.`);
  if (valor > 0 && tem(p,'congelamento')) liberarControle(e,p);
  if (p.vida > 0) especial(e,p,'receberDano',caster,{si:before, absorvido});
  if (caster && caster.vida > 0 && perda > 0) especial(e,caster,'causarDano',p,{...ctx,alvo:ctx.alvo ?? before,letal:p.vida<=0});
}
function aplicarEfeito(e: EstadoNovo, f: EfeitoNovo, alvo: Combatente, caster: Combatente, ctx: Contexto, danoBase: number) {
  if (alvo.vida <= 0) return;
  switch (f.tipo) {
    case 'dano': dano(e,alvo,danoBase,caster,ctx); return;
    case 'cura': {
      const before=foto(alvo); alvo.vida=Math.min(alvo.maxima,alvo.vida+f.valor);
      especial(e,caster,'curar',alvo,{...ctx,alvo:before}); return;
    }
    case 'escudo': {
      const before=foto(alvo); alvo.escudo=Math.min(6,alvo.escudo+f.valor);
      especial(e,alvo,'receberEscudo',caster,{si:before}); return;
    }
    case 'removerEscudo': alvo.escudo=Math.max(0,alvo.escudo-f.valor); return;
    case 'bonus': alvo.bonus+=f.valor; return;
    case 'purificar': {
      const before=foto(alvo); const control=impedidoNovo(alvo);
      alvo.efeitos=alvo.efeitos.filter((x)=>!negativos.has(x.tipo));
      if(control) estado(e,alvo,'tenacidade',1);
      especial(e,caster,'purificar',alvo,{...ctx,alvo:before}); return;
    }
    default: estado(e,alvo,f.tipo,f.valor);
  }
}
function conjurador(e: EstadoNovo, l: LadoNovo, c: CartaNova) { return e.jogadores[l].campo.find((p) => p.carta===c.conjurador && p.vida>0); }
export function alvosNovos(e: EstadoNovo, lado: LadoNovo, c: CartaNova): string[] {
  const caster=conjurador(e,lado,c);
  if(c.alvo==='si') return caster ? [caster.id] : [];
  if(c.alvo==='grupo') return [];
  return e.jogadores[c.alvo==='inimigo' ? outroNovo(lado) : lado].campo.filter((p)=>p.vida>0).map((p)=>p.id);
}
export function alvosAtaqueNovo(e: EstadoNovo, lado: LadoNovo): string[] {
  const inimigos=e.jogadores[outroNovo(lado)].campo;
  const tanks=inimigos.filter((p)=>cartaNova(p.carta).funcao==='tank');
  return (tanks.length ? tanks : inimigos).map((p)=>p.id);
}
export function podeCartaNova(e: EstadoNovo, lado: LadoNovo, id: string): string | null {
  let c: CartaNova; try { c=cartaNova(id); } catch { return 'Carta desconhecida.'; }
  const j=e.jogadores[lado]; const caster=conjurador(e,lado,c);
  if(e.vencedor!==null) return 'A partida terminou.';
  if(c.tipo!=='magia' && c.tipo!=='feitico') return 'Use uma magia ou um feitiço.';
  if(c.elemento!==j.elemento) return 'Essa carta pertence a outro elemento.';
  if(!caster) return 'O conjurador desta carta morreu.';
  if(impedidoNovo(caster)) return 'O conjurador está atordoado ou congelado.';
  if(j.mao && !j.mao.includes(id) || j.maoQtd<=0) return 'Você não tem essa carta na mão.';
  if(manaLivreNova(j)<c.custo) return 'Mana insuficiente.';
  if(e.pendente) {
    if(e.pendente.lado===lado) return 'Cabe ao defensor reagir ao golpe.';
    if(!c.reacao || cartaNova(caster.carta).funcao!=='suporte') return 'Só escudos de suporte podem responder ao golpe.';
  } else if(e.ativo!==lado && !c.reacao) return 'Espere sua vez.';
  if(e.ativo===lado && !j.comprou && !e.pendente) return 'Escolha primeiro sua compra do turno.';
  return null;
}
export function podeAtaqueNovo(e: EstadoNovo, p: Combatente): boolean {
  return e.vencedor===null && !e.pendente && e.ativo===p.dono && e.jogadores[p.dono].comprou && e.jogadores[p.dono].ataques<REGRAS_NOVAS.ataquesPorTurno && !p.atacou && !impedidoNovo(p) && !tem(p,'enraizamento');
}
function gastarMao(j: JogadorNovo, id: string, mana=false) {
  const mao=mana?j.maoMana:j.mao; const qtd=mana?j.maoManaQtd:j.maoQtd;
  if(qtd<=0 || mao && !mao.includes(id)) falha('Carta ausente da mão.');
  if(mao) mao.splice(mao.indexOf(id),1);
  if(mana) j.maoManaQtd--; else j.maoQtd--;
}
function resolver(e: EstadoNovo) {
  const p=e.pendente; if(!p) falha('Nenhum golpe pendente.');
  const caster=combatente(e,p.conjurador); if(!caster) falha('Conjurador ausente.');
  const c=p.carta?cartaNova(p.carta):undefined;
  const alvo=p.alvo?combatente(e,p.alvo):undefined;
  const ctx: Contexto={carta:c,si:p.fotoSi,alvo:p.fotoAlvo};
  for(const f of p.efeitos) {
    const targets=f.mira==='si'?[caster]:f.mira==='alvo'?(alvo?[alvo]:[]):p.alvosGrupo.map((id)=>combatente(e,id)).filter((q):q is Combatente=>!!q && (f.mira==='aliados' ? q.dono===p.lado : q.dono!==p.lado));
    for(const t of targets) aplicarEfeito(e,f,t,caster,ctx,f.mira==='inimigos'?Math.min(2,p.dano):p.dano);
  }
  if(!p.basico && c) especial(e,caster,'conjurarFeitico',alvo,ctx);
  e.pendente=null; mortes(e);
}
function passar(e: EstadoNovo) {
  const velho=e.ativo;
  for(const p of e.jogadores[velho].campo) {
    p.bonus=0;
    const control=p.efeitos.some((x)=>['atordoamento','congelamento'].includes(x.tipo) && x.vence<=e.turno);
    p.efeitos=p.efeitos.filter((x)=>x.restantes!==undefined || x.vence>e.turno);
    if(control) estado(e,p,'tenacidade',1);
  }
  e.ativo=outroNovo(velho); e.turno++;
  const j=e.jogadores[e.ativo]; j.gasta=0; j.comprou=false; j.jogouMana=false; j.ataques=0;
  for(const p of j.campo) {
    p.atacou=false;
    p.efeitos=p.efeitos.filter((x)=>!(['evasao','determinacao'].includes(x.tipo) && x.vence<=e.turno));
    for(const x of [...p.efeitos]) if(x.restantes!==undefined) {
      if(x.tipo==='regeneracao' && p.vida>0) p.vida=Math.min(p.maxima,p.vida+x.valor);
      if(x.tipo==='queimadura' && p.vida>0) dano(e,p,x.valor);
      x.restantes--;
    }
    p.efeitos=p.efeitos.filter((x)=>x.restantes===undefined || x.restantes>0);
    if(p.vida>0) especial(e,p,'inicio');
  }
  mortes(e); registrar(e,`Turno de ${j.nome}: escolha uma das duas pilhas.`);
}
export function aplicarNova(original: EstadoNovo, acao: AcaoNova): ResultadoNovo {
  try {
    if(!acao || ![0,1].includes(acao.lado)) falha('Jogada inválida.');
    if(original.vencedor!==null) falha('A partida terminou.');
    const e=structuredClone(original), j=e.jogadores[acao.lado];
    if(acao.t==='desistir') { e.vencedor=outroNovo(acao.lado); e.pendente=null; registrar(e,`${j.nome} desistiu.`); }
    else if(acao.t==='resolver') { if(!e.pendente || acao.lado!==outroNovo(e.pendente.lado)) falha('Cabe ao defensor concluir a reação.'); resolver(e); }
    else if(acao.t==='jogar') {
      const erro=podeCartaNova(e,acao.lado,acao.carta); if(erro) falha(erro);
      const c=cartaNova(acao.carta), caster=conjurador(e,acao.lado,c)!;
      const alvo=c.alvo==='si'?caster:acao.alvo?combatente(e,acao.alvo):undefined;
      if(c.alvo!=='grupo' && (!alvo || !alvosNovos(e,acao.lado,c).includes(alvo.id))) falha('Escolha um alvo válido.');
      const si=foto(caster), fot=alvo?foto(alvo):undefined; const reacao=!!e.pendente || e.ativo!==acao.lado;
      gastarMao(j,c.id); j.gasta+=c.custo;
      registrar(e,`${j.nome} conjurou ${c.nome} com ${cartaNova(caster.carta).nome.split(',')[0]}.`);
      const ctx: Contexto={carta:c,si,alvo:fot,reacao};
      if(c.tipo==='feitico') {
        const d=c.efeitos.find((f)=>f.tipo==='dano')?.valor ?? 0;
        const bonus=d>0 ? caster.bonus : 0;
        const fraco=d>0 && tem(caster,'desorientacao')?2:0;
        caster.bonus=0;
        if(d>0) tirarEstado(caster,'desorientacao');
        const total=d>0?Math.max(0,Math.min(6,d+bonus+especial(e,caster,'declararFeitico',alvo,ctx)-fraco)):0;
        const groups=c.efeitos.filter((f)=>f.mira==='aliados'||f.mira==='inimigos').flatMap((f)=>[...e.jogadores[f.mira==='aliados'?acao.lado:outroNovo(acao.lado)].campo].sort((a,b)=>a.vida-b.vida).slice(0,f.maxAlvos??3).map((p)=>p.id));
        e.pendente={lado:acao.lado,conjurador:caster.id,alvo:alvo?.id,carta:c.id,basico:false,efeitos:c.efeitos,dano:total,fotoSi:si,fotoAlvo:fot,alvosGrupo:Array.from(new Set(groups))};
      } else {
        for(const f of c.efeitos) {
          const targets=f.mira==='si'?[caster]:f.mira==='alvo'?(alvo?[alvo]:[]):[...e.jogadores[f.mira==='aliados'?acao.lado:outroNovo(acao.lado)].campo].sort((a,b)=>(b.maxima-b.vida)-(a.maxima-a.vida)).slice(0,f.maxAlvos??3);
          for(const t of targets) aplicarEfeito(e,f,t,caster,ctx,0);
        }
        especial(e,caster,'conjurarMagia',alvo,ctx); mortes(e);
      }
    } else {
      if(e.ativo!==acao.lado) falha('Espere sua vez.');
      if(e.pendente) falha('O defensor ainda pode reagir ao golpe.');
      switch(acao.t) {
        case 'comprar': {
          if(j.comprou) falha('Você já comprou neste turno.');
          if(!['mana','magia'].includes(acao.pilha)) falha('Pilha inválida.');
          const mana=acao.pilha==='mana';
          if((mana?j.reservaQtd:j.baralhoQtd)<=0) falha('Essa pilha está vazia.');
          const pile=mana?j.reserva:j.baralho, mao=mana?j.maoMana:j.mao;
          if(pile && mao) mao.push(pile.shift()!);
          if(mana) {j.reservaQtd--;j.maoManaQtd++;} else {j.baralhoQtd--;j.maoQtd++;}
          j.comprou=true; registrar(e,`${j.nome} comprou uma carta de ${mana?'mana':'magia/feitiço'}.`); break;
        }
        case 'mana': {
          if(!j.comprou) falha('Escolha sua compra primeiro.');
          if(j.jogouMana) falha('Uma carta de mana por turno.');
          const c=cartaNova(acao.carta);
          if(c.tipo!=='mana'||c.elemento!==j.elemento) falha('Mana de outro grimório.');
          if(j.fonte+(c.cargas??0)>REGRAS_NOVAS.manaMaxima) falha('A fonte pode ter até 12 cargas.');
          gastarMao(j,c.id,true); j.fonte+=c.cargas!; j.manaEmJogo.push(c.id); j.jogouMana=true; break;
        }
        case 'atacar': {
          const p=combatente(e,acao.atacante), alvo=combatente(e,acao.alvo);
          if(!p||p.dono!==acao.lado||!podeAtaqueNovo(e,p)||!alvo||!alvosAtaqueNovo(e,acao.lado).includes(alvo.id)) falha('Ataque inválido: tanks vivos protegem dos ataques básicos.');
          const si=foto(p), fot=foto(alvo); const total=Math.min(6,cartaNova(p.carta).ataque!+especial(e,p,'declararAtaque',alvo,{si,alvo:fot}));
          p.atacou=true; j.ataques++;
          e.pendente={lado:acao.lado,conjurador:p.id,alvo:alvo.id,basico:true,efeitos:[{tipo:'dano',valor:total,mira:'alvo'}],dano:total,fotoSi:si,fotoAlvo:fot,alvosGrupo:[]};
          registrar(e,`${cartaNova(p.carta).nome.split(',')[0]} declarou ataque de ${total}.`); break;
        }
        case 'passar': {
          if(!j.comprou && (j.baralhoQtd>0||j.reservaQtd>0)) falha('Escolha sua compra antes de passar.');
          passar(e); break;
        }
        default: falha('Jogada desconhecida.');
      }
    }
    e.seq++; return {ok:true,estado:e,acao};
  } catch(erro) { return {ok:false,erro:erro instanceof Error?erro.message:'Jogada inválida.'}; }
}
