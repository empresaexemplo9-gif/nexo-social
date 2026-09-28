const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const crypto = require('node:crypto');
const { NextRequest } = require('next/server');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} }; new Function('require', 'module', 'exports', code)(name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), mod, mod.exports); return mod.exports;
}
const parser = load('lib/football-live-parser.ts');
test('live metadata distinguishes upcoming, ended and embed restrictions', () => {
  const player = { microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { isLiveNow: true } } }, playabilityStatus: { status: 'OK', playableInEmbed: true } };
  assert.equal(parser.broadcastState(player).state, 'live');
  player.playabilityStatus.playableInEmbed = false; assert.equal(parser.broadcastState(player).embeddable, false);
  player.microformat.playerMicroformatRenderer.liveBroadcastDetails.endTimestamp = '2026-09-01'; assert.equal(parser.broadcastState(player), null);
  assert.equal(parser.broadcastState({ playabilityStatus: { status: 'LIVE_STREAM_OFFLINE', liveStreamability: { liveStreamabilityRenderer: { offlineSlate: { liveStreamOfflineSlateRenderer: { scheduledStartTime: '1791750600' } } } } } }).state, 'upcoming');
  assert.equal(parser.broadcastState({ playabilityStatus: { status: 'LOGIN_REQUIRED' } }), null);
});
test('candidate parser requires scoped live badges, not titles or playing animations', () => {
  const video = (id, title, badges) => ({ videoRenderer: { videoId: id, title: { simpleText: title }, badges } });
  const data = [video('abcdefghijk', 'AO VIVO: A x B', []), video('12345678901', 'A x B', [{ style: 'BADGE_STYLE_LIVE_NOW' }]), video('abcdefghij2', 'NBA: A x B', [{ style: 'BADGE_STYLE_LIVE_NOW' }]), video('abcdefghij3', 'A x B', [{ text: 'Tocando agora' }])];
  assert.deepEqual(parser.liveCandidates(data).map(v => v.id), ['12345678901']);
  const object = { title: 'braces } and escaped " quote', a: { b: 1 } }; assert.deepEqual(parser.youtubeJson('var ytInitialData = ' + JSON.stringify(object) + '; trailing', 'ytInitialData'), object);
  assert.equal(parser.youtubeJson('var ytInitialData = nope', 'ytInitialData'), null);
});
test('history survives reload, isolates accounts, and preserves unseen personal priority', async () => {
  const saved = new Map(); global.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k,v) => saved.set(k,v) };
  const client = load('lib/shorts-client.ts'); client.markShortSeen('one', 'abcdefghijk');
  assert.deepEqual(load('lib/shorts-client.ts').seenShorts('one'), ['abcdefghijk']); assert.deepEqual(client.seenShorts('two'), []);
  assert.notEqual(client.nextShortRound(), client.nextShortRound());
  const oldFetch = global.fetch;
  const short = id => ({ id, titulo: id, canal: 'Canal', capa: '', de: '' });
  global.fetch = async url => ({ ok: true, json: async () => ({ owner: 'one', itens: [short('personal001'), short('public00001'), short('abcdefghijk')] }) });
  try { const result = await client.loadShortFeed(['tema:esporte'], 1); assert.deepEqual(result.itens.map(v=>v.id), ['personal001', 'public00001']); } finally { global.fetch = oldFetch; }
});
