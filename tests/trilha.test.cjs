const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

function carregar(arquivo, deps = {}) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(codigo, { exports, require: (n) => deps[n] ?? {} });
  return exports;
}
const perguntas = carregar('lib/jogos/perguntas.ts');
const trilha = carregar('lib/jogos/trilha.ts', { './perguntas': perguntas });

const ana = { userId: 'ana', nome: 'Ana', avatar: null };
const bia = { userId: 'bia', nome: 'Bia', avatar: null };

test('banco de perguntas: 14 categorias, ids únicos e 4 opções distintas', () => {
  const { PERGUNTAS, CATEGORIAS_DO_QUIZ } = perguntas;
  assert.equal(CATEGORIAS_DO_QUIZ.length, 14);
  assert.equal(new Set(PERGUNTAS.map((p) => p.id)).size, PERGUNTAS.length);
  for (const c of CATEGORIAS_DO_QUIZ) assert.ok(PERGUNTAS.filter((p) => p.cat === c.id).length >= 15, c.id);
  for (const p of PERGUNTAS) assert.equal(new Set(p.o).size, 4, p.id);
});

test('andar respeita estrela, ponte e a chegada', () => {
  assert.equal(trilha.andar(0, 2), 2);
  assert.equal(trilha.andar(2, 2), 5); // parou na estrela (4): +1
  assert.equal(trilha.andar(6, 2), 12); // ponte do 8 leva ao 12
  assert.equal(trilha.andar(29, 3), trilha.CASAS);
});

test('sortear pergunta embaralha e aponta a certa', () => {
  let e = trilha.novaTrilha('m1', ana);
  const { pergunta, opcoes, correta } = trilha.sortearPergunta(e, 'brasil', () => 0.42);
  assert.equal(pergunta.cat, 'brasil');
  assert.equal(opcoes[correta], pergunta.o[0]);
  assert.equal(new Set(opcoes).size, 4);
});

test('revelar move quem acertou e dá bônus ao mais rápido', () => {
  let e = trilha.entrar(trilha.novaTrilha('m1', ana), bia);
  e = { ...e, fase: 'pergunta', rodada: 1 };
  const r = trilha.revelar(e, 2, 'curiosidade', { ana: { opcao: 2, ms: 3000 }, bia: { opcao: 2, ms: 9000 } });
  const [a, b] = r.jogadores;
  assert.equal(a.casa, 3); // 2 + 1 de bônus
  assert.equal(b.casa, 2);
  assert.ok(a.pontos > b.pontos);
  assert.equal(r.revelacao.maisRapido, 'ana');
  assert.equal(r.fase, 'revelacao');
  assert.equal(r.vencedores.length, 0);
});

test('fim de jogo pelas rodadas e desempate por pontos', () => {
  let e = trilha.entrar(trilha.novaTrilha('m1', ana), bia);
  e = { ...e, rodada: e.totalRodadas, jogadores: e.jogadores.map((j) => ({ ...j, casa: 10 })) };
  const r = trilha.revelar(e, 0, 'x', { ana: { opcao: 1, ms: 1000 }, bia: { opcao: 0, ms: 1000 } });
  assert.equal(trilha.acabou(r), true);
  assert.deepEqual([...r.vencedores], ['bia']);
});
