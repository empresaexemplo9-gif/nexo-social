process.env.NODE_ENV='test';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript'),React=require('react');
const {create,act}=require('react-test-renderer');
test('download opens the local PDF inside the reader without navigating away',async()=>{
 const exports={};const requests=[];let saved=0,revoked=0;
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/midia/LivroArquivo.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:()=>React,Blob,AbortController,URL:{createObjectURL:()=> 'blob:local-book',revokeObjectURL:()=>revoked++},window:{setTimeout,clearTimeout},document:{body:{appendChild:()=>{}},createElement:()=>({click:()=>saved++,remove:()=>{}})},fetch:async url=>{requests.push(url);return url.includes('parte=')?new Response('%PDF-test'):Response.json({nome:'book.pdf',tamanho:9});}});
 let tree;await act(async()=>{tree=create(React.createElement(exports.default,{id:'book',titulo:'Livro'}));});
 await act(async()=>{tree.root.findAllByType('button')[1].props.onClick();await new Promise(r=>setTimeout(r,10));});
 assert.equal(saved,1);assert.equal(tree.root.findByType('iframe').props.src,'blob:local-book');
 assert.ok(requests.every(u=>u.startsWith('/api/livros-arquivo?')));
 await act(async()=>tree.unmount());assert.equal(revoked,1);
});
