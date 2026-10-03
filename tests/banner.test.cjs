process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(arquivo) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, Math, Number, Array, require: () => ({}) });
  return exports;
}

const tipos = load('lib/aparencia-tipos.ts');
const simples = (o) => JSON.parse(JSON.stringify(o));
const ID = '00000000-0000-4000-8000-000000000001';

test('banner: só adesivo e botton com endereço válido, dentro do banner, até 12', () => {
  const bom = { id: ID, url: '/colecao/linkin-park/adesivos/discografia-01.webp', tipo: 'sticker', x: 40, y: 60, giro: 5 };
  assert.deepEqual(simples(tipos.formaDoBanner([bom])), [bom]);
  const bucket = 'https://abc.supabase.co/storage/v1/object/public/exclusivos/gatinhos/bottons/a-01.png';
  assert.equal(tipos.formaDoBanner([{ ...bom, url: bucket, tipo: 'button' }]).length, 1);
  for (const ruim of [
    { ...bom, url: '/colecao/linkin-park/fundos/discografia.webp' }, // plano de fundo não vai no banner
    { ...bom, url: 'https://exemplo.com/x.png' },
    { ...bom, url: '/colecao/../segredo.webp' },
    { ...bom, tipo: 'wallpaper' },
    { ...bom, id: 'nao-e-uuid' },
    null,
    'x',
  ]) assert.equal(tipos.formaDoBanner([ruim]).length, 0, JSON.stringify(ruim));
  // Posição e giro ficam dentro dos limites.
  const [preso] = tipos.formaDoBanner([{ ...bom, x: -50, y: 900, giro: 400 }]);
  assert.deepEqual([preso.x, preso.y, preso.giro], [2, 98, 30]);
  const [semNumero] = tipos.formaDoBanner([{ ...bom, x: 'a', y: null, giro: undefined }]);
  assert.deepEqual([semNumero.x, semNumero.y, semNumero.giro], [50, 50, 0]);
  assert.equal(tipos.formaDoBanner(Array.from({ length: 30 }, () => bom)).length, tipos.MAXIMO_NO_BANNER);
  assert.deepEqual(simples(tipos.formaDoBanner('lixo')), []);
  // Faz parte da aparência (e começa vazio).
  assert.deepEqual(simples(tipos.APARENCIA_PADRAO.banner), []);
  assert.equal(tipos.formaDaAparencia({ banner: [bom] }).banner.length, 1);
  assert.match(fs.readFileSync('lib/aparencia.ts', 'utf8'), /banner: formaDoBanner\(o\.banner\)/, 'a conta guarda limpo');
});

test('banner: botão de enfeitar no banner da home, camada que não pega o toque, itens menores que no chat', () => {
  const hero = fs.readFileSync('components/InterestsView.tsx', 'utf8');
  assert.match(hero, /<AdesivosDoBanner editando=\{enfeitando\} onFechar=\{\(\) => setEnfeitando\(false\)\} \/>/);
  assert.match(hero, /'Mudar adesivos' : 'Enfeitar com adesivos'/);
  const comp = fs.readFileSync('components/home/AdesivosDoBanner.tsx', 'utf8');
  assert.match(comp, /editando \? 'banner-camada--editando' : 'pointer-events-none'/, 'fora da edição não atrapalha os botões');
  assert.match(comp, /createPortal\(/, 'a bandeja sai do banner');
  for (const acao of ['Tirar todos', 'Cancelar', 'Pronto', 'Tirar']) assert.ok(comp.includes(acao), acao);
  assert.match(comp, /usados\(m\.id\) >= \(m\.quantidade \?\? 1\)/, 'cada item quantas vezes a pessoa tem');
  const css = fs.readFileSync('app/globals.css', 'utf8');
  const maximo = (seletor, prop) => Number(css.split(seletor)[1].split('}')[0].match(new RegExp(`${prop}: clamp\\([^,]+, [^,]+, (\\d+)px\\)`))[1]);
  assert.ok(maximo('.banner-item--adesivo img {', 'height') < 160, 'adesivo menor que no chat (160 px)');
  assert.ok(maximo('.banner-item--botton img {', 'width') < 112, 'botton menor que no chat (112 px)');
});
