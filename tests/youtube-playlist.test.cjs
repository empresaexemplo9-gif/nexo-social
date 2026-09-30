// React act() needs the development renderer even in the production build job.
process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

function setup(opcoes = {}) {
  const exports = {};
  const window = new EventTarget();
  if (opcoes.yt) window.YT = opcoes.yt;
  const timers = [];
  const preferences = { ready: false, prefs: { musicGenres: ['rock'], musicHits: false, musicMix: 'misturar' } };
  const requests = [];
  const pending = [];
  const intervals = new Set();
  const dependencies = {
    react: React,
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    './YoutubeAccount': () => null,
    '@/lib/preferences': { usePreferences: () => preferences },
    '@/lib/taxonomy': { MUSIC_GENRES: [{ id: 'rock', label: 'Rock' }, { id: 'lofi', label: 'Lo-fi & Foco' }] },
    // Sem a API do player (padrão), o vídeo toca e só não segue sozinho.
    '@/lib/youtube-iframe': { carregarApiDoYoutube: () => opcoes.api ?? Promise.reject(new Error('sem api')) },
  };
  const source = fs.readFileSync(process.env.PLAYLIST_SOURCE || 'components/YoutubePlaylist.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, {
    exports, window, document: { hidden: false }, URLSearchParams, AbortController,
    setInterval: fn => { intervals.add(fn); return fn; },
    setTimeout: fn => { timers.push(fn); return fn; },
    clearTimeout: fn => { const i = timers.indexOf(fn); if (i >= 0) timers.splice(i, 1); },
    clearInterval: fn => intervals.delete(fn),
    fetch: (url, options) => {
      requests.push({ url, signal: options.signal });
      return new Promise(resolve => pending.push(resolve));
    },
    require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
  });
  return { Playlist: exports.default, preferences, window, requests, pending, intervals, timers };
}

test('home music mounts after login and refreshes when YouTube is connected in another tab', async () => {
  const app = setup();
  let view;
  await act(async () => { view = create(React.createElement(app.Playlist)); });
  assert.match(JSON.stringify(view.toJSON()), /Montando sua trilha/);
  assert.equal(app.requests.length, 0, 'wait for the signed-in profile');

  app.preferences.ready = true;
  await act(async () => { view.update(React.createElement(app.Playlist)); });
  assert.match(app.requests[0].url, /genre=rock/);
  await act(async () => { app.pending.shift()({ ok: true, json: async () => ({ videos: [
    { id: 'video-1', title: 'Música de teste', channel: 'Canal', thumb: null },
  ] }) }); });
  assert.match(JSON.stringify(view.toJSON()), /Música de teste/);

  await act(async () => { app.window.dispatchEvent(new Event('nexo:youtube-changed')); });
  assert.equal(app.requests.length, 2, 'the connection event refreshes the playlist');
  assert.equal(app.requests[0].signal.aborted, true);
  await act(async () => { app.pending.shift()({ ok: true, json: async () => ({ videos: [] }) }); });

  await act(async () => { view.unmount(); });
  app.window.dispatchEvent(new Event('nexo:youtube-changed'));
  assert.equal(app.requests.length, 2, 'listeners are removed on navigation away');
  assert.equal(app.intervals.size, 0, 'refresh timers are removed too');
  assert.equal(app.requests[1].signal.aborted, true);
});

test('music API failure stays inside the widget and the retry works', async () => {
  const app = setup();
  app.preferences.ready = true;
  let view;
  await act(async () => { view = create(React.createElement(app.Playlist)); });
  await act(async () => { app.pending.shift()({ ok: false, json: async () => ({ error: 'Serviço indisponível' }) }); });
  assert.match(JSON.stringify(view.root.findByProps({ role: 'alert' }).children[0].props.children), /Serviço indisponível/);
  const retry = view.root.findAllByType('button').find(button => button.props.children === 'Tentar novamente');
  await act(async () => { retry.props.onClick(); });
  assert.equal(app.requests.length, 2);
  await act(async () => { app.pending.shift()({ ok: true, json: async () => ({ videos: [] }) }); });
  assert.equal(view.root.findAllByProps({ role: 'alert' }).length, 0);
  await act(async () => { view.unmount(); });
});

test('Bom Dia supplies a playable default and refreshes its daily music variation', async () => {
  const app = setup();
  app.preferences.ready = true;
  app.preferences.prefs.musicGenres = [];
  let view;
  await act(async () => { view = create(React.createElement(app.Playlist, { fallbackGenre: 'lofi', variation: 2 })); });
  assert.match(app.requests[0].url, /genre=lofi/);
  assert.match(app.requests[0].url, /rodada=2/);
  await act(async () => app.pending.shift()({ ok: true, json: async () => ({ videos: [
    { id: 'abcdefghijk', title: 'Trilha de teste', channel: 'Canal', thumb: null },
  ] }) }));
  const play = view.root.findAllByType('button').find(button => button.props.children === 'Tocar seleção');
  await act(async () => play.props.onClick());
  assert.match(view.root.findByType('iframe').props.src, /youtube-nocookie\.com\/embed\/abcdefghijk/);
  await act(async () => view.update(React.createElement(app.Playlist, { fallbackGenre: 'lofi', variation: 3 })));
  assert.match(app.requests.at(-1).url, /rodada=3/);
  await act(async () => app.pending.shift()({ ok: true, json: async () => ({ videos: [] }) }));
  await act(async () => view.unmount());
});

test('a música escolhida toca ela mesma; ao acabar segue a próxima; se falhar, avisa e não pula', async () => {
  const players = [];
  const app = setup({ api: Promise.resolve(), yt: { Player: function (el, opcoes) { players.push(opcoes); } } });
  app.preferences.ready = true;
  let view;
  const noDom = { createNodeMock: () => ({ isConnected: true }) };
  await act(async () => { view = create(React.createElement(app.Playlist), noDom); });
  await act(async () => app.pending.shift()({ ok: true, json: async () => ({ videos: [
    { id: 'aaaaaaaaaaa', title: 'Música A', channel: 'Canal', thumb: null },
    { id: 'bbbbbbbbbbb', title: 'Música B', channel: 'Canal', thumb: null },
    { id: 'ccccccccccc', title: 'Música C', channel: 'Canal', thumb: null },
  ] }) }));
  const botao = (rotulo) => view.root.findAllByType('button').find((b) => b.props['aria-label'] === rotulo || b.props.children === rotulo);
  const tocando = () => view.root.findByType('iframe').props.src;

  // Escolher a B toca a B — e o player não recebe a lista (que fazia pular).
  await act(async () => botao('Tocar Música B').props.onClick());
  assert.match(tocando(), /embed\/bbbbbbbbbbb\?/);
  assert.doesNotMatch(tocando(), /playlist=/);
  assert.equal(players.length, 1);

  // Falhou: aparece o aviso e continua na B (a pessoa decide).
  await act(async () => players[0].events.onError({ data: 150 }));
  assert.match(view.root.findByProps({ role: 'alert' }).findAllByType('p')[0].props.children, /não permite/);
  assert.match(tocando(), /embed\/bbbbbbbbbbb\?/);
  assert.equal(app.timers.length, 0, 'escolha manual não pula sozinha');
  await act(async () => botao('Tocar a próxima').props.onClick());
  assert.match(tocando(), /embed\/ccccccccccc\?/);

  // "Tocar seleção": começa na A e, quando ela termina, segue para a próxima que toca.
  await act(async () => botao('Tocar seleção').props.onClick());
  assert.match(tocando(), /embed\/aaaaaaaaaaa\?/);
  await act(async () => players.at(-1).events.onStateChange({ data: 0 }));
  assert.match(tocando(), /embed\/ccccccccccc\?/, 'a B já falhou: a sequência vai direto para a C');
  await act(async () => view.unmount());
});
