process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

function load(path, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: n => { if (!(n in deps)) throw Error(n); return deps[n]; },
    structuredClone, globalThis: { crypto: globalThis.crypto }, Uint32Array, setTimeout, clearTimeout,
    ResizeObserver: class { observe() {} disconnect() {} }, console });
  return exports;
}
const legacy = load('lib/jogos/arcanos/cartas.ts', {});
const cards = load('lib/jogos/arcanos/grimorios.ts', { './grimorios.json': JSON.parse(fs.readFileSync('lib/jogos/arcanos/grimorios.json', 'utf8')) });
const motor = load('lib/jogos/arcanos/motor-grimorios.ts', { './cartas': legacy, './grimorios': cards });
const css = new Proxy({}, { get: (_, n) => String(n) });
const cartasVisuais = load('components/comunidade/jogos/CartasGrimorios.tsx', {
  react: React, 'next/image': props => React.createElement('img', { src: props.src, alt: props.alt }),
  '@/lib/jogos/arcanos/cartas': legacy, '@/lib/jogos/arcanos/grimorios': cards,
});
const Campo = load('components/comunidade/jogos/CampoDeBatalha.tsx', {
  react: React, 'next/image': props => React.createElement('img', { src: props.src, alt: props.alt }),
  '@/lib/jogos/arcanos/cartas': legacy, '@/lib/jogos/arcanos/grimorios': cards,
  '@/lib/jogos/arcanos/motor-grimorios': motor,
  './CartasGrimorios': cartasVisuais,
  './CampoDeBatalha.module.css': { __esModule: true, default: css },
  './MiniaturasDoTabuleiro': { __esModule: true, default: () => null },
}).default;
const ps = [{ userId: 'ana', nome: 'Ana', elemento: 'fogo' }, { userId: 'bia', nome: 'Bia', elemento: 'agua' }];
const props = e => ({ estado: e, segundos: 99, selecionada: null, onJogar() {}, onSelecionar() {}, onAlvo() {}, onInspecionar() {}, onAviso() {}, onCartas() {}, onRegras() {}, onSair() {} });

test('a baixa mantém sua posição no campo e impede as cartas do conjurador morto', async () => {
  const e = motor.novaPartidaGrimorios(ps, 0);
  e.jogadores[0].comprou = true; e.jogadores[0].fonte = 12;
  const healer = e.jogadores[0].campo.find(p => p.carta === 'fogo-alena');
  healer.vida = 1;
  const spell = 'fogo-brasa-restauradora'; e.jogadores[0].mao = [spell]; e.jogadores[0].maoQtd = 1;
  e.ativo = 1;
  e.jogadores[1].comprou = true;
  // Um feitiço pode atingir o suporte mesmo com tanks vivos.
  const attackSpell = cards.CARTAS_NOVAS.find(c => c.elemento === 'agua' && c.tipo === 'feitico' && c.alvo === 'inimigo');
  e.jogadores[1].mao = [attackSpell.id]; e.jogadores[1].maoQtd = 1; e.jogadores[1].fonte = 12;
  const declared = motor.aplicarNova(e, { t: 'jogar', lado: 1, carta: attackSpell.id, alvo: healer.id });
  assert.equal(declared.ok, true);
  const hit = motor.aplicarNova(declared.estado, { t: 'resolver', lado: 0 });
  assert.equal(hit.ok, true);
  const ended = motor.aplicarNova(hit.estado, { t: 'passar', lado: 1 });
  assert.equal(ended.ok, true);
  let view;
  await act(async () => { view = create(React.createElement(Campo, props(ended.estado))); });
  try {
    assert.equal(view.root.findAll(n => n.type === 'article' && n.props['data-unidade']).length, 20);
    assert.equal(view.root.findAll(n => n.type === 'span' && n.props['data-miniatura-personagem']).length, 19);
    assert.equal(view.root.findAll(n => n.type === 'button' && n.props['aria-label'] === 'Alena, eliminado').length, 1);
    assert.equal(view.root.find(n => n.type === 'button' && n.props['aria-label'] === 'Usar Brasa Restauradora').props.disabled, true);
  } finally { await act(async () => view.unmount()); }
});

test('sessenta posições no modo de trios, com mão e decks separados do tabuleiro', async () => {
  const jogadores = legacy.ELEMENTOS_ORDEM.map((elemento,i) => ({userId:'p'+i,nome:'Jogador '+i,elemento}));
  const e = motor.novaPartidaGrimorios(jogadores, 0, undefined, 'trios');
  let view;
  await act(async () => { view = create(React.createElement(Campo, props(e))); });
  try {
    assert.equal(view.root.findAll(n => n.type === 'article' && n.props['data-unidade']).length, 60);
    assert.equal(view.root.findAll(n => n.type === 'span' && n.props['data-miniatura-personagem']).length, 60);
    assert.equal(view.root.findAll(n => n.props['data-zona'] === 'mao').length, 1);
    assert.equal(view.root.findAll(n => n.props['data-zona'] === 'decks').length, 1);
    assert.equal(view.root.findAll(n => n.props['data-zona'] === 'tabuleiro').length, 1);
  } finally { await act(async () => view.unmount()); }
});

test('o espectador vê o campo completo sem mão privada ou compras habilitadas', async () => {
  const e = motor.publicoNovo(motor.novaPartidaGrimorios(ps, 0));
  let view;
  await act(async () => { view = create(React.createElement(Campo, props(e))); });
  try {
    assert.equal(view.root.findAll(n => n.type === 'article' && n.props['data-unidade']).length, 20);
    assert.equal(view.root.findAll(n => n.props['aria-label'] === 'Suas cartas na mão').length, 0);
    assert.ok(view.root.findAll(n => n.type === 'button' && n.props['aria-label']?.startsWith('Comprar')).every(n => n.props.disabled));
    assert.equal(view.root.findAll(n => n.type === 'button' && n.props['aria-label']?.startsWith('Usar ')).length, 0);
  } finally { await act(async () => view.unmount()); }
});
