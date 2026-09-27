const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const ts=require('typescript');
const fs=require('node:fs');
const {NextResponse}=require('next/server');
function setup(configured=true) {
 const jar=new Map();let uid='user-a';const calls=[];
 const scope='https://www.googleapis.com/auth/youtube.readonly';
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/youtube-conta.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports,Buffer,URL,URLSearchParams,Date,AbortSignal,process:{env:configured?{YOUTUBE_OAUTH_CLIENT_ID:'id',YOUTUBE_OAUTH_CLIENT_SECRET:'secret',YOUTUBE_SESSION_SECRET:'cookie-secret'}:{}},
  fetch:async(url,options)=>{calls.push(String(url));return {ok:true,json:async()=>String(url).includes('/token')?{access_token:'access',refresh_token:'refresh',expires_in:3600,scope}:{items:[]}};},
  require:name=>({'server-only':{},'node:crypto':require('node:crypto'),'next/server':{NextResponse},'next/headers':{cookies:()=>({get:n=>jar.has(n)?{value:jar.get(n)}:undefined,set:(n,v)=>jar.set(n,v)})},'./api-helpers':{getSession:async()=>({user:uid?{id:uid}:null})}}[name]),
 });
 return {api:exports,jar,calls,user:value=>uid=value,request:(action,query='')=>exports.youtubeAccount(new Request('https://nexo.example/api/youtube/'+action+query),action)};
}
test('YouTube connection requires platform login and configured credentials',async()=>{
 const a=setup();a.user(null);assert.equal((await a.request('entrar')).status,401);
 const b=setup(false);assert.match((await b.request('entrar')).headers.get('location'),/indisponivel/);assert.equal(b.calls.length,0);
});
test('OAuth uses readonly scope, PKCE, encrypted state and rejects tampering',async()=>{
 const a=setup();const r=await a.request('entrar');const url=new URL(r.headers.get('location'));
 assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.match(url.searchParams.get('scope'),/youtube.readonly$/);
 assert.ok(!a.jar.get('nexo_youtube_oauth').includes('user-a'));
 assert.match((await a.request('retorno','?state=wrong&code=code')).headers.get('location'),/falhou/);assert.equal(a.calls.length,0);
});
test('OAuth callback cannot attach an account to a different platform user',async()=>{
 const a=setup();const url=new URL((await a.request('entrar')).headers.get('location'));a.user('user-b');
 assert.match((await a.request('retorno','?state='+url.searchParams.get('state')+'&code=code')).headers.get('location'),/falhou/);assert.equal(a.calls.length,0);
});
test('successful connection isolates tokens by platform user and disconnect revokes them',async()=>{
 const a=setup();const url=new URL((await a.request('entrar')).headers.get('location'));
 assert.match((await a.request('retorno','?state='+url.searchParams.get('state')+'&code=code')).headers.get('location'),/conectado/);
 assert.equal(await a.api.youtubeAccess('user-a'),'access');assert.equal(await a.api.youtubeAccess('user-b'),null);
 const status=await (await a.request('conta')).json();assert.equal(status.conectado,true);assert.equal(status.token,undefined);
 await a.request('sair');assert.equal(await a.api.youtubeAccess('user-a'),null);assert.ok(a.calls.some(u=>u.includes('/revoke')));
});
