const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const ts=require('typescript');
const fs=require('node:fs');
const {NextResponse}=require('next/server');
const scope='https://www.googleapis.com/auth/youtube.readonly';
function setup(options={}) {
 const jar=new Map(), attributes=new Map(), calls=[];let uid='user-a', clock=Date.now();
 const env=options.env || {YOUTUBE_OAUTH_CLIENT_ID:'id',YOUTUBE_OAUTH_CLIENT_SECRET:'secret',YOUTUBE_SESSION_SECRET:'cookie-secret',NODE_ENV:'production'};
 const exports={};
 class Clock extends Date { static now(){return clock;} }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/youtube-conta.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports,Buffer,URL,URLSearchParams,Date:Clock,AbortSignal,process:{env},
  fetch:async(url,init)=>{
   calls.push({url:String(url),init});
   if(String(url).includes('/token'))return {ok:!options.tokenError,json:async()=> options.tokenError?{error:options.tokenError}:{access_token:'access',refresh_token:options.noRefresh?undefined:'refresh',expires_in:3600,scope:options.scope??scope}};
   if(String(url).includes('/revoke'))return {ok:!options.revokeError,json:async()=>({error:options.revokeError})};
   return {ok:!options.apiError,json:async()=>options.apiError?{error:{errors:[{reason:options.apiError}]}}:{items:[]}};
  },
  require:name=>({'server-only':{},'node:crypto':require('node:crypto'),'next/server':{NextResponse},'next/headers':{cookies:()=>({get:n=>jar.has(n)?{value:jar.get(n)}:undefined,set:(n,v,o)=>{jar.set(n,v);attributes.set(n,o);}})},'./auth':{isPlatformAdmin:email=>email==='admin@example.com'},'./api-helpers':{getSession:async()=>({user:uid?{id:uid,email:options.admin?'admin@example.com':'member@example.com'}:null})}}[name]),
 });
 const request=(action,query='',init)=>exports.youtubeAccount(new Request('https://nexo.example/api/youtube/'+action+query,init),action);
 return {api:exports,jar,attributes,calls,env,user:value=>uid=value,advance:ms=>clock+=ms,request,
  start:async(next='')=>new URL((await request('entrar',next?'?next='+encodeURIComponent(next):'')).headers.get('location')),
  callback:url=>request('retorno','?state='+url.searchParams.get('state')+'&code=code')};
}
test('browser entry recovers platform login; JSON status stays protected',async()=>{
 const a=setup();a.user(null);
 const r=await a.request('entrar');assert.equal(r.status,307);assert.match(r.headers.get('location'),/\/login\?next=/);
 assert.equal((await a.request('conta')).status,401);
 const b=setup({env:{}});assert.match((await b.request('entrar')).headers.get('location'),/indisponivel/);assert.equal(b.calls.length,0);
});
test('Google aliases use complete credential pairs without mixing different clients',async()=>{
 const a=setup({env:{GOOGLE_CLIENT_ID:'google-id',GOOGLE_CLIENT_SECRET:'google-secret',YOUTUBE_SESSION_SECRET:'key'}});
 assert.equal((await a.start()).searchParams.get('client_id'),'google-id');
 const b=setup({env:{YOUTUBE_OAUTH_CLIENT_ID:'youtube-id',GOOGLE_CLIENT_SECRET:'google-secret',YOUTUBE_SESSION_SECRET:'key'}});
 assert.match((await b.start()).href,/indisponivel/);
});
test('OAuth uses readonly scope, PKCE, account selection and protected cookies',async()=>{
 const a=setup();const url=await a.start('/shorts');
 assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('scope'),scope);
 assert.equal(url.searchParams.get('redirect_uri'),'https://nexo.example/api/youtube/retorno');
 assert.match(url.searchParams.get('prompt'),/select_account/);
 assert.ok(!a.jar.get('nexo_youtube_oauth').includes('user-a'));
 const opts=a.attributes.get('nexo_youtube_oauth');assert.equal(opts.httpOnly,true);assert.equal(opts.secure,true);assert.equal(opts.sameSite,'lax');
 assert.match((await a.request('retorno','?state=wrong&code=code')).headers.get('location'),/falhou/);assert.equal(a.calls.length,0);
});
test('callback rejects a changed platform user, modified cookie and expired state',async()=>{
 const a=setup();const url=await a.start();a.user('user-b');
 assert.match((await a.callback(url)).headers.get('location'),/falhou/);assert.equal(a.calls.length,0);
 const b=setup();const u=await b.start();b.jar.set('nexo_youtube_oauth','tampered');assert.match((await b.callback(u)).headers.get('location'),/falhou/);
 const c=setup();const v=await c.start();c.advance(600001);assert.match((await c.callback(v)).headers.get('location'),/expirado/);assert.equal(c.calls.length,0);
});
test('cancelled grants make no token request; errors identify configuration and permission',async()=>{
 const a=setup();const u=await a.start();assert.match((await a.request('retorno','?state='+u.searchParams.get('state')+'&error=access_denied')).headers.get('location'),/cancelado/);assert.equal(a.calls.length,0);
 for(const [options,expected] of [[{tokenError:'invalid_client'},'configuracao'],[{tokenError:'invalid_grant'},'expirado'],[{scope:'openid email'},'permissao'],[{apiError:'accessNotConfigured'},'api_desativada']]) {
  const b=setup(options);const v=await b.start();assert.match((await b.callback(v)).headers.get('location'),new RegExp(expected));assert.equal(b.jar.has('nexo_youtube'),false);
 }
});
test('return destination is preserved and external/encoded redirects are rejected',async()=>{
 for(const [next,path] of [['/shorts','/shorts'],['/#trilha','/'],['/conta#youtube','/conta'],['//evil.test','/conta'],['/\\evil.test','/conta'],['/%2f%2fevil.test','/conta'],['/api/admin','/conta']]){
  const a=setup();const u=await a.start(next);const target=new URL((await a.callback(u)).headers.get('location'));assert.equal(target.origin,'https://nexo.example');assert.equal(target.pathname,path);
 }
});
test('malformed, unsafe and wrong-domain callback configuration fails without throwing',async()=>{
 for(const uri of ['not a url','http://nexo.example/api/youtube/retorno','https://nexo.example/other','https://nexo.example/api/youtube/retorno?q=1']){
  const a=setup();a.env.YOUTUBE_OAUTH_REDIRECT_URI=uri;assert.match((await a.start()).href,/configuracao/);
 }
 const a=setup();a.env.YOUTUBE_OAUTH_REDIRECT_URI='https://other.example/api/youtube/retorno';assert.match((await a.start()).href,/dominio/);
});
test('tokens remain isolated and private; callback is one-time and disconnect revokes',async()=>{
 const a=setup();const url=await a.start('/shorts');const r=await a.callback(url);
 assert.equal(new URL(r.headers.get('location')).pathname,'/shorts');assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');
 assert.equal(await a.api.youtubeAccess('user-a'),'access');assert.equal(await a.api.youtubeAccess('user-b'),null);
 assert.ok(!a.jar.get('nexo_youtube').includes('access'));
 const status=await(await a.request('conta')).json();assert.equal(status.conectado,true);assert.equal(status.token,undefined);assert.equal(status.setup,undefined);
 const count=a.calls.length;assert.match((await a.callback(url)).headers.get('location'),/falhou/);assert.equal(a.calls.length,count);
 await a.request('sair');assert.equal(await a.api.youtubeAccess('user-a'),null);assert.ok(a.calls.some(c=>c.url.includes('/revoke')));
});
test('a grant without refresh token lasts only until its access token expires',async()=>{
 const a=setup({noRefresh:true});await a.callback(await a.start());assert.equal(await a.api.youtubeAccess('user-a'),'access');assert.ok(a.attributes.get('nexo_youtube').maxAge<=3600);
 a.advance(3600001);assert.equal(await a.api.youtubeAccess('user-a'),null);assert.equal(a.jar.get('nexo_youtube'),'');
});
test('expired access tokens refresh, and revoked refresh grants clear the session',async()=>{
 const options={};const a=setup(options);await a.callback(await a.start());a.advance(3600001);assert.equal(await a.api.youtubeAccess('user-a'),'access');
 const body=a.calls.filter(c=>c.url.includes('/token')).at(-1).init.body;assert.equal(body.get('grant_type'),'refresh_token');
 options.tokenError='invalid_grant';a.advance(3600001);assert.equal(await a.api.youtubeAccess('user-a'),null);assert.equal(a.jar.get('nexo_youtube'),'');
});
test('admin configuration diagnostics reveal presence, never credential values',async()=>{
 const a=setup({admin:true});const status=await(await a.request('conta')).json();assert.equal(status.setup.credenciais,true);assert.equal(status.setup.dominioCorreto,true);assert.equal(JSON.stringify(status).includes('cookie-secret'),false);
});
test('disconnect rejects cross-origin requests and clears already revoked tokens',async()=>{
 const a=setup({revokeError:'invalid_token'});await a.callback(await a.start());
 assert.equal((await a.request('sair','',{method:'POST',headers:{origin:'https://evil.example'}})).status,403);
 assert.equal(await a.api.youtubeAccess('user-a'),'access');assert.equal((await a.request('sair')).status,200);assert.equal(await a.api.youtubeAccess('user-a'),null);
});

test('temporary refresh failures preserve connection and recover without consent',async()=>{
 const options={};const a=setup(options);await a.callback(await a.start());
 a.advance(3600001);options.tokenError='temporarily_unavailable';
 const status=await(await a.request('conta')).json();
 assert.equal(status.conectado,true);assert.equal(status.temporariamenteIndisponivel,true);
 assert.ok(a.jar.get('nexo_youtube'));options.tokenError=undefined;
 assert.equal(await a.api.youtubeAccess('user-a'),'access');
 options.tokenError='invalid_grant';a.advance(3600001);
 assert.equal((await(await a.request('conta')).json()).conectado,false);
});
