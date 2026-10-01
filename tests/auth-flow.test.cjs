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
const senha = load('lib/senha.ts');

test('redirect validation rejects external URLs', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/auth/callback', null]) assert.equal(redirect.safeAuthDestination(value), null);
  assert.equal(redirect.safeAuthDestination('/agenda'), '/agenda');
});

function callback(options = {}) {
  const calls = [];
  const user = options.noUser ? null : { id: 'u1', email: 'user@example.com', is_anonymous: false, user_metadata: { full_name: 'Pessoa', account_type: 'organizacao', tenant_name: 'Empresa' } };
  const sb = {
    auth: {
      exchangeCodeForSession: async code => { calls.push(['exchange', code]); return { error: options.exchangeError }; },
      getUser: async () => ({ data: { user }, error: null }),
      signOut: async () => ({}),
    },
    rpc: async (name, args) => { calls.push([name, args]); return { error: options.profileError }; },
  };
  const admin = {
    from: () => ({ select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: options.hasAccess === false ? null : { user_id: 'u1' }, error: null }; } }),
    rpc: async () => ({ data: true, error: null }),
    auth: { admin: { deleteUser: async () => ({}) } },
  };
  return {
    calls,
    GET: load('app/auth/callback/route.ts', {
      'next/server': { NextResponse },
      '@/lib/supabase-server': { createServerSupabase: () => sb, createAdminClient: () => admin },
      '@/lib/auth-redirect': redirect,
      '@/lib/auth': { isPlatformAdmin: () => false },
    }).GET,
  };
}

test('existing invited OAuth account enters and is provisioned', async () => {
  const app = callback();
  const res = await app.GET(new Request('https://nexo.test/auth/callback?code=abc&next=%2Fagenda'));
  assert.equal(res.headers.get('location'), 'https://nexo.test/agenda');
  assert.equal(app.calls.some(x => x[0] === 'ensure_my_profile'), true);
});

test('new OAuth account requires a valid invitation', async () => {
  const blocked = await callback({ hasAccess: false }).GET(new Request('https://nexo.test/auth/callback?code=abc'));
  assert.match(blocked.headers.get('location'), /invite_required/);

  const allowed = await callback({ hasAccess: false }).GET(new Request('https://nexo.test/auth/callback?code=abc&convite=' + 'a'.repeat(64)));
  assert.equal(new URL(allowed.headers.get('location')).pathname, '/');
});

function signup(session, validInvite = true) {
  const calls = [];
  const sb = { auth: { signUp: async data => { calls.push(data); return { data: { session, user: { id: 'new-user' } }, error: null }; } } };
  const anon = { rpc: async () => ({ data: { valid: validInvite }, error: null }) };
  const admin = { rpc: async () => ({ data: true, error: null }), auth: { admin: { deleteUser: async () => ({}) } } };
  return {
    calls,
    POST: load('app/api/signup/route.ts', {
      'next/server': { NextResponse },
      '@/lib/supabase-server': { createServerSupabase: () => sb, createAnonServerClient: () => anon, createAdminClient: () => admin },
      '@/lib/auth': { tenantSlug: () => 'empresa' },
      '@/lib/auth-redirect': redirect,
      '@/lib/auth-errors': { describeAuthError: e => e?.message || 'error' },
      '@/lib/senha': senha,
    }).POST,
  };
}

const token = 'b'.repeat(64);
const payload = { email: ' PERSON@example.com ', password: 'Teste-senha9', fullName: 'Pessoa', accountType: 'organizacao', tenantName: 'Empresa', next: '//evil.test', inviteToken: token };
const request = (body = payload, origin = 'https://nexo.test') => new Request('https://nexo.test/api/signup', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('signup validates and consumes an invite', async () => {
  const app = signup(null, true);
  const res = await app.POST(request());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).confirmacaoPendente, true);
  assert.equal(app.calls[0].email, 'person@example.com');
  assert.match(app.calls[0].options.emailRedirectTo, /convite=/);
});

test('signup rejects missing, invalid, used or cross-origin invitations', async () => {
  assert.equal((await signup(null).POST(request({ ...payload, inviteToken: '' }))).status, 403);
  assert.equal((await signup(null, false).POST(request())).status, 403);
  assert.equal((await signup(null).POST(request(payload, 'https://evil.test'))).status, 403);
});

test('signup exige a senha da política do Supabase (8+, minúscula, maiúscula, número e símbolo)', async () => {
  for (const fraca of ['Ab1!', 'teste-senha9', 'TESTE-SENHA9', 'Teste-senha', 'Testesenha9', 'Testé-senha9'.replace('-', '')]) {
    const app = signup(null, true);
    const res = await app.POST(request({ ...payload, password: fraca }));
    assert.equal(res.status, 400, fraca);
    assert.equal((await res.json()).error, senha.AVISO_DA_SENHA);
    assert.equal(app.calls.length, 0, 'nem chega ao Supabase');
  }
  assert.equal(senha.senhaValida('Teste-senha9'), true);
  assert.equal(senha.senhaValida('A1!' + 'a'.repeat(126)), false, 'acima de 128');
});

test('o erro de senha fraca do Supabase vira a orientação em português', () => {
  const erros = load('lib/auth-errors.ts', { './senha': senha });
  assert.equal(erros.describeAuthError({ message: 'Password should be at least 8 characters.' }), senha.AVISO_DA_SENHA);
  assert.equal(erros.describeAuthError({ message: 'Password should contain at least one character of each: abc, ABC, 012, !@#.' }), senha.AVISO_DA_SENHA);
  assert.equal(erros.describeAuthError({ message: 'qualquer coisa', code: 'weak_password' }), senha.AVISO_DA_SENHA);
  assert.equal(erros.describeAuthError({ message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.');
});
