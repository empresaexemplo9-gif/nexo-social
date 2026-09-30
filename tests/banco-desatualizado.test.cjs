const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

function carregar(arquivo, deps = {}) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(codigo, { exports, require: (n) => deps[n] ?? {}, Promise, JSON });
  return exports;
}

const erros = carregar('lib/erros-banco.ts');
const chat = carregar('lib/chat-mensagens.ts', { './erros-banco': erros, './invite-stickers': { STICKERS: [] } });

test('tabela e coluna que faltam são reconhecidas pelo Postgres e pelo PostgREST', () => {
  assert.equal(erros.semTabela({ code: '42P01' }), true);
  assert.equal(erros.semTabela({ code: 'PGRST205' }), true);
  assert.equal(erros.semColuna({ code: '42703' }), true);
  assert.equal(erros.semColuna({ code: 'PGRST204' }), true);
  for (const e of [null, undefined, {}, { code: '23505' }, { code: '42501' }]) {
    assert.equal(erros.semTabela(e), false);
    assert.equal(erros.semColuna(e), false);
  }
});

test('leitura sem a coluna da resposta cai para as colunas que existem', async () => {
  const pedidas = [];
  const r = await chat.lerMensagens(async (colunas) => {
    pedidas.push(colunas);
    return colunas.includes('reply_to') ? { data: null, error: { code: '42703' } } : { data: [{ id: 'm1' }], error: null };
  }, 'id, body');
  assert.deepEqual(pedidas, ['id, body, kind, media_path, media_meta, reply_to', 'id, body, kind, media_path, media_meta']);
  assert.equal(r.error, null);
  assert.equal(r.data[0].id, 'm1');
});

test('resposta gravada num banco sem reply_to (PGRST204) vai sem a citação, não falha', async () => {
  const linhas = [];
  const r = await chat.inserirMensagem(async (linha) => {
    linhas.push(linha);
    return 'reply_to' in linha ? { data: null, error: { code: 'PGRST204' } } : { data: { id: 'n1' }, error: null };
  }, { body: 'oi', reply_to: 'm1' });
  assert.equal(linhas.length, 2);
  assert.equal('reply_to' in linhas[1], false);
  assert.equal(r.error, null);
  assert.equal(r.data.id, 'n1');
});

test('outros erros de gravação não são mascarados', async () => {
  let chamadas = 0;
  const r = await chat.inserirMensagem(async () => {
    chamadas += 1;
    return { data: null, error: { code: '42501' } };
  }, { body: 'oi', reply_to: 'm1' });
  assert.equal(chamadas, 1);
  assert.equal(r.error.code, '42501');
});

test('as rotas não voltam a checar só o código do Postgres', () => {
  const rotas = [
    'app/api/comunidade/grupos/[id]/posts/[postId]/comentarios/route.ts',
    'app/api/comunidade/grupos/[id]/jogos/route.ts',
    'app/api/comunidade/grupos/[id]/chat/route.ts',
    'app/api/comunidade/chat/[userId]/route.ts',
    'app/api/comunidade/resumo/route.ts',
    'app/api/push/inscricao/route.ts',
    'lib/chat-mensagens.ts',
  ];
  for (const rota of rotas) {
    const fonte = fs.readFileSync(rota, 'utf8');
    assert.doesNotMatch(fonte, /code\s*[!=]==\s*'(42P01|42703)'/, rota);
  }
});
