const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

function carregar(arquivo) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(codigo, { exports, require: () => ({}), URLSearchParams, setTimeout, Promise, Error });
  return exports;
}
const t = carregar('lib/traducao.ts');

/** Google de mentira: devolve "[pt] texto" para cada q, e registra os pedidos. */
function googleFalso({ auto = false, falhas = 0 } = {}) {
  const pedidos = [];
  let restantes = falhas;
  const buscar = async (url, init) => {
    const qs = new URLSearchParams(init.body).getAll('q');
    pedidos.push({ url, qs });
    if (restantes-- > 0) return { ok: false, status: 429, json: async () => null };
    const lista = qs.map((q) => (auto ? [`[pt] ${q}`, 'en'] : `[pt] ${q}`));
    return { ok: true, status: 200, json: async () => lista };
  };
  return { buscar, pedidos };
}

test('traduz na mesma ordem, um item por parágrafo, e mantém os vazios', async () => {
  const g = googleFalso();
  const r = await t.traduzirTextos(['Chapter I', '', 'It is a truth.', 'Second one.'], { de: 'en', buscar: g.buscar });
  assert.deepEqual([...r.textos], ['[pt] Chapter I', '', '[pt] It is a truth.', '[pt] Second one.']);
  assert.equal(r.origem, 'en');
  assert.equal(g.pedidos.length, 1);
  assert.match(g.pedidos[0].url, /sl=en&tl=pt/);
  assert.equal(g.pedidos[0].qs.length, 3);
});

test('língua desconhecida vai como automática e volta a língua detectada', async () => {
  const g = googleFalso({ auto: true });
  const r = await t.traduzirTextos(['Hello'], { de: null, buscar: g.buscar });
  assert.match(g.pedidos[0].url, /sl=auto/);
  assert.equal(r.origem, 'en');
  assert.equal(r.textos[0], '[pt] Hello');
});

test('capítulo grande vira vários pedidos e parágrafo enorme é quebrado e remontado', async () => {
  const g = googleFalso();
  const frase = 'This is a sentence of moderate length. ';
  const enorme = frase.repeat(300).trim(); // ~11 mil caracteres
  const paragrafos = Array.from({ length: 60 }, (_, i) => `Paragraph ${i} ${'word '.repeat(60)}`);
  const r = await t.traduzirTextos([enorme, ...paragrafos], { de: 'en', buscar: g.buscar });
  assert.ok(g.pedidos.length >= 2, 'mais de um pedido');
  for (const p of g.pedidos) assert.ok(p.qs.join('').length <= 9000 || p.qs.length === 1);
  assert.equal(r.textos.length, 61);
  assert.ok(r.textos[0].startsWith('[pt] This is'));
  assert.ok(!r.textos[0].includes('  '));
  assert.equal(r.textos[60].trim(), `[pt] ${paragrafos[59]}`.trim());
});

test('tenta de novo uma vez e falha claro quando o tradutor recusa', async () => {
  const uma = googleFalso({ falhas: 1 });
  const r = await t.traduzirTextos(['Hi'], { de: 'en', buscar: uma.buscar });
  assert.equal(r.textos[0], '[pt] Hi');
  const sempre = googleFalso({ falhas: 5 });
  await assert.rejects(() => t.traduzirTextos(['Hi'], { de: 'en', buscar: sempre.buscar }), /ocupado/);
});

test('resposta com quantidade errada não embaralha parágrafos', async () => {
  const buscar = async () => ({ ok: true, status: 200, json: async () => ['só um'] });
  await assert.rejects(() => t.traduzirTextos(['a', 'b'], { de: 'en', buscar }), /incompleta/);
});

test('quem precisa de tradução e o nome da língua', () => {
  assert.equal(t.precisaTraduzir('pt'), false);
  assert.equal(t.precisaTraduzir('pt-BR'), false);
  assert.equal(t.precisaTraduzir('en'), true);
  assert.equal(t.precisaTraduzir(null), true);
  assert.equal(t.nomeDoIdioma('fr'), 'francês');
  assert.equal(t.nomeDoIdioma('xx'), null);
});
