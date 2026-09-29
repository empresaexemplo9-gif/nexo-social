process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { NextResponse } = require('next/server');

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, {
    exports, URL, URLSearchParams, Date, Intl, AbortController, AbortSignal, console,
    require(name) { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, ...globals,
  });
  return exports;
}
const catalog = load('lib/bom-dia.ts');
const feeds = load('lib/bom-dia-feed.ts');

test('São Paulo midnight changes the complete daily selection, including year boundaries', () => {
  assert.equal(catalog.dayKey(new Date('2026-09-29T02:59:59Z')), '2026-09-28');
  assert.equal(catalog.dayKey(new Date('2026-09-29T03:00:00Z')), '2026-09-29');
  assert.equal(catalog.dayKey(new Date('2027-01-01T02:59:59Z')), '2026-12-31');
  for (const [day, tomorrow] of [['2026-09-28', '2026-09-29'], ['2026-12-31', '2027-01-01']]) {
    const a = catalog.selectBomDia(day), b = catalog.selectBomDia(tomorrow);
    assert.ok(a.recipes.every(r => !b.recipes.some(x => x.id === r.id)));
    assert.notEqual(a.routine.id, b.routine.id);
    assert.ok(a.tips.every(t => !b.tips.some(x => x.id === t.id)));
    assert.notEqual(a.musicVariation, b.musicVariation);
  }
});
test('manual selection varies and every dietary filter is respected for a full month', () => {
  const initial = catalog.selectBomDia('2026-09-29');
  const next = catalog.selectBomDia('2026-09-29', 1);
  assert.ok(initial.recipes.every(r => !next.recipes.some(x => x.id === r.id)));
  for (const diet of Object.keys(catalog.DIET_FILTERS)) for (let round = 0; round < 31; round++) {
    const selection = catalog.selectBomDia('2026-09-29', round, diet);
    assert.equal(new Set(selection.recipes.map(r => r.id)).size, 3);
    assert.ok(selection.recipes.every(r => diet === 'todas' || r.tags.includes(diet)));
    assert.ok(selection.recipes.every(r => r.ingredients.length >= 3 && r.steps.length >= 3 && r.minutes > 0));
  }
});
test('external discovery rejects old, future, malformed dates and duplicate links', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const item = { title: 'Receita', url: 'https://www.youtube.com/watch?v=abcdefghijk', source: 'Panelinha', kind: 'Cozinha', publishedAt: '2026-09-28T12:00:00Z' };
  const result = feeds.recentDiscoveries([item, item, { ...item, url: 'old', publishedAt: '2025-01-01' }, { ...item, url: 'future', publishedAt: '2027-01-01' }, { ...item, url: 'invalid', publishedAt: 'not-a-date' }], now);
  assert.equal(result.length, 1);
});
test('breakfast parser accepts current markup but rejects off-site links and strips markup', () => {
  const result = feeds.parseBreakfast('<a href=/receita/mingau><h6>Mingau &amp; frutas</h6></a><a href="https://evil.test/receita/x"><h6>Wrong</h6></a><a href="javascript:alert(1)"><h6>Wrong</h6></a><a href=/receita/mingau><h6>Duplicate</h6></a><a href=/loja><h6>Loja</h6></a>');
  assert.equal(result.length, 1); assert.equal(result[0].title, 'Mingau & frutas');
  assert.equal(result[0].publishedAt, null); assert.equal(result[0].url, 'https://panelinha.com.br/receita/mingau');
});
test('video feed accepts only relevant dated publications with real video ids', () => {
  const entry = (id, title, date) => `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><published>${date}</published></entry>`;
  const result = feeds.parseVideoFeed(entry('abcdefghijk', 'Receita de bolo', '2026-09-29T08:00:00Z') + entry('12345678901', 'Cuidados com gatos', '2026-09-29') + entry('bad', 'Receita', '2026-09-29'), 'Panelinha', 'Cozinha', /receita/i);
  assert.equal(result.length, 1); assert.equal(result[0].url, 'https://www.youtube.com/watch?v=abcdefghijk');
});
test('an unavailable source or database does not discard working sources', async () => {
  const source = load('lib/bom-dia-sources.ts', {
    'server-only': {}, 'next/cache': { unstable_cache: fn => fn }, './bom-dia': catalog, './bom-dia-feed': feeds,
    './supabase-server': { createAnonServerClient: () => null },
  }, { fetch: async url => {
    if (!url.includes('home/cafe')) throw Error('offline');
    return { ok: true, text: async () => '<a href=/receita/mingau><h6>Mingau</h6></a>' };
  } });
  const result = await source.getBomDiaSources(0);
  assert.equal(result.items.length, 1); assert.equal(result.editorial, null);
  assert.equal(result.sources.filter(s => s.ok).length, 1);
  assert.equal(result.sources.filter(s => !s.ok && s.checkedAt === null).length, 2);
});
test('Bom Dia news API requires authentication and normalizes round input', async () => {
  for (const user of [null, { is_anonymous: true }, { id: 'member' }]) {
    let calls = 0;
    const api = load('app/api/bom-dia/novidades/route.ts', {
      'next/server': { NextResponse }, '@/lib/api-helpers': { getSession: async () => ({ user }) },
      '@/lib/bom-dia-sources': { getBomDiaSources: async round => { calls++; assert.equal(round, 0); return { items: [] }; } },
    });
    const res = await api.GET(new Request('https://nexo.example/api/bom-dia/novidades?rodada=Infinity'));
    assert.equal(res.status, user?.id ? 200 : 401); assert.equal(calls, user?.id ? 1 : 0);
    if (user?.id) assert.equal(res.headers.get('cache-control'), 'private, no-store');
  }
});
test('UI switches recipes, applies filters, refreshes after midnight and cleans up listeners', async () => {
  let now = '2026-09-29T12:00:00Z';
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const clockCatalog = load('lib/bom-dia.ts', {}, { Date: Clock });
  const window = new EventTarget(), document = new EventTarget(); document.hidden = false;
  const timers = new Set();
  const globals = { Date: Clock, window, document, setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn) };
  const hook = load('components/bom-dia/useBomDia.ts', { react: React, '@/lib/bom-dia': clockCatalog }, globals);
  const requests = [];
  const View = load('components/bom-dia/BomDiaView.tsx', {
    react: React, 'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    '@/components/icons': () => null, '@/components/YoutubePlaylist': () => null,
    '@/lib/bom-dia': clockCatalog, './useBomDia': hook,
  }, { ...globals, fetch: async (url, options) => { requests.push({ url, signal: options.signal }); return { ok: true, json: async () => ({ items: [], sources: [], editorial: null }) }; } }).default;
  let view;
  await act(async () => { view = create(React.createElement(View, { initialDay: '2026-09-29' })); });
  const titles = () => view.root.findByProps({ id: 'receita' }).findAllByType('h3').map(n => n.children.join(''));
  const first = titles();
  const change = view.root.findAllByType('button').find(b => b.findAllByType('span').some(span => span.children.some(child => typeof child === 'string' && child.includes('Ver outras ideias'))));
  await act(async () => change.props.onClick()); assert.notDeepEqual(titles(), first);
  assert.match(requests.at(-1).url, /rodada=1/);
  await act(async () => view.root.findByType('select').props.onChange({ target: { value: 'vegana' } }));
  assert.ok(titles().every(title => clockCatalog.RECIPES.find(r => r.title === title).tags.includes('vegana')));
  now = '2026-09-30T03:00:01Z';
  await act(async () => window.dispatchEvent(new Event('focus')));
  assert.match(requests.at(-1).url, /rodada=0/);
  assert.match(JSON.stringify(view.toJSON()), /30 de setembro/);
  await act(async () => view.unmount()); assert.equal(timers.size, 0);
  assert.ok(requests.every(r => r.signal.aborted));
});
