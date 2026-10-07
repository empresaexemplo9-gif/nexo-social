const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,deps={}){
 const exports={}; const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
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


const T=require('three');
const artes=load('lib/jogos/arcanos/miniaturas-atlas.ts');
const relevo=load('lib/jogos/arcanos/relevo-alpha.ts',{three:T});
function modelosCom(t=T){return load('lib/jogos/arcanos/miniaturas.ts',{three:t,'./miniaturas-atlas':artes,'./relevo-alpha':relevo});}
function mascara(){const largura=24,altura=32,alpha=new Uint8Array(largura*altura).fill(255);for(let y=12;y<20;y++)for(let x=9;x<15;x++)alpha[y*largura+x]=0;return{largura,altura,alpha,proporcao:.55};}

test('sessenta miniaturas têm volume, identidade própria e liberação dos materiais',()=>{
 const modelos=modelosCom();
 for(const c of cards.CARTAS_NOVAS.filter(c=>c.tipo==='personagem')){
  const g=modelos.criarMiniatura(c,mascara()),size=new T.Box3().setFromObject(g).getSize(new T.Vector3());
  assert.equal(g.userData.personagem,c.id);assert.ok(size.x>.5&&size.y>2&&size.z>.3);assert.equal(g.children.length,9);
  let liberados=0;const mats=new Set(g.children.map(o=>o.material));mats.forEach(mat=>mat.addEventListener('dispose',()=>liberados++));modelos.liberarMiniatura(g);assert.equal(liberados,mats.size);assert.equal(g.children.length,0);
 }
});

test('cada personagem ocupa um quadro exclusivo da arte derivada e preserva seu card original',()=>{
 const modelos=modelosCom(),quadros=new Set();
 for(const c of cards.CARTAS_NOVAS.filter(c=>c.tipo==='personagem')){
  const arte=artes.arteDaMiniatura(c),chave=arte.src+':'+arte.posicao;assert.ok(!quadros.has(chave),c.id);quadros.add(chave);
  assert.ok(fs.existsSync('public'+arte.src),c.id);
  const g=modelos.criarMiniatura(c,mascara()),r=modelos.regiaoDaArte(arte),frente=g.children.find(p=>p.material.userData.recorte),uv=frente.geometry.getAttribute('uv');
  assert.equal(g.userData.arte,c.arte.src);assert.equal(g.userData.arteMiniatura,arte.src);
  for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>=r.x-1e-6&&uv.getX(i)<=r.x+r.largura+1e-6,c.id);assert.ok(uv.getY(i)>=r.y-1e-6&&uv.getY(i)<=r.y+r.altura+1e-6,c.id);}
  modelos.liberarMiniatura(g);
 }assert.equal(quadros.size,60);
});

test('o relevo preserva vazios entre membros e fecha o contorno com frente e verso',()=>{
 const gs=relevo.esculpirMiniatura(mascara(),{x:0,y:0,largura:1,altura:1});
 const mesh=new T.Mesh(gs.frente,new T.MeshBasicMaterial());mesh.updateMatrixWorld();
 const ray=new T.Raycaster(new T.Vector3(0,1.44,10),new T.Vector3(0,0,-1));assert.equal(ray.intersectObject(mesh).length,0);
 ray.set(new T.Vector3(-.5,1.44,10),new T.Vector3(0,0,-1));assert.ok(ray.intersectObject(mesh).length>0);
 assert.equal(gs.frente.index.count,gs.verso.index.count);assert.ok(gs.bordas.getAttribute('position').count>0);
 Object.values(gs).forEach(g=>{for(const v of g.getAttribute('position').array)assert.ok(Number.isFinite(v));g.dispose();});mesh.material.dispose();
});

test('atlas compartilhado só é liberado após a última miniatura, inclusive morte durante a carga',async()=>{
 let carregadas=0,liberadas=0,terminar;const textura=new T.Texture();textura.addEventListener('dispose',()=>liberadas++);
 const modelos=modelosCom({...T,TextureLoader:class{loadAsync(){carregadas++;return new Promise(r=>terminar=()=>r(textura));}}});
 const cs=cards.CARTAS_NOVAS.filter(c=>c.tipo==='personagem'&&c.elemento==='fogo'),[c1,c2]=cs;
 const a=modelos.criarMiniatura(c1,mascara()),b=modelos.criarMiniatura(c2,mascara()),pa=modelos.texturizarMiniatura(a,c1),pb=modelos.texturizarMiniatura(b,c2);
 assert.equal(carregadas,1);modelos.liberarMiniatura(a);terminar();await Promise.all([pa,pb]);
 assert.equal(a.userData.texturizada,false);assert.equal(b.userData.texturizada,true);assert.equal(liberadas,0);
 assert.equal(b.children.find(p=>p.material.userData.recorte).material.map,textura);
 modelos.liberarMiniatura(b);await Promise.resolve();assert.equal(liberadas,1);
});

test('fragmentos isolados do atlas não viram miniaturas nem deslocam os pés',()=>{
 const m=mascara();m.alpha.fill(0);for(let y=3;y<26;y++)for(let x=6;x<18;x++)m.alpha[y*m.largura+x]=255;m.alpha[31*m.largura]=255;
 const limpa=relevo.isolarPersonagem(m);assert.equal(limpa.alpha[31*m.largura],0);assert.equal(limpa.alpha[8*m.largura+9],255);assert.equal(m.alpha[31*m.largura],255);
});

test('a câmera superior projeta os pés na borda da carta após rolagem e mudança de tamanho',()=>{
 const c=load('lib/jogos/arcanos/camera-tabuleiro.ts');
 for(const [w,h] of [[1400,1000],[390,820],[800,1600]]){
  const camera=new T.OrthographicCamera(-w/2,w/2,h/2,-h/2,.1,6000);camera.position.set(w/2,1800*Math.sin(c.ELEVACAO_TABULEIRO),1800*Math.cos(c.ELEVACAO_TABULEIRO));camera.lookAt(w/2,0,0);camera.updateMatrixWorld();
  for(const [x,y] of [[w*.2,100],[w*.7,h*.8]]){const p=c.posicaoNoTabuleiro(x,y,h),v=new T.Vector3(p.x,p.y,p.z).project(camera);assert.ok(Math.abs((v.x+1)*w/2-x)<1e-7);assert.ok(Math.abs((1-v.y)*h/2-y)<1e-7);}
  const escala=c.escalaNoTabuleiro(80,100,{largura:1.46,altura:2.8,profundidade:.6});assert.ok(escala>0&&Number.isFinite(escala));
 }
});

test('contornos suavizados continuam fechados e com normais finitas',()=>{
 const gs=relevo.esculpirMiniatura(mascara(),{x:.2,y:0,largura:.2,altura:.5}),extremos=new Set();
 for(const g of [gs.frente,gs.verso]){const p=g.getAttribute('position');for(let i=0;i<p.count;i++)extremos.add([p.getX(i),p.getY(i),p.getZ(i)].join(','));}
 const bordas=gs.bordas.getAttribute('position');for(let i=0;i<bordas.count;i++)assert.ok(extremos.has([bordas.getX(i),bordas.getY(i),bordas.getZ(i)].join(',')));
 for(const g of Object.values(gs)){for(const v of g.getAttribute('normal').array)assert.ok(Number.isFinite(v));g.dispose();}
});

test('miniaturas usam iluminação física e liberam as instâncias das runas',()=>{
 const modelos=modelosCom(),c=cards.CARTAS_NOVAS.find(c=>c.tipo==='personagem'),g=modelos.criarMiniatura(c,mascara(),'detalhe');
 const frente=g.children.find(p=>p.material.userData.recorte);assert.ok(frente.material instanceof T.MeshStandardMaterial);assert.equal(frente.material.alphaToCoverage,true);assert.equal(g.userData.qualidade,'detalhe');
 const runas=g.children.find(p=>p instanceof T.InstancedMesh);assert.equal(runas.count,12);let descartada=false;runas.addEventListener('dispose',()=>descartada=true);modelos.liberarMiniatura(g);assert.equal(descartada,true);
});

test('perspectiva mantém o próprio exército abaixo de todos os outros para os seis assentos',()=>{
 const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
 const estilos=new Proxy({},{get:(_,k)=>String(k)});
 const cartasVisuais=load('components/comunidade/jogos/CartasGrimorios.tsx',{react:React,'next/image':()=>null,'@/lib/jogos/arcanos/cartas':legacy,'@/lib/jogos/arcanos/grimorios':cards});
 const campo=load('components/comunidade/jogos/CampoDeBatalha.tsx',{
  react:{...React,useLayoutEffect:React.useEffect},'next/image':()=>null,
  '@/lib/jogos/arcanos/cartas':legacy,'@/lib/jogos/arcanos/grimorios':cards,'@/lib/jogos/arcanos/motor-grimorios':m,
  './CartasGrimorios':cartasVisuais,'./CampoDeBatalha.module.css':estilos
 }).default;
 for(const modo of ['livre','trios','duplas'])for(let eu=0;eu<6;eu++){
  const e=preparar(modo);e.eu=eu;const html=render(React.createElement(campo,{estado:e,selecionada:null,segundos:100}));
  const proprio=html.indexOf('aria-label="Sua formação · parte inferior"');assert.ok(proprio>0);
  assert.equal((html.match(/data-carta-completa=/g)||[]).length,60);
  assert.ok(!html.includes('<canvas'));assert.ok(!html.includes('Girar miniaturas'));
  const personagem=cards.cartaNova(e.jogadores[eu].campo[0].carta);assert.ok(html.includes(personagem.especial.nome));assert.ok(html.includes(personagem.texto));
  assert.ok(html.indexOf('data-posicao="superior"')<proprio);assert.ok(html.slice(proprio).includes('data-exercito="p'+eu+'"'));
  assert.equal((html.match(/data-posicao="superior"/g)||[]).length,5);assert.equal((html.match(/hidden=""/g)||[]).length,4);
 }
});
