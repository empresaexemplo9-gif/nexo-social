const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

// Carrega os módulos TS do jogo (cartas + motor) sem compilar o projeto.
function carregar(arquivo, deps) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(codigo, { exports, require: (n) => deps[n] ?? {}, structuredClone, globalThis: { crypto: globalThis.crypto } });
  return exports;
}
const cartas = carregar('lib/jogos/arcanos/cartas.ts', {});
const motor = carregar('lib/jogos/arcanos/motor.ts', { './cartas': cartas });

const P = (userId, escolas) => ({ userId, nome: userId, escolas });

/** Partida com as mãos montadas à mão (o baralho é a lista dada, sem embaralhar). */
function partida(maoA, maoB) {
  const baralho = (lado, lista) => {
    const ids = lista.map((_, i) => `${lado}c${i}`);
    return { baralho: ids, segredos: Object.fromEntries(ids.map((id, i) => [id, lista[i]])) };
  };
  const encher = (m) => [...m, ...Array(30 - m.length).fill('b04')];
  const a = baralho(0, encher(maoA));
  const b = baralho(1, encher(maoB));
  // Cada aparelho só conhece o próprio baralho; aqui juntamos os dois para testar.
  const e = motor.novaPartida([P('ana', ['chama', 'bosque']), P('bia', ['mare', 'sombra'])], 0, a);
  e.jogadores[1].mao = [];
  e.jogadores[1].baralho = [...b.baralho];
  e.jogadores[1].segredos = { ...b.segredos };
  for (let i = 0; i < 5; i++) e.jogadores[1].mao.push(e.jogadores[1].baralho.shift());
  return e;
}
const ok = (r) => {
  assert.equal(r.ok, true, r.erro);
  return r.estado;
};
const passar = (e) => ok(motor.aplicar(e, { t: 'passar', lado: e.ativo }));

test('baralho de duas escolas tem 30 cartas e nenhuma ficha', () => {
  const lista = cartas.montarBaralho(['chama', 'luz']);
  assert.equal(lista.length, 30);
  assert.ok(lista.every((id) => !cartas.carta(id).ficha));
  assert.equal(cartas.CARTAS.filter((c) => !c.ficha).length, 60);
});

test('embaralhar dá ids secretos e mantém as cartas', () => {
  const lista = cartas.montarBaralho(['mare', 'sombra']);
  const { baralho, segredos } = motor.embaralharBaralho(lista, 1);
  assert.equal(new Set(baralho).size, 30);
  assert.equal(JSON.stringify(baralho.map((id) => segredos[id]).sort()), JSON.stringify([...lista].sort()));
  assert.ok(baralho.every((id) => id.startsWith('1')));
});

test('éter, compra e enjoo de invocação', () => {
  let e = partida(['c01', 'b02', 'c04', 'b04', 'c03'], ['m01', 'm02', 'm03', 's01', 's03']);
  assert.equal(e.jogadores[0].maoQtd, 5);
  assert.equal(e.jogadores[0].eter, 1);
  // Diabrete tem Ímpeto: ataca no mesmo turno.
  e = ok(motor.aplicar(e, { t: 'jogar', lado: 0, inst: '0c0', carta: 'c01' }));
  assert.equal(motor.podeJogar(e, 0, 'b02'), 'Éter insuficiente.');
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 0, atacantes: ['0c0'] }));
  assert.equal(e.jogadores[1].vida, 19);
  e = passar(e);
  assert.equal(e.ativo, 1);
  assert.equal(e.jogadores[1].maoQtd, 6);
  assert.equal(e.jogadores[1].eter, 1);
  e = passar(e);
  assert.equal(e.jogadores[0].eter, 2);
  // Lobo sem Ímpeto não ataca no turno em que entra.
  e = ok(motor.aplicar(e, { t: 'jogar', lado: 0, inst: '0c1', carta: 'b02' }));
  assert.equal(motor.aplicar(e, { t: 'atacar', lado: 0, atacantes: ['0c1'] }).ok, false);
});

test('feitiço com alvo, voo e bloqueio', () => {
  let e = partida(['c03', 'c01', 'c01', 'c01', 'c01'], ['m01', 'm02', 'm03', 's01', 's03']);
  e = ok(motor.aplicar(e, { t: 'jogar', lado: 0, inst: '0c0', carta: 'c03', alvo: { tipo: 'heroi', lado: 1 } }));
  assert.equal(e.jogadores[1].vida, 18);
  e = passar(e);
  // Bia põe o Espírito da Névoa (voa).
  e = ok(motor.aplicar(e, { t: 'jogar', lado: 1, inst: '1c0', carta: 'm01' }));
  e = passar(e);
  e = ok(motor.aplicar(e, { t: 'jogar', lado: 0, inst: '0c1', carta: 'c01' }));
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 0, atacantes: ['0c1'] }));
  assert.equal(e.fase, 'bloqueio');
  e = ok(motor.aplicar(e, { t: 'bloquear', lado: 1, bloqueios: { '0c1': '1c0' } }));
  // Diabrete 1/1 morre; Espírito 1/2 sobrevive; dano some no fim do turno.
  assert.equal(e.jogadores[0].campo.length, 0);
  assert.equal(e.jogadores[1].campo[0].dano, 1);
  e = passar(e);
  assert.equal(e.jogadores[1].campo[0].dano, 0);
  // Quem voa só é bloqueado por quem voa ou tem alcance.
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 1, atacantes: ['1c0'] }));
  assert.equal(e.fase, 'principal');
  assert.equal(e.jogadores[0].vida, 19);
});

test('atropelar, letal, escudo e vínculo', () => {
  let e = partida(['b02'], ['s01']);
  const [a, b] = e.jogadores;
  const nova = (id, carta, dono) => ({ id, carta, dono, ataque: cartas.carta(carta).ataque, vida: cartas.carta(carta).vida, bonusA: 0, bonusV: 0, dano: 0, palavras: [...(cartas.carta(carta).palavras ?? [])], palavrasFim: [], exausta: false, congelada: false, entrouNoTurno: 0 });
  a.campo.push(nova('mam', 'b11', 0)); // Mamute 8/8 Atropelar
  b.campo.push(nova('urso', 'b04', 1)); // Urso 3/4
  b.campo.push(nova('cav', 'l09', 1)); // Cavaleiro 3/4 Vínculo, Escudo
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 0, atacantes: ['mam'] }));
  e = ok(motor.aplicar(e, { t: 'bloquear', lado: 1, bloqueios: { mam: 'urso' } }));
  assert.equal(e.jogadores[1].vida, 16); // 8 - 4 = 4 atropela
  assert.equal(e.jogadores[1].campo.some((c) => c.id === 'urso'), false);
  e = passar(e);
  // O Mamute atacou e está exausto: não bloqueia. O Cavaleiro passa direto e o vínculo cura.
  e.jogadores[1].vida = 10;
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 1, atacantes: ['cav'] }));
  assert.equal(e.fase, 'principal');
  assert.equal(e.jogadores[1].vida, 13);
  assert.equal(e.jogadores[0].vida, 17);
});

test('fichas, ao morrer e fim de jogo', () => {
  let e = partida(['c03', 'c03', 'c03', 'c03', 'c03'], ['s02']);
  e.jogadores[0].eter = 10;
  const esq = { id: 'esq', carta: 's02', dono: 1, ataque: 2, vida: 2, bonusA: 0, bonusV: 0, dano: 0, palavras: [], palavrasFim: [], exausta: false, congelada: false, entrouNoTurno: 0 };
  e.jogadores[1].campo.push(esq);
  e = ok(motor.aplicar(e, { t: 'jogar', lado: 0, inst: '0c0', carta: 'c03', alvo: { tipo: 'criatura', id: 'esq' } }));
  assert.equal(e.jogadores[1].campo.length, 1);
  assert.equal(e.jogadores[1].campo[0].carta, 'f-esqueleto');
  e.jogadores[1].vida = 2;
  e = ok(motor.aplicar(e, { t: 'jogar', lado: 0, inst: '0c1', carta: 'c03', alvo: { tipo: 'heroi', lado: 1 } }));
  assert.equal(e.vencedor, 0);
  assert.equal(motor.aplicar(e, { t: 'passar', lado: 0 }).ok, false);
});

test('o adversário só conhece quantidades e chega ao mesmo estado público', () => {
  const lista = ['c01', 'c03', 'b02', 'b04', 'c04', ...Array(25).fill('b04')];
  const ids = lista.map((_, i) => `0k${i}`);
  const meu = { baralho: ids, segredos: Object.fromEntries(ids.map((id, i) => [id, lista[i]])) };
  const pA = [P('ana', ['chama', 'bosque']), P('bia', ['mare', 'sombra'])];
  let meuLado = motor.novaPartida(pA, 0, meu);
  let delaLado = motor.novaPartida(pA, 1, { baralho: Array.from({ length: 30 }, (_, i) => `1k${i}`), segredos: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`1k${i}`, 'm01'])) });
  const acoes = [
    { t: 'jogar', lado: 0, inst: '0k0', carta: 'c01' },
    { t: 'atacar', lado: 0, atacantes: ['0k0'] },
    { t: 'passar', lado: 0 },
    { t: 'jogar', lado: 1, inst: '1k0', carta: 'm01' },
    { t: 'passar', lado: 1 },
  ];
  for (const a of acoes) {
    meuLado = ok(motor.aplicar(meuLado, a));
    delaLado = ok(motor.aplicar(delaLado, a));
  }
  const semSegredo = (e) => JSON.stringify(motor.publico(e));
  assert.equal(semSegredo(meuLado), semSegredo(delaLado));
  assert.equal(delaLado.jogadores[0].mao, null);
  assert.equal(meuLado.jogadores[0].mao.length, meuLado.jogadores[0].maoQtd);
});

test('todas as cartas geram texto de regras', () => {
  for (const c of cartas.CARTAS) {
    const linhas = cartas.textoDaCarta(c);
    if (c.efeitos?.length || c.palavras?.length || c.aoMorrer?.length) assert.ok(linhas.length > 0, c.id);
  }
});

// --- Adversário do computador ------------------------------------------------------
const robo = carregar('lib/jogos/arcanos/robo.ts', { './cartas': cartas, './motor': motor });

test('o computador joga partidas inteiras só com jogadas válidas e alguém vence', () => {
  const escolas = [['chama', 'bosque'], ['mare', 'sombra'], ['luz', 'chama'], ['bosque', 'sombra'], ['mare', 'luz']];
  for (let n = 0; n < 12; n++) {
    const ea = escolas[n % escolas.length];
    const eb = escolas[(n + 2) % escolas.length];
    const a = motor.embaralharBaralho(cartas.montarBaralho(ea), 0);
    const b = motor.embaralharBaralho(cartas.montarBaralho(eb), 1);
    // Aqui os dois lados ficam no mesmo estado (cada robô só olha a própria mão).
    let e = motor.novaPartida([P('a', ea), P('b', eb)], 0, a);
    e.jogadores[1].mao = [];
    e.jogadores[1].baralho = [...b.baralho];
    e.jogadores[1].segredos = { ...b.segredos };
    for (let i = 0; i < 5; i++) e.jogadores[1].mao.push(e.jogadores[1].baralho.shift());
    let passos = 0;
    while (e.vencedor === null && passos < 2000) {
      const quem = e.fase === 'bloqueio' ? motor.outro(e.ativo) : e.ativo;
      const acao = robo.decidirJogada({ ...e, eu: quem }, quem);
      assert.ok(acao, `sem jogada no passo ${passos}`);
      const r = motor.aplicar(e, acao);
      assert.equal(r.ok, true, `${JSON.stringify(acao)}: ${r.erro}`);
      e = { ...r.estado, eu: 0 };
      passos += 1;
    }
    assert.notEqual(e.vencedor, null, 'a partida terminou');
  }
});

test('o computador bloqueia quando o ataque seria fatal', () => {
  let e = partida(['b04'], ['b04']);
  // Coloca uma criatura em cada lado e deixa o defensor com pouca vida.
  e.jogadores[0].campo.push({ id: 'x1', carta: 'b04', dono: 0, ataque: 3, vida: 3, bonusA: 0, bonusV: 0, dano: 0, palavras: [], palavrasFim: [], exausta: false, congelada: false, entrouNoTurno: 0 });
  e.jogadores[1].campo.push({ id: 'y1', carta: 'b04', dono: 1, ataque: 1, vida: 1, bonusA: 0, bonusV: 0, dano: 0, palavras: [], palavrasFim: [], exausta: false, congelada: false, entrouNoTurno: 0 });
  e.jogadores[1].vida = 3;
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 0, atacantes: ['x1'] }));
  assert.equal(e.fase, 'bloqueio');
  const acao = robo.decidirJogada({ ...e, eu: 1 }, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(acao)), { t: 'bloquear', lado: 1, bloqueios: { x1: 'y1' } });
});
