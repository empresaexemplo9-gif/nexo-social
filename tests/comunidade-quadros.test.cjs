process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: () => ({}) });
  return exports;
}

const q = load('lib/comunidade-quadros.ts');
const css = fs.readFileSync('app/globals.css', 'utf8');
const middleware = fs.readFileSync('middleware.ts', 'utf8');
const regex = new RegExp(middleware.match(/const MURAL_DA_COMUNIDADE = \/(.+)\/;/)[1]);

test('cada quadro tem capa, miniatura e estilo próprio', () => {
  for (const nome of q.QUADROS) {
    assert.ok(fs.existsSync(`public${q.capaDoQuadro(nome)}`), `capa de ${nome}`);
    assert.ok(fs.existsSync(`public${q.miniDoQuadro(nome)}`), `miniatura de ${nome}`);
    assert.ok(css.includes(`[data-quadro='${nome}']`), `estilo de ${nome}`);
  }
});

test('abas e opções só usam quadros que existem, e as opções variam', () => {
  const usados = [
    ...Object.values(q.ABAS_DA_COMUNIDADE).map((a) => a.quadro),
    ...Object.values(q.QUADRO_DA_PUBLICACAO),
    ...Object.values(q.QUADRO_DA_LISTA),
    ...['livro', 'show', 'musica', 'filme', 'serie', 'jogo', 'esporte', 'evento', 'lugar', null].map((a) => q.quadroDoAssunto(a)),
  ];
  for (const u of usados) assert.ok(q.QUADROS.includes(u), u);
  // Nenhum tipo de publicação repete quadro; nenhum tipo de lista também.
  const pub = Object.values(q.QUADRO_DA_PUBLICACAO);
  const lis = Object.values(q.QUADRO_DA_LISTA);
  assert.equal(new Set(pub).size, pub.length);
  assert.equal(new Set(lis).size, lis.length);
});

test('cada aba tem o seu muro de fundo (no computador e no celular)', () => {
  const paredes = Object.entries(q.PAREDE_DA_ABA);
  assert.equal(new Set(paredes.map(([, p]) => p)).size, paredes.length, 'um muro diferente por aba');
  for (const [aba, parede] of paredes) {
    for (const arquivo of [`${parede}.webp`, `${parede}-cel.webp`]) {
      assert.ok(fs.existsSync(`public/bg/comunidade/${arquivo}`), arquivo);
      assert.ok(regex.test(`/bg/comunidade/${arquivo}`), `middleware libera ${arquivo}`);
    }
    if (parede !== 'parede') assert.ok(css.includes(`[data-aba='${aba}']) .parede-comunidade::before`), `CSS do muro de ${aba}`);
  }
});

test('o middleware libera só as imagens decorativas da Comunidade', () => {
  for (const f of fs.readdirSync('public/bg/comunidade/quadros')) assert.ok(regex.test(`/bg/comunidade/quadros/${f}`), f);
  for (const ruim of ['/bg/comunidade/../segredo.webp', '/bg/comunidade/quadros/x.webp.js', '/bg/comunidade/parede-admin.webp', '/api/mural']) {
    assert.ok(!regex.test(ruim), ruim);
  }
});
