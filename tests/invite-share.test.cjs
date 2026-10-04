process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

function load(file, deps = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, {
    exports, URL, File, console, ...globals,
    require(name) { if (name in deps) return deps[name]; throw Error(name); },
  });
  return exports;
}

const themes = load('lib/invite-themes.ts');
const stickers = load('lib/invite-stickers.ts');
const art = load('lib/invite-art.ts', { './invite-themes': themes, './invite-stickers': stickers });
const token = 'a'.repeat(64);
const link = `${art.INVITE_SITE}/convite/${token}`;
const share = (globals) => load('lib/invite-share.ts', { './invite-art': art }, globals);

test('Compartilhar envia a arte pronta imediatamente com o link na legenda', async () => {
  const file = new File(['png'], 'convite.png', { type: 'image/png' });
  let sent;
  const app = share({ navigator: {
    canShare: ({ files }) => files[0] === file,
    share(data) { sent = data; return Promise.resolve(); },
  } });
  const pending = app.shareInvite(link, file);
  assert.equal(sent.files[0], file); // Sem aguardar um download depois do clique.
  assert.ok(sent.text.endsWith(`\n${link}`));
  assert.equal(sent.title, art.inviteMeta(token).title);
  assert.equal(sent.url, undefined); // O link acompanha a imagem na legenda.
  await pending;
});

test('sem envio de arquivos ou sem imagem pronta, mantém o compartilhamento do link', async () => {
  const file = new File(['png'], 'convite.png', { type: 'image/png' });
  for (const canShare of [undefined, () => false, () => true]) {
    let sent;
    const app = share({ navigator: { canShare, share(data) { sent = data; return Promise.resolve(); } } });
    await app.shareInvite(link, canShare?.() === true ? undefined : file);
    assert.equal(sent.url, link);
    assert.equal(sent.files, undefined);
    assert.equal(sent.title, art.inviteMeta(token).title);
  }
});

test('cancelamento do compartilhamento não abre outra janela nem envia de novo', async () => {
  let calls = 0;
  const app = share({ navigator: { share() { calls++; return Promise.reject(Object.assign(Error('cancel'), { name: 'AbortError' })); } } });
  await assert.rejects(app.shareInvite(link), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('a imagem compartilhada é a mesma do cartão, com nome sem o token de acesso', async () => {
  let url;
  const app = share({ fetch: async (request) => {
    url = request;
    return new Response(new Blob(['png'], { type: 'image/png' }));
  } });
  const file = await app.inviteShareFile(link);
  assert.equal(url, art.inviteImage(token));
  assert.equal(file.type, 'image/png');
  assert.equal(file.name, `nexo-social-convite-${String(art.inviteSerial(token)).padStart(4, '0')}.png`);
  assert.ok(!file.name.includes(token));
  assert.equal(await file.text(), 'png');
});

test('falhas ou respostas HTML não viram um arquivo de imagem', async () => {
  for (const response of [new Response('falha', { status: 500 }), new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }), new Response(new Blob([], { type: 'image/png' }))]) {
    const app = share({ fetch: async () => response });
    await assert.rejects(app.inviteShareFile(link));
  }
});

test('a prévia usa o mesmo texto da arte para todas as variações de adesivo', () => {
  const seen = new Set();
  for (let i = 0; i < 5000 && seen.size < art.STICKERS.length; i++) {
    const candidate = i.toString(16).padStart(64, '0');
    const e = art.inviteEdition(candidate);
    seen.add(e.variant);
    const copy = themes.themeCopy(e.theme, e.variant);
    const meta = art.inviteMeta(candidate);
    assert.equal(meta.title, `${copy.titulo.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()} — Convite ${e.serialLabel}`);
    assert.ok(meta.description.includes(copy.linha.replace(/\n/g, ' ')));
  }
  assert.equal(seen.size, art.STICKERS.length);
});

function pageSetup({ native = true, listFails = false } = {}) {
  const sent = [], copied = [], downloads = [], imageRequests = [];
  let created = false;
  const navigator = {
    share: native ? (data) => { sent.push(data); return Promise.resolve(); } : undefined,
    canShare: native ? () => true : undefined,
    clipboard: { writeText: async (text) => copied.push(text) },
  };
  const fetch = async (url, options) => {
    if (url === '/api/invites') {
      if (options?.method === 'POST') { created = true; return Response.json({ credits: 2, link }); }
      if (listFails && created) throw Error('offline');
      return Response.json({ credits: 3, invites: listFails ? [] : [{ id: 'i', link, status: 'pending' }] });
    }
    imageRequests.push(url);
    return { ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) };
  };
  const document = {
    createElement: () => { const anchor = { click() { downloads.push({ name: this.download, url: this.href }); }, remove() {} }; return anchor; },
    body: { appendChild() {} },
  };
  const globals = { navigator, fetch, document, window: { setTimeout() {} } };
  const mod = load('app/convites/page.tsx', {
    react: React,
    '@/components/Navbar': () => null,
    '@/lib/invite-art': art,
    '@/lib/invite-share': share(globals),
  }, globals);
  return { mod, sent, copied, downloads, imageRequests };
}

const button = (view, label) => view.root.findAllByType('button').find((n) => n.props.children === label);

test('o botão da tela compartilha a imagem já carregada com a legenda e o link', async () => {
  const s = pageSetup();
  let view;
  await act(async () => { view = create(React.createElement(s.mod.default)); });
  assert.equal(s.imageRequests.length, 1);
  await act(async () => { await button(view, 'Compartilhar').props.onClick(); });
  assert.equal(s.sent.length, 1);
  assert.equal(s.sent[0].files[0].type, 'image/png');
  assert.ok(s.sent[0].text.endsWith(link));
  await act(async () => { await button(view, 'Atualizar convites').props.onClick(); });
  assert.equal(s.imageRequests.length, 1); // A atualização da lista reutiliza a arte.
  view.unmount();
});

test('no computador, Baixar arte salva a imagem e Copiar link mantém o endereço completo', async () => {
  const s = pageSetup({ native: false });
  let view;
  await act(async () => { view = create(React.createElement(s.mod.default)); });
  await act(async () => { await button(view, 'Baixar arte').props.onClick(); });
  assert.equal(s.downloads.length, 1);
  assert.ok(s.downloads[0].name.endsWith('.png'));
  assert.ok(s.downloads[0].url.startsWith('blob:'));
  await act(async () => { await button(view, 'Copiar link').props.onClick(); });
  assert.equal(s.copied[0], link);
  assert.ok(JSON.stringify(view.toJSON()).includes('Para enviar a imagem junto'));
  view.unmount();
});

test('um convite recém-criado continua compartilhando a arte quando a lista falha', async () => {
  const s = pageSetup({ listFails: true });
  let view;
  await act(async () => { view = create(React.createElement(s.mod.default)); });
  await act(async () => { await button(view, 'Gerar link de convite').props.onClick(); });
  assert.ok(JSON.stringify(view.toJSON()).includes('Links já criados continuam disponíveis'));
  await act(async () => { await button(view, 'Compartilhar').props.onClick(); });
  assert.equal(s.sent[0].files[0].type, 'image/png');
  assert.ok(s.sent[0].text.endsWith(link));
  view.unmount();
});
