const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// lib/aparencia.ts e o que ele importa de lib/, transpilados para CommonJS.
const cache = {};
function carregar(arquivo) {
  if (cache[arquivo]) return cache[arquivo];
  const exports = {};
  cache[arquivo] = exports;
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(codigo, { exports, require: (n) => (n.startsWith('./') ? carregar(`lib/${n.slice(2)}.ts`) : {}) });
  return exports;
}
const ap = carregar('lib/aparencia.ts');
const opcao = (id) => ap.OPCOES_DE_FUNDO.find((o) => o.id === id);

test('toda opção de fundo tem mural, e os três murais entram no rodízio', () => {
  assert.ok(ap.OPCOES_DE_FUNDO.length > 3);
  for (const o of ap.OPCOES_DE_FUNDO) assert.ok(ap.MURAIS.includes(o.mural), o.id);
  assert.deepEqual(new Set(ap.OPCOES_DE_FUNDO.map((o) => o.mural)), new Set(ap.MURAIS));
});

test('os arquivos dos murais existem (fundo e miniatura) e passam sem sessão no middleware', () => {
  const fonte = fs.readFileSync('middleware.ts', 'utf8');
  const MURAL = eval(fonte.match(/const MURAL = (\/.+\/);/)[1]);
  for (const o of ap.OPCOES_DE_FUNDO) {
    for (const mini of [false, true]) {
      const caminho = ap.muralDoFundo(o, mini);
      assert.ok(fs.existsSync(`public${caminho}`), caminho);
      assert.match(caminho, MURAL);
    }
  }
  assert.doesNotMatch('/bg/murais/../../middleware.ts', MURAL);
});

test('a versão do mural segue a luz do que aparece, não só a cor do título', () => {
  // Cor lisa: clara → mural claro; escura → mural escuro.
  assert.equal(opcao('pop-comic').muralEscuro, false);
  assert.equal(opcao('preto-tech').muralEscuro, true);
  assert.equal(opcao('azul-eletrico').muralEscuro, true);
  // Textura que cobre tudo manda: couro escuro → escuro; lona clara → claro,
  // mesmo com os títulos claros (escuro) desse tema.
  assert.equal(opcao('couro-preto').muralEscuro, true);
  assert.equal(opcao('patch-lona').escuro, true);
  assert.equal(opcao('patch-lona').muralEscuro, false);
  assert.match(ap.muralDoFundo(opcao('patch-lona')), /-claro\.webp$/);
  assert.match(ap.muralDoFundo(opcao('couro-preto'), true), /-escuro-mini\.webp$/);
  // Textura leve por cima de uma cor clara: vale a cor.
  assert.equal(opcao('classico').muralEscuro, false);
});

test('o CSS mistura cada versão do jeito certo e mantém as medidas do padrão', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.mural-fundo--claro\s*\{\s*mix-blend-mode:\s*multiply;/);
  assert.match(css, /\.mural-fundo--escuro\s*\{\s*mix-blend-mode:\s*screen;/);
  // O padrão e as opções dividem a mesma regra (intensidade, miolo limpo, celular).
  assert.match(css, /\.fundo-tech__mural,\s*\.mural-fundo\s*\{[^}]*mask-image/);
});
