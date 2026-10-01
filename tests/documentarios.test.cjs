process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(arquivo, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, Buffer, btoa, URLSearchParams, AbortSignal, console, Date, Map, Set, Promise,
    require(nome) { if (!(nome in deps)) throw Error(nome); return deps[nome]; },
  });
  return exports;
}

const doc = load('lib/documentarios.ts');
const yt = load('lib/youtube-aberto.ts', { 'server-only': {}, 'next/cache': { unstable_cache: (f) => f }, './midia': { decodificarEntidades: (s) => s } });

test('o filtro de 4K e HD da busca do YouTube (o mesmo protobuf da página)', () => {
  // Sem resolução, o `sp` de sempre.
  assert.equal(yt.filtroDaBusca('qualquer'), 'EgIQAQ%3D%3D');
  assert.equal(yt.filtroDaBusca('longo'), 'EgQQARgC');
  // Vídeo + longo (> 20 min) + 4K; e o mesmo com HD.
  assert.equal(decodeURIComponent(yt.filtroDaBusca('longo', '4k')), Buffer.from([0x12, 0x06, 0x10, 0x01, 0x18, 0x02, 0x70, 0x01]).toString('base64'));
  assert.equal(decodeURIComponent(yt.filtroDaBusca('longo', 'hd')), Buffer.from([0x12, 0x06, 0x10, 0x01, 0x18, 0x02, 0x20, 0x01]).toString('base64'));
  assert.equal(yt.filtroDaBusca('shorts', '4k'), yt.filtroDaBusca('shorts'));
});

test('a idade do vídeo pelo texto da página', () => {
  assert.equal(yt.idadeEmAnos('há 2 anos'), 2);
  assert.equal(yt.idadeEmAnos('Transmitido há 1 ano'), 1);
  assert.equal(yt.idadeEmAnos('há 6 meses'), 0.5);
  assert.equal(yt.idadeEmAnos('há 3 semanas'), 0);
  assert.equal(yt.idadeEmAnos('8 years ago'), 8);
  assert.equal(yt.idadeEmAnos(''), null);
  assert.equal(yt.idadeEmAnos('1,2 mi de visualizações'), null);
});

test('cada gênero vira um tema de documentário, com buscas em 4K', () => {
  const generos = [...fs.readFileSync('lib/taxonomy.ts', 'utf8').split('export const FILM_GENRES')[1].split('];')[0].matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(generos.length >= 12);
  for (const g of generos) {
    const t = doc.TEMAS_DOCUMENTAIS[g];
    assert.ok(t, `tema para ${g}`);
    assert.ok(t.termos.length >= 2 && t.termos.every((x) => /document/i.test(x)), `${g}: só documentários`);
  }
  assert.equal(doc.temaDocumental('nao-existe').rotulo, doc.TEMAS_DOCUMENTAIS.documentario.rotulo);
});

test('acervo antigo fica de fora', () => {
  for (const velho of ['Why We Fight: Divide and Conquer 1943', 'The Battle Of Midway (1942)', 'Filme mudo restaurado', 'Cinejornal da guerra', 'Documentário colorizado da Segunda Guerra']) {
    assert.ok(doc.PARECE_ANTIGO.test(velho), velho);
  }
  for (const novo of ['Sibéria: a vida no lugar mais frio do mundo | Documentário completo 4K', 'Planeta Terra III — episódio completo', 'Amazônia 2024: o rio voador']) {
    assert.ok(!doc.PARECE_ANTIGO.test(novo), novo);
  }
});

test('a aba de documentários não usa mais o acervo antigo do Internet Archive', () => {
  const gratis = fs.readFileSync('lib/gratis.ts', 'utf8');
  const filmes = gratis.slice(gratis.indexOf("if (p.area === 'filmes')"), gratis.indexOf("if (p.area === 'livros')"));
  assert.ok(!/buscarNoArchive|doArchive|feature_films/.test(filmes), 'nada do Archive nos filmes');
  assert.match(filmes, /documentariosAtuais/);
  assert.match(gratis, /buscarNoYoutubeAberto\(t, 'longo', 24, qualidade\)/);
  assert.match(gratis, /juntar\(await buscar\('4k'\), '4K'\)/);
  // E o filtro: completo (> 20 min), recente e sem cara de antigo.
  const serve = gratis.slice(gratis.indexOf('export function documentarioServe'), gratis.indexOf('/** Intercala'));
  assert.match(serve, /20 \* 60/);
  assert.match(serve, /IDADE_MAXIMA/);
  assert.match(serve, /PARECE_ANTIGO/);
});

test('a grade: 4K primeiro, completa com HD, sem antigos nem curtos', async () => {
  const pedidos = [];
  const video = (id, titulo, extra = {}) => ({ id, titulo, canal: 'Canal Doc', segundos: 3000, short: false, capa: '', anos: 1, preferenciaPt: 4, ...extra });
  const gratis = load('lib/gratis.ts', {
    'server-only': {},
    './livros-abertos': { livrosOpenLibrary: async () => [], livrosInternetArchive: async () => [] },
    './descoberta-musical': load('lib/descoberta-musical.ts', { 'server-only': {}, './taxonomy': {}, './youtube': {}, './youtube-aberto': {}, './spotify': {}, 'next/cache': { unstable_cache: (f) => f } }),
    './youtube': { isYoutubeConfigured: () => false, searchVideos: async () => [], searchVideosPelaApi: async () => [] },
    './youtube-aberto': {
      buscarNoYoutubeAberto: async (termo, filtro, max, qualidade) => {
        pedidos.push([termo, filtro, qualidade]);
        if (qualidade === '4k') return [video(`k${termo.length}a`, `Sibéria ${termo}`), video('velho1', 'The Battle of Midway 1942'), video('curto1', 'Trailer', { segundos: 120 })];
        return [video(`h${termo.length}b`, `Antártida ${termo}`), video('antigo2', 'Doc', { anos: 9 })];
      },
    },
    './documentarios': doc,
    './taxonomy': load('lib/taxonomy.ts'),
    './midia': { decodificarEntidades: (s) => s },
  });
  const r = await gratis.indicacoesGratis({ area: 'filmes', chave: 'fantasia-cine', estilo: 'classicos', idioma: 'pt', rodada: 0 });
  assert.equal(r.rotulo, 'Mundos gelados e submarinos');
  const ids = r.itens.map((i) => i.id);
  assert.ok(ids.length >= 4, `itens: ${ids}`);
  assert.ok(!ids.some((id) => /velho|curto|antigo/.test(id)), 'antigos, curtos e velhos ficam de fora');
  assert.ok(r.itens.slice(0, 3).every((i) => i.qualidade === '4K'), '4K primeiro');
  assert.ok(r.itens.some((i) => i.qualidade === 'HD'), 'HD completa');
  assert.ok(r.itens.every((i) => /maxresdefault/.test(i.capa) && i.fonte === 'YouTube' && i.ano === String(new Date().getFullYear() - 1)));
  assert.ok(pedidos.every(([, filtro]) => filtro === 'longo'), 'só completos (> 20 min)');
  assert.ok(pedidos.some(([, , q]) => q === '4k') && pedidos.some(([, , q]) => q === 'hd'));
});
