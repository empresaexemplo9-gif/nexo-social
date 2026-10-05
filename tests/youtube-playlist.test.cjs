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
  const window = new EventTarget();
  window.location = { origin: 'https://nexo.example' };
  if (opcoes.yt) window.YT = opcoes.yt;
  const timers = [];
  const preferences = { ready: false, prefs: { musicGenres: ['rock'], musicHits: false, musicMix: 'misturar' } };
  const requests = [];
  const pending = [];
  const intervals = new Set();
  const nodes = [];
  const createNodeMock = () => {
    const node = { children: [], appendChild(child) { this.children.push(child); }, querySelector() { return this.children[0]; }, replaceChildren() { this.children = []; } };
    nodes.push(node);
    return node;
  };
  const dependencies = {
    react: React,
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    './YoutubeAccount': () => null,
    '@/lib/preferences': { usePreferences: () => preferences },
    '@/lib/taxonomy': { MUSIC_GENRES: [{ id: 'rock', label: 'Rock' }, { id: 'lofi', label: 'Lo-fi & Foco' }] },
    // Sem a API do player (padrão), o vídeo toca e só não segue sozinho.
    '@/lib/youtube-iframe': { carregarApiDoYoutube: () => opcoes.api ?? Promise.reject(new Error('sem api')) },
  };
  const globals = {
    window, document: { hidden: false, createElement: () => ({}) }, URL, URLSearchParams, AbortController,
    setInterval: fn => { intervals.add(fn); return fn; },
    setTimeout: fn => { timers.push(fn); return fn; },
    clearTimeout: fn => { const i = timers.indexOf(fn); if (i >= 0) timers.splice(i, 1); },
    clearInterval: fn => intervals.delete(fn),
    fetch: (url, options) => {
      requests.push({ url, signal: options.signal });
      return new Promise(resolve => pending.push(resolve));
    },
    require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
  };
  const load = (path) => {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText, { ...globals, exports });
    return exports;
  };
  dependencies['@/lib/music-queue'] = load('lib/music-queue.ts');
  dependencies['./YoutubeMusicPlayer'] = load('components/YoutubeMusicPlayer.tsx');
  dependencies['../YoutubeMusicPlayer'] = dependencies['./YoutubeMusicPlayer'];
  return { Playlist: load(process.env.PLAYLIST_SOURCE || 'components/YoutubePlaylist.tsx').default,
    MusicPlayer: dependencies['./YoutubeMusicPlayer'].default, Queue: load('components/midia/YoutubeMusicQueue.tsx').default,
    preferences, window, requests, pending, intervals, timers, nodes, createNodeMock };
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

test('lista da Comunidade continua em ordem, repete e para de tentar quando todos os vídeos falham', async () => {
  const players = [];
  const app = setup({ api: Promise.resolve(), yt: youtubeMock(players) });
  let view;
  const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb'];
  await act(async () => { view = create(React.createElement(app.Queue, { ids, title: 'Minha playlist' }), { createNodeMock: app.createNodeMock }); });
  const player = players[0];
  await act(async () => player.events.onReady());
  await act(async () => player.events.onStateChange({ data: 1 }));
  await act(async () => player.events.onStateChange({ data: 2 }));
  assert.equal(player.id, ids[0], 'pausar não avança');
  await act(async () => player.events.onStateChange({ data: 0 }));
  assert.equal(player.id, ids[1]);
  await act(async () => player.events.onStateChange({ data: 0 }));
  assert.equal(player.id, ids[1], 'evento duplicado de fim não pula outra música');
  await act(async () => player.events.onStateChange({ data: 1 }));
  await act(async () => player.events.onStateChange({ data: 0 }));
  assert.equal(player.id, ids[0], 'repete a lista');
  await act(async () => player.events.onError({ data: 100 }));
  await act(async () => app.timers[0]());
  assert.equal(player.id, ids[1], 'ignora a faixa removida');
  await act(async () => player.events.onError({ data: 150 }));
  assert.equal(app.timers.length, 0, 'não tenta indefinidamente quando nada toca');
  assert.match(JSON.stringify(view.toJSON()), /Nenhuma música/);
  assert.equal(view.root.findByType('button').props.disabled, true);
  await act(async () => view.unmount());
  assert.equal(player.destroyed, true);
});

test('seleção de uma faixa recomeça no mesmo player e permite retomar áudio bloqueado pelo navegador', async () => {
  const players = [];
  const app = setup({ api: Promise.resolve(), yt: youtubeMock(players) });
  let view;
  await act(async () => { view = create(React.createElement(app.Queue, { ids: ['aaaaaaaaaaa'], title: 'Uma música' }), { createNodeMock: app.createNodeMock }); });
  const player = players[0];
  await act(async () => player.events.onReady());
  await act(async () => player.events.onStateChange({ data: 1 }));
  await act(async () => player.events.onStateChange({ data: 0 }));
  assert.deepEqual(player.loads, ['aaaaaaaaaaa'], 'carrega novamente a mesma faixa');
  await act(async () => player.events.onAutoplayBlocked());
  const resume = view.root.findAllByType('button').find(b => b.props.children === 'Continuar reprodução');
  await act(async () => resume.props.onClick());
  assert.equal(player.plays, 2);
  await act(async () => player.events.onStateChange({ data: 1 }));
  assert.equal(view.root.findAllByType('button').filter(b => b.props.children === 'Continuar reprodução').length, 0);
  await act(async () => view.unmount());
});

test('escolha mais recente prevalece enquanto a API carrega e eventos depois de fechar são ignorados', async () => {
  const players = [];
  let resolveApi;
  const app = setup({ api: new Promise(resolve => { resolveApi = resolve; }), yt: youtubeMock(players) });
  let ended = 0, failed = 0, view;
  const props = { title: 'Player', request: 1, onEnded: () => ended++, onError: () => failed++ };
  await act(async () => { view = create(React.createElement(app.MusicPlayer, { ...props, videoId: 'aaaaaaaaaaa' }), { createNodeMock: app.createNodeMock }); });
  await act(async () => view.update(React.createElement(app.MusicPlayer, { ...props, request: 2, videoId: 'bbbbbbbbbbb' })));
  await act(async () => resolveApi());
  await act(async () => players[0].events.onReady());
  assert.equal(players[0].id, 'bbbbbbbbbbb');
  await act(async () => players[0].events.onStateChange({ data: 1 }));
  await act(async () => view.unmount());
  await act(async () => { players[0].events.onStateChange({ data: 0 }); players[0].events.onError({ data: 100 }); });
  assert.equal(ended, 0);
  assert.equal(failed, 0);
  assert.equal(players[0].destroyed, true);
});

test('falha da API é visível e ainda permite escolher outra faixa no iframe simples', async () => {
  const app = setup();
  let view;
  await act(async () => { view = create(React.createElement(app.MusicPlayer, { videoId: 'aaaaaaaaaaa', title: 'A', request: 1 }), { createNodeMock: app.createNodeMock }); });
  assert.match(JSON.stringify(view.toJSON()), /Não foi possível conectar a reprodução automática/);
  await act(async () => view.update(React.createElement(app.MusicPlayer, { videoId: 'bbbbbbbbbbb', title: 'B', request: 2 })));
  assert.match(app.nodes[0].children[0].src, /embed\/bbbbbbbbbbb/);
  await act(async () => view.unmount());
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
  await act(async () => { view = create(React.createElement(app.Playlist, { fallbackGenre: 'lofi', variation: 2 }), { createNodeMock: app.createNodeMock }); });
  assert.match(app.requests[0].url, /genre=lofi/);
  assert.match(app.requests[0].url, /rodada=2/);
  await act(async () => app.pending.shift()({ ok: true, json: async () => ({ videos: [
    { id: 'abcdefghijk', title: 'Trilha de teste', channel: 'Canal', thumb: null },
  ] }) }));
  const play = view.root.findAllByType('button').find(button => button.props.children === 'Tocar seleção');
  await act(async () => play.props.onClick());
  assert.match(app.nodes.at(-1).children[0].src, /youtube-nocookie\.com\/embed\/abcdefghijk/);
  await act(async () => view.update(React.createElement(app.Playlist, { fallbackGenre: 'lofi', variation: 3 })));
  assert.match(app.requests.at(-1).url, /rodada=3/);
  await act(async () => app.pending.shift()({ ok: true, json: async () => ({ videos: [] }) }));
  await act(async () => view.unmount());
});

function youtubeMock(players) {
  return { Player: function (el, options) {
    this.events = options.events;
    this.id = new URL(el.src).pathname.split('/').at(-1);
    this.loads = [];
    this.getVideoUrl = () => `https://www.youtube.com/watch?v=${this.id}`;
    this.loadVideoById = id => { this.id = id; this.loads.push(id); };
    this.playVideo = () => { this.plays = (this.plays || 0) + 1; };
    this.destroy = () => { this.destroyed = true; };
    players.push(this);
  } };
}

test('a trilha mantém um player, toca a escolha, avança sozinha, pula indisponíveis e repete a lista', async () => {
  const players = [];
  const app = setup({ api: Promise.resolve(), yt: youtubeMock(players) });
  app.preferences.ready = true;
  let view;
  const noDom = { createNodeMock: app.createNodeMock };
  await act(async () => { view = create(React.createElement(app.Playlist), noDom); });
  await act(async () => app.pending.shift()({ ok: true, json: async () => ({ videos: [
    { id: 'aaaaaaaaaaa', title: 'Música A', channel: 'Canal', thumb: null },
    { id: 'bbbbbbbbbbb', title: 'Música B', channel: 'Canal', thumb: null },
    { id: 'ccccccccccc', title: 'Música C', channel: 'Canal', thumb: null },
  ] }) }));
  const botao = (rotulo) => view.root.findAllByType('button').find((b) => b.props['aria-label'] === rotulo || b.props.children === rotulo);
  const tocando = () => players[0].id;

  // Escolher a B toca a B — e o player não recebe a lista (que fazia pular).
  await act(async () => botao('Tocar Música B').props.onClick());
  assert.equal(tocando(), 'bbbbbbbbbbb');
  assert.doesNotMatch(app.nodes.at(-1).children[0].src, /playlist=/);
  assert.equal(players.length, 1);
  await act(async () => players[0].events.onReady());

  // Falhou: avisa e pula a B sem pedir outro clique.
  await act(async () => players[0].events.onError({ data: 150 }));
  assert.match(view.root.findByProps({ role: 'alert' }).findAllByType('p')[0].props.children, /não permite/);
  assert.equal(tocando(), 'bbbbbbbbbbb');
  assert.equal(app.timers.length, 1);
  await act(async () => app.timers[0]());
  assert.equal(tocando(), 'ccccccccccc');

  // "Tocar seleção": começa na A e, quando ela termina, segue para a próxima que toca.
  await act(async () => botao('Tocar seleção').props.onClick());
  assert.equal(tocando(), 'aaaaaaaaaaa');
  await act(async () => players[0].events.onStateChange({ data: 1 }));
  await act(async () => players.at(-1).events.onStateChange({ data: 0 }));
  assert.equal(tocando(), 'ccccccccccc', 'a B já falhou: a sequência vai direto para a C');
  await act(async () => players[0].events.onStateChange({ data: 1 }));
  await act(async () => players[0].events.onStateChange({ data: 0 }));
  assert.equal(tocando(), 'aaaaaaaaaaa', 'última música volta para a primeira');
  assert.equal(players.length, 1, 'avanços não recriam o iframe nem o player');
  assert.deepEqual(players[0].loads, ['ccccccccccc', 'aaaaaaaaaaa', 'ccccccccccc', 'aaaaaaaaaaa']);
  await act(async () => view.unmount());
  assert.equal(players[0].destroyed, true);
});
