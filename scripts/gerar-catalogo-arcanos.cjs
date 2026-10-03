// Gera docs/arcanos-cartas.md a partir de lib/jogos/arcanos/cartas.ts.
// Uso: node scripts/gerar-catalogo-arcanos.cjs
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

const mod = {};
const codigo = ts.transpileModule(fs.readFileSync('lib/jogos/arcanos/cartas.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(codigo, { exports: mod, require: () => ({}), Error, Map, Set, Array, Object });
const { CARTAS, ELEMENTOS, ELEMENTOS_ORDEM, MANAS, textoDaCarta, dadosTexto } = mod;

const linhas = [];
linhas.push('# Arcanos — catálogo de cartas');
linhas.push('');
linhas.push('Gerado por `scripts/gerar-catalogo-arcanos.cjs`. Cada elemento tem 21 feitiços e 9 personagens no grimório (30 cartas) e uma reserva de 20 cartas de mana (16 Essências +1 e 4 Núcleos +2), idêntica em todos os elementos.');
linhas.push('');
for (const el of ELEMENTOS_ORDEM) {
  const e = ELEMENTOS[el];
  linhas.push(`## ${e.nome}`);
  linhas.push('');
  linhas.push(`> ${e.lema} — ${e.estilo}`);
  linhas.push('');
  linhas.push('| Id | Carta | Tipo | Custo | Cópias | Raridade | Regras |');
  linhas.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const c of CARTAS.filter((x) => x.el === el)) {
    const tipo = c.tipo === 'magia' ? 'Feitiço' : `Personagem (${c.arquetipo}) ${dadosTexto(c.ataque)} / ${c.vida}♥`;
    linhas.push(`| ${c.id} | **${c.nome}** | ${tipo} | ${c.custo} | ${c.copias} | ${c.raridade} | ${textoDaCarta(c).join(' ').replace(/\|/g, '/')} |`);
  }
  const m = MANAS.filter((x) => x.el === el);
  linhas.push('');
  linhas.push(`Mana: **${m[0].nome}** (+1, ×16) e **${m[1].nome}** (+2, ×4).`);
  linhas.push('');
}
fs.writeFileSync('docs/arcanos-cartas.md', linhas.join('\n'));
console.log('docs/arcanos-cartas.md gerado com', CARTAS.length, 'cartas');
