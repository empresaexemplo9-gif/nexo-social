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
    conta: 'pessoal', convites: 'pessoal', pessoa: 'pessoal', colecionaveis: 'colecionaveis',
  };
  for (const [rota, area] of Object.entries(rotas)) {
    assert.ok(fs.readFileSync(`app/${rota}/layout.tsx`, 'utf8').includes(`<TemaDaArea area="${area}">`), rota);
  }
  assert.ok(fs.readFileSync('app/tema/[slug]/layout.tsx', 'utf8').includes('temaDoAssunto(params.slug)'));
  // A home só veste o muro de início quando a pessoa não escolheu um fundo.
  assert.match(fs.readFileSync('components/HomeView.tsx', 'utf8'), /ready && \(!fundo \|\| exclusivo\) \? AREAS\.inicio : null/);
});

test('o middleware libera só os muros das áreas', () => {
  for (const ruim of ['/bg/paredes/../segredo.webp', '/bg/paredes/inicio.webp.js', '/bg/paredes/Inicio.webp', '/bg/paredes/a/b.webp', '/api/x']) {
    assert.ok(!regex.test(ruim), ruim);
  }
});

test('murais claros: a escolha fica na conta e vale em todas as áreas', () => {
  const tipos = load('lib/aparencia-tipos.ts');
  assert.equal(tipos.APARENCIA_PADRAO.muro, 'escuro');
  assert.equal(tipos.formaDaAparencia({ muro: 'claro' }).muro, 'claro');
  for (const ruim of [undefined, null, 'CLARO', 'azul', 1]) assert.equal(tipos.formaDaAparencia({ muro: ruim }).muro, 'escuro');
  // A conta guarda a versão (normalizarAparencia) e o layout a aplica antes de pintar.
  assert.match(fs.readFileSync('lib/aparencia.ts', 'utf8'), /muro: formaDoMuro\(o\.muro\)/);
  assert.ok(fs.readFileSync('app/layout.tsx', 'utf8').includes(`localStorage.getItem('${tipos.CACHE_DO_MURO}')==='claro'`));
  assert.ok(fs.readFileSync('components/AplicarAparencia.tsx', 'utf8').includes('raiz.dataset.muro'));
  // Dá para escolher no menu e em Personalizar cores.
  assert.ok(fs.readFileSync('components/Navbar.tsx', 'utf8').includes('<AlternarMuro'));
  assert.ok(fs.readFileSync('components/home/PersonalizarAparencia.tsx', 'utf8').includes("escolher({ muro: id })"));
  // O CSS claro: o muro, o vidro, a barra e a cor de cada área.
  for (const trecho of [
    "html[data-muro='claro'] .tema-mural {",
    "html[data-muro='claro'] .parede-mural::after",
    "html[data-muro='claro'] .tema-mural :is(.barra-lateral, .barra-topo)",
    "html[data-muro='claro'] .tema-mural :is([class^='bg-zinc-900/']",
  ]) assert.ok(css.includes(trecho), trecho);
  for (const area of Object.keys(AREAS)) assert.ok(css.includes(`html[data-muro='claro'] .tema-mural[data-area='${area}'] {`), area);
});
