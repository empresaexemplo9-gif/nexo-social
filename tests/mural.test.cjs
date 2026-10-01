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
    exports, URL, URLSearchParams, Request, Response, console,
    require(name) { if (!(name in deps)) throw Error(name); return deps[name]; },
  });
  return exports;
}

const simples = (o) => JSON.parse(JSON.stringify(o));
const EU = '11111111-1111-1111-1111-111111111111';
const PUB = '22222222-2222-2222-2222-222222222222';
const GRUPO = '33333333-3333-3333-3333-333333333333';
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));

const tipos = load('lib/mural-tipos.ts', {});
const errosBanco = load('lib/erros-banco.ts', {});
const comunidadeTipos = load('lib/comunidade-tipos.ts', {});

/**
 * Supabase de mentira. `respostas[tabela]` decide o que cada consulta devolve
 * (função de quem chamou o quê); `feito` guarda cada chamada.
 */
function banco(respostas = {}) {
  const feito = [];
  const from = (tabela) => {
    const chamada = { tabela, ops: [] };
    feito.push(chamada);
    const fim = () => (respostas[tabela] ? respostas[tabela](chamada) : { data: [], error: null });
    const q = new Proxy({}, {
      get(_, nome) {
        if (nome === 'then') return (ok, falhou) => Promise.resolve(fim()).then(ok, falhou);
        if (nome === 'single' || nome === 'maybeSingle') return () => Promise.resolve(fim());
        return (...args) => { chamada.ops.push([nome, ...args]); return q; };
      },
    });
    return q;
  };
  return { feito, sb: { from, rpc: async () => ({ data: [], error: null }) } };
}

function deps(db, { user = { id: EU }, contatos = [] } = {}) {
  const comunidade = load('lib/comunidade.ts', {
    'server-only': {},
    'next/server': { NextResponse },
    './api-helpers': { getSession: async () => ({ sb: db.sb, user }) },
    './social': { isUuid },
  });
  return {
    'next/server': { NextResponse },
    '@/lib/comunidade': comunidade,
    '@/lib/comunidade-tipos': comunidadeTipos,
    '@/lib/mural': {
      idsDosContatos: async () => contatos,
      montarPublicacoes: async (_sb, linhas) => linhas.map((l) => ({ id: l.id, tipo: l.tipo })),
      autores: async () => new Map([[EU, { id: EU, nome: 'Ana', avatarPath: null }]]),
    },
    '@/lib/mural-tipos': tipos,
    '@/lib/social': { isUuid, searchPeople: async () => [{ id: EU, name: 'Ana', avatarPath: null, proximo: false }] },
    '@/lib/data': { getTopic: (s) => (s === 'musica' ? { label: 'Música' } : s === 'cultura' ? { label: 'Cultura' } : undefined) },
    '@/lib/erros-banco': errosBanco,
  };
}

const json = (url, body, method = 'POST') => new Request(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const publicar = (body) => json('https://nexo.test/api/mural', body);

test('publicar: valida tipo, quem vê, grupo, assunto, link e vídeo', async () => {
  const db = banco();
  const mod = load('app/api/mural/route.ts', deps(db));
  const status = async (b) => (await mod.POST(publicar(b))).status;
  assert.equal(await status({ corpo: 'oi', visibilidade: 'todos' }), 400, 'sem tipo');
  assert.equal(await status({ tipo: 'conversa', corpo: 'oi', visibilidade: 'mundo' }), 400, 'visibilidade inventada');
  assert.equal(await status({ tipo: 'conversa', corpo: 'oi', visibilidade: 'grupo' }), 400, 'grupo sem id');
  assert.equal(await status({ tipo: 'resenha', corpo: 'bom', visibilidade: 'todos' }), 400, 'resenha sem assunto');
  assert.equal(await status({ tipo: 'livro', corpo: 'bom', visibilidade: 'todos' }), 400, 'livro sem título');
  assert.equal(await status({ tipo: 'video', url: 'https://vimeo.com/123', visibilidade: 'todos' }), 400, 'vídeo fora do YouTube');
  assert.equal(await status({ tipo: 'conversa', corpo: 'veja', url: 'javascript:alert(1)', visibilidade: 'todos' }), 400, 'link sem http');
  assert.equal(await status({ tipo: 'conversa', corpo: '   ', visibilidade: 'todos' }), 400, 'vazio');
  assert.equal(db.feito.length, 0, 'nada chega ao banco quando a validação barra');
});

test('publicar: grava em nome de quem está logado, com nota e assunto só onde cabem', async () => {
  const gravadas = [];
  const db = banco({
    publicacoes: (c) => {
      const ins = c.ops.find((o) => o[0] === 'insert');
      if (ins) gravadas.push(ins[1]);
      return { data: { id: PUB, ...(ins ? ins[1] : {}) }, error: null };
    },
  });
  const mod = load('app/api/mural/route.ts', deps(db));

  const res = await mod.POST(publicar({
    tipo: 'experiencia', assunto: 'Rock in Rio', assuntoTipo: 'show', nota: 4, autor_id: 'outra-pessoa',
    corpo: 'Foi maravilhoso porém cansativo. Será que eu iria gostar mais do The Town?', visibilidade: 'contatos', tema: 'musica',
  }));
  assert.equal(res.status, 201);
  assert.equal(gravadas[0].autor_id, EU, 'o autor é sempre a sessão');
  assert.equal(gravadas[0].nota, 4);
  assert.equal(gravadas[0].assunto_tipo, 'show');
  assert.equal(gravadas[0].tema, 'musica');
  assert.equal(gravadas[0].visibilidade, 'contatos');
  assert.equal(gravadas[0].grupo_id, null);

  await mod.POST(publicar({ tipo: 'conversa', corpo: 'oi', nota: 5, assunto: 'x', tema: 'inventado', visibilidade: 'grupo', grupoId: GRUPO }));
  assert.equal(gravadas[1].nota, null, 'conversa não tem nota');
  assert.equal(gravadas[1].assunto, null, 'conversa não tem assunto');
  assert.equal(gravadas[1].tema, null, 'tema que não existe');
  assert.equal(gravadas[1].grupo_id, GRUPO);

  await mod.POST(publicar({ tipo: 'livro', assunto: 'Dom Casmurro — Machado de Assis', assuntoTipo: 'filme', visibilidade: 'todos' }));
  assert.equal(gravadas[2].assunto_tipo, 'livro', 'livro é sempre livro');

  await mod.POST(publicar({ tipo: 'video', url: 'https://youtu.be/dQw4w9WgXcQ', visibilidade: 'todos' }));
  assert.equal(gravadas[3].youtube_id, 'dQw4w9WgXcQ');
  assert.equal(gravadas[3].url, null, 'o link do vídeo vira o id do YouTube');
});

test('publicar com palavra proibida: o banco descarta, a resposta avisa o banimento', async () => {
  const db = banco({
    publicacoes: () => ({ data: null, error: { code: 'PGRST116' } }),
    user_bans: () => ({ data: { user_id: EU }, error: null }),
  });
  const res = await load('app/api/mural/route.ts', deps(db)).POST(publicar({ tipo: 'conversa', corpo: 'texto ruim', visibilidade: 'todos' }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).banido, true);
});

test('publicar em grupo do qual não participa: 403; banco sem a tabela: 503', async () => {
  let erro = { code: '42501' };
  const db = banco({ publicacoes: () => ({ data: null, error: erro }) });
  const mod = load('app/api/mural/route.ts', deps(db));
  const r1 = await mod.POST(publicar({ tipo: 'conversa', corpo: 'oi', visibilidade: 'grupo', grupoId: GRUPO }));
  assert.equal(r1.status, 403);
  assert.match((await r1.json()).error, /não participa deste grupo/);
  erro = { code: 'PGRST205' };
  assert.equal((await mod.POST(publicar({ tipo: 'conversa', corpo: 'oi', visibilidade: 'todos' }))).status, 503);
});

test('mural: sem login não entra; filtros viram consulta e a busca usa o texto normalizado', async () => {
  const fora = load('app/api/mural/route.ts', deps(banco(), { user: null }));
  assert.equal((await fora.GET(new Request('https://nexo.test/api/mural'))).status, 401);

  const db = banco({ publicacoes: () => ({ data: [{ id: PUB, tipo: 'resenha' }], error: null }) });
  const mod = load('app/api/mural/route.ts', deps(db));
  const res = await mod.GET(new Request(`https://nexo.test/api/mural?tipo=resenha&autor=${EU}&q=${encodeURIComponent('Ação, É!  x')}&antes=2026-10-01T00:00:00Z`));
  assert.equal(res.status, 200);
  assert.deepEqual(simples(await res.json()), { publicacoes: [{ id: PUB, tipo: 'resenha' }], fim: true });
  const ops = simples(db.feito[0].ops);
  assert.deepEqual(ops.filter((o) => o[0] === 'eq'), [['eq', 'tipo', 'resenha'], ['eq', 'autor_id', EU]]);
  assert.deepEqual(ops.filter((o) => o[0] === 'like'), [['like', 'busca', '%acao%']], 'termos curtos ficam de fora');
  assert.deepEqual(ops.find((o) => o[0] === 'lt'), ['lt', 'created_at', '2026-10-01T00:00:00Z']);

  // Tipo inventado e autor que não é id não viram filtro.
  const db2 = banco();
  await load('app/api/mural/route.ts', deps(db2)).GET(new Request('https://nexo.test/api/mural?tipo=xingamento&autor=1%3Dor'));
  assert.equal(db2.feito[0].ops.filter((o) => o[0] === 'eq').length, 0);
});

test('mural dos contatos: sem contatos, vazio sem consultar; com contatos, só os deles', async () => {
  let consultas = 0;
  const vazio = banco({ publicacoes: () => { consultas++; return { data: [], error: null }; } });
  const r = await load('app/api/mural/route.ts', deps(vazio)).GET(new Request('https://nexo.test/api/mural?escopo=contatos'));
  assert.deepEqual(simples(await r.json()), { publicacoes: [], fim: true });
  assert.equal(consultas, 0, 'a consulta nem chega a rodar');

  const db = banco();
  await load('app/api/mural/route.ts', deps(db, { contatos: ['c1', 'c2'] })).GET(new Request('https://nexo.test/api/mural?escopo=contatos'));
  assert.deepEqual(simples(db.feito[0].ops.find((o) => o[0] === 'in')), ['in', 'autor_id', ['c1', 'c2']]);

  const meus = banco();
  await load('app/api/mural/route.ts', deps(meus)).GET(new Request('https://nexo.test/api/mural?escopo=meus'));
  assert.deepEqual(simples(meus.feito[0].ops.find((o) => o[0] === 'eq')), ['eq', 'autor_id', EU]);
});

test('reação: valida, troca (upsert) ou tira, e devolve a contagem', async () => {
  const db = banco({ publicacao_reacoes: (c) => (c.ops[0][0] === 'select' ? { data: [{ reacao: 'amei' }, { reacao: 'amei' }, { reacao: 'curti' }], error: null } : { data: null, error: null }) });
  const mod = load('app/api/mural/[id]/reacao/route.ts', deps(db));
  const ctx = { params: { id: PUB } };
  assert.equal((await mod.POST(json('https://nexo.test/x', { reacao: 'odiei' }), ctx)).status, 400);
  assert.equal((await mod.POST(json('https://nexo.test/x', { reacao: 'amei' }), { params: { id: 'x' } })).status, 400);

  const res = await mod.POST(json('https://nexo.test/x', { reacao: 'amei' }), ctx);
  assert.deepEqual(simples(await res.json()), { reacoes: { amei: 2, curti: 1 }, minhaReacao: 'amei' });
  assert.deepEqual(simples(db.feito.find((c) => c.ops[0][0] === 'upsert').ops[0][1]), { publicacao_id: PUB, user_id: EU, reacao: 'amei' });

  await mod.POST(json('https://nexo.test/x', { reacao: null }), ctx);
  const tirou = db.feito.find((c) => c.ops[0][0] === 'delete');
  assert.deepEqual(simples(tirou.ops.slice(1)), [['eq', 'publicacao_id', PUB], ['eq', 'user_id', EU]], 'só a própria reação');
});

test('opinião: exige texto, só em publicação visível, resposta só da mesma publicação', async () => {
  let visivel = true;
  const inseridas = [];
  const db = banco({
    publicacoes: () => ({ data: visivel ? { id: PUB, autor_id: EU } : null, error: null }),
    publicacao_comentarios: (c) => {
      const ins = c.ops.find((o) => o[0] === 'insert');
      if (ins) {
        inseridas.push(ins[1]);
        return { data: { id: 'o1', autor_id: EU, corpo: ins[1].corpo, resposta_a: ins[1].resposta_a, created_at: '2026-10-01T10:00:00Z' }, error: null };
      }
      return { data: null, error: null }; // a opinião respondida não é desta publicação
    },
  });
  const mod = load('app/api/mural/[id]/opinioes/route.ts', deps(db));
  const ctx = { params: { id: PUB } };
  assert.equal((await mod.POST(json('https://nexo.test/x', { corpo: '  ' }), ctx)).status, 400);
  visivel = false;
  assert.equal((await mod.POST(json('https://nexo.test/x', { corpo: 'Acho que sim' }), ctx)).status, 404);
  visivel = true;
  const res = await mod.POST(json('https://nexo.test/x', { corpo: 'Vai no The Town, é mais tranquilo.', respostaA: '44444444-4444-4444-4444-444444444444' }), ctx);
  assert.equal(res.status, 201);
  const j = await res.json();
  assert.equal(j.opiniao.autor.nome, 'Ana');
  assert.equal(inseridas[0].resposta_a, null, 'resposta a opinião de outra publicação vira opinião solta');
  assert.equal(inseridas[0].autor_id, EU);
});

test('apagar opinião: se o banco não apagou nada, é porque não era sua nem da sua publicação', async () => {
  const db = banco({ publicacao_comentarios: () => ({ data: [], error: null }) });
  const mod = load('app/api/mural/[id]/opinioes/route.ts', deps(db));
  const del = (id) => mod.DELETE(new Request(`https://nexo.test/x?id=${id}`, { method: 'DELETE' }), { params: { id: PUB } });
  assert.equal((await del('nada')).status, 400);
  assert.equal((await del('44444444-4444-4444-4444-444444444444')).status, 403);
});

test('busca por conteúdo: publicações visíveis, pessoas e matérias históricas', async () => {
  const db = banco({ publicacoes: () => ({ data: [{ id: PUB, tipo: 'experiencia' }], error: null }) });
  const pauta = load('lib/historicas-pauta.ts', {});
  const mod = load('app/api/busca/conteudo/route.ts', { ...deps(db), '@/lib/historicas-pauta': pauta });
  const vazio = await (await mod.GET(new Request('https://nexo.test/api/busca/conteudo?q=a'))).json();
  assert.deepEqual(simples(vazio), { q: 'a', publicacoes: [], pessoas: [], historicas: [] });

  // Um verbete da pauta, buscado sem acento e em minúsculas, aparece nas históricas.
  const [tema, lista] = Object.entries(pauta.PAUTA).find(([t]) => t === 'musica' || t === 'cultura');
  const verbete = lista[0].verbete.replace(/ \(.+\)$/, '');
  const q = tipos.normalizarBusca(verbete).split(' ').filter((t) => t.length >= 2).slice(0, 2).join(' ');
  const j = await (await mod.GET(new Request(`https://nexo.test/api/busca/conteudo?q=${encodeURIComponent(q)}`))).json();
  assert.equal(j.publicacoes[0].id, PUB);
  assert.equal(j.pessoas[0].name, 'Ana');
  assert.ok(j.historicas.some((h) => h.tema === tema && h.slug === pauta.slugDaPauta(lista[0].verbete)), JSON.stringify(j.historicas));
});

test('o texto da busca no navegador é igual ao do banco', () => {
  assert.equal(tipos.normalizarBusca('Fui no ROCK IN RIO — foi ótimo! 2026'), 'fui no rock in rio foi otimo 2026');
  const sql = fs.readFileSync('db/social.sql', 'utf8');
  assert.match(sql, /create or replace function (public\.)?busca_normalizar/i);
  // Todas as tabelas novas de texto passam pela moderação.
  for (const [t, cols] of [['perfil_social', 'bio'], ['publicacoes', "'titulo', 'corpo', 'assunto'"], ['publicacao_comentarios', 'corpo']]) {
    assert.ok(sql.includes(`moderacao_ligar('${t}', ARRAY[`) && sql.match(new RegExp(`moderacao_ligar\\('${t}', ARRAY\\[[^\\]]*${cols}`)), t);
  }
});
