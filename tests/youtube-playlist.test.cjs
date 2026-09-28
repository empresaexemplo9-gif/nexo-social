// React act() needs the development renderer even in the production build job.
process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

function setup() {
  const exports = {};
  const window = new EventTarget();
  const preferences = { ready: false, prefs: { musicGenres: ['rock'], musicHits: false, musicMix: 'misturar' } };
  const requests = [];
  const pending = [];
  const intervals = new Set();
  const dependencies = {
    react: React,
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    './YoutubeAccount': () => null,
    '@/lib/preferences': { usePreferences: () => preferences },
    '@/lib/taxonomy': { MUSIC_GENRES: [{ id: 'rock', label: 'Rock' }] },
  };
  const source = fs.readFileSync(process.env.PLAYLIST_SOURCE || 'components/YoutubePlaylist.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, {
    exports, window, document: { hidden: false }, URLSearchParams, AbortController,
    setInterval: fn => { intervals.add(fn); return fn; },
    clearInterval: fn => intervals.delete(fn),
    fetch: (url, options) => {
      requests.push({ url, signal: options.signal });
      return new Promise(resolve => pending.push(resolve));
    },
    require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
  });
  return { Playlist: exports.default, preferences, window, requests, pending, intervals };
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
