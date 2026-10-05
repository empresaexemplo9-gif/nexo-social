process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
function load(path, deps, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, { exports, ...globals, require: n => {
    if (n === 'react') return React;
    if (n === 'react/jsx-runtime') return require(n);
    if (!(n in deps)) throw Error(n);
    return deps[n];
  } });
  return exports;
}
test('recolher, navegar e ampliar mantém a mesma fila; fechar a desmonta', async () => {
  let mounts = 0, unmounts = 0;
  function Queue() { React.useEffect(() => { mounts++; return () => unmounts++; }, []); return React.createElement('iframe'); }
  const window = new EventTarget(), document = { body: { style: { overflow: '' } } };
  const media = load('components/midia/MidiaProvider.tsx', { '../icons': () => null, './Leitor': () => null, './LivroArquivo': () => null, './YoutubeMusicQueue': Queue }, { window, document });
  let actions;
  function Page({ name }) { actions = media.useMidia(); return React.createElement('p', null, name); }
  const item = { titulo: 'Lista', midia: { tipo: 'youtube', id: 'aaaaaaaaaaa', fila: ['bbbbbbbbbbb'] } };
  let view;
  const render = name => React.createElement(media.MidiaProvider, null, React.createElement(Page, { name }));
  await act(async () => { view = create(render('Início')); });
  await act(async () => actions.abrir(item));
  assert.equal(document.body.style.overflow, 'hidden');
  await act(async () => view.root.findByProps({ 'aria-label': 'Recolher player' }).props.onClick());
  assert.equal(document.body.style.overflow, '');
  assert.equal(view.root.findAllByProps({ role: 'dialog' }).length, 0);
  await act(async () => view.update(render('Agenda')));
  assert.equal(mounts, 1); assert.equal(unmounts, 0);
  await act(async () => view.root.findByProps({ 'aria-label': 'Ampliar player' }).props.onClick());
  assert.equal(mounts, 1);
  await act(async () => actions.abrir(item));
  assert.equal(mounts, 2, 'escolher a mesma lista novamente recomeça a reprodução');
  assert.equal(unmounts, 1);
  await act(async () => actions.fechar());
  assert.equal(unmounts, 2);
  assert.equal(document.body.style.overflow, '');
  await act(async () => view.unmount());
});
function worker() {
  const handlers = {}, removed = [], stored = [];
  let skips = 0, claims = 0;
  const self = { location: { origin: 'https://nexo.example' }, addEventListener: (n, fn) => handlers[n] = fn,
    skipWaiting: async () => skips++, clients: { claim: async () => claims++ } };
  const caches = { keys: async () => ['nexo-v5-shell', 'nexo-v6-shell', 'nexo-v6-estatico', 'nexo-v7-shell', 'other-cache'],
    delete: async n => removed.push(n), match: async () => null,
    open: async n => ({ addAll: async () => {}, match: async () => ({ version: n }), put: async () => stored.push(n) }) };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, caches, URL, Set, Uint8Array, setTimeout,
    fetch: async () => ({ ok: true, clone: () => ({}) }), Response });
  const dispatch = async (name, extra = {}) => {
    const pending = []; let response;
    handlers[name]({ ...extra, waitUntil: p => pending.push(p), respondWith: p => response = p });
    const result = response && await response;
    await Promise.all(pending);
    return result;
  };
  return { dispatch, removed, stored, skips: () => skips, claims: () => claims };
}
test('atualização espera a escolha, preserva caches externos e a versão anterior', async () => {
  const w = worker(); await w.dispatch('install'); assert.equal(w.skips(), 0);
  await w.dispatch('message', { data: { type: 'SKIP_WAITING' } }); assert.equal(w.skips(), 1);
  await w.dispatch('activate'); assert.deepEqual(w.removed, ['nexo-v5-shell']); assert.equal(w.claims(), 1);
});
test('arquivos estáticos terminam de gravar; API e mídia externa passam direto', async () => {
  const w = worker();
  const request = url => ({ method: 'GET', url, mode: 'cors' });
  await w.dispatch('fetch', { request: request('https://nexo.example/_next/static/chunk.js') });
  assert.deepEqual(w.stored, ['nexo-v7-estatico']);
  assert.equal(await w.dispatch('fetch', { request: request('https://nexo.example/api/me') }), undefined);
  assert.equal(await w.dispatch('fetch', { request: request('https://www.youtube.com/embed/aaaaaaaaaaa') }), undefined);
});
test('nova versão não recarrega a reprodução sem escolha explícita', async () => {
  const sw = new EventTarget(), window = new EventTarget(), document = new EventTarget();
  sw.controller = {}; document.readyState = 'complete'; document.hidden = false;
  let reloads = 0, messages = [], updates = 0;
  window.location = { reload: () => reloads++ };
  const waiting = { postMessage: m => messages.push(m) };
  const registration = new EventTarget(); registration.waiting = waiting;
  registration.update = async () => updates++;
  sw.register = async (path, opts) => { assert.equal(path, '/sw.js'); assert.equal(opts.updateViaCache, 'none'); return registration; };
  const { default: Register } = load('components/PWARegister.tsx', { '@/lib/push-cliente': { renovarInscricao: async () => {} } }, {
    navigator: { serviceWorker: sw, onLine: true }, window, document, process: { env: { NODE_ENV: 'production' } }, console,
  });
  let view; await act(async () => { view = create(React.createElement(Register)); });
  await act(async () => sw.dispatchEvent(new Event('controllerchange')));
  assert.equal(reloads, 0);
  await act(async () => view.root.findAllByType('button').find(b => b.props.children === 'Depois').props.onClick());
  assert.equal(view.toJSON(), null);
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(updates, 1);
  await act(async () => view.root.findAllByType('button').find(b => b.props.children === 'Atualizar agora').props.onClick());
  assert.equal(messages[0].type, 'SKIP_WAITING');
  await act(async () => sw.dispatchEvent(new Event('controllerchange')));
  assert.equal(reloads, 1);
  await act(async () => view.unmount());
});
