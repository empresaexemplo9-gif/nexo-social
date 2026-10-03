process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(arquivo) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, Date, Math, Map, Set, String, Number, require: () => ({}) });
  return exports;
}

const mi = load('lib/missoes.ts');
const sql = fs.readFileSync('db/missoes.sql', 'utf8');
const servidor = fs.readFileSync('lib/missoes-servidor.ts', 'utf8');
const icones = fs.readFileSync('components/icons.tsx', 'utf8');

test('missões: ids aceitos pelo banco, metas e prêmios coerentes, ícones e links que existem', () => {
  const ids = mi.MISSOES.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  for (const m of mi.MISSOES) {
    assert.match(m.id, /^[a-z0-9-]{1,60}$/, `${m.id}: cabe na regra do banco`);
    assert.ok(Number.isInteger(m.meta) && m.meta >= 1, `${m.id}: meta`);
    assert.ok(m.premio[0] >= 1 && m.premio[1] >= m.premio[0] && m.premio[1] <= 5, `${m.id}: prêmio de 1 a 5 itens (o banco limita)`);
    assert.ok(icones.includes(`  ${m.icone}:`) || icones.includes(`  ${m.icone}: (`), `${m.id}: ícone ${m.icone}`);
    const rota = m.link.split('?')[0].replace(/^\//, '');
    assert.ok(fs.existsSync(`app/${rota}/page.tsx`), `${m.id}: a página ${m.link} existe`);
    assert.ok(servidor.includes(`  ${m.medida}:`), `${m.id}: o servidor mede ${m.medida}`);
  }
  // Tem das duas: as que voltam toda semana e as conquistas.
  assert.ok(mi.MISSOES.filter((m) => m.periodo === 'semanal').length >= 4);
  assert.ok(mi.MISSOES.filter((m) => m.periodo === 'unica').length >= 8);
  assert.ok(mi.MISSOES.some((m) => m.premio[1] > 1), 'alguma libera mais de um item');
});

test('missões: a semana conta no horário de Brasília e vira na segunda 00:00', () => {
  // Domingo 23:30 em Brasília (segunda 02:30 UTC) ainda é a semana do domingo.
  const domingo = new Date('2026-10-05T02:30:00Z');
  const segunda = new Date('2026-10-05T03:00:00Z');
  assert.equal(mi.inicioDaSemana(domingo).toISOString(), '2026-09-28T03:00:00.000Z');
  assert.equal(mi.inicioDaSemana(segunda).toISOString(), '2026-10-05T03:00:00.000Z');
  assert.notEqual(mi.semanaDe(domingo), mi.semanaDe(segunda));
  assert.equal(mi.semanaDe(new Date('2026-10-03T12:00:00Z')), '2026-S40');
  assert.equal(mi.semanaDe(new Date('2027-01-01T12:00:00Z')), '2026-S53', 'a virada do ano segue a semana ISO');
  assert.equal(mi.semanaDe(new Date('2026-01-01T12:00:00Z')), '2026-S01');
  for (const d of ['2026-01-01', '2026-06-15', '2026-12-31', '2027-03-08']) {
    assert.match(mi.semanaDe(new Date(`${d}T15:00:00Z`)), /^[0-9]{4}-S[0-9]{2}$/, 'cabe na regra do banco');
  }
  const semanal = mi.MISSOES.find((m) => m.periodo === 'semanal');
  const unica = mi.MISSOES.find((m) => m.periodo === 'unica');
  assert.equal(mi.periodoDaMissao(unica, segunda), 'sempre');
  assert.equal(mi.periodoDaMissao(semanal, segunda), mi.semanaDe(segunda));
});

test('missões: o prêmio sai entre o mínimo e o máximo, e o estado segue o progresso', () => {
  const m = { premio: [2, 3] };
  assert.equal(mi.tamanhoDoPremio(m, 0), 2);
  assert.equal(mi.tamanhoDoPremio(m, 0.49), 2);
  assert.equal(mi.tamanhoDoPremio(m, 0.5), 3);
  assert.equal(mi.tamanhoDoPremio(m, 1), 3);
  assert.equal(mi.tamanhoDoPremio({ premio: [1, 1] }, 0.9), 1);
  assert.equal(mi.textoDoPremio({ premio: [1, 1] }), '1 item sorteado');
  assert.equal(mi.textoDoPremio({ premio: [2, 3] }), '2 a 3 itens sorteados');
  assert.equal(mi.estadoDaMissao(0, 3, false), 'andamento');
  assert.equal(mi.estadoDaMissao(3, 3, false), 'pronta');
  assert.equal(mi.estadoDaMissao(3, 3, true), 'resgatada');
  assert.equal(mi.missaoPorId('nao-existe'), null);
});

test('sorteio e trocas: só o servidor chama, uma vez por período, repetido por repetido', () => {
  for (const f of ['exclusivos_resgatar_missao', 'exclusivos_propor_troca', 'exclusivos_responder_troca', 'exclusivos_cancelar_troca', 'exclusivos_dar_item']) {
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION ${f}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`), `${f} fechada para o público`);
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION ${f}\\([^)]*\\) TO service_role;`), `${f} só com a chave de serviço`);
  }
  assert.match(sql, /PRIMARY KEY \(user_id, missao, periodo\)/, 'um resgate por missão e período');
  assert.match(sql, /WHERE active AND sorteavel ORDER BY random\(\)/, 'sorteia qualquer item ativo e sorteável');
  assert.match(sql, /exclusivos_quantos\(p_de, p_oferece\) < 2/, 'só oferece repetido');
  assert.match(sql, /v_dele < 2 OR v_minha < 2/, 'na hora do aceite, os dois ainda têm o repetido');
  // O resgate confere o progresso no servidor antes de sortear.
  const rota = fs.readFileSync('app/api/missoes/route.ts', 'utf8');
  assert.ok(rota.indexOf('progressoDe(') < rota.indexOf("rpc('exclusivos_resgatar_missao'"), 'confere antes de sortear');
  assert.match(rota, /estaBanida/);
  const trocas = fs.readFileSync('app/api/exclusivos/trocas/route.ts', 'utf8');
  assert.match(trocas, /type: 'troca'/, 'avisa quem recebe a proposta e quem propôs quando aceita');
});

test('colecionáveis: abas de Missões e Trocas, e o ×N dos repetidos', () => {
  const pagina = fs.readFileSync('app/colecionaveis/page.tsx', 'utf8');
  assert.match(pagina, /'missoes', 'trocas'\]/);
  const c = fs.readFileSync('components/colecionaveis/Colecionaveis.tsx', 'utf8');
  assert.match(c, /<Missoes onGanhou=/);
  assert.match(c, /<Trocas onMudou=/);
  assert.equal((c.match(/<Repetido item=\{item\} \/>/g) || []).length, 3, 'adesivos, bottons e planos de fundo');
  assert.ok(fs.readFileSync('app/globals.css', 'utf8').includes('.item-repetido {'));
  // O painel do superadministrador tira um item do sorteio (fica só para os kits).
  assert.match(fs.readFileSync('components/AdminExclusivos.tsx', 'utf8'), /mudarItem\(i, \{ sorteavel: i\.sorteavel === false \}\)/);
  assert.match(fs.readFileSync('app/api/admin/exclusivos/route.ts', 'utf8'), /mudanca\.sorteavel = body\.sorteavel/);
});
