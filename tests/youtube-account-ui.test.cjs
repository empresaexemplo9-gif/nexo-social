// React act() precisa do renderizador de desenvolvimento.
process.env.NODE_ENV = 'test';
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

// A tela de conexão do YouTube, com fetch, janela e documento de mentira.
function montar(respostas) {
  const ouvintes = { window: new Map(), document: new Map() };
  const alvo = (mapa) => ({
    addEventListener: (tipo, fn) => mapa.set(tipo, [...(mapa.get(tipo) ?? []), fn]),
    removeEventListener: (tipo, fn) => mapa.set(tipo, (mapa.get(tipo) ?? []).filter((x) => x !== fn)),
  });
  const document = { visibilityState: 'visible', ...alvo(ouvintes.document) };
  const window = {
    location: { href: 'https://nexo.example/conta' },
    history: { state: null, replaceState() {} },
    setTimeout, clearTimeout,
    ...alvo(ouvintes.window),
  };
  let pedidos = 0;
  const fetch = async () => {
    const corpo = respostas[Math.min(pedidos++, respostas.length - 1)];
    return { ok: true, status: 200, json: async () => corpo };
  };
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync('components/YoutubeAccount.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const deps = {
    react: React,
    'next/link': ({ children }) => React.createElement('span', null, children),
    'next/navigation': { usePathname: () => '/conta' },
  };
  vm.runInNewContext(codigo, {
    exports, window, document, fetch, URL, AbortController, Error, console,
    require: (n) => { if (!(n in deps)) throw Error(n); return deps[n]; },
  });
  const disparar = (onde, tipo) => (ouvintes[onde].get(tipo) ?? []).forEach((fn) => fn());
  return { Componente: exports.default, document, disparar, pedidos: () => pedidos };
}

const texto = (r) => JSON.stringify(r.toJSON());
const esperar = () => act(async () => { await new Promise((ok) => setTimeout(ok, 0)); });
let aberto = null;
afterEach(() => { if (aberto) act(() => aberto.unmount()); aberto = null; });

test('voltar do Google sem conectar explica o bloqueio; conectado, o aviso some', async () => {
  const naoConectado = { configurado: true, conectado: false };
  const t = montar([naoConectado, naoConectado, { configurado: true, conectado: true }]);
  await act(async () => { aberto = create(React.createElement(t.Componente)); });
  await esperar();
  assert.match(texto(aberto), /Continuar com Google/);
  assert.doesNotMatch(texto(aberto), /ainda não foi concluída/);

  // Toca em "Continuar com Google": a aba perde o foco e volta sem conexão.
  const link = aberto.root.find((n) => n.type === 'a');
  act(() => link.props.onClick());
  t.document.visibilityState = 'hidden';
  act(() => t.disparar('document', 'visibilitychange'));
  assert.doesNotMatch(texto(aberto), /ainda não foi concluída/);
  t.document.visibilityState = 'visible';
  act(() => t.disparar('document', 'visibilitychange'));
  await esperar();
  assert.match(texto(aberto), /ainda não foi concluída/);
  assert.match(texto(aberto), /Acesso bloqueado/);
  assert.equal(t.pedidos(), 2); // voltou: consulta a conexão de novo

  // Na próxima volta a conta está conectada: o aviso some.
  act(() => link.props.onClick());
  act(() => t.disparar('window', 'focus'));
  await esperar();
  assert.match(texto(aberto), /Sua conta do YouTube está conectada/);
  assert.doesNotMatch(texto(aberto), /ainda não foi concluída/);
});

test('o administrador vê o lembrete do status de publicação no Google', async () => {
  const t = montar([{ configurado: true, conectado: false, setup: { credenciais: true, chaveSessao: true, retorno: 'https://nexo.example/api/youtube/retorno', dominioCorreto: true } }]);
  await act(async () => { aberto = create(React.createElement(t.Componente)); });
  await esperar();
  assert.match(texto(aberto), /Configuração do administrador/);
  assert.match(texto(aberto), /usuários de teste/);
});
