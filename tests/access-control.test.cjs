const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function load({ user = null, error = null, throws = false, url = 'https://example.supabase.co', refresh = false, access = true } = {}) {
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
      if (name === '@supabase/ssr') return { createServerClient: (_, __, options) => ({
        auth: {
          async getUser() {
            calls++;
            if (throws) throw Error('network unavailable');
            if (refresh) options.cookies.setAll([{ name: 'session', value: 'renewed', options: { httpOnly: true, path: '/' } }]);
            return { data: { user }, error };
          },
        },
        from() {
          return {
            select() { return this; },
            eq() { return this; },
            async maybeSingle() { return { data: access ? { user_id: user?.id || 'u' } : null, error: null }; },
          };
        },
      }) };
      throw Error(name);
    },
  });
  return { run: path => exports.middleware(new NextRequest(`https://nexo.example${path}`)), calls: () => calls };
}

test('all internal pages and APIs require login', async () => {
  const app = load();
  for (const path of ['/agenda', '/comunidade/convite/token', '/admin', '/conta', '/new-route']) {
    const res = await app.run(path);
    assert.equal(res.status, 307, path);
    assert.equal(new URL(res.headers.get('location')).pathname, '/login');
  }
  for (const path of ['/api/contents', '/api/events', '/api/admin/events', '/api/health', '/api/push/inscricao', '/api/push/teste', '/api/push/chave']) {
    assert.equal((await app.run(path)).status, 401, path);
  }
});

test('visitors see the public homepage even when authentication is unavailable', async () => {
  for (const options of [{}, { throws: true }, { url: '' }, { user: { is_anonymous: true } }, { error: Error('expired'), refresh: true }]) {
    const res = await load(options).run('/?campaign=welcome');
    assert.equal(res.status, 200);
    assert.equal(new URL(res.headers.get('x-middleware-rewrite')).pathname, '/sobre');
    assert.equal(res.headers.get('location'), null);
    assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
    if (options.refresh) assert.equal(res.cookies.get('session').value, 'renewed');
  }
  const app = load({ throws: true });
  assert.equal((await app.run('/sobre')).headers.get('x-middleware-next'), '1');
  assert.equal(app.calls(), 0);
  assert.equal((await app.run('/sobre/private')).status, 307);
});

test('login, signup, invite validation and static assets stay public', async () => {
  const app = load({ throws: true });
  for (const path of ['/auth/callback?code=valid-code', '/termos', '/privacidade', '/login', '/api/signup', '/api/invites/validate?token=x', '/offline', '/sw.js', '/manifest.webmanifest', '/icon-192.png', '/google12ea32661b84e35f.html', '/api/push/despachar']) {
    assert.equal((await app.run(path)).headers.get('x-middleware-next'), '1', path);
  }
  assert.equal(app.calls(), 0);
});

test('authenticated invited accounts enter and uninvited accounts fail closed', async () => {
  const allowed = load({ user: { id: '1', email: 'member@example.com' }, access: true, refresh: true });
  for (const path of ['/', '/agenda', '/api/me']) {
    const res = await allowed.run(path);
    assert.equal(res.headers.get('x-middleware-next'), '1', path);
    assert.equal(res.cookies.get('session').value, 'renewed');
  }

  const blocked = load({ user: { id: '2', email: 'member@example.com' }, access: false });
  assert.equal((await blocked.run('/')).status, 307);
  assert.equal((await blocked.run('/api/me')).status, 403);
});

test('admin retains access without ordinary invite lookup and members cannot use admin APIs', async () => {
  const admin = load({ user: { id: 'a', email: 'admin@example.com' }, access: false });
  for (const path of ['/admin', '/api/admin/events']) assert.equal((await admin.run(path)).headers.get('x-middleware-next'), '1');

  const member = load({ user: { id: 'm', email: 'member@example.com' }, access: true });
  assert.equal((await member.run('/api/admin/events')).status, 403);
});

test('missing configuration, network errors and invalid sessions fail closed', async () => {
  assert.equal((await load({ throws: true }).run('/api/me')).status, 503);
  assert.equal((await load({ url: '' }).run('/api/me')).status, 503);
  assert.equal((await load({ user: { is_anonymous: true } }).run('/api/me')).status, 401);
});

test('invitation preview is public but invite management and unrelated paths remain protected', async () => {
  const app = load({ throws: true });
  for (const path of ['/convite/' + 'a'.repeat(64), '/convite/arte/0?v=1', '/convite/arte/131?n=427&v=6', '/convite-assets/adesivos/007.png', '/convite-assets/fonts/anton.ttf', '/convite-assets/texturas/lona.jpg']) {
    assert.equal((await app.run(path)).headers.get('x-middleware-next'), '1');
  }
  assert.equal(app.calls(), 0);
  for (const path of ['/convites', '/convite/admin', '/convite/arte/admin', '/convite-assets/adesivos/x.png', '/convite-assets/outro/segredo.json']) assert.equal((await app.run(path)).status, 307);
  assert.equal((await app.run('/api/invites')).status, 503);
});
