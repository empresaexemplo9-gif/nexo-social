process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

function load(path, dependencies, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, { exports, URL, Date, ...globals,
    require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
  });
  return exports;
}

test('faixas do Spotify avançam automaticamente e a última volta à primeira', async () => {
  const preferences = { ready: true, prefs: { musicGenres: ['rock'] } };
  const Embed = () => null;
  const spotify = { autorizado: true, status: 'desligado' };
  const { default: Profile } = load('components/ProfilePlaylist.tsx', {
    react: React, 'next/link': () => null, './icons': () => null,
    '@/lib/preferences': { usePreferences: () => preferences },
    '@/lib/taxonomy': { MUSIC_GENRES: [{ id: 'rock', label: 'Rock' }], genreLabel: () => 'Rock' },
    './spotify/SpotifyProvider': { useSpotify: () => spotify },
    './YoutubePlaylist': () => null, './spotify/PlayerEmbutido': Embed,
  }, { fetch: async () => ({ ok: true, json: async () => ({ listas: [{ id: 'l', titulo: 'Minha lista', faixas: [
    { id: 'a', name: 'A', artist: 'Artista', url: 'https://example.com/a' },
    { id: 'b', name: 'B', artist: 'Artista', url: 'https://example.com/b' },
  ] }] }) }) });
  let view;
  await act(async () => { view = create(React.createElement(Profile)); });
  const play = view.root.findAllByType('button').find(b => b.findAllByType('span').some(s => s.props.children === 'A'));
  assert.ok(play);
  await act(async () => play.props.onClick());
  assert.equal(view.root.findByType(Embed).props.pedido.uri, 'spotify:track:a');
  await act(async () => view.root.findByType(Embed).props.onFim());
  assert.equal(view.root.findByType(Embed).props.pedido.uri, 'spotify:track:b');
  await act(async () => view.root.findByType(Embed).props.onFim());
  assert.equal(view.root.findByType(Embed).props.pedido.uri, 'spotify:track:a');
  await act(async () => view.unmount());
});

function embedSetup(uri) {
  const timers = new Set();
  const listeners = {};
  const controller = { loads: [], plays: 0, loadUri(uri) { this.loads.push(uri); }, play() { this.plays++; },
    addListener(event, cb) { listeners[event] = cb; }, destroy() { this.destroyed = true; } };
  const window = {};
  const element = { appendChild() {}, replaceChildren() {}, querySelector() { return { setAttribute() {} }; } };
  const { default: Embed } = load('components/spotify/PlayerEmbutido.tsx', { react: React }, {
    window, document: { createElement: () => ({}), body: { appendChild() {} } },
    setTimeout: fn => { timers.add(fn); return fn; }, clearTimeout: fn => timers.delete(fn),
  });
  return { Embed, window, timers, listeners, controller, element,
    props: { pedido: { uri, n: '1', tocar: false }, titulo: 'Playlist' } };
}

test('playlist embutida deixa o Spotify avançar, recomeça ao concluir e respeita a pausa', async () => {
  const app = embedSetup('spotify:playlist:collection');
  let view;
  await act(async () => { view = create(React.createElement(app.Embed, app.props), { createNodeMock: () => app.element }); });
  await act(async () => app.window.onSpotifyIframeApiReady({ createController: (element, options, cb) => cb(app.controller) }));
  // Ignora apenas o timeout de carregar a API, sem esperar dez segundos.
  app.timers.clear();
  const update = (position, paused, playingURI = 'spotify:track:a', buffering = false) => app.listeners.playback_update({ data: {
    duration: 30000, position, isPaused: paused, isBuffering: buffering, playingURI,
  } });
  await act(async () => { update(29000, false); update(29500, true); });
  assert.equal(app.timers.size, 0, 'pausa perto do fim não recomeça nem avança');
  await act(async () => { update(29900, false); update(30000, true); });
  assert.equal(app.timers.size, 1);
  await act(async () => update(0, false, 'spotify:track:b'));
  assert.equal(app.timers.size, 0, 'próxima faixa nativa cancela a repetição');
  assert.equal(app.controller.loads.length, 0);
  await act(async () => { update(29900, false, 'spotify:track:b'); update(30000, true, 'spotify:track:b'); });
  await act(async () => [...app.timers][0]());
  assert.deepEqual(app.controller.loads, ['spotify:playlist:collection']);
  assert.equal(app.controller.plays, 1);
  await act(async () => view.unmount());
  assert.equal(app.controller.destroyed, true);
});

test('Spotify Premium inicia a fila e ativa a repetição do contexto no dispositivo correto', async () => {
  const listeners = {}, requests = [];
  const window = new EventTarget();
  window.location = { href: 'https://nexo.example/' };
  window.setInterval = () => 1; window.clearInterval = () => {};
  window.Spotify = { Player: function () {
    this.addListener = (event, cb) => { listeners[event] = cb; };
    this.connect = async () => true;
    this.disconnect = () => {};
    this.activateElement = async () => {};
  } };
  const document = new EventTarget(); document.hidden = false;
  const auth = { auth: { getUser: async () => ({ data: { user: { email: 'admin@example.com' } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } };
  const module = load('components/spotify/SpotifyProvider.tsx', {
    react: React, '../icons': () => null, '@/lib/supabase': { supabase: auth },
    '@/lib/auth': { isPlatformAdmin: () => true }, './BarraDoPlayer': () => null,
  }, { window, document, AbortSignal, setTimeout: () => 1, clearTimeout: () => {},
    fetch: async (url, options) => {
      requests.push({ url, options });
      return url === '/api/spotify/token' ? { ok: true, json: async () => ({ token: 'test-token', expiraEm: Date.now() + 3600000 }) } : { ok: true, status: 204 };
    } });
  let context, view;
  function Consumer() { context = module.useSpotify(); return null; }
  await act(async () => { view = create(React.createElement(module.SpotifyProvider, null, React.createElement(Consumer))); });
  await act(async () => listeners.ready({ device_id: 'my-device' }));
  let result;
  await act(async () => { result = await context.tocar({ uris: ['spotify:track:a', 'spotify:track:b'], inicio: 'spotify:track:b' }); });
  assert.equal(result, true);
  const play = requests.find(r => r.url.includes('/play?'));
  assert.deepEqual(JSON.parse(play.options.body), { uris: ['spotify:track:a', 'spotify:track:b'], offset: { uri: 'spotify:track:b' } });
  const repeat = requests.find(r => r.url.includes('/repeat?'));
  assert.match(repeat.url, /state=context&device_id=my-device/);
  assert.equal(repeat.options.method, 'PUT');
  await act(async () => view.unmount());
});
