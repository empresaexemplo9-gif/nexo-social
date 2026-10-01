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

const { AREAS, PAREDES_DAS_AREAS, temaDoAssunto } = load('lib/areas.ts');
const { QUADROS } = load('lib/comunidade-quadros.ts');
const css = fs.readFileSync('app/globals.css', 'utf8');
const middleware = fs.readFileSync('middleware.ts', 'utf8');
const regex = new RegExp(middleware.match(/const MURO_DA_AREA = \/(.+)\/;/)[1]);

// 'parede' é o muro da marca da Comunidade (public/bg/comunidade), o padrão do CSS.
const murosNovos = PAREDES_DAS_AREAS.filter((p) => p !== 'parede');

test('cada muro de área existe no computador e no celular, com o seu CSS', () => {
  for (const parede of murosNovos) {
    for (const arquivo of [`${parede}.webp`, `${parede}-cel.webp`]) {
      assert.ok(fs.existsSync(`public/bg/paredes/${arquivo}`), arquivo);
      assert.ok(regex.test(`/bg/paredes/${arquivo}`), `middleware libera ${arquivo}`);
    }
    assert.ok(css.includes(`.tema-mural[data-parede='${parede}'] > .parede-mural::before`), `CSS do muro ${parede}`);
  }
  assert.ok(fs.existsSync('public/bg/comunidade/parede.webp'));
});

test('as áreas variam o muro e só usam quadros, molduras e cores que existem', () => {
  const temas = Object.entries(AREAS);
  for (const [area, t] of temas) {
    assert.ok(QUADROS.includes(t.quadro), `quadro de ${area}`);
    assert.ok(css.includes(`[data-moldura='${t.moldura}']`), `moldura de ${area}`);
    assert.match(t.acento, /^#[0-9a-f]{6}$/, `cor de ${area}`);
    assert.ok(css.includes(`.tema-mural[data-area='${area}']`), `cores de ${area}`);
  }
  // Nenhuma área repete o muro, e as cores também variam.
  assert.equal(new Set(temas.map(([, t]) => t.parede)).size, temas.length);
  assert.ok(new Set(temas.map(([, t]) => t.quadro)).size >= temas.length - 2);
});

test('cada página de tema veste a área mais próxima com o quadro do assunto', () => {
  const data = fs.readFileSync('lib/data.ts', 'utf8');
  const slugs = [...data.matchAll(/slug: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(slugs.length >= 12);
  for (const slug of slugs) {
    const { area, tema } = temaDoAssunto(slug);
    assert.ok(AREAS[area], slug);
    assert.ok(QUADROS.includes(tema.quadro), slug);
    assert.notEqual(area, 'inicio', `${slug} tem tema próprio`);
  }
  assert.equal(temaDoAssunto('nao-existe').area, 'inicio');
});

test('cada área do site está vestida pelo seu layout', () => {
  const rotas = {
    agenda: 'agenda', evento: 'agenda', 'bom-dia': 'bomdia', busca: 'busca', descobrir: 'descobrir', esporte: 'esporte',
    historicas: 'historicas', livros: 'livros', questionario: 'questionario', revista: 'revista', shorts: 'shorts',
    conta: 'pessoal', convites: 'pessoal', pessoa: 'pessoal',
  };
  for (const [rota, area] of Object.entries(rotas)) {
    assert.ok(fs.readFileSync(`app/${rota}/layout.tsx`, 'utf8').includes(`<TemaDaArea area="${area}">`), rota);
  }
  assert.ok(fs.readFileSync('app/tema/[slug]/layout.tsx', 'utf8').includes('temaDoAssunto(params.slug)'));
  // A home só veste o muro de início quando a pessoa não escolheu um fundo.
  assert.match(fs.readFileSync('components/HomeView.tsx', 'utf8'), /ready && !fundo \? AREAS\.inicio : null/);
});

test('o middleware libera só os muros das áreas', () => {
  for (const ruim of ['/bg/paredes/../segredo.webp', '/bg/paredes/inicio.webp.js', '/bg/paredes/Inicio.webp', '/bg/paredes/a/b.webp', '/api/x']) {
    assert.ok(!regex.test(ruim), ruim);
  }
});
