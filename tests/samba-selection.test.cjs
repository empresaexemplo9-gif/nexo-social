const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
function moduleAt(file,dependencies,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>dependencies[n],...globals});return exports;}
const discovery=moduleAt('lib/descoberta-musical.ts',{});
test('genre validation distinguishes samba from sambalpuri and missing metadata',()=>{
 for(const g of ['samba','samba de roda','pagode','partido alto'])assert.equal(discovery.artistaDeSamba([g]),true);
 for(const g of ['sambalpuri','odia','indian folk','pop',''])assert.equal(discovery.artistaDeSamba([g]),false);
 assert.equal(discovery.artistaDeSamba([]),false);
});
test('Spotify removes wrong-genre and unverified artists from every samba list',async()=>{
 const calls=[];
 const api=moduleAt('lib/spotify.ts',{'server-only':{},'./descoberta-musical':discovery},{Buffer,AbortSignal,process:{env:{SPOTIFY_CLIENT_ID:'test',SPOTIFY_CLIENT_SECRET:'test'}},fetch:async url=>{
 calls.push(url);
 const value=url.includes('/api/token')?{access_token:'test',expires_in:3600}:url.includes('/artists/')?{genres:url.endsWith('/valid')?['samba']:url.endsWith('/wrong')?['sambalpuri']:[]}:url.includes('type=playlist')?{playlists:{items:[]}}:{tracks:{items:['valid','wrong','unknown'].map(id=>({id,name:'track',artists:[{id,name:id}],album:{release_date:'2026'}}))}};
 return {ok:true,json:async()=>value};
 }});
 const result=await api.trilhaDoGenero({generos:['samba','pagode'],termo:'samba',sinais:['samba','pagode']},'test',{hits:true,mix:'famosas'});
 assert.deepEqual(Array.from(result.listas.flatMap(l=>l.faixas.map(f=>f.id))),['valid']);
 assert.equal(calls.filter(u=>u.includes('/artists/')).length,3);
});
