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
    exports, URL, URLSearchParams, Request, Response, console, Date,
    require(name) { if (!(name in deps)) throw Error(name); return deps[name]; },
  });
  return exports;
}

const simples = (o) => JSON.parse(JSON.stringify(o));
const EU = '11111111-1111-1111-1111-111111111111';
const LISTA = '22222222-2222-2222-2222-222222222222';
const ITEM = '33333333-3333-3333-3333-333333333333';
const RODA = '44444444-4444-4444-4444-444444444444';
const GRUPO = '55555555-5555-5555-5555-555555555555';
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));

const muralTipos = load('lib/mural-tipos.ts', {});
const listasTipos = load('lib/listas-tipos.ts', {});
const errosBanco = load('lib/erros-banco.ts', {});
const comunidadeTipos = load('lib/comunidade-tipos.ts', {});

/** Supabase de mentira: `respostas[tabela](chamada)` decide o que volta; `feito` guarda cada chamada. */
function banco(respostas = {}) {
  const feito = [];
  const rpcs = [];
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
  return {
    feito,
    rpcs,
    sb: { from, rpc: async (fn, args) => { rpcs.push([fn, args]); return respostas.rpc ? respostas.rpc(fn, args) : { data: null, error: null }; } },
  };
}
const op = (chamada, nome) => chamada.ops.find((o) => o[0] === nome);

function deps(db, { user = { id: EU }, contatos = [] } = {}) {
  const comunidade = load('lib/comunidade.ts', {
    'server-only': {},
    'next/server': { NextResponse },
    './api-helpers': { getSession: async () => ({ sb: db.sb, user }) },
    './social': { isUuid },
  });
  return {
    'next/server': { NextResponse },
    '@supabase/supabase-js': {},
    '@/lib/comunidade': comunidade,
    '@/lib/comunidade-tipos': comunidadeTipos,
    '@/lib/mural': {
      idsDosContatos: async () => contatos,
      autores: async () => new Map([[EU, { id: EU, nome: 'Ana', avatarPath: null }]]),
      montarPublicacoes: async () => [],
    },
    '@/lib/listas': {
      montarListas: async (_sb, linhas) => linhas.map((l) => ({ id: l.id, itens: l.itens ?? 0 })),
      montarListaCompleta: async (_sb, l) => ({ id: l.id }),
      montarRodas: async (_sb, linhas) => linhas.map((r) => ({ id: r.id })),
      montarRodaCompleta: async (_sb, r) => ({ id: r.id, aberta: r.aberta }),
    },
    '@/lib/listas-tipos': listasTipos,
    '@/lib/mural-tipos': muralTipos,
    '@/lib/social': { isUuid },
    '@/lib/erros-banco': errosBanco,
  };
}

const json = (url, body, method = 'POST') => new Request(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('criar lista: valida tipo, nome, quem vê e grupo, e grava em nome da sessão', async () => {
  const gravadas = [];
  const db = banco({ listas: (c) => { const i = op(c, 'insert'); if (i) gravadas.push(i[1]); return { data: { id: LISTA, ...(i?.[1] ?? {}) }, error: null }; } });
  const mod = load('app/api/listas/route.ts', deps(db));
  const st = async (b) => (await mod.POST(json('https://x/api/listas', b))).status;
  assert.equal(await st({ titulo: 'Para correr', visibilidade: 'todos' }), 400, 'sem tipo');
  assert.equal(await st({ tipo: 'musicas', titulo: '  ', visibilidade: 'todos' }), 400, 'sem nome');
  assert.equal(await st({ tipo: 'musicas', titulo: 'X', visibilidade: 'publico' }), 400, 'quem vê inventado');
  assert.equal(await st({ tipo: 'musicas', titulo: 'X', visibilidade: 'grupo' }), 400, 'grupo sem id');
  assert.equal(gravadas.length, 0);
  assert.equal(await st({ tipo: 'musicas', titulo: 'Para correr', descricao: 'Rock', visibilidade: 'grupo', grupoId: GRUPO, autor_id: 'outra' }), 201);
  assert.deepEqual(simples(gravadas[0]), { autor_id: EU, tipo: 'musicas', titulo: 'Para correr', descricao: 'Rock', visibilidade: 'grupo', grupo_id: GRUPO });
});

test('sugestões: listas abertas a todos, de outras pessoas, e só as que têm itens', async () => {
  const db = banco({ listas: () => ({ data: [{ id: 'a', itens: 3 }, { id: 'b', itens: 0 }], error: null }) });
  const res = await load('app/api/listas/route.ts', deps(db)).GET(new Request('https://x/api/listas'));
  assert.deepEqual(simples(await res.json()).listas.map((l) => l.id), ['a']);
  const ops = simples(db.feito[0].ops);
  assert.ok(ops.some((o) => o[0] === 'eq' && o[1] === 'visibilidade' && o[2] === 'todos'));
  assert.ok(ops.some((o) => o[0] === 'neq' && o[1] === 'autor_id' && o[2] === EU));

  const minhas = banco();
  await load('app/api/listas/route.ts', deps(minhas)).GET(new Request('https://x/api/listas?escopo=minhas&q=Rock%20Nacional'));
  const ops2 = simples(minhas.feito[0].ops);
  assert.ok(ops2.some((o) => o[0] === 'eq' && o[1] === 'autor_id' && o[2] === EU));
  assert.deepEqual(ops2.filter((o) => o[0] === 'like'), [['like', 'busca', '%rock%'], ['like', 'busca', '%nacional%']]);
});

test('pôr item: só quem criou; vídeo do YouTube vira id; vai para o fim; nome barrado não bane', async () => {
  let dono = true;
  let erroDoItem = null;
  const gravados = [];
  const db = banco({
    listas: () => ({ data: dono ? { id: LISTA } : null, error: null }),
    lista_itens: (c) => {
      const i = op(c, 'insert');
      if (!i) return { data: [{ posicao: 7 }], count: 7, error: null };
      if (erroDoItem) return { data: null, error: erroDoItem };
      gravados.push(i[1]);
      return { data: { id: ITEM, ...i[1] }, error: null };
    },
    user_bans: () => ({ data: null, error: null }),
  });
  const mod = load('app/api/listas/[id]/itens/route.ts', deps(db));
  const ctx = { params: { id: LISTA } };
  const por = (b) => mod.POST(json('https://x', b), ctx);

  assert.equal((await por({ titulo: '' })).status, 400);
  assert.equal((await por({ titulo: 'X', url: 'ftp://x' })).status, 400);
  dono = false;
  assert.equal((await por({ titulo: 'Tempo Perdido' })).status, 403);
  dono = true;
  const res = await por({ titulo: 'Tempo Perdido', subtitulo: 'Legião Urbana', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', nota: 'Clássico' });
  assert.equal(res.status, 201);
  assert.deepEqual(simples(gravados[0]), {
    lista_id: LISTA, posicao: 8, titulo: 'Tempo Perdido', subtitulo: 'Legião Urbana', youtube_id: 'dQw4w9WgXcQ', url: null, nota: 'Clássico',
  });
  assert.equal((await res.json()).item.youtubeId, 'dQw4w9WgXcQ');

  erroDoItem = { code: 'P0001', message: 'Este título tem uma palavra que a plataforma não aceita. Escreva de outro jeito.' };
  const barrado = await por({ titulo: 'título feio' });
  assert.equal(barrado.status, 400);
  assert.match((await barrado.json()).error, /não aceita/);
});

test('lista cheia: não passa de 200 itens', async () => {
  const db = banco({
    listas: () => ({ data: { id: LISTA }, error: null }),
    lista_itens: (c) => (op(c, 'insert') ? { data: { id: ITEM }, error: null } : { data: [{ posicao: 200 }], count: 200, error: null }),
  });
  const res = await load('app/api/listas/[id]/itens/route.ts', deps(db)).POST(json('https://x', { titulo: 'Mais um' }), { params: { id: LISTA } });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /200 itens/);
});

test('reação: na lista inteira ou num item — troca a antiga e devolve a contagem do alvo', async () => {
  const db = banco({ lista_reacoes: (c) => (op(c, 'select') ? { data: [{ reacao: 'amei' }, { reacao: 'curti' }], error: null } : { data: null, error: null }) });
  const mod = load('app/api/listas/[id]/reacao/route.ts', deps(db));
  const ctx = { params: { id: LISTA } };
  assert.equal((await mod.POST(json('https://x', { reacao: 'odiei' }), ctx)).status, 400);
  assert.equal((await mod.POST(json('https://x', { itemId: 'x', reacao: 'amei' }), ctx)).status, 400);

  const r = await mod.POST(json('https://x', { itemId: ITEM, reacao: 'amei' }), ctx);
  assert.deepEqual(simples(await r.json()), { reacoes: { amei: 1, curti: 1 }, minhaReacao: 'amei' });
  const [apagou, inseriu, contou] = db.feito;
  assert.ok(op(apagou, 'delete'));
  assert.deepEqual(simples(apagou.ops.filter((o) => o[0] === 'eq')), [['eq', 'lista_id', LISTA], ['eq', 'user_id', EU], ['eq', 'item_id', ITEM]]);
  assert.deepEqual(simples(op(inseriu, 'insert')[1]), { lista_id: LISTA, item_id: ITEM, user_id: EU, reacao: 'amei' });
  assert.deepEqual(simples(op(contou, 'eq')), ['eq', 'lista_id', LISTA]);

  const db2 = banco();
  await load('app/api/listas/[id]/reacao/route.ts', deps(db2)).POST(json('https://x', { reacao: null }), ctx);
  assert.deepEqual(simples(op(db2.feito[0], 'is')), ['is', 'item_id', null], 'sem item: a reação da lista inteira');
  assert.equal(db2.feito.filter((c) => op(c, 'insert')).length, 0, 'null só tira');
});

test('comentário com palavra proibida: o banco descarta e a resposta avisa o banimento', async () => {
  const db = banco({
    lista_comentarios: () => ({ data: null, error: { code: 'PGRST116' } }),
    user_bans: () => ({ data: { user_id: EU }, error: null }),
  });
  const res = await load('app/api/listas/[id]/comentarios/route.ts', deps(db)).POST(json('https://x', { corpo: 'texto ruim', itemId: ITEM }), { params: { id: LISTA } });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).banido, true);
});

test('abrir roda: valida o tema e quem pode entrar; sem login não entra', async () => {
  const gravadas = [];
  const db = banco({ rodas: (c) => { const i = op(c, 'insert'); if (i) gravadas.push(i[1]); return { data: { id: RODA }, error: null }; } });
  const mod = load('app/api/rodas/route.ts', deps(db));
  assert.equal((await mod.POST(json('https://x', { visibilidade: 'todos' }))).status, 400);
  assert.equal((await mod.POST(json('https://x', { tema: 'Torto Arado', visibilidade: 'x' }))).status, 400);
  const res = await mod.POST(json('https://x', { tema: 'O final de Torto Arado', assuntoTipo: 'livro', visibilidade: 'contatos', criador_id: 'outra' }));
  assert.equal(res.status, 201);
  assert.equal((await res.json()).id, RODA);
  assert.deepEqual(simples(gravadas[0]), { criador_id: EU, tema: 'O final de Torto Arado', descricao: null, assunto_tipo: 'livro', visibilidade: 'contatos', grupo_id: null });

  const fora = load('app/api/rodas/route.ts', deps(banco(), { user: null }));
  assert.equal((await fora.GET(new Request('https://x/api/rodas'))).status, 401);
});

test('rodas: as paradas há mais de 24 h não aparecem como acontecendo', async () => {
  const db = banco({ rodas: () => ({ data: [{ id: RODA }], error: null }) });
  const antes = Date.now();
  const res = await load('app/api/rodas/route.ts', deps(db)).GET(new Request('https://x/api/rodas?q=torto'));
  const j = simples(await res.json());
  assert.deepEqual(j, { abertas: [{ id: RODA }], encerradas: [{ id: RODA }] });
  const [abertas, encerradas] = db.feito;
  const gt = op(abertas, 'gt');
  assert.equal(gt[1], 'ultima_atividade');
  const limite = Date.parse(gt[2]);
  assert.ok(Math.abs(antes - 24 * 3600_000 - limite) < 5000, 'limite de 24 h');
  assert.deepEqual(simples(op(abertas, 'like')), ['like', 'busca', '%torto%']);
  assert.deepEqual(simples(op(encerradas, 'eq')), ['eq', 'aberta', false]);
});

test('roda: entrar, sair e encerrar — só quem abriu encerra (pelo banco)', async () => {
  let erroRpc = null;
  const db = banco({
    rodas: () => ({ data: { id: RODA, aberta: true }, error: null }),
    roda_participantes: () => ({ data: null, error: null }),
    rpc: () => ({ data: null, error: erroRpc }),
  });
  const mod = load('app/api/rodas/[id]/route.ts', deps(db));
  const ctx = { params: { id: RODA } };
  assert.equal((await mod.POST(json('https://x', { acao: 'apagar-tudo' }), ctx)).status, 400);
  const entrou = await mod.POST(json('https://x', { acao: 'entrar' }), ctx);
  assert.equal(entrou.status, 200);
  assert.deepEqual(simples(op(db.feito.find((c) => c.tabela === 'roda_participantes'), 'insert')[1]), { roda_id: RODA, user_id: EU });

  assert.equal((await mod.POST(json('https://x', { acao: 'encerrar' }), ctx)).status, 200);
  assert.deepEqual(simples(db.rpcs[0]), ['encerrar_roda', { p_roda: RODA }]);
  erroRpc = { code: 'P0001', message: 'Só quem abriu a roda pode encerrá-la.' };
  const negado = await mod.POST(json('https://x', { acao: 'encerrar' }), ctx);
  assert.equal(negado.status, 403);
  assert.match((await negado.json()).error, /Só quem abriu/);
});

test('mensagem na roda: precisa estar nela e aberta; palavra proibida bane', async () => {
  let erro = { code: '42501' };
  let banido = false;
  const db = banco({
    roda_mensagens: () => ({ data: null, error: erro }),
    user_bans: () => ({ data: banido ? { user_id: EU } : null, error: null }),
  });
  const mod = load('app/api/rodas/[id]/mensagens/route.ts', deps(db));
  const ctx = { params: { id: RODA } };
  assert.equal((await mod.POST(json('https://x', { corpo: '   ' }), ctx)).status, 400);
  const fora = await mod.POST(json('https://x', { corpo: 'Oi!' }), ctx);
  assert.equal(fora.status, 403);
  assert.match((await fora.json()).error, /terminou ou você ainda não entrou/);
  erro = { code: 'PGRST116' };
  banido = true;
  const ban = await mod.POST(json('https://x', { corpo: 'texto ruim' }), ctx);
  assert.equal(ban.status, 403);
  assert.equal((await ban.json()).banido, true);
});

test('a lista toca inteira no reprodutor, e tudo novo passa pelas regras da comunidade', () => {
  const provider = fs.readFileSync('components/midia/MidiaProvider.tsx', 'utf8');
  assert.match(provider, /&playlist=\$\{m\.fila/);
  const sql = fs.readFileSync('db/listas-rodas.sql', 'utf8');
  for (const t of ['listas', 'lista_itens', 'lista_comentarios', 'rodas', 'roda_mensagens']) {
    assert.ok(sql.includes(`moderacao_ligar('${t}', ARRAY[`), t);
  }
  // Encerrar apaga a conversa; a faxina encerra rodas paradas e apaga as antigas.
  assert.match(sql, /DELETE FROM roda_mensagens WHERE roda_id = p_roda/);
  assert.match(sql, /ultima_atividade < NOW\(\) - INTERVAL '24 hours'/);
  assert.match(sql, /encerrada_em < NOW\(\) - INTERVAL '7 days'/);
  assert.equal(listasTipos.RODA_ENCERRA_PARADA_HORAS, 24);
  assert.equal(listasTipos.RODA_FICA_DIAS, 7);
});
