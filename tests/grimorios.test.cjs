const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function carregar(path,deps){const exports={};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(code,{exports,require:n=>deps[n]??{},structuredClone,globalThis:{crypto:globalThis.crypto},Uint32Array,Math,Number,Error,Set,Map,Array,Object,JSON},{filename:path});return exports;}
const legado=carregar('lib/jogos/arcanos/cartas.ts',{});
const dados=JSON.parse(fs.readFileSync('lib/jogos/arcanos/grimorios.json','utf8'));
const cartas=carregar('lib/jogos/arcanos/grimorios.ts',{'./grimorios.json':{default:dados}});
const m=carregar('lib/jogos/arcanos/motor-grimorios.ts',{'./grimorios':cartas,'./cartas':legado});
const robo=carregar('lib/jogos/arcanos/robo-grimorios.ts',{'./grimorios':cartas,'./motor-grimorios':m});
const els=dados.map(g=>g.elemento);
const ps=(a='fogo',b='agua')=>[{userId:'ana',nome:'Ana',elemento:a},{userId:'bia',nome:'Bia',elemento:b}];
const ok=r=>{assert.equal(r.ok,true,r.erro);return r.estado;};
function mesa(a='fogo',b='agua'){
 const p=ps(a,b),e=m.novaPartidaGrimorios(p,0,m.embaralharNovo(a));
 const outro=m.novaPartidaGrimorios(p,1,m.embaralharNovo(b));
 for(const k of ['mao','baralho','maoMana','reserva'])e.jogadores[1][k]=outro.jogadores[1][k];
 e.jogadores.forEach(j=>{j.comprou=true;j.fonte=12;});return e;
}
const darCarta=(e,l,n)=>{const c=cartas.CARTAS_NOVAS.find(c=>c.elemento===e.jogadores[l].elemento&&c.nome===n);assert.ok(c,n);e.jogadores[l].mao=[c.id];e.jogadores[l].maoQtd=1;return c.id;};
test('a reação ao golpe pertence ao defensor',()=>{
 let e=mesa();const p=e.jogadores[0].campo.find(p=>cartas.cartaNova(p.carta).funcao==='guerreiro');
 e=ok(m.aplicarNova(e,{t:'atacar',lado:0,atacante:p.id,alvo:e.jogadores[1].campo[0].id}));
 const c=cartas.CARTAS_NOVAS.find(c=>c.elemento==='fogo'&&c.reacao);
 darCarta(e,0,c.nome);assert.match(m.podeCartaNova(e,0,c.id),/defensor/);
});
test('264 títulos, 60 personagens/efeitos exclusivos, seis reservas suficientes e valores recalculados',()=>{
 assert.equal(cartas.CARTAS_NOVAS.length,264);
 assert.equal(new Set(cartas.CARTAS_NOVAS.map(c=>c.id)).size,264);
 assert.equal(new Set(cartas.CARTAS_NOVAS.map(c=>c.nome)).size,264);
 const especiais=[];
 for(const g of dados){const p=g.cartas.filter(c=>c.tipo==='personagem');assert.equal(p.length,10);assert.equal(cartas.pilhaNova(g.elemento).length,48);assert.equal(cartas.pilhaNova(g.elemento,true).length,24);
 for(const f of ['tank','mago','suporte','guerreiro','arqueiro'])assert.equal(p.filter(c=>c.funcao===f).length,2);
 for(const c of p){assert.ok(c.vida>=8&&c.vida<=15);assert.ok(c.ataque>=1&&c.ataque<=6);if(c.funcao==='tank')assert.equal(c.vida,15);else if(c.funcao==='suporte')assert.equal(c.vida,8);else assert.ok(c.vida>8&&c.vida<15);const {nome,texto,...signature}=c.especial;especiais.push(JSON.stringify(signature));assert.ok(texto.includes('Uma vez'));}
 for(const c of g.cartas.filter(c=>c.conjurador)){assert.ok(p.some(p=>p.id===c.conjurador));assert.ok(c.custo>=2&&c.custo<=4);for(const f of c.efeitos){if(['dano','escudo'].includes(f.tipo))assert.ok(f.valor>=1&&f.valor<=6);if(['aliados','inimigos'].includes(f.mira))assert.equal(f.maxAlvos,3);}}
 }
 assert.equal(new Set(especiais).size,60);
});
test('todos os personagens começam em campo, nenhuma vida de herói e nenhuma carta oculta no estado público',()=>{
 const e=m.novaPartidaGrimorios(ps(),0,m.embaralharNovo('fogo'));for(const j of e.jogadores){assert.equal(j.campo.length,10);assert.equal(j.vida,undefined);assert.ok(j.campo.every(p=>p.vida===p.maxima));}
 const pub=m.publicoNovo(e);assert.equal(pub.eu,null);for(const j of pub.jogadores)for(const k of ['mao','baralho','maoMana','reserva'])assert.equal(j[k],null);
});
test('compra é uma única escolha entre magia e mana, sem consumir a outra pilha',()=>{
 const e=m.novaPartidaGrimorios(ps(),0,m.embaralharNovo('fogo'));const a=ok(m.aplicarNova(e,{t:'comprar',lado:0,pilha:'magia'}));assert.equal(a.jogadores[0].maoQtd,6);assert.equal(a.jogadores[0].reservaQtd,e.jogadores[0].reservaQtd);assert.equal(m.aplicarNova(a,{t:'comprar',lado:0,pilha:'mana'}).ok,false);assert.equal(m.aplicarNova(a,{t:'comprar',lado:1,pilha:'mana'}).ok,false);
});
test('conjurador morto, elemento errado, controle e mana insuficiente impedem conjuração',()=>{
 const e=mesa(),id=darCarta(e,0,'Corte de Brasa');e.jogadores[0].campo=e.jogadores[0].campo.filter(p=>p.carta!==cartas.cartaNova(id).conjurador);assert.match(m.podeCartaNova(e,0,id),/morreu/);
 const a=mesa();const spell=darCarta(a,0,'Lança de Fogo');a.jogadores[0].fonte=1;assert.match(m.podeCartaNova(a,0,spell),/Mana/);a.jogadores[0].fonte=12;a.jogadores[0].campo.find(p=>p.carta===cartas.cartaNova(spell).conjurador).efeitos.push({tipo:'atordoamento',valor:1,vence:3});assert.match(m.podeCartaNova(a,0,spell),/atordoado/);assert.match(m.podeCartaNova(a,0,'agua-lancas-da-torrente'),/elemento/);
});
test('ataque 3 quebra escudo 2 e tira exatamente 1 de vida; somente zero mata',()=>{
 let e=mesa();const id=darCarta(e,0,'Lança de Fogo'),target=e.jogadores[1].campo[4];target.escudo=2;const antes=target.vida;e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:target.id}));assert.equal(m.combatente(e,target.id).vida,antes);assert.equal(e.pendente.dano,3);e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));assert.equal(m.combatente(e,target.id).escudo,0);assert.equal(m.combatente(e,target.id).vida,antes-1);assert.equal(e.vencedor,null);
});
test('suporte pode reagir no turno inimigo e paga mana antes de reduzir dano',()=>{
 let e=mesa();const attack=darCarta(e,0,'Lança de Fogo'),shield=darCarta(e,1,'Véu da Nascente'),target=e.jogadores[1].campo[4];e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:attack,alvo:target.id}));e=ok(m.aplicarNova(e,{t:'jogar',lado:1,carta:shield,alvo:target.id}));assert.equal(e.jogadores[1].gasta,2);assert.equal(m.combatente(e,target.id).escudo,3);e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));assert.equal(m.combatente(e,target.id).vida,8);assert.equal(m.combatente(e,target.id).escudo,0);
});
test('bônus de feitiço e escudos acumulados respeitam o limite de 6',()=>{
 let e=mesa();const id=darCarta(e,0,'Lança de Fogo'),target=e.jogadores[1].campo[4],caster=e.jogadores[0].campo.find(p=>p.carta===cartas.cartaNova(id).conjurador);caster.bonus=100;e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:target.id}));assert.equal(e.pendente.dano,6);assert.equal(m.combatente(e,caster.id).bonus,0);
 let b=mesa();const shield=darCarta(b,0,'Fortaleza da Bigorna'),p=b.jogadores[0].campo[0];p.escudo=5;b=ok(m.aplicarNova(b,{t:'jogar',lado:0,carta:shield,alvo:p.id}));assert.equal(m.combatente(b,p.id).escudo,6);
});
test('eliminação só termina quando morre o último adversário e resta pelo menos um vencedor',()=>{
 let e=mesa();const target=e.jogadores[1].campo[4];target.vida=3;e.jogadores[1].campo=[target];const id=darCarta(e,0,'Lança de Fogo');e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:target.id}));assert.equal(e.vencedor,null);e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));assert.equal(e.vencedor,0);assert.equal(e.jogadores[1].campo.length,0);assert.ok(e.jogadores[0].campo.length>=1);assert.ok(e.jogadores[1].mortos.includes(target.carta));
});
test('congelamento não renova, dano absorvido remove gelo e dá tenacidade; morto não regenera',()=>{
 let e=mesa('agua','terra'),target=e.jogadores[1].campo[4],id=darCarta(e,0,'Disparo de Gelo');e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:target.id}));e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));assert.ok(m.combatente(e,target.id).efeitos.some(s=>s.tipo==='congelamento'));
 const attack=darCarta(e,0,'Jato de Alta Pressão');m.combatente(e,target.id).escudo=6;e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:attack,alvo:target.id}));e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));assert.ok(!m.combatente(e,target.id).efeitos.some(s=>s.tipo==='congelamento'));assert.ok(m.combatente(e,target.id).efeitos.some(s=>s.tipo==='tenacidade'));
 const b=mesa();const p=b.jogadores[1].campo[4];p.vida=1;p.efeitos=[{tipo:'queimadura',valor:1,restantes:2,vence:2},{tipo:'regeneracao',valor:1,restantes:2,vence:2}];const after=ok(m.aplicarNova(b,{t:'passar',lado:0}));assert.equal(m.combatente(after,p.id),undefined);
});
test('dois ataques básicos de personagens diferentes; tanks protegem; fonte renova sem desaparecer',()=>{
 let e=mesa();const target=e.jogadores[1].campo[0];for(const p of e.jogadores[0].campo.slice(6,8)){e=ok(m.aplicarNova(e,{t:'atacar',lado:0,atacante:p.id,alvo:target.id}));e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));}assert.equal(e.jogadores[0].ataques,2);assert.equal(m.podeAtaqueNovo(e,e.jogadores[0].campo[8]),false);assert.equal(m.alvosAtaqueNovo(e,0).length,2);e.jogadores[0].gasta=8;e=ok(m.aplicarNova(e,{t:'passar',lado:0}));e=ok(m.aplicarNova(e,{t:'comprar',lado:1,pilha:'magia'}));e=ok(m.aplicarNova(e,{t:'passar',lado:1}));assert.equal(e.jogadores[0].fonte,12);assert.equal(e.jogadores[0].gasta,0);
});
test('todos os confrontos terminam, sem descompasso entre os aparelhos ou vantagem extrema de elemento',()=>{
 const report={};for(const el of els)report[el]={vitorias:0,partidas:0};let games=0,maxTurn=0;
 for(const a of els)for(const b of els)for(let run=0;run<4;run++){
  const p=ps(a,b);let e0=m.novaPartidaGrimorios(p,0,m.embaralharNovo(a)),e1=m.novaPartidaGrimorios(p,1,m.embaralharNovo(b));let steps=0;
  while(e0.vencedor===null&&steps++<2200){const lado=e0.pendente?m.outroNovo(e0.pendente.lado):e0.ativo;const acao=robo.decidirGrimorios(lado===0?e0:e1,lado);assert.ok(acao,`${a}/${b}: falta jogada`);e0=ok(m.aplicarNova(e0,acao));e1=ok(m.aplicarNova(e1,acao));assert.equal(JSON.stringify(m.publicoNovo(e0)),JSON.stringify(m.publicoNovo(e1)),`${a}/${b}: estados diferentes`);for(const j of e0.jogadores)for(const p of j.campo){assert.ok(p.vida>0&&p.vida<=p.maxima);assert.ok(p.escudo>=0&&p.escudo<=6);}}
  assert.notEqual(e0.vencedor,null,`${a}/${b}: partida não terminou`);maxTurn=Math.max(maxTurn,e0.turno);games++;
  if(a!==b){report[a].partidas++;report[b].partidas++;if(e0.vencedor!== 'empate')report[e0.jogadores[e0.vencedor].elemento].vitorias++;}
 }
 console.log(JSON.stringify({simulacoes:games,maiorTurno:maxTurn,elementos:report}));
 for(const [el,r] of Object.entries(report))assert.ok(r.vitorias/r.partidas>.15&&r.vitorias/r.partidas<.85,`${el}: distribuição excessiva`);
});
