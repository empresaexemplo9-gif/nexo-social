const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function load({ user = null, error = null, throws = false, url = 'https://example.supabase.co', refresh = false } = {}) {
  let calls = 0;
  const exports = {};
  const source = ts.transpileModule(readFileSync('middleware.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URL, Set, console: { error() {} },
    require(name) {
      if (name === 'next/server') return { NextResponse };
      if (name === '@/lib/auth') return { isPlatformAdmin: email => email === 'admin@example.com' };
      if (name === '@/lib/supabase-config') return { resolveSupabaseUrl: () => url, PUBLISHABLE_ANON_KEY: 'public' };
      if (name === '@supabase/ssr') return { createServerClient: (_, __, options) => ({ auth: {
        async getUser() {
          calls++;
          if (throws) throw Error('network unavailable');
          if (refresh) options.cookies.setAll([{ name: 'session', value: 'renewed', options: { httpOnly: true, path: '/' } }]);
          return { data: { user }, error };
        },
      } }) };
      throw Error(name);
    },
  });
  return { run: path => exports.middleware(new NextRequest(`https://nexo.example${path}`)), calls: () => calls };
}

test('all internal pages, new routes and extension-shaped URLs require login', async () => {
  const app = load();
  for (const path of ['/', '/agenda', '/comunidade/convite/token', '/admin', '/conta', '/new-route', '/revista/tema/article.png', '/login/extra', '/privacidade/extra', '/termos/extra']) {
    const res = await app.run(path);
    assert.equal(res.status, 307, path);
    const target = new URL(res.headers.get('location'));
    assert.equal(target.pathname, '/login');
    assert.equal(target.searchParams.get('next'), path);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
  }
});
test('preserves the destination and query after login', async () => {
  const res = await load().run('/busca?q=musica');
  assert.equal(new URL(res.headers.get('location')).searchParams.get('next'), '/busca?q=musica');
});
test('APIs reject visitors with JSON 401, including health and admin', async () => {
  for (const path of ['/api/contents', '/api/events', '/api/admin/events', '/api/health', '/api/seed', '/api/signup/extra']) {
    const res = await load().run(path);
    assert.equal(res.status, 401, path);
    assert.match((await res.json()).error, /login/);
  }
});
test('login, registration and PWA assets remain public even during auth outage', async () => {
  const app = load({ throws: true });
  for (const path of ['/termos', '/privacidade', '/login', '/login?cadastro=1', '/api/signup', '/offline', '/sw.js', '/manifest.webmanifest', '/icon-192.png', '/bg/hud.svg']) {
    assert.equal((await app.run(path)).headers.get('x-middleware-next'), '1', path);
  }
  assert.equal(app.calls(), 0);
});
test('invalid, expired and anonymous sessions cannot enter', async () => {
  for (const options of [{ error: { message: 'expired' } }, { user: { email: 'test@example.com' }, error: {} }, { user: { is_anonymous: true } }]) {
    assert.equal((await load(options).run('/')).status, 307);
    assert.equal((await load(options).run('/api/me')).status, 401);
  }
});
test('missing configuration and network errors fail closed', async () => {
  for (const options of [{ throws: true }, { url: '' }]) {
    assert.equal((await load(options).run('/')).status, 307);
    assert.equal((await load(options).run('/api/me')).status, 503);
  }
});
test('authenticated accounts enter and refreshed cookies survive responses', async () => {
  const app = load({ user: { email: 'member@example.com' }, refresh: true });
  for (const path of ['/', '/agenda', '/api/me']) {
    const res = await app.run(path);
    assert.equal(res.headers.get('x-middleware-next'), '1');
    assert.equal(res.cookies.get('session').value, 'renewed');
  }
  const redirect = await app.run('/admin');
  assert.equal(redirect.status, 307);
  assert.equal(redirect.cookies.get('session').value, 'renewed');
  assert.equal((await app.run('/api/admin/events')).status, 403);
});
test('admin retains access; session cleanup cookies survive login redirects', async () => {
  const app = load({ user: { email: 'admin@example.com' } });
  for (const path of ['/admin', '/api/admin/events']) assert.equal((await app.run(path)).headers.get('x-middleware-next'), '1');
  assert.equal((await load({ refresh: true }).run('/')).cookies.get('session').value, 'renewed');
});

test('Spotify and its catalog are restricted to platform superadmins', async () => {
  for (const path of ['/api/spotify/entrar', '/api/spotify/retorno', '/api/spotify/token', '/api/spotify/sair', '/api/playlist']) {
    assert.equal((await load().run(path)).status, 401, path);
    assert.equal((await load({ user: { email: 'member@example.com' } }).run(path)).status, 403, path);
    assert.equal((await load({ user: { email: 'admin@example.com' } }).run(path)).headers.get('x-middleware-next'), '1', path);
  }
  assert.equal((await load({ user: { email: 'member@example.com' } }).run('/api/musica')).headers.get('x-middleware-next'), '1');
});
