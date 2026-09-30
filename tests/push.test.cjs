const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

function carregar(arquivo, deps = {}, extra = {}) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(codigo, { exports, require: (n) => deps[n] ?? {}, process: { env: extra.env ?? {} }, setTimeout, Promise, Date, JSON, Buffer, console: { warn() {}, error() {} } });
  return exports;
}
const plain = (v) => JSON.parse(JSON.stringify(v));
const regras = carregar('lib/push-regras.ts');

test('cada tipo de notificação cai na categoria certa', () => {
  assert.equal(regras.categoriaDoTipo('chamada'), 'ligacoes');
  for (const t of ['chat', 'recado', 'grupo_chat']) assert.equal(regras.categoriaDoTipo(t), 'mensagens');
  assert.equal(regras.categoriaDoTipo('lembrete'), 'lembretes');
  for (const t of ['convite', 'resposta', 'cancelado', 'convite_grupo', 'resposta_grupo', 'entrou_grupo', 'contato', 'comentario', 'novo']) {
    assert.equal(regras.categoriaDoTipo(t), 'convites', t);
  }
});

test('preferências: o que faltar ou vier estranho fica ligado', () => {
  assert.deepEqual(plain(regras.formaDosAvisos(null)), { ligacoes: true, mensagens: true, convites: true, lembretes: true });
  assert.deepEqual(plain(regras.formaDosAvisos({ mensagens: false, ligacoes: 'não', extra: false })), { ligacoes: true, mensagens: false, convites: true, lembretes: true });
});

test('o aviso da ligação toca e se agrupa por quem liga; o link nunca sai da plataforma', () => {
  const a = regras.avisoDaNotificacao({ id: 'n1', type: 'chamada', title: 'Chamada de vídeo', body: 'Ana está te ligando.', link: '/comunidade/chat?com=u1&chamada=1', actor_id: 'u1', created_at: '2026-09-30T12:00:00Z' });
  assert.equal(a.ligacao, true);
  assert.equal(a.etiqueta, 'chamada-u1');
  assert.equal(a.link, '/comunidade/chat?com=u1&chamada=1');
  assert.equal(regras.opcoesDeEntrega(a).urgency, 'high');
  assert.ok(regras.opcoesDeEntrega(a).TTL <= 60, 'ligação velha não toca');
  const grupo = regras.avisoDaNotificacao({ id: 'n2', type: 'chamada', title: 'x', body: null, link: '/comunidade/g1?chamada=grupo', actor_id: 'u1', group_id: 'g1' });
  assert.equal(grupo.etiqueta, 'chamada-grupo-g1');
  assert.equal(regras.linkSeguro('https://malicioso.com'), '/');
  assert.equal(regras.linkSeguro('//malicioso.com'), '/');
  assert.equal(regras.avisoDaNotificacao({ id: 'n3', type: 'chat', title: 'Oi', body: 'b', link: null, actor_id: 'u9' }).etiqueta, 'chat-u9');
});

// --- Despacho no servidor (web-push e banco de mentira) ----------------------------------
function servidor({ claimed, prefs = [], inscricoes = [], falhas = {} }) {
  const enviados = [];
  const apagados = [];
  const webpush = {
    setVapidDetails() {},
    async sendNotification(sub, corpo, opcoes) {
      if (falhas[sub.endpoint]) throw Object.assign(new Error('x'), { statusCode: falhas[sub.endpoint] });
      enviados.push({ endpoint: sub.endpoint, aviso: JSON.parse(corpo), opcoes });
    },
  };
  const tabela = (nome) => {
    const q = {
      _nome: nome,
      select() { return q; },
      in() {
        if (nome === 'user_preferences') return Promise.resolve({ data: prefs, error: null });
        if (nome === 'push_subscriptions') return Promise.resolve({ data: inscricoes, error: null });
        return Promise.resolve({ data: [], error: null });
      },
      delete() { return { in: (_c, ids) => { apagados.push(...ids); return Promise.resolve({}); } }; },
      update() { return { in: () => Promise.resolve({}) }; },
    };
    return q;
  };
  const admin = { rpc: async () => ({ data: claimed, error: null }), from: tabela };
  const push = carregar('lib/push.ts', {
    'server-only': {},
    crypto: require('crypto'),
    'web-push': { __esModule: true, default: webpush },
    './supabase-server': { createAdminClient: () => admin },
    './push-regras': regras,
  }, { env: { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' } });
  return { push, enviados, apagados };
}

test('despacho respeita o que cada pessoa escolheu e esquece aparelho que saiu do push', async () => {
  const s = servidor({
    claimed: [
      { id: 'a', user_id: 'ana', type: 'chat', title: 'Nova mensagem', body: 'oi', link: '/comunidade/chat?com=bia', actor_id: 'bia' },
      { id: 'b', user_id: 'bia', type: 'chat', title: 'Nova mensagem', body: 'oi', link: '/x', actor_id: 'ana' },
      { id: 'c', user_id: 'bia', type: 'chamada', title: 'Chamada', body: 'liga', link: '/y', actor_id: 'ana' },
    ],
    prefs: [{ user_id: 'bia', notification_prefs: { mensagens: false } }],
    inscricoes: [
      { id: 's1', user_id: 'ana', endpoint: 'https://push/ana', p256dh: 'k', auth: 'a' },
      { id: 's2', user_id: 'bia', endpoint: 'https://push/bia', p256dh: 'k', auth: 'a' },
      { id: 's3', user_id: 'ana', endpoint: 'https://push/ana-velho', p256dh: 'k', auth: 'a' },
    ],
    falhas: { 'https://push/ana-velho': 410 },
  });
  const r = await s.push.despacharPush();
  assert.equal(r.avisos, 3);
  const para = s.enviados.map((e) => `${e.endpoint}:${e.aviso.tipo}`).sort();
  assert.deepEqual(para, ['https://push/ana:chat', 'https://push/bia:chamada']);
  assert.deepEqual(s.apagados, ['s3']);
  const ligacao = s.enviados.find((e) => e.aviso.tipo === 'chamada');
  assert.equal(ligacao.aviso.ligacao, true);
  assert.equal(ligacao.opcoes.urgency, 'high');
});

test('o segredo do despacho é estável e não é a chave privada', () => {
  const { push } = servidor({ claimed: [] });
  const a = push.segredoDoDespacho();
  assert.equal(a, push.segredoDoDespacho());
  assert.equal(a.length, 64);
  assert.notEqual(a, 'priv');
});

// --- Service worker -------------------------------------------------------------------
function sw({ janelas = [], fechaNoAviso = 0 } = {}) {
  const h = {};
  const mostradas = [];
  const abertas = new Map();
  const abertasJanela = [];
  let relogio = 0;
  const self = {
    location: { origin: 'https://nexo.test' },
    addEventListener: (n, f) => (h[n] = f),
    skipWaiting() {},
    registration: {
      async showNotification(titulo, o) {
        mostradas.push({ titulo, ...o });
        // A pessoa fecha o aviso depois do N-ésimo toque.
        abertas.set(o.tag, !(fechaNoAviso && mostradas.length >= fechaNoAviso));
      },
      async getNotifications({ tag }) { return abertas.get(tag) ? [{}] : []; },
      pushManager: {},
    },
    clients: {
      async matchAll() { return janelas; },
      async openWindow(u) { abertasJanela.push(u); },
      claim() {},
    },
  };
  // Tempo de mentira: o toque de 30 s roda na hora.
  const ctx = { self, caches: {}, fetch: async () => ({}), URL, Date: { now: () => relogio }, setTimeout: (f, ms) => { relogio += ms; Promise.resolve().then(f); }, Promise, Uint8Array, atob, JSON, Set, Map, console };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), ctx);
  const disparar = async (nome, evento) => {
    let espera = Promise.resolve();
    h[nome]({ ...evento, waitUntil: (p) => (espera = p) });
    await espera;
  };
  return { h, mostradas, abertas, abertasJanela, disparar };
}

test('push de mensagem: aviso com som, agrupado pela etiqueta', async () => {
  const s = sw();
  await s.disparar('push', { data: { json: () => ({ tipo: 'chat', titulo: 'Nova mensagem de Ana', corpo: 'oi', link: '/comunidade/chat?com=ana', etiqueta: 'chat-ana', ligacao: false }) } });
  assert.equal(s.mostradas.length, 1);
  const n = s.mostradas[0];
  assert.equal(n.silent, false);
  assert.equal(n.renotify, true);
  assert.equal(n.tag, 'chat-ana');
  assert.equal(n.requireInteraction, false);
});

test('ligação: Atender/Recusar e toca de novo por 30 segundos enquanto ninguém responde', async () => {
  const s = sw();
  await s.disparar('push', { data: { json: () => ({ tipo: 'chamada', titulo: 'Chamada de vídeo', corpo: 'Ana está te ligando.', link: '/comunidade/chat?com=ana&chamada=1', etiqueta: 'chamada-ana', ligacao: true }) } });
  assert.equal(s.mostradas[0].requireInteraction, true);
  assert.deepEqual(plain(s.mostradas[0].actions.map((a) => a.action)), ['atender', 'recusar']);
  assert.equal(s.mostradas.length, 6, '1 aviso + 5 toques (a cada 5 s por 30 s)');
});

test('ligação: recusar só para de tocar; atender abre a chamada; link de fora não abre', async () => {
  const recusa = sw();
  await recusa.disparar('notificationclick', { action: 'recusar', notification: { tag: 'chamada-ana', data: { link: '/x' }, close() {} } });
  assert.equal(recusa.abertasJanela.length, 0);

  const atende = sw();
  await atende.disparar('notificationclick', { action: 'atender', notification: { tag: 'chamada-ana', data: { link: '/comunidade/chat?com=ana&chamada=1' }, close() {} } });
  assert.deepEqual(atende.abertasJanela, ['https://nexo.test/comunidade/chat?com=ana&chamada=1']);

  const fora = sw();
  await fora.disparar('notificationclick', { notification: { tag: 't', data: { link: 'https://malicioso.com/' }, close() {} } });
  assert.equal(fora.abertasJanela.length, 0, 'link de fora não abre');
});

test('ligação fechada pela pessoa para de tocar', async () => {
  const s = sw({ fechaNoAviso: 2 });
  await s.disparar('push', { data: { json: () => ({ tipo: 'chamada', titulo: 'Chamada', corpo: '', etiqueta: 'chamada-ana', ligacao: true }) } });
  assert.equal(s.mostradas.length, 2, 'parou depois que a pessoa fechou');
});

test('com o app na frente: toca o aviso de outra conversa, mas não repete a que já está aberta nem a ligação', async () => {
  const janela = [{ visibilityState: 'visible', focused: true, url: 'https://nexo.test/comunidade/chat?com=ana' }];
  const outra = sw({ janelas: janela });
  await outra.disparar('push', { data: { json: () => ({ tipo: 'chat', titulo: 'x', corpo: 'y', link: '/comunidade/chat?com=bia', etiqueta: 'chat-bia' }) } });
  assert.equal(outra.mostradas.length, 1, 'conversa com outra pessoa toca');

  const mesma = sw({ janelas: janela });
  await mesma.disparar('push', { data: { json: () => ({ tipo: 'chat', titulo: 'x', corpo: 'y', link: '/comunidade/chat?com=ana', etiqueta: 'chat-ana' }) } });
  assert.equal(mesma.mostradas.length, 0, 'a conversa aberta não repete');

  const ligacao = sw({ janelas: janela });
  await ligacao.disparar('push', { data: { json: () => ({ tipo: 'chamada', titulo: 'Chamada', corpo: '', link: '/x', etiqueta: 'chamada-bia', ligacao: true }) } });
  assert.equal(ligacao.mostradas.length, 0, 'a ligação toca no próprio app');
});
