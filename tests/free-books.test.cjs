const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
function load(file,deps={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>deps[n]??{},URLSearchParams,AbortSignal,...globals});return exports;}
test('Archive excludes restricted and unlicensed books and preserves text reader',async()=>{
 const api=load('lib/livros-abertos.ts',{}, {fetch:async()=>({ok:true,json:async()=>({response:{docs:[
 {identifier:'valid',title:'Livro',year:1900,format:['Text PDF'],language:'por',licenseurl:'https://creativecommons.org/publicdomain/mark/1.0/'},
 {identifier:'locked',title:'Locked',collection:['gutenberg','printdisabled']},
 {identifier:'unlicensed',title:'Not open'},
 {identifier:'restricted',title:'Restricted',collection:['gutenberg'],'access-restricted-item':true}
 ]}})})});
 const items=await api.livrosInternetArchive('ficcao-lit',true);assert.equal(items.length,1);assert.equal(items[0].midia.formato,'texto');assert.equal(items[0].idioma,'pt');
});
test('Open Library confirms actual edition language and rejects loans',async()=>{
 const doc=(id,status='open')=>({title:id,ebook_access:'public',availability:{identifier:id,status,is_readable:true}});
 const api=load('lib/livros-abertos.ts',{}, {fetch:async url=>({ok:true,json:async()=>url.includes('search.json')?{docs:[doc('pt'),doc('en'),doc('loan','borrow_available')]}:{metadata:{mediatype:'texts',language:url.endsWith('/pt')?'por':'eng',title:'Title'},files:[{format:'Text PDF'}]}})});
 const items=await api.livrosOpenLibrary('ficcao-lit',true);assert.equal(items.length,1);assert.equal(items[0].midia.id,'pt');
});
test('one failed catalog does not erase books from remaining sources',async()=>{
 const book={id:'ia:book',titulo:'Livro',midia:{tipo:'archive',id:'book',formato:'texto'}};
 const api=load('lib/gratis.ts',{
 './livros-abertos':{livrosOpenLibrary:async()=>{throw Error('503');},livrosInternetArchive:async()=>[book,book]},
 './descoberta-musical':{diaDeHoje:()=> '2026-09-28',sorteador:()=>()=>0.5,embaralhar:x=>x},
 './taxonomy':{BOOK_GENRES:[],FILM_GENRES:[],HOBBIES:[],genreLabel:()=> 'Ficção'},
 },{fetch:async()=>({ok:false,status:403})});
 const result=await api.indicacoesGratis({area:'livros',chave:'ficcao-lit',idioma:'pt',estilo:'classicos',rodada:0});
 assert.equal(result.itens.length,1);assert.equal(result.avisos.length,2);
});
test('PDF resolution rejects arbitrary URLs, restricted files and oversized downloads',async()=>{
 let requests=0;
 const api=load('lib/livros-abertos.ts',{}, {fetch:async()=>{requests++;return {ok:true,json:async()=>({metadata:{mediatype:'texts'},files:[{name:'private.pdf',format:'Text PDF',size:100,private:'true'},{name:'large.pdf',format:'Text PDF',size:50000000},{name:'book.pdf',format:'Text PDF',size:1000}]})};}});
 await assert.rejects(api.arquivoDoLivro('https://example.com/a'));assert.equal(requests,0);
 const file=await api.arquivoDoLivro('book-id');assert.equal(file.url,'https://archive.org/download/book-id/book.pdf');
});
test('translated classics always query Portuguese and foreign authors',async()=>{
 let query;
 const api=load('lib/livros-abertos.ts',{}, {fetch:async url=>{query=decodeURIComponent(url);return {ok:true,json:async()=>({response:{docs:[]}})};}});
 await api.livrosInternetArchive('traducoes',false);
 assert.match(query,/creator:/);assert.match(query,/Victor\+Hugo/);assert.match(query,/language:/);
});
test('PDF route requires login and validates bounded range responses',async()=>{
 const {NextResponse}=require('next/server');let user=null;
 const bytes=new TextEncoder().encode('%PDF-test');let seenRange;
 const api=load('app/api/livros-arquivo/route.ts',{'next/server':{NextResponse},'@/lib/api-helpers':{getSession:async()=>({user})},'@/lib/livros-abertos':{arquivoDoLivro:async()=>({url:'https://archive.org/download/book/book.pdf',nome:'book.pdf',tamanho:bytes.length})}}, {URL,Response,Uint8Array,fetch:async(_url,o)=>{seenRange=o.headers.Range;return new Response(bytes,{status:206,headers:{'content-range':`bytes 0-${bytes.length-1}/${bytes.length}`}});}});
 const req=part=>new Request('https://nexo.example/api/livros-arquivo?id=book&parte='+part);
 assert.equal((await api.GET(req(0))).status,401);user={id:'test'};
 assert.equal((await api.GET(req(100))).status,400);
 const response=await api.GET(req(0));assert.equal(response.status,200);assert.equal(await response.text(),'%PDF-test');assert.equal(seenRange,'bytes=0-8');
});
