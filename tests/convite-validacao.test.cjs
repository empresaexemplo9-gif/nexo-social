const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');

function rota({ valido = false, convite = null, usuario = null } = {}) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync('app/api/invites/validate/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const anon = { rpc: async () => ({ data: [{ valid: valido }], error: null }) };
  const admin = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: convite, error: null }) }) }) }),
    auth: { admin: { getUserById: async () => ({ data: { user: usuario }, error: null }) } },
  };
  vm.runInNewContext(codigo, { exports, URL, require: (n) => (n === 'next/server' ? { NextResponse } : { createAnonServerClient: () => anon, createAdminClient: () => admin }) });
  return (token) => exports.GET(new Request(`https://nexo.test/api/invites/validate?token=${token}`)).then((r) => r.json());
}
const token = 'c'.repeat(64);

test('convite novo é válido; usado por conta confirmada não é', async () => {
  assert.deepEqual(await rota({ valido: true })(token), { valid: true });
  assert.deepEqual(await rota({ convite: { status: 'used', used_by: 'u1' }, usuario: { id: 'u1', email_confirmed_at: '2026-09-30' } })(token), { valid: false });
  assert.deepEqual(await rota()('xyz'), { valid: false });
});

test('convite usado por conta que nunca confirmou o e-mail volta como retomada', async () => {
  assert.deepEqual(await rota({ convite: { status: 'used', used_by: 'u1' }, usuario: { id: 'u1', email_confirmed_at: null } })(token.toUpperCase()), { valid: true, retomada: true });
});
