const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,deps={}){
 const exports={}; const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n);},structuredClone,globalThis:{crypto:globalThis.crypto},Uint32Array,setTimeout,clearTimeout,setInterval,clearInterval,console},{filename:path}); return exports;
}
const legacy=load('lib/jogos/arcanos/cartas.ts');
const cards=load('lib/jogos/arcanos/grimorios.ts',{'./grimorios.json':JSON.parse(fs.readFileSync('lib/jogos/arcanos/grimorios.json','utf8'))});
const m=load('lib/jogos/arcanos/motor-grimorios.ts',{'./cartas':legacy,'./grimorios':cards});
const robot=load('lib/jogos/arcanos/robo-grimorios.ts',{'./grimorios':cards,'./motor-grimorios':m});
const room=load('lib/jogos/arcanos/mesa-grimorios.ts',{'./cartas':legacy,'./motor-grimorios':m});
const ps=legacy.ELEMENTOS_ORDEM.map((elemento,i)=>({userId:'p'+i,nome:'Jogador '+i,elemento}));
const ok=r=>{assert.equal(r.ok,true,r.erro);return r.estado;};
const preparar=modo=>{const e=m.novaPartidaGrimorios(ps,0,undefined,modo);e.jogadores.forEach(j=>{j.comprou=true;j.fonte=12;});return e;};
const dar=(e,l,teste)=>{const c=cards.CARTAS_NOVAS.find(c=>c.elemento===ps[l].elemento&&teste(c));assert.ok(c);e.jogadores[l].mao=[c.id];e.jogadores[l].maoQtd=1;return c;};

test('limites de jogadores, equipes completas e elementos exclusivos em todos os modos',()=>{
 for(const modo of ['livre','duplas','trios']){
  assert.throws(()=>m.novaPartidaGrimorios([{...ps[0]},{...ps[1],elemento:ps[0].elemento},...ps.slice(2)],0,undefined,modo),/grimório diferente/);
  const e=m.novaPartidaGrimorios(ps,0,undefined,modo);assert.equal(e.jogadores.length,6);
  for(const j of e.jogadores)assert.equal(j.campo.length,10);
 }
 assert.throws(()=>m.novaPartidaGrimorios(ps.slice(0,5),0,undefined,'duplas'),/seis/);
 assert.throws(()=>m.novaPartidaGrimorios(ps.slice(0,5),0,undefined,'trios'),/seis/);
 assert.throws(()=>m.novaPartidaGrimorios([...ps,ps[0]],0),/inválidos/);
 assert.throws(()=>m.novaPartidaGrimorios(ps.map(p=>({...p,equipe:0})),0,undefined,'trios'),/equipes/);
 for(const n of [2,3,4,5,6])assert.equal(m.novaPartidaGrimorios(ps.slice(0,n),null).jogadores.length,n);
});

test('cura e escudo usam mana própria em aliado de outro grimório, sem fogo amigo',()=>{
 for(const modo of ['duplas','trios']){
  let e=preparar(modo),aliado=modo==='duplas'?3:2,alvo=e.jogadores[aliado].campo[4];alvo.vida=2;
  const cura=dar(e,0,c=>c.tipo==='magia'&&c.alvo==='aliado'&&c.efeitos.some(f=>f.tipo==='cura'));
  assert.ok(m.alvosNovos(e,0,cura).includes(alvo.id));assert.ok(!m.alvosNovos(e,0,cura).includes(e.jogadores[1].campo[0].id));
  e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:cura.id,alvo:alvo.id}));assert.ok(m.combatente(e,alvo.id).vida>2);assert.equal(e.jogadores[0].gasta,cura.custo);assert.equal(e.jogadores[aliado].gasta,0);
  const shield=dar(e,0,c=>c.reacao&&c.efeitos.some(f=>f.tipo==='escudo'));e.ativo=1;
  const inimigo=e.jogadores[1].campo[6];e=ok(m.aplicarNova(e,{t:'atacar',lado:1,atacante:inimigo.id,alvo:e.jogadores[aliado].campo[0].id}));
  assert.equal(m.podeCartaNova(e,0,shield.id),null);
  e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:shield.id,alvo:e.jogadores[aliado].campo[0].id}));assert.ok(e.jogadores[aliado].campo[0].escudo>0);
  assert.equal(m.aplicarNova(e,{t:'resolver',lado:0}).ok,false);e=ok(m.aplicarNova(e,{t:'resolver',lado:aliado}));
  assert.ok(!m.alvosAtaqueNovo(e,0).some(id=>m.combatente(e,id).dono===aliado));
 }
 const e=preparar('livre'),heal=dar(e,0,c=>c.alvo==='aliado');assert.ok(m.alvosNovos(e,0,heal).every(id=>m.combatente(e,id).dono===0));
});

test('tanks protegem seu exército e grupos não ultrapassam três alvos',()=>{
 let e=preparar('livre');assert.equal(m.alvosAtaqueNovo(e,0).length,10);
 e.jogadores[1].campo=e.jogadores[1].campo.filter(p=>cards.cartaNova(p.carta).funcao!=='tank');
 assert.equal(m.alvosAtaqueNovo(e,0).filter(id=>m.combatente(e,id).dono===1).length,8);
 const c=dar(e,0,c=>c.tipo==='feitico'&&c.efeitos.some(f=>f.mira==='inimigos'));
 e=ok(m.aplicarNova(e,{t:'jogar',lado:0,carta:c.id,alvo:e.jogadores[1].campo[0].id}));assert.ok(e.pendente.alvosGrupo.length<=3);
 const donos=new Set(e.pendente.alvosGrupo.map(id=>m.combatente(e,id).dono));for(const d of donos)assert.ok(m.podeReagirNovo(e,d));
});

test('jogador sem personagens é pulado, e equipe só perde quando todos são eliminados',()=>{
 let e=preparar('trios');e=ok(m.aplicarNova(e,{t:'desistir',lado:1}));assert.equal(e.vencedor,null);
 e=ok(m.aplicarNova(e,{t:'passar',lado:0}));assert.equal(e.ativo,2);
 e=ok(m.aplicarNova(e,{t:'desistir',lado:3}));assert.equal(e.vencedor,null);
 e=ok(m.aplicarNova(e,{t:'desistir',lado:5}));assert.equal(e.vencedor,0);assert.deepEqual(Array.from(e.vencedores),[0,2,4]);
 let f=preparar('livre');for(let i=1;i<5;i++)f=ok(m.aplicarNova(f,{t:'desistir',lado:i}));assert.equal(f.vencedor,null);f=ok(m.aplicarNova(f,{t:'desistir',lado:5}));assert.equal(f.vencedor,0);
});

test('controle dura o próximo turno do dono, mesmo quando eliminados alteram a rotação',()=>{
 let e=preparar('livre');e.ativo=1;
 const c=dar(e,1,c=>c.tipo==='feitico'&&c.efeitos.some(f=>f.tipo==='congelamento'));
 const alvo=e.jogadores[4].campo[4];e=ok(m.aplicarNova(e,{t:'jogar',lado:1,carta:c.id,alvo:alvo.id}));e=ok(m.aplicarNova(e,{t:'resolver',lado:4}));
 assert.equal(m.impedidoNovo(m.combatente(e,alvo.id)),true);
 e=ok(m.aplicarNova(e,{t:'desistir',lado:2}));e=ok(m.aplicarNova(e,{t:'desistir',lado:3}));
 e=ok(m.aplicarNova(e,{t:'passar',lado:1}));assert.equal(e.ativo,4);assert.equal(m.impedidoNovo(m.combatente(e,alvo.id)),true);
 e=ok(m.aplicarNova(e,{t:'comprar',lado:4,pilha:'magia'}));e=ok(m.aplicarNova(e,{t:'passar',lado:4}));assert.equal(m.impedidoNovo(m.combatente(e,alvo.id)),false);
});

test('partidas de seis terminam nos três modos com a mesma informação pública nos seis clientes',()=>{
 for(const modo of ['livre','duplas','trios'])for(let rodada=0;rodada<2;rodada++){
  let estados=ps.map((p,i)=>m.novaPartidaGrimorios(ps,i,m.embaralharNovo(p.elemento),modo)),passos=0;
  while(estados[0].vencedor===null&&passos++<6000){
   const e=estados[0],lado=e.pendente?m.defensorNovo(e):e.ativo;
   const a=robot.decidirGrimorios(estados[lado],lado);assert.ok(a,modo+' sem jogada');
   estados=estados.map(v=>ok(m.aplicarNova(v,a)));
   const publico=JSON.stringify(m.publicoNovo(estados[0]));for(const v of estados)assert.equal(JSON.stringify(m.publicoNovo(v)),publico);
  }
  assert.notEqual(estados[0].vencedor,null,modo+' não terminou');
  const e=estados[0];assert.ok(e.jogadores.some(j=>j.campo.length));assert.equal(new Set(e.jogadores.filter(j=>j.campo.length).map(j=>j.equipe)).size,1);
 }
});

const pausa=()=>new Promise(r=>setTimeout(r,12));
function rede(){const callbacks=new Map(),pacotes=[];return{pacotes,canal:(id)=>({estado:'ok',mesas:[],presentes:[],anunciar:async()=>{},ouvir:f=>{callbacks.set(id,f);return()=>callbacks.delete(id);},enviar:(mesa,tipo,dados={})=>{const m={...dados,mesa,tipo,de:id};pacotes.push(m);setTimeout(()=>callbacks.forEach((f,k)=>{if(k!==id)f(m);}),0);}})};}
test('sala reserva elementos concorrentes, transmite só jogadas públicas e sincroniza seis mãos privadas',async()=>{
 const net=rede(),salas=[],estados=[],lobbies=[],avisos=[];
 const criar=(i,elemento)=>room.criarMesaGrimorios({canal:net.canal(ps[i].userId),mesa:'teste',eu:ps[i],host:'p0',elemento,modo:'trios',onEstado:e=>estados[i]=e,onLobby:l=>lobbies[i]=l,onAviso:a=>avisos[i]=a});
 try{
  salas.push(criar(0,'fogo'));salas.push(criar(1,'fogo'));await pausa();await pausa();
  assert.equal(lobbies[0].participantes.length,1);assert.match(avisos[1],/escolhido/);
  salas[1].escolher('agua');for(let i=2;i<6;i++)salas.push(criar(i,ps[i].elemento));await pausa();await pausa();
  assert.equal(lobbies[0].participantes.length,6);assert.equal(new Set(lobbies[0].participantes.map(p=>p.elemento)).size,6);
  salas[0].iniciar();await pausa();await pausa();assert.equal(estados.filter(Boolean).length,6);
  salas[0].jogar({t:'comprar',lado:0,pilha:'magia'});await pausa();salas[0].jogar({t:'passar',lado:0});await pausa();
  salas[1].jogar({t:'comprar',lado:1,pilha:'mana'});await pausa();await pausa();
  for(let i=0;i<6;i++){assert.equal(estados[i].seq,3);assert.ok(Array.isArray(estados[i].jogadores[i].mao));for(let k=0;k<6;k++)if(k!==i)assert.equal(estados[i].jogadores[k].mao,null);}
  const publico=JSON.stringify(m.publicoNovo(estados[0]));for(const v of estados)assert.equal(JSON.stringify(m.publicoNovo(v)),publico);
  for(const msg of net.pacotes.filter(p=>p.tipo==='arc2:publico'))for(const j of msg.estado.jogadores)for(const k of ['mao','maoMana','baralho','reserva'])assert.equal(j[k],null);
  salas[0].jogar({t:'desistir',lado:0});await pausa();salas[0].fechar();await pausa();
  salas[1].jogar({t:'passar',lado:1});await pausa();await pausa();assert.equal(estados[2].ativo,2);assert.equal(estados[2].seq,5);
 }finally{salas.forEach(s=>s.fechar());}
});

test('sessenta miniaturas têm geometria 3D, escala válida, identidade própria e liberação dos materiais',()=>{
 const T=require('three');const modelos=load('lib/jogos/arcanos/miniaturas.ts',{three:T,'three/addons/utils/BufferGeometryUtils.js':require('three/addons/utils/BufferGeometryUtils.js')});
 for(const c of cards.CARTAS_NOVAS.filter(c=>c.tipo==='personagem')){
  const g=modelos.criarMiniatura(c),box=new T.Box3().setFromObject(g),size=box.getSize(new T.Vector3());
  assert.equal(g.userData.personagem,c.id);assert.ok(size.x>.5&&size.y>2&&size.z>.3);assert.ok(g.children.length>4&&g.children.length<20);
  let liberados=0;const mats=new Set(g.children.map(o=>o.material));mats.forEach(mat=>mat.addEventListener('dispose',()=>liberados++));modelos.liberarMiniatura(g);assert.equal(liberados,mats.size);assert.equal(g.children.length,0);
 }
});
