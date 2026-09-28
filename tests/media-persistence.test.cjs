const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const ts=require('typescript');
const fs=require('node:fs');
const {NextRequest,NextResponse}=require('next/server');
function setup(){
 const exports={},env={SPOTIFY_CLIENT_ID:'test',SPOTIFY_CLIENT_SECRET:'secret'};let error=null;let clock=Date.now();
 class Clock extends Date{static now(){return clock;}}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/spotify-conta.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
 exports,Buffer,URL,URLSearchParams,AbortSignal,Date:Clock,process:{env},
 require:n=>({'server-only':{},'node:crypto':require('node:crypto'),'next/server':{NextResponse}}[n]),
 fetch:async url=>({ok:!error,status:error?400:200,json:async()=>error?{error}:String(url).endsWith('/me')?{display_name:'Test'}:{access_token:'access',refresh_token:'refresh',expires_in:3600}})
 });
 const request=(path,cookie)=>new NextRequest('https://nexo.example'+path,{headers:cookie?{cookie}:undefined});
 return {exports,env,request,advance:()=>clock+=3600001,error:v=>error=v};
}
test('Spotify rejects insecure, foreign and malformed callback URLs',()=>{
 const a=setup();
 for(const uri of ['http://nexo.example/api/spotify/retorno','https://wrong.example/api/spotify/retorno','invalid','https://nexo.example/api/spotify/retorno?x=1']){
 a.env.SPOTIFY_REDIRECT_URI=uri;
 const r=a.exports.iniciarLogin(a.request('/api/spotify/entrar'));
 assert.equal(new URL(r.headers.get('location')).origin,'https://nexo.example');
 assert.equal(new URL(r.headers.get('location')).searchParams.get('spotify'),'off');
 }
});
test('Spotify restores cookies, survives outages and clears revoked grants',async()=>{
 const a=setup();const start=a.exports.iniciarLogin(a.request('/api/spotify/entrar'));
 const state=new URL(start.headers.get('location')).searchParams.get('state');
 const pending=start.cookies.get('nexo_spotify_pedido');
 const callback=await a.exports.concluirLogin(a.request('/api/spotify/retorno?code=test&state='+state,pending.name+'='+pending.value));
 const session=callback.cookies.get('nexo_spotify');const cookie=session.name+'='+session.value;
 const restored=await a.exports.tokenDoPlayer(a.request('/api/spotify/token',cookie));
 assert.equal((await restored.json()).conectado,true);assert.equal(restored.cookies.get('nexo_spotify_on').value,'1');
 assert.equal(restored.cookies.get('nexo_spotify').maxAge,180*86400);
 a.advance();a.error('temporarily_unavailable');
 const outage=await a.exports.tokenDoPlayer(a.request('/api/spotify/token',cookie));assert.equal(outage.status,502);assert.equal(outage.cookies.getAll().length,0);
 a.error(null);assert.equal((await(await a.exports.tokenDoPlayer(a.request('/api/spotify/token',cookie))).json()).conectado,true);
 a.error('invalid_grant');const revoked=await a.exports.tokenDoPlayer(a.request('/api/spotify/token',cookie));assert.equal((await revoked.json()).conectado,false);assert.equal(revoked.cookies.get('nexo_spotify').maxAge,0);
});
test('external navigation keeps internal pages in the platform tab',()=>{
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/external-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL});
 for(const [href,expected] of [['/conta',false],['/#trilha',false],['https://youtube.com/watch?v=x',true],['/api/youtube/entrar',true],['/api/spotify/entrar',true],['mailto:test@example.com',false]])assert.equal(exports.opensNewTab(href,'https://nexo.example'),expected);
});
