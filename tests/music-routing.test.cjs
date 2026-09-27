const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse, NextRequest } = require('next/server');
function moduleAt(path, dependencies) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
 {exports, URL, Number, Error, require: name => {if (!(name in dependencies)) throw Error(name); return dependencies[name];}});
 return exports;
}
test('all Spotify handlers enforce admin access independently of middleware', async () => {
 for(const [route, method, handler] of [['entrar','GET','iniciarLogin'],['retorno','GET','concluirLogin'],['token','GET','tokenDoPlayer'],['sair','POST','encerrar']]) {
  for(const ok of [false,true]) {
   let calls=0;
   const mod=moduleAt(`app/api/spotify/${route}/route.ts`, {
    '@/lib/api-helpers':{requireAdmin:async()=>ok?{ok:true}:{ok:false,response:NextResponse.json({}, {status:403})}},
    '@/lib/spotify-conta':{[handler]:()=>{calls++;return NextResponse.json({ok:true});}},
   });
   assert.equal((await mod[method](new NextRequest('https://nexo.example/api/spotify/'+route))).status,ok?200:403);
   assert.equal(calls,ok?1:0);
  }
 }
});
test('YouTube music uses preferences without any Spotify dependencies and handles failures', async () => {
 for(const scenario of ['visitor','anonymous','unknown','success','network']) {
  let query='';
  const mod=moduleAt('app/api/musica/route.ts', {
   'next/server':{NextResponse}, 'next/cache':{unstable_cache:fn=>fn},
   '@/lib/api-helpers':{getSession:async()=>({user:scenario==='visitor'?null:{id:'member',is_anonymous:scenario==='anonymous'}})},
   '@/lib/youtube-conta':{preferenciasYoutube:async()=>({conectado:false,videos:[]})},
   '@/lib/taxonomy':{MUSIC_GENRES:[{id:'rock',label:'Rock'}]},
   '@/lib/descoberta-musical':{diaDeHoje:()=> '2026-09-27'},
   '@/lib/youtube':{searchVideos:async q=>{query=q;if(scenario==='network')throw Error('offline');return [{id:'abcdefghijk',title:'Music'}, {id:'abcdefghijk'}, {id:'invalid'}];}},
  });
  const res=await mod.GET(new Request('https://nexo.example/api/musica?genre='+(scenario==='unknown'?'wrong':'rock')+'&mix=lancamentos&rodada=Infinity'));
  const expected={visitor:401,anonymous:401,unknown:400,success:200,network:502}[scenario];
  assert.equal(res.status,expected);
  if(scenario==='success'){const data=await res.json();assert.equal(data.provider,'youtube');assert.equal(data.videos.length,1);assert.equal(data.rodada,0);assert.match(query,/Rock lançamentos 2026/);}
 }
});
