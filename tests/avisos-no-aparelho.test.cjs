// React act() precisa do renderizador de desenvolvimento.
process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

function carregarTs(arquivo, deps) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(codigo, { exports, require: (n) => { if (!(n in deps)) throw Error(n); return deps[n]; }, Promise, console });
  return exports;
}

function setup(estadoInicial) {
  const regras = carregarTs('lib/push-regras.ts', {});
  const salvos = [];
  const chamadas = [];
  const prefs = { notificacoes: { ligacoes: true, mensagens: true, convites: true, lembretes: true } };
  const cliente = {
    estadoDoPush: async () => estadoInicial,
    ativarPush: async () => { chamadas.push('ativar'); return 'ligado'; },
    desativarPush: async () => { chamadas.push('desativar'); },
    testarPush: async () => { chamadas.push('testar'); },
  };
  const mod = carregarTs('components/AvisosNoAparelho.tsx', {
    react: React,
    './icons': () => null,
    '@/lib/preferences': { usePreferences: () => ({ prefs, save: (p) => salvos.push(p) }) },
    '@/lib/push-regras': regras,
    '@/lib/push-cliente': cliente,
  });
  return { mod, salvos, chamadas };
}

const texto = (view) => JSON.stringify(view.toJSON());
const botao = (view, rotulo) => view.root.findAll((n) => n.type === 'button' && JSON.stringify(n.props.children ?? '').includes(rotulo))[0];

test('aparelho sem avisos: "Ativar avisos" liga, manda o teste e mostra a confirmação', async () => {
  const s = setup('desligado');
  let view;
  await act(async () => { view = create(React.createElement(s.mod.default)); });
  assert.match(texto(view), /Ligações tocam, mensagens e convites chegam com som/);
  await act(async () => { botao(view, 'Ativar avisos').props.onClick(); });
  assert.deepEqual(s.chamadas, ['ativar', 'testar']);
  assert.match(texto(view), /Avisos ligados neste aparelho/);
  assert.match(texto(view), /Mandamos um aviso de teste/);
});

test('cada tipo liga e desliga para todos os aparelhos da conta', async () => {
  const s = setup('ligado');
  let view;
  await act(async () => { view = create(React.createElement(s.mod.default)); });
  const caixas = view.root.findAll((n) => n.type === 'input' && n.props.type === 'checkbox');
  assert.equal(caixas.length, 4);
  await act(async () => { caixas[1].props.onChange(); }); // Mensagens
  assert.deepEqual(JSON.parse(JSON.stringify(s.salvos[0])), { notificacoes: { ligacoes: true, mensagens: false, convites: true, lembretes: true } });
});

test('iPhone fora da Tela de Início: explica como instalar, sem botão que não funcionaria', async () => {
  const s = setup('precisa-instalar');
  let view;
  await act(async () => { view = create(React.createElement(s.mod.default)); });
  assert.match(texto(view), /Adicionar à Tela de Início/);
  assert.equal(botao(view, 'Ativar avisos'), undefined);
});

test('convite curto no painel de notificações só aparece quando dá para ativar', async () => {
  for (const [estado, aparece] of [['desligado', true], ['ligado', false], ['bloqueado', false], ['precisa-instalar', true]]) {
    const s = setup(estado);
    let view;
    await act(async () => { view = create(React.createElement(s.mod.ConviteParaAvisos)); });
    assert.equal(view.toJSON() !== null, aparece, estado);
  }
});
