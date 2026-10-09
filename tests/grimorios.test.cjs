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
function baixa(e,l,p) {
 const j=e.jogadores[l]; p.vida=0; j.campo=j.campo.filter(q=>q.id!==p.id); j.mortos.push(p.carta); j.caidos.push(p); return p;
}
function retorno(e,l,sufixo='retorno') { return darCarta(e,l,cartas.cartaNova(`${e.jogadores[l].elemento}-${sufixo}`).nome); }

test('todos os grimórios têm quatro retornos e uma habilidade adicional exclusiva, com compra pública correta',()=>{
 const nomes=[];
 for(const el of els) {
  const e=mesa(el,els.find(x=>x!==el)),g=cartas.grimorioNovo(el),rs=g.cartas.filter(c=>c.efeitos.some(f=>f.tipo==='reviver'));
  assert.equal(rs.length,4);assert.equal(rs.filter(c=>c.tipo==='feitico').length,1);assert.ok(rs.every(c=>c.copias===1&&c.custo>=5&&c.custo<=6));
  const habilidades=g.cartas.flatMap(c=>c.habilidades??[]);assert.equal(habilidades.length,1);nomes.push(habilidades[0].nome);assert.equal(habilidades[0].limite,'partida');
  assert.equal(e.jogadores[0].baralhoQtd,47);assert.equal(e.jogadores[0].reservaQtd,22);
  for(const c of rs)assert.match(m.podeCartaNova(e,0,darCarta(e,0,c.nome)),/Não há aliado/);
 }
 assert.equal(new Set(nomes).size,6);
});

test('ressurreições pagam a mana e restauram cada personagem na mesma posição sem reiniciar habilidades',()=>{
 for(const el of els)for(const suffix of ['retorno','retorno-protegido','retorno-regenerador','ritual-de-retorno']) {
  let e=mesa(el,els.find(x=>x!==el));const p=baixa(e,0,e.jogadores[0].campo[6]);p.especialUsado=true;p.usoEspecial=1;p.bonus=3;p.escudo=6;p.efeitos=[{tipo:'queimadura',valor:1,restantes:2,vence:2}];
  const id=retorno(e,0,suffix),c=cartas.cartaNova(id),original=JSON.stringify(e);
  e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:p.id}));
  if(c.tipo==='feitico'){assert.equal(m.combatente(e,p.id),undefined);e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));}
  const vivo=m.combatente(e,p.id);assert.ok(vivo);assert.equal(vivo.vida,c.efeitos[0].valor);assert.equal(vivo.especialUsado,true);assert.equal(vivo.usoEspecial,1);assert.equal(vivo.bonus,0);assert.equal(vivo.reviveu,true);
  assert.ok(vivo.efeitos.some(x=>x.tipo==='exaustao'));assert.ok(!vivo.efeitos.some(x=>x.tipo==='queimadura'));assert.equal(vivo.escudo,suffix==='retorno-protegido'?2:0);
  assert.equal(e.jogadores[0].campo[6].id,p.id);assert.ok(!e.jogadores[0].mortos.includes(p.carta));assert.ok(!e.jogadores[0].caidos.some(q=>q.id===p.id));assert.equal(e.jogadores[0].gasta,c.custo);assert.ok(e.jogadores[0].descarte.includes(id));assert.notEqual(JSON.stringify(e),original);
  assert.equal(m.podeAtaqueNovo(e,vivo),false);
  const proprio=cartas.grimorioNovo(el).cartas.find(c=>c.conjurador===p.carta);darCarta(e,0,proprio.nome);assert.match(m.podeCartaNova(e,0,proprio.id),/exausto/);
  e=ok(m.aplicarNova(e,{t:'passar',lado:0}));e.jogadores[1].comprou=true;e=ok(m.aplicarNova(e,{t:'passar',lado:1}));
  assert.ok(!m.combatente(e,p.id).efeitos.some(x=>x.tipo==='exaustao'));assert.equal(m.combatente(e,p.id).atacou,false);
 }
});

test('alvos vivos, inimigos, segunda ressurreição e cartas sem mana não consomem recursos',()=>{
 let e=mesa();const p=baixa(e,0,e.jogadores[0].campo[6]),id=retorno(e,0);
 for(const alvo of [e.jogadores[0].campo[0].id,e.jogadores[1].campo[0].id,'9:inventado']) {const original=JSON.stringify(e);assert.equal(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo}).ok,false);assert.equal(JSON.stringify(e),original);}
 e.jogadores[0].fonte=4;assert.match(m.podeCartaNova(e,0,id),/Mana/);e.jogadores[0].fonte=12;
 e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:p.id}));baixa(e,0,m.combatente(e,p.id));retorno(e,0);assert.ok(!m.alvosNovos(e,0,cartas.cartaNova(id)).includes(p.id));assert.equal(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:p.id}).ok,false);
});

test('suportes preservam seu efeito original e usam a habilidade de retorno apenas uma vez, sem gastar se não há morto',()=>{
 for(const el of els) {
  let e=mesa(el,els.find(x=>x!==el));const c=cartas.grimorioNovo(el).cartas.find(c=>c.habilidades),h=c.habilidades[0];let caster=e.jogadores[0].campo.find(p=>p.carta===c.id);
  const ativar=()=>{
   caster=e.jogadores[0].campo.find(p=>p.carta===c.id);
   if(h.condicao==='siMeiaVida')caster.vida=4;if(h.condicao==='siEscudo')caster.escudo=1;
   if(h.gatilho==='inicio'){e.ativo=1;e.jogadores[1].comprou=true;e=ok(m.aplicarNova(e,{t:'passar',lado:1}));}
   else {e.ativo=0;e.jogadores[0].comprou=true;e.jogadores[0].gasta=0;
    const spell=cartas.grimorioNovo(el).cartas.find(s=>s.conjurador===c.id&&(h.gatilho==='curar'?s.tipo==='magia'&&s.alvo==='aliado'&&s.efeitos.some(f=>f.tipo==='cura'):h.gatilho==='conjurarMagia'?s.efeitos.some(f=>f.tipo==='purificar'):s.tipo==='feitico'));
    const target=h.gatilho==='conjurarFeitico'?e.jogadores[1].campo[0]:e.jogadores[0].campo[0];target.vida=2;darCarta(e,0,spell.nome);e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:spell.id,alvo:target.id}));if(e.pendente)e=ok(m.aplicarNova(e,{t:'resolver',lado:1}));
   }
  };
  ativar();assert.equal(m.combatente(e,caster.id).habilidadesUsadas?.[h.nome],undefined);
  const fallen=baixa(e,0,e.jogadores[0].campo.find(p=>cartas.cartaNova(p.carta).funcao==='guerreiro'));ativar();assert.equal(m.combatente(e,fallen.id).vida,h.valor);assert.ok(m.combatente(e,caster.id).habilidadesUsadas[h.nome]);
  const another=baixa(e,0,e.jogadores[0].campo.find(p=>cartas.cartaNova(p.carta).funcao==='arqueiro'));ativar();assert.equal(m.combatente(e,another.id),undefined);
 }
});

test('robô escolhe reviver um aliado elegível, e clientes públicos e privados aplicam o mesmo retorno',()=>{
 let e=mesa();const p=baixa(e,0,e.jogadores[0].campo[6]),id=retorno(e,0);e.jogadores[0].jogouMana=true;
 assert.equal(robo.decidirGrimorios(e,0).carta,id);
 const a={t:'jogar',lado:0,carta:id,alvo:p.id},publico=m.publicoNovo(e),privado=ok(m.aplicarNova(e,a)),remoto=ok(m.aplicarNova(publico,a));
 assert.equal(JSON.stringify(m.publicoNovo(privado)),JSON.stringify(m.publicoNovo(remoto)));assert.equal(e.jogadores[0].campo.length,9);
});

test('baixa real armazena usos de habilidades, retorno preserva a ficha e segunda morte fecha sua ressurreição',()=>{
 let e=mesa('fogo','agua');const p=e.jogadores[0].campo[6];p.vida=1;p.especialUsado=true;p.habilidadesUsadas={teste:1};
 const matar=()=>{e.ativo=1;e.jogadores[1].comprou=true;e.jogadores[1].gasta=0;const id=darCarta(e,1,'Jato de Alta Pressão');e=ok(m.aplicarNova(e,{t:'jogar',lado:1,carta:id,alvo:p.id}));e=ok(m.aplicarNova(e,{t:'resolver',lado:0}));};
 matar();assert.equal(m.combatente(e,p.id),undefined);assert.equal(e.jogadores[0].caidos.find(q=>q.id===p.id).habilidadesUsadas.teste,1);
 e.ativo=0;const id=retorno(e,0);e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:id,alvo:p.id}));assert.equal(m.combatente(e,p.id).habilidadesUsadas.teste,1);
 m.combatente(e,p.id).vida=1;matar();assert.equal(e.jogadores[0].caidos.find(q=>q.id===p.id).reviveu,true);assert.ok(!m.alvosNovos(e,0,cartas.cartaNova(id)).includes(p.id));
});

test('reviver durante o início do turno não aplica duas vezes regeneração em quem já estava em campo',()=>{
 let e=mesa('terra','fogo'),j=e.jogadores[0];const caster=j.campo.find(p=>cartas.cartaNova(p.carta).habilidades);caster.efeitos=[{tipo:'regeneracao',valor:1,restantes:2,vence:3}];caster.vida=7;
 const p=baixa(e,0,j.campo[0]);e.ativo=1;e.jogadores[1].comprou=true;e=ok(m.aplicarNova(e,{t:'passar',lado:1}));
 assert.equal(m.combatente(e,p.id).vida,2);assert.equal(m.combatente(e,caster.id).efeitos.find(x=>x.tipo==='regeneracao').restantes,1);
});
test('a reação ao golpe pertence ao defensor',()=>{
 let e=mesa();const p=e.jogadores[0].campo.find(p=>cartas.cartaNova(p.carta).funcao==='guerreiro');
 e=ok(m.aplicarNova(e,{t:'atacar',lado:0,atacante:p.id,alvo:e.jogadores[1].campo[0].id}));
 const c=cartas.CARTAS_NOVAS.find(c=>c.elemento==='fogo'&&c.reacao);
 darCarta(e,0,c.nome);assert.match(m.podeCartaNova(e,0,c.id),/defensor/);
});
test('288 títulos, 60 personagens/efeitos exclusivos, seis reservas suficientes e valores recalculados',()=>{
 assert.equal(cartas.CARTAS_NOVAS.length,288);
 assert.equal(new Set(cartas.CARTAS_NOVAS.map(c=>c.id)).size,288);
 assert.equal(new Set(cartas.CARTAS_NOVAS.map(c=>c.nome)).size,288);
 const especiais=[];
 for(const g of dados){const p=g.cartas.filter(c=>c.tipo==='personagem');assert.equal(p.length,10);assert.equal(cartas.pilhaNova(g.elemento).length,52);assert.equal(cartas.pilhaNova(g.elemento,true).length,24);
 for(const f of ['tank','mago','suporte','guerreiro','arqueiro'])assert.equal(p.filter(c=>c.funcao===f).length,2);
 for(const c of p){assert.ok(c.vida>=8&&c.vida<=15);assert.ok(c.ataque>=1&&c.ataque<=6);if(c.funcao==='tank')assert.equal(c.vida,15);else if(c.funcao==='suporte')assert.equal(c.vida,8);else assert.ok(c.vida>8&&c.vida<15);const {nome,texto,...signature}=c.especial;especiais.push(JSON.stringify(signature));assert.ok(texto.includes('Uma vez'));}
 for(const c of g.cartas.filter(c=>c.conjurador)){assert.ok(p.some(p=>p.id===c.conjurador));assert.ok(c.custo>=2&&c.custo<=(c.efeitos.some(f=>f.tipo==='reviver')?6:4));for(const f of c.efeitos){if(['dano','escudo'].includes(f.tipo))assert.ok(f.valor>=1&&f.valor<=6);if(['aliados','inimigos'].includes(f.mira))assert.equal(f.maxAlvos,3);}}
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
 for(const a of els)for(const b of els.filter(el=>el!==a))for(let run=0;run<4;run++){
  const p=ps(a,b);let e0=m.novaPartidaGrimorios(p,0,m.embaralharNovo(a)),e1=m.novaPartidaGrimorios(p,1,m.embaralharNovo(b));let steps=0;
  while(e0.vencedor===null&&steps++<2200){const lado=e0.pendente?m.outroNovo(e0.pendente.lado):e0.ativo;const acao=robo.decidirGrimorios(lado===0?e0:e1,lado);assert.ok(acao,`${a}/${b}: falta jogada`);e0=ok(m.aplicarNova(e0,acao));e1=ok(m.aplicarNova(e1,acao));assert.equal(JSON.stringify(m.publicoNovo(e0)),JSON.stringify(m.publicoNovo(e1)),`${a}/${b}: estados diferentes`);for(const j of e0.jogadores)for(const p of j.campo){assert.ok(p.vida>0&&p.vida<=p.maxima);assert.ok(p.escudo>=0&&p.escudo<=6);}}
  assert.notEqual(e0.vencedor,null,`${a}/${b}: partida não terminou`);maxTurn=Math.max(maxTurn,e0.turno);games++;
  if(a!==b){report[a].partidas++;report[b].partidas++;if(e0.vencedor!== 'empate')report[e0.jogadores[e0.vencedor].elemento].vitorias++;}
 }
 console.log(JSON.stringify({simulacoes:games,maiorTurno:maxTurn,elementos:report}));
 for(const [el,r] of Object.entries(report))assert.ok(r.vitorias/r.partidas>.15&&r.vitorias/r.partidas<.85,`${el}: distribuição excessiva`);
});
