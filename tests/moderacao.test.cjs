process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');

function load(path, deps) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, {
    exports, URL, Request, Response, console,
    require(name) { if (!(name in deps)) throw Error(name); return deps[name]; },
  });
  return exports;
}

// Supabase de mentira: guarda o que cada chamada fez.
function banco({ bans = [], termos = [], rpcErro = null } = {}) {
  const feito = [];
  const tabela = (nome) => {
    const q = {
      select() { return q; }, order() { return q; }, eq(col, v) { feito.push({ nome, eq: [col, v] }); return q; },
      limit() { return Promise.resolve({ data: nome === 'user_bans' ? bans : termos, error: null }); },
      then(ok) { return Promise.resolve({ data: termos, error: null }).then(ok); },
      upsert(linha) { feito.push({ nome, upsert: linha }); return Promise.resolve({ error: null }); },
      delete() { feito.push({ nome, delete: true }); return q; },
    };
    return q;
  };
  return {
    feito,
    sb: { from: tabela, rpc: async (fn, args) => { feito.push({ rpc: fn, args }); return { error: rpcErro }; } },
  };
}

function rota({ admin = true, db = banco(), desbanidos = [] } = {}) {
  const mod = load('app/api/admin/moderacao/route.ts', {
    'next/server': { NextResponse },
    '@/lib/api-helpers': {
      requireAdmin: async () => admin
        ? { ok: true, sb: db.sb, user: { id: 'admin' } }
        : { ok: false, response: NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 }) },
    },
    '@/lib/supabase-server': { createAdminClient: () => ({ auth: { admin: { updateUserById: async (id, o) => { desbanidos.push([id, o]); return {}; } } } }) },
    '@/lib/social': {
      isUuid: (v) => /^[0-9a-f-]{36}$/i.test(v),
      profilesByIds: async () => new Map([['11111111-1111-1111-1111-111111111111', { name: 'Ana', email: 'ana@x.com' }]]),
    },
  });
  return { mod, db, desbanidos };
}

const simples = (o) => JSON.parse(JSON.stringify(o));
const post = (body) => new Request('https://nexo.test/api/admin/moderacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ID = '11111111-1111-1111-1111-111111111111';

test('moderação no painel: só o administrador entra', async () => {
  const { mod } = rota({ admin: false });
  assert.equal((await mod.GET()).status, 403);
  assert.equal((await mod.POST(post({ acao: 'termo', termo: 'teste' }))).status, 403);
  assert.equal((await mod.DELETE(new Request('https://nexo.test/api/admin/moderacao?termo=x', { method: 'DELETE' }))).status, 403);
});

test('lista os banimentos com nome, termo, trecho e de onde veio', async () => {
  const db = banco({ bans: [{ user_id: ID, termo: 'merda', trecho: 'que livro de merda', origem: 'community_posts', created_at: '2026-10-01T10:00:00Z', revogado_em: null }] });
  const res = await rota({ db }).mod.GET();
  const j = await res.json();
  assert.equal(j.banimentos[0].nome, 'Ana');
  assert.equal(j.banimentos[0].trecho, 'que livro de merda');
  assert.equal(j.banimentos[0].origem, 'community_posts');
});

test('acrescentar termo: normaliza, valida o tipo e exige "frase" para termo com espaço', async () => {
  const { mod, db } = rota();
  assert.equal((await mod.POST(post({ acao: 'termo', termo: ' X ' }))).status, 400);
  assert.equal((await mod.POST(post({ acao: 'termo', termo: 'tomar no', tipo: 'palavra' }))).status, 400);
  assert.equal((await mod.POST(post({ acao: 'termo', termo: 'Tomar No', tipo: 'frase' }))).status, 200);
  assert.equal((await mod.POST(post({ acao: 'termo', termo: 'Xingo', tipo: 'qualquer' }))).status, 200);
  assert.deepEqual(simples(db.feito.filter((f) => f.upsert).map((f) => f.upsert)), [{ termo: 'tomar no', tipo: 'frase' }, { termo: 'xingo', tipo: 'palavra' }]);
});

test('revogar: valida a conta, chama o banco e libera no Auth', async () => {
  const { mod, db, desbanidos } = rota();
  assert.equal((await mod.POST(post({ acao: 'revogar', userId: 'nada' }))).status, 400);
  assert.equal((await mod.POST(post({ acao: 'revogar', userId: ID }))).status, 200);
  assert.deepEqual(simples(db.feito.find((f) => f.rpc)), { rpc: 'revogar_banimento', args: { p_user: ID } });
  assert.deepEqual(simples(desbanidos), [[ID, { ban_duration: 'none' }]]);
  assert.equal((await mod.POST(post({ acao: 'apagar-tudo' }))).status, 400);
});

test('aceite das regras: pede login, informa e registra', async () => {
  let sessao = { sb: null, user: null };
  const aceitas = new Set();
  const sb = {
    from: () => ({ select() { return this; }, eq(_, id) { this.id = id; return this; }, async maybeSingle() { return { data: aceitas.has(this.id) ? { user_id: this.id } : null, error: null }; } }),
    rpc: async (fn) => { assert.equal(fn, 'aceitar_regras'); aceitas.add(sessao.user.id); return { error: null }; },
  };
  const mod = load('app/api/regras/route.ts', { 'next/server': { NextResponse }, '@/lib/api-helpers': { getSession: async () => sessao } });
  sessao = { sb, user: null };
  assert.equal((await mod.GET()).status, 401);
  sessao = { sb, user: { id: 'u1' } };
  assert.equal((await (await mod.GET()).json()).aceitas, false);
  const outro = new Request('https://nexo.test/api/regras', { method: 'POST', headers: { origin: 'https://evil.test' } });
  assert.equal((await mod.POST(outro)).status, 403);
  assert.equal((await mod.POST(new Request('https://nexo.test/api/regras', { method: 'POST' }))).status, 200);
  assert.equal((await (await mod.GET()).json()).aceitas, true);
});

test('o banimento aparece em todo lugar que conta a regra: cadastro, aviso, /banido e termos', () => {
  for (const arquivo of ['app/login/LoginForm.tsx', 'components/AvisoDeRegras.tsx', 'app/banido/page.tsx']) {
    assert.match(fs.readFileSync(arquivo, 'utf8'), /from '@\/lib\/regras'/, arquivo);
  }
  assert.match(fs.readFileSync('lib/regras.ts', 'utf8'), /banido na hora e perde o acesso à plataforma para sempre/);
  assert.match(fs.readFileSync('app/termos/page.tsx', 'utf8'), /banida de forma imediata e permanente/);
  // O gatilho cobre todas as tabelas de texto que já existem.
  const sql = fs.readFileSync('db/moderacao.sql', 'utf8');
  for (const t of ['profiles', 'community_groups', 'community_posts', 'community_post_comments', 'community_chat_messages', 'community_albums', 'messages', 'appointments']) {
    assert.match(sql, new RegExp(`moderacao_ligar\\('${t}'`), t);
  }
});
