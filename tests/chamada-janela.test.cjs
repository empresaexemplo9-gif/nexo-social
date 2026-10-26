// React act() precisa do renderizador de desenvolvimento.
process.env.NODE_ENV = 'test';
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

// Chamada sem rede: uma "malha" de mentira no lugar do WebRTC.
class MalhaFalsa {
  constructor(_sb, _topico, _eu, _ice, aoMudar) {
    this.aoMudar = aoMudar;
    this.local = null;
    this.audio = true;
    this.video = true;
    this.frente = 'user';
    this.cheia = false;
    this.meFalando = false;
    this.outros = [];
    MalhaFalsa.ultima = this;
  }
  async entrar() {}
  pessoas() { return this.outros; }
  async sair() { this.saiu = true; }
  alternarAudio() { this.audio = !this.audio; this.aoMudar(); }
  async alternarVideo() {}
  async trocarCamera() {}
}

function carregar(tela) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync('components/comunidade/Chamada.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const deps = {
    react: React,
    'react-dom': { createPortal: (el) => el },
    '../icons': () => null,
    '../Avatar': () => null,
    '@/lib/supabase': { supabase: {} },
    '@/lib/chamada': { ChamadaMesh: MalhaFalsa, MAX_PESSOAS: 8, servidoresIce: async () => [], topicoDaChamada: () => 'grupo:g1:chamada' },
  };
  const window = { innerWidth: tela.w, innerHeight: tela.h, addEventListener() {}, removeEventListener() {} };
  vm.runInNewContext(codigo, {
    exports,
    require: (n) => { if (!(n in deps)) throw Error(n); return deps[n]; },
    window,
    document: { body: {}, fullscreenElement: null, querySelectorAll: () => audios },
    MediaStream: class { constructor(faixas) { this.faixas = faixas; } },
    navigator: { mediaDevices: { enumerateDevices: async () => [] } },
    setInterval, clearInterval, Promise, console,
  });
  return exports.default;
}

// A janela mede 320×240; os <video> e <audio> têm o mínimo que a chamada usa.
let tocar = async () => {};
let audios = [];
const nos = (el) => {
  if (el.type === 'video') return { srcObject: null, videoWidth: 0, play: async () => {} };
  if (el.type === 'audio') {
    const a = { srcObject: null, play: () => tocar() };
    audios.push(a);
    return a;
  }
  return { offsetWidth: 320, offsetHeight: 240, setPointerCapture() {} };
};

// Cada chamada aberta é desmontada no fim do teste (para o cronômetro dela).
const abertas = [];
afterEach(async () => {
  while (abertas.length) {
    const v = abertas.pop();
    await act(async () => v.unmount());
  }
  tocar = async () => {};
  audios = [];
});

async function abrir(tela = { w: 1280, h: 800 }) {
  const Chamada = carregar(tela);
  let saiu = false;
  let view;
  await act(async () => {
    view = create(
      React.createElement(Chamada, {
        groupId: 'g1', titulo: 'Chamada · Amigos', meuId: 'eu', meuNome: 'Ana', modo: { tipo: 'grupo' }, comVideo: true,
        pessoas: {}, onSair: () => { saiu = true; },
      }),
      { createNodeMock: nos },
    );
  });
  abertas.push(view);
  return { view, saiu: () => saiu };
}

const caixa = (view) => view.root.find((n) => n.type === 'div' && (n.props.role === 'region' || n.props.role === 'dialog'));
const botao = (view, rotulo) => view.root.find((n) => n.type === 'button' && n.props['aria-label'] === rotulo);
const videos = (view) => view.root.findAll((n) => n.type === 'video').length;

test('a chamada abre numa janela flutuante, sem tomar a tela nem travar a página', async () => {
  const { view } = await abrir();
  const c = caixa(view);
  assert.equal(c.props.role, 'region');
  assert.equal(c.props['aria-modal'], undefined);
  assert.doesNotMatch(c.props.className, /inset-0/);
  // Canto de baixo à direita, inteira dentro da tela.
  assert.deepEqual({ ...c.props.style }, { left: 1280 - 320 - 16, top: 800 - 240 - 16 });
  assert.ok(botao(view, 'Desligar microfone'), 'os controles ficam na janela');
});

test('no celular a janela começa em cima (embaixo fica o campo de mensagem)', async () => {
  const { view } = await abrir({ w: 390, h: 844 });
  assert.equal(caixa(view).props.style.top, 76);
});

test('ampliar leva à tela toda e reduzir volta para a janela', async () => {
  const { view } = await abrir();
  await act(async () => botao(view, 'Ampliar a chamada').props.onClick());
  assert.equal(caixa(view).props.role, 'dialog');
  assert.match(caixa(view).props.className, /inset-0/);
  await act(async () => botao(view, 'Reduzir a chamada').props.onClick());
  assert.equal(caixa(view).props.role, 'region');
});

test('recolher esconde os vídeos da vista sem desmontá-los (o som continua)', async () => {
  const { view } = await abrir();
  const antes = videos(view);
  assert.ok(antes > 0);
  await act(async () => botao(view, 'Recolher a chamada').props.onClick());
  assert.equal(videos(view), antes);
  assert.ok(view.root.find((n) => n.type === 'div' && n.props.className === 'sr-only'));
  assert.ok(botao(view, 'Sair da chamada'), 'recolhida, os controles seguem à mão');
  await act(async () => botao(view, 'Mostrar os vídeos').props.onClick());
  assert.equal(view.root.findAll((n) => n.type === 'div' && n.props.className === 'sr-only').length, 0);
});

test('a janela se arrasta pelo topo e nunca sai da tela', async () => {
  const { view } = await abrir();
  const alca = view.root.find((n) => n.type === 'div' && n.props.title === 'Arraste para mudar a chamada de lugar');
  const ev = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, target: { closest: () => null }, currentTarget: { setPointerCapture() {} } });
  await act(async () => alca.props.onPointerDown(ev(950, 550)));
  await act(async () => alca.props.onPointerMove(ev(100, 100)));
  assert.deepEqual({ ...caixa(view).props.style }, { left: 94, top: 94 });
  await act(async () => alca.props.onPointerMove(ev(-500, 5000)));
  assert.deepEqual({ ...caixa(view).props.style }, { left: 8, top: 800 - 240 - 8 });
  await act(async () => alca.props.onPointerUp(ev(0, 0)));
  await act(async () => alca.props.onPointerMove(ev(600, 300)));
  assert.deepEqual({ ...caixa(view).props.style }, { left: 8, top: 800 - 240 - 8 }, 'solto, não segue o dedo');
});

test('um toque nos botões do topo não começa a arrastar', async () => {
  const { view } = await abrir();
  const alca = view.root.find((n) => n.type === 'div' && n.props.title === 'Arraste para mudar a chamada de lugar');
  const noBotao = (x, y) => ({ clientX: x, clientY: y, pointerId: 2, target: { closest: () => ({}) }, currentTarget: { setPointerCapture() {} } });
  const antes = { ...caixa(view).props.style };
  await act(async () => alca.props.onPointerDown(noBotao(950, 550)));
  await act(async () => alca.props.onPointerMove(noBotao(10, 10)));
  assert.deepEqual({ ...caixa(view).props.style }, antes);
});

test('sair encerra a chamada', async () => {
  const { view, saiu } = await abrir();
  await act(async () => botao(view, 'Sair da chamada').props.onClick());
  assert.equal(MalhaFalsa.ultima.saiu, true);
  assert.equal(saiu(), true);
});

// Alguém na chamada só com voz: a faixa de vídeo reservada nunca manda quadro.
const voz = { kind: 'audio' };
const pessoaSoComVoz = {
  sessao: 's2',
  meta: { userId: 'u2', nome: 'Bia', audio: true, video: false, desde: 1 },
  stream: { getAudioTracks: () => [voz], getVideoTracks: () => [{ kind: 'video' }], getTracks: () => [voz] },
  estado: 'connected', qualidade: null, retransmitido: false, falando: false,
};

async function comBia(view) {
  await act(async () => {
    MalhaFalsa.ultima.outros = [pessoaSoComVoz];
    MalhaFalsa.ultima.aoMudar();
  });
}

test('a voz de cada pessoa toca num <audio> próprio, e os <video> ficam mudos', async () => {
  const { view } = await abrir();
  await comBia(view);
  // O <video> espera o primeiro quadro para tocar: numa chamada de voz ele nunca chega.
  for (const v of view.root.findAll((n) => n.type === 'video')) assert.equal(v.props.muted, true);
  assert.equal(view.root.findAll((n) => n.type === 'audio').length, 1);
  assert.equal(audios.length, 1);
  const faixas = audios[0].srcObject.faixas;
  assert.ok(faixas.length === 1 && faixas[0] === voz, 'só a faixa de áudio');
});

test('ampliar e reduzir não corta a voz (o <audio> não é recriado)', async () => {
  const { view } = await abrir();
  await comBia(view);
  await act(async () => botao(view, 'Ampliar a chamada').props.onClick());
  await act(async () => botao(view, 'Reduzir a chamada').props.onClick());
  assert.equal(audios.length, 1);
});

test('som barrado pelo navegador: aparece "Tocar para ouvir", e o toque destrava', async () => {
  tocar = async () => { throw Object.assign(new Error('sem gesto'), { name: 'NotAllowedError' }); };
  const { view } = await abrir();
  await comBia(view);
  const destravar = botao(view, 'Tocar para ouvir');
  assert.ok(destravar);
  tocar = async () => {};
  await act(async () => destravar.props.onClick());
  assert.equal(view.root.findAll((n) => n.type === 'button' && n.props['aria-label'] === 'Tocar para ouvir').length, 0);
});
