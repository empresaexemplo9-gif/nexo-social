const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, URL, console, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; } });
  return exports;
}
const redirect = load('lib/auth-redirect.ts');
test('redirect validation rejects external URLs, auth loops and parser ambiguities', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/\t/evil.test', '/login', '/auth/callback', '/a/../login', null]) assert.equal(redirect.safeAuthDestination(value), null, value);
  assert.equal(redirect.safeAuthDestination('/comunidade/convite/abc?q=1#ok'), '/comunidade/convite/abc?q=1#ok');
});
function callback(options = {}) {
  const calls = [];
  const sb = { auth: {
    exchangeCodeForSession: async code => { calls.push(code); return { error: options.exchangeError }; },
    getUser: async () => ({ data: { user: options.noUser ? null : { email: 'user@example.com', user_metadata: { full_name: 'Pessoa', account_type: 'organizacao', tenant_name: 'Empresa' } } } }),
  }, rpc: async (name, args) => { calls.push(args); return { error: options.profileError }; } };
  return { calls, GET: load('app/auth/callback/route.ts', { 'next/server': { NextResponse }, '@/lib/supabase-server': { createServerSupabase: () => sb }, '@/lib/auth-redirect': redirect, '@/lib/auth': { isPlatformAdmin: () => false } }).GET };
}
test('OAuth callback validates session, provisions real user context and preserves internal destination', async () => {
  const app = callback();
  const res = await app.GET(new Request('https://nexo.test/auth/callback?code=abc&next=%2Fagenda'));
  assert.equal(res.headers.get('location'), 'https://nexo.test/agenda');
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.equal(app.calls[1].p_account_type, 'organizacao');
});
test('failed exchange, missing user and failed provisioning never enter protected app', async () => {
  for (const options of [{ exchangeError: {} }, { noUser: true }, { profileError: {} }]) {
    const res = await callback(options).GET(new Request('https://nexo.test/auth/callback?code=secret&next=//evil.test'));
    assert.equal(new URL(res.headers.get('location')).pathname, '/login');
    assert.equal(res.headers.get('location').includes('secret'), false);
  }
});
test('cancelled or missing OAuth code never calls token exchange', async () => {
  for (const query of ['', '?error=access_denied&code=abc']) {
    const app = callback();
    await app.GET(new Request('https://nexo.test/auth/callback' + query));
    assert.equal(app.calls.length, 0);
  }
});
function signup(session) {
  const calls = [];
  return { calls, POST: load('app/api/signup/route.ts', { 'next/server': { NextResponse }, '@/lib/supabase-server': { createServerSupabase: () => ({ auth: { signUp: async data => { calls.push(data); return { data: { session }, error: null }; } } }) }, '@/lib/auth': { tenantSlug: () => 'empresa' }, '@/lib/auth-redirect': redirect, '@/lib/auth-errors': { describeAuthError: () => 'error' } }).POST };
}
const payload = { email: ' PERSON@example.com ', password: 'test-password', fullName: 'Pessoa', accountType: 'organizacao', tenantName: 'Empresa', next: '//evil.test' };
const request = (body = payload, origin = 'https://nexo.test') => new Request('https://nexo.test/api/signup', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('signup retains email verification and returns actual confirmation state', async () => {
  for (const session of [null, { access_token: 'test' }]) {
    const app = signup(session);
    const res = await app.POST(request());
    assert.equal((await res.json()).confirmacaoPendente, !session);
    assert.equal(app.calls[0].email, 'person@example.com');
    assert.equal(app.calls[0].options.emailRedirectTo, 'https://nexo.test/auth/callback');
    assert.equal(app.calls[0].options.data.account_type, 'organizacao');
    assert.equal(app.calls[0].email_confirm, undefined);
  }
});
test('signup rejects invalid input and cross-origin requests without creating accounts', async () => {
  const app = signup(null);
  assert.equal((await app.POST(request(payload, 'https://evil.test'))).status, 403);
  assert.equal((await app.POST(request({ ...payload, password: 'x' }))).status, 400);
  assert.equal((await app.POST(request({ ...payload, fullName: '' }))).status, 400);
  assert.equal(app.calls.length, 0);
});
