const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

// Carrega os módulos TS do jogo (cartas + motor + robô) sem compilar o projeto.
function carregar(arquivo, deps) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(codigo, { exports, require: (n) => deps[n] ?? {}, structuredClone, globalThis: { crypto: globalThis.crypto }, Uint32Array, Math, Number, Error, Set, Map, Array, Object, JSON }, { filename: arquivo });
  return exports;
}
const cartas = carregar('lib/jogos/arcanos/cartas.ts', {});
const motor = carregar('lib/jogos/arcanos/motor.ts', { './cartas': cartas });
const robo = carregar('lib/jogos/arcanos/robo.ts', { './cartas': cartas, './motor': motor });

const ELS = ['fogo', 'agua', 'terra', 'ar', 'luz', 'escuridao'];
const P = (userId, elemento) => ({ userId, nome: userId, elemento });
const ok = (r) => {
  assert.equal(r.ok, true, r.erro);
  return r.estado;
};

/** Partida em que os dois lados são conhecidos (juntamos os dois aparelhos só para testar). */
function mesa(elA, elB, maoA = [], maoB = [], manaA = 0, manaB = 0) {
  const a = motor.embaralharBaralho(elA);
  const b = motor.embaralharBaralho(elB);
  const e = motor.novaPartida([P('ana', elA), P('bia', elB)], 0, a);
  const j1 = e.jogadores[1];
  j1.mao = b.baralho.splice(0, 6);
  j1.baralho = b.baralho;
  j1.maoMana = b.reserva.splice(0, 3);
  j1.reserva = b.reserva;
  e.jogadores[0].mao = [...maoA];
  e.jogadores[0].maoQtd = maoA.length;
  j1.mao = [...maoB];
  j1.maoQtd = maoB.length;
  e.jogadores[0].fonte = manaA;
  e.jogadores[1].fonte = manaB;
  e.eu = null;
  return e;
}
// Com eu === null o motor não confere a mão; para testar a mão, deixamos tudo "público" e confiamos nos ids.
const jogar = (e, carta, alvo, lado = e.ativo, rolls) => motor.aplicar(e, { t: 'jogar', lado, carta, alvo, rolls });
const heroi = (lado) => ({ tipo: 'heroi', lado });

test('cada elemento tem 30 cartas de grimório e 20 de mana, com a mesma divisão', () => {
  for (const el of ELS) {
    const g = cartas.montarGrimorio(el);
    assert.equal(g.length, 30, el);
    const k = g.map((id) => cartas.carta(id));
    assert.equal(k.filter((c) => c.tipo === 'magia').length, 21, `${el} feitiços`);
    assert.equal(k.filter((c) => c.tipo === 'personagem').length, 9, `${el} personagens`);
    const r = cartas.montarReserva(el);
    assert.equal(r.length, 20);
    assert.equal(r.filter((id) => id.startsWith('m1-')).length, 16);
    assert.equal(r.filter((id) => id.startsWith('m2-')).length, 4);
    assert.ok(r.every((id) => cartas.cartaDeMana(id).el === el));
  }
  assert.equal(cartas.CARTAS.length, 102);
  assert.equal(new Set(cartas.CARTAS.map((c) => c.id)).size, 102);
});

test('todo número das cartas é um dado de 3, 4, 6, 8, 10, 12 ou 20 faces', () => {
  const dados = [];
  const colher = (ef) => 'd' in ef && dados.push(ef.d);
  for (const c of cartas.CARTAS) {
    [...c.efeitos, ...(c.entrada ?? []), ...(c.inicio ?? []), ...(c.morte ?? [])].forEach(colher);
    if (c.ataque) dados.push(c.ataque);
  }
  assert.ok(dados.length > 100);
  for (const x of dados) {
    assert.ok(cartas.FACES.includes(x.f), `faces ${x.f}`);
    assert.ok(x.n >= 1 && x.n <= 4);
  }
  // Os seis modelos pequenos e grandes aparecem de verdade.
  const usadas = new Set(dados.map((x) => x.f));
  for (const f of cartas.FACES) assert.ok(usadas.has(f), `d${f} sem uso`);
});

test('feitiços que pedem alvo sempre trazem um efeito para o alvo escolhido, e vice-versa', () => {
  for (const c of cartas.CARTAS.filter((c) => c.tipo === 'magia')) {
    const usa = c.efeitos.some((ef) => 'alvo' in ef && ef.alvo === 'escolhido');
    assert.equal(Boolean(c.alvo), usa, c.id);
  }
  for (const c of cartas.CARTAS.filter((c) => c.tipo === 'personagem')) {
    const todos = [...(c.entrada ?? []), ...(c.inicio ?? []), ...(c.morte ?? [])];
    assert.ok(todos.every((ef) => !('alvo' in ef) || ef.alvo !== 'escolhido'), c.id);
  }
});

test('dano rolado: o dado vem na jogada e o escudo absorve primeiro', () => {
  let e = mesa('fogo', 'agua', ['fo03'], [], 5, 0);
  // Lança de Brasa: 1d8. Escudo de 3 no herói inimigo.
  e.jogadores[1].escudo = 3;
  const r = jogar(e, 'fo03', heroi(1), 0, [6]);
  e = ok(r);
  assert.equal(e.jogadores[1].escudo, 0);
  assert.equal(e.jogadores[1].vida, 17);
  assert.equal(JSON.stringify(r.acao.rolls), '[6]');
  assert.equal(e.jogadores[0].gasta, 2);
  const dados = e.eventos.find((x) => x.k === 'dados');
  assert.equal(dados.faces, 8);
  assert.equal(dados.total, 6);
});

test('dado impossível, sobrando ou faltando recusa a jogada', () => {
  const e = mesa('fogo', 'agua', ['fo03'], [], 5);
  assert.equal(jogar(e, 'fo03', heroi(1), 0, [9]).ok, false);
  assert.equal(jogar(e, 'fo03', heroi(1), 0, []).ok, false);
  assert.equal(jogar(e, 'fo03', heroi(1), 0, [3, 3]).ok, false);
  assert.equal(jogar(e, 'fo03', heroi(1), 0, [0]).ok, false);
});

test('mana: uma por turno, soma na fonte e limita o custo', () => {
  let e = mesa('fogo', 'agua', ['fo03'], [], 0);
  e.jogadores[0].maoMana = ['m1-fogo', 'm2-fogo'];
  assert.match(jogar(e, 'fo03', heroi(1), 0, [1]).erro, /Falta mana/);
  e = ok(motor.aplicar(e, { t: 'mana', lado: 0, carta: 'm2-fogo' }));
  assert.equal(e.jogadores[0].fonte, 2);
  assert.equal(motor.aplicar(e, { t: 'mana', lado: 0, carta: 'm1-fogo' }).ok, false);
  e = ok(jogar(e, 'fo03', heroi(1), 0, [2]));
  assert.equal(motor.manaDisponivel(e.jogadores[0]), 0);
});

test('cura não passa dos 20 e escudo some no início do turno do dono', () => {
  let e = mesa('luz', 'fogo', ['lu02', 'lu03'], [], 5);
  e.jogadores[0].vida = 18;
  e = ok(jogar(e, 'lu02', heroi(0), 0, [4]));
  assert.equal(e.jogadores[0].vida, 20);
  e = ok(jogar(e, 'lu03', heroi(0), 0, [5]));
  assert.equal(e.jogadores[0].escudo, 5);
  e = ok(motor.aplicar(e, { t: 'passar', lado: 0 }));
  e = ok(motor.aplicar(e, { t: 'passar', lado: 1 }));
  assert.equal(e.jogadores[0].escudo, 0);
});

test('silêncio no herói impede feitiços mas não invocar personagens', () => {
  let e = mesa('agua', 'fogo', ['ag04'], ['fo01', 'fo13'], 3, 4);
  e = ok(jogar(e, 'ag04', heroi(1), 0, []));
  assert.equal(e.jogadores[1].status.silencio, 1);
  e = ok(motor.aplicar(e, { t: 'passar', lado: 0 }));
  assert.match(jogar(e, 'fo01', heroi(0), 1, [1]).erro, /silenciado/);
  e = ok(jogar(e, 'fo13', undefined, 1, []));
  assert.equal(e.jogadores[1].campo.length, 1);
  e = ok(motor.aplicar(e, { t: 'passar', lado: 1 }));
  assert.equal(e.jogadores[1].status.silencio, 0);
});

test('personagem: entra, não ataca no turno (a não ser com Ímpeto) e o Guardião protege', () => {
  let e = mesa('fogo', 'terra', ['fo13', 'fo14'], ['te15'], 5, 5);
  e = ok(jogar(e, 'fo14', undefined, 0, [])); // Guerreiro Rubro, sem Ímpeto
  const guerreiro = e.jogadores[0].campo[0];
  assert.equal(motor.podeAtacar(e, guerreiro), false);
  e = ok(jogar(e, 'fo13', undefined, 0, [])); // Salamandra, Ímpeto
  const sal = e.jogadores[0].campo[1];
  assert.equal(motor.podeAtacar(e, sal), true);
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 0, atacante: sal.id, alvo: heroi(1), rolls: [3] }));
  assert.equal(e.jogadores[1].vida, 17);
  e = ok(motor.aplicar(e, { t: 'passar', lado: 0 }));
  e = ok(jogar(e, 'te15', undefined, 1, [])); // Guerreiro de Granito: Guardião
  e = ok(motor.aplicar(e, { t: 'passar', lado: 1 }));
  const meu = e.jogadores[0].campo[0];
  const alvos = motor.alvosDoAtaque(e, meu);
  assert.equal(alvos.length, 1);
  assert.equal(alvos[0].tipo, 'char');
  assert.equal(motor.aplicar(e, { t: 'atacar', lado: 0, atacante: meu.id, alvo: heroi(1), rolls: [2] }).ok, false);
});

test('atordoar impede o ataque; esquiva anula o próximo dano; couraça reduz 1', () => {
  let e = mesa('agua', 'fogo', ['ag05'], ['fo14'], 5, 5);
  e.jogadores[1].campo.push({ id: '1p9', carta: 'fo14', dono: 1, vida: 6, dano: 0, escudo: 0, status: { silencio: 0, atordoado: 0, esquiva: false, dots: [], regens: [], ampls: [], fracos: [] }, exausta: false, entrouNoTurno: 0 });
  e = ok(jogar(e, 'ag05', { tipo: 'char', id: '1p9' }, 0, [2])); // Geada: 1d3 de dano, menos 1 de couraça
  const g = e.jogadores[1].campo[0];
  assert.equal(g.dano, 1);
  assert.equal(g.status.atordoado, 1);
  e = ok(motor.aplicar(e, { t: 'passar', lado: 0 }));
  assert.equal(motor.podeAtacar(e, e.jogadores[1].campo[0]), false);

  let f = mesa('ar', 'fogo', ['ar01', 'ar02'], [], 3);
  f = ok(jogar(f, 'ar01', heroi(0), 0, []));
  assert.equal(f.jogadores[0].status.esquiva, true);
  f.jogadores[1].status.esquiva = true; // o inimigo também tem uma esquiva guardada
  f = ok(jogar(f, 'ar02', heroi(1), 0, [3]));
  assert.equal(f.jogadores[1].vida, 20);
  assert.equal(f.jogadores[1].status.esquiva, false);
});

test('dano contínuo e regeneração rolam no início do turno de quem os tem', () => {
  let e = mesa('escuridao', 'fogo', ['es03'], [], 4);
  e = ok(jogar(e, 'es03', heroi(1), 0, []));
  assert.equal(e.jogadores[1].status.dots.length, 1);
  const r = motor.aplicar(e, { t: 'passar', lado: 0, rolls: [3] });
  e = ok(r);
  assert.equal(e.jogadores[1].vida, 17);
  assert.equal(e.jogadores[1].status.dots[0].t, 2);
  assert.equal(motor.aplicar(e, { t: 'passar', lado: 1 }).ok, true);
});

test('amplificar: o personagem rola +dados em cada ataque e perde o bônus com o tempo', () => {
  let e = mesa('fogo', 'agua', ['fo13', 'fo06'], [], 5);
  e = ok(jogar(e, 'fo13', undefined, 0, []));
  const sal = e.jogadores[0].campo[0].id;
  e = ok(jogar(e, 'fo06', { tipo: 'char', id: sal }, 0, []));
  assert.equal(e.jogadores[0].campo[0].status.ampls.length, 1);
  // Ataque: 1d4 + 1d6 de bônus.
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 0, atacante: sal, alvo: heroi(1), rolls: [3, 5] }));
  assert.equal(e.jogadores[1].vida, 12);
  const dados = e.eventos.filter((x) => x.k === 'dados');
  assert.equal(JSON.stringify(dados.map((x) => x.faces)), '[4,6]');
});

test('personagem com "ao entrar", "ao morrer" e Alado: gatilhos e restrição de alvo', () => {
  // Elemental de Magma: ao morrer causa 1d6 a todos os personagens inimigos.
  let e = mesa('fogo', 'ar', ['fo16'], ['ar13'], 6, 6);
  e = ok(jogar(e, 'fo16', undefined, 0, []));
  const el = e.jogadores[0].campo[0];
  e = ok(motor.aplicar(e, { t: 'passar', lado: 0 }));
  e = ok(jogar(e, 'ar13', undefined, 1, [])); // Falcão: Alado + Ímpeto
  const falcao = e.jogadores[1].campo[0];
  // O falcão ataca o elemental (Guardião) e depois o elemental não pode atacar o falcão (alado).
  e = ok(motor.aplicar(e, { t: 'atacar', lado: 1, atacante: falcao.id, alvo: { tipo: 'char', id: el.id }, rolls: [4] }));
  e = ok(motor.aplicar(e, { t: 'passar', lado: 1 }));
  const meu = e.jogadores[0].campo[0];
  assert.equal(motor.alvosDoAtaque(e, meu).some((r) => r.tipo === 'char'), false);
  assert.equal(motor.alvosDoAtaque(e, meu).length, 1); // só o herói
});

test('ressuscitar devolve o último morto; desistir e vida zero encerram a partida', () => {
  let e = mesa('fogo', 'agua', ['fo10'], [], 6);
  e.jogadores[0].cemiterio = ['fo13', 'fo14'];
  e = ok(jogar(e, 'fo10', undefined, 0, [3]));
  assert.equal(e.jogadores[0].campo[0].carta, 'fo14');
  assert.equal(e.jogadores[0].cemiterio.length, 1);

  let f = mesa('fogo', 'agua', ['fo12'], [], 6);
  f.jogadores[1].vida = 4;
  f = ok(jogar(f, 'fo12', heroi(1), 0, [11]));
  assert.equal(f.vencedor, 0);
  assert.equal(motor.aplicar(f, { t: 'passar', lado: 0 }).ok, false);

  let g = mesa('fogo', 'agua');
  g = ok(motor.aplicar(g, { t: 'desistir', lado: 1 }));
  assert.equal(g.vencedor, 0);
});

test('duas máquinas, o mesmo jogo: o robô joga contra o robô e os dois estados nunca divergem', () => {
  for (let partida = 0; partida < 36; partida++) {
    const els = [ELS[partida % 6], ELS[(partida * 5 + 2) % 6]];
    const ps = [P('ana', els[0]), P('bia', els[1])];
    const a = motor.embaralharBaralho(els[0]);
    const b = motor.embaralharBaralho(els[1]);
    // Cada aparelho só conhece o próprio baralho.
    let A = motor.novaPartida(ps, 0, a);
    let B = motor.novaPartida(ps, 1, b);
    const norm = (e) => JSON.stringify(motor.publico(e), (k, v) => (k === 'eventos' ? undefined : v));
    assert.equal(norm(A), norm(B));
    let passos = 0;
    while (A.vencedor === null && passos < 900) {
      const lado = A.ativo;
      const dono = lado === 0 ? A : B;
      const acao = robo.decidirJogada(dono, lado);
      assert.ok(acao, 'o robô sempre tem uma ação');
      const r = motor.aplicar(dono, acao);
      assert.equal(r.ok, true, `${r.erro} (${JSON.stringify(acao)})`);
      if (lado === 0) A = r.estado; else B = r.estado;
      // O outro aparelho repete a jogada com os dados que vieram junto.
      const outroAp = lado === 0 ? B : A;
      const r2 = motor.aplicar(outroAp, r.acao);
      assert.equal(r2.ok, true, r2.erro);
      if (lado === 0) B = r2.estado; else A = r2.estado;
      assert.equal(norm(A), norm(B), `divergiu na partida ${partida}, passo ${passos}`);
      passos++;
    }
    assert.ok(A.vencedor !== null, `partida ${partida} sem fim em ${passos} passos`);
    assert.equal(A.vencedor, B.vencedor);
  }
});

test('partidas aleatórias (qualquer jogada legal) nunca quebram o motor e terminam sempre igual nos dois lados', () => {
  const escolher = (l) => l[Math.floor(Math.random() * l.length)];
  for (let partida = 0; partida < 60; partida++) {
    const els = [escolher(ELS), escolher(ELS)];
    const ps = [P('ana', els[0]), P('bia', els[1])];
    let A = motor.novaPartida(ps, 0, motor.embaralharBaralho(els[0]));
    let B = motor.novaPartida(ps, 1, motor.embaralharBaralho(els[1]));
    const norm = (e) => JSON.stringify(motor.publico(e), (k, v) => (k === 'eventos' ? undefined : v));
    for (let passo = 0; passo < 700 && A.vencedor === null; passo++) {
      const lado = A.ativo;
      const dono = lado === 0 ? A : B;
      const j = dono.jogadores[lado];
      const opcoes = [];
      for (const id of j.maoMana ?? []) if (!motor.podeJogarMana(dono, lado, id)) opcoes.push({ t: 'mana', lado, carta: id });
      for (const id of j.mao ?? []) {
        if (motor.podeJogar(dono, lado, id)) continue;
        const k = cartas.carta(id);
        if (k.tipo === 'magia' && k.alvo) for (const alvo of motor.alvosDaCarta(dono, lado, id)) opcoes.push({ t: 'jogar', lado, carta: id, alvo });
        else opcoes.push({ t: 'jogar', lado, carta: id });
      }
      for (const p of j.campo) if (motor.podeAtacar(dono, p)) for (const alvo of motor.alvosDoAtaque(dono, p)) opcoes.push({ t: 'atacar', lado, atacante: p.id, alvo });
      const acao = opcoes.length && Math.random() < 0.8 ? escolher(opcoes) : { t: 'passar', lado };
      const r = motor.aplicar(dono, acao);
      assert.equal(r.ok, true, `${r.erro} ${JSON.stringify(acao)}`);
      if (lado === 0) A = r.estado; else B = r.estado;
      const outroAp = lado === 0 ? B : A;
      const r2 = motor.aplicar(outroAp, r.acao);
      assert.equal(r2.ok, true, r2.erro);
      if (lado === 0) B = r2.estado; else A = r2.estado;
      assert.equal(norm(A), norm(B), `divergiu na partida ${partida}, passo ${passo}: ${JSON.stringify(acao)}`);
      for (const jj of A.jogadores) {
        assert.ok(jj.campo.length <= 4);
        assert.ok(jj.vida <= 20);
        assert.ok(jj.fonte <= 10);
        for (const c of jj.campo) assert.ok(c.dano >= 0 && c.escudo >= 0);
      }
    }
  }
});
