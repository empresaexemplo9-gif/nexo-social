process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText, {
    exports, URL, URLSearchParams, TextDecoder, Date, console,
    require(name) { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
  });
  return exports;
}
const parser = load('lib/noticias-parser.ts');
const m = load('lib/revista-montagem.ts', { './noticias-parser': parser });
const wt = load('lib/wiki-texto.ts');
const pauta = load('lib/historicas-pauta.ts');
const moda = load('lib/ingressos-moda.ts');
const simples = (o) => JSON.parse(JSON.stringify(o));

const AGORA = Date.parse('2026-10-01T15:00:00Z');
let seq = 0;
function noticia(o) {
  const link = o.link ?? `https://exemplo.com.br/n/${++seq}`;
  return {
    id: parser.idDaNoticia(link), titulo: o.titulo, resumo: o.resumo ?? '', link, imagem: o.imagem ?? null,
    fonte: o.fonte ?? 'g1', site: 'https://exemplo.com.br', publicadaEm: o.em ?? '2026-10-01T12:00:00Z',
  };
}
const nomes = (t) => simples(m.nomesProprios(t).map((x) => x.texto));

// ---------------------------------------------------------------------------
// Nomes próprios

test('nomes próprios: conectores, vírgula, artigo, ano e maiúscula de começo de frase', () => {
  assert.ok(nomes('Show de Taylor Swift no Rio de Janeiro tem ingressos esgotados').includes('Taylor Swift'));
  assert.deepEqual(
    nomes('O Agente Secreto, de Kleber Mendonça Filho, é escolhido para o Oscar').filter((x) => !x.startsWith('O ')),
    ['Agente Secreto', 'Kleber Mendonça Filho', 'Oscar'],
  );
  assert.ok(nomes('Rock in Rio 2026: veja os horários').includes('Rock in Rio'));
  assert.ok(nomes('Em São Paulo, Bienal do Livro recebe 600 mil visitantes').includes('Bienal do Livro'));
  assert.ok(!nomes('Em São Paulo, Bienal do Livro recebe 600 mil visitantes').some((x) => x.startsWith('Em ')));
  assert.ok(nomes('Cantora Anitta anuncia turnê pela Europa').includes('Anitta'));

  const fortes = (titulo, resumo = '') => Array.from(m.nomesDaNoticia({ titulo, resumo }).fortes);
  // Maiúscula só de começo de frase não é nome com certeza; no resumo, no meio da frase, é.
  assert.deepEqual(fortes('Anitta lança clipe gravado em casa'), []);
  assert.deepEqual(fortes('Anitta lança clipe gravado em casa', 'O clipe de Anitta saiu hoje.'), ['anitta']);
  // Genérico e substantivo comum sozinho não contam.
  assert.deepEqual(fortes('A Netflix confirma terceira temporada de Round 6'), ['round 6']);
  // Título Em Caixa Alta Em Toda Palavra: nada ali é nome. Manchete cheia de nomes não é caixa de título.
  assert.deepEqual(fortes('Banda Anuncia Novo Disco Para O Verão'), []);
  const cheia = fortes('Kleber Mendonça Filho comemora indicação de O Agente Secreto');
  assert.ok(cheia.includes('kleber mendonca filho') && cheia.includes('o agente secreto'), cheia.join());
});

// ---------------------------------------------------------------------------
// Agrupar por assunto

test('agrupa a mesma notícia em veículos diferentes e separa o que não tem a ver', () => {
  const a = noticia({ titulo: 'Taylor Swift anuncia shows no Brasil em 2027', fonte: 'g1', em: '2026-10-01T10:00:00Z' });
  const b = noticia({ titulo: 'Turnê de Taylor Swift terá duas datas em São Paulo', fonte: 'Folha', imagem: 'https://img.exemplo.com.br/ts.jpg', resumo: 'x'.repeat(130), em: '2026-10-01T09:00:00Z' });
  const c = noticia({ titulo: 'Festival de Cannes divulga júri', fonte: 'Estadão', em: '2026-10-01T11:00:00Z' });
  const d = noticia({ titulo: 'Ingressos para Taylor Swift: veja preços', fonte: 'Estadão', em: '2026-09-30T20:00:00Z' });
  const e = noticia({ titulo: 'O Agente Secreto, de Kleber Mendonça Filho, vai disputar o Oscar', fonte: 'g1', em: '2026-10-01T08:00:00Z' });
  const f = noticia({ titulo: 'Kleber Mendonça Filho comemora indicação de O Agente Secreto', fonte: 'CinePOP', em: '2026-10-01T07:00:00Z' });
  assert.equal(m.agruparPorAssunto([e, f]).length, 1);
  const grupos = m.agruparPorAssunto([a, b, c, d]);
  assert.equal(grupos.length, 2);
  const ts = grupos.find((g) => g.some((n) => n.id === a.id));
  assert.equal(ts.length, 3);
  // A principal é a que tem foto e resumo.
  assert.equal(ts[0].id, b.id);
  // Pedida pelo endereço, a notícia vira a principal do grupo dela.
  assert.equal(m.grupoDaNoticia([a, b, c, d], d.id)[0].id, d.id);
  assert.equal(m.grupoDaNoticia([a, b, c, d], 'naoexiste'), null);
  // Na capa, o assunto com mais veículos vem antes.
  assert.equal(m.ordenarGrupos(grupos, AGORA)[0].length, 3);
});

test('o assunto do grupo: o nome mais citado, o composto antes das partes', () => {
  const g = [
    noticia({ titulo: 'Show de Taylor Swift no Rio tem ingressos esgotados' }),
    noticia({ titulo: 'Taylor Swift chega ao Brasil nesta semana', fonte: 'Folha' }),
  ];
  const c = m.candidatosAoAssunto(g, 'musica');
  assert.equal(c[0], 'Taylor Swift');
  assert.ok(!c.includes('Show'));
  assert.ok(!c.includes('Rio'));
  // Em Viagem, lugar é assunto.
  assert.ok(m.candidatosAoAssunto([noticia({ titulo: 'Voos para Portugal ficam mais baratos' })], 'viagem').includes('Portugal'));
  assert.ok(!m.candidatosAoAssunto([noticia({ titulo: 'Voos para Portugal ficam mais baratos' })], 'cinema').includes('Portugal'));
});

test('o verbete tem de combinar com o tema ou com as notícias', () => {
  const anitta = { titulo: 'Anitta', descricao: 'cantora brasileira', resumo: 'Larissa de Macedo Machado, conhecida como Anitta, é uma cantora, compositora, atriz e empresária brasileira.' };
  assert.equal(m.verbeteCombina(anitta, [{ titulo: 'Anitta anuncia turnê', resumo: '' }], 'musica', 'Anitta'), true);
  const molusco = { titulo: 'Lula', descricao: 'molusco cefalópode', resumo: 'As lulas são moluscos cefalópodes marinhos da ordem Teuthida, com corpo alongado e dez braços.' };
  assert.equal(m.verbeteCombina(molusco, [{ titulo: 'Lula sanciona lei de incentivo à cultura', resumo: 'A lei amplia o fomento a museus e teatros.' }], 'cultura', 'Lula'), false);
  assert.equal(m.verbeteCombina({ titulo: 'Lista de filmes de 2026', descricao: null, resumo: 'filme filme filme' }, [], 'cinema', 'Filmes de 2026'), false);
  // Nome composto precisa de menos prova.
  const cannes = { titulo: 'Festival de Cannes', descricao: 'festival de cinema na França', resumo: 'O Festival de Cannes é um dos mais prestigiados festivais de cinema do mundo.' };
  assert.equal(m.verbeteCombina(cannes, [{ titulo: 'Festival de Cannes divulga júri', resumo: '' }], 'cinema', 'Festival de Cannes'), true);
});

// ---------------------------------------------------------------------------
// Página do veículo

test('lê a foto grande (og:image) e a descrição do <head> da matéria', () => {
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <meta content="https://cdn.exemplo.com.br/wp-content/uploads/2026/10/capa-300x200.jpg" property="og:image">
    <meta property="og:image:width" content="1600"><meta property="og:image:height" content="900">
    <meta name="description" content="Resumo curto">
    <meta property="og:description" content="Show de &quot;estreia&quot; reúne 40 mil pessoas &amp; muda a agenda da cantora na América do Sul">
    <meta name="author" content="Fulana de Tal">
    </head><body><meta property="og:image" content="https://cdn.exemplo.com.br/outra.jpg"></body></html>`;
  const p = simples(m.lerPaginaDaMateria(html, 'https://exemplo.com.br/materia'));
  assert.deepEqual(p.foto, { url: 'https://cdn.exemplo.com.br/wp-content/uploads/2026/10/capa.jpg', largura: 1600, altura: 900 });
  assert.equal(p.descricao, 'Show de "estreia" reúne 40 mil pessoas & muda a agenda da cantora na América do Sul');
  assert.equal(p.autor, 'Fulana de Tal');

  // Logotipo/foto padrão do site não serve; vai para a próxima (twitter:image), relativa ao endereço.
  const padrao = `<head><meta property="og:image" content="/static/og-default.png"><meta name="twitter:image" content="/fotos/grande.jpg"></head>`;
  assert.equal(m.lerPaginaDaMateria(padrao, 'http://exemplo.com.br/a/b').foto.url, 'https://exemplo.com.br/fotos/grande.jpg');
  // Foto declarada pequena demais, ou nenhuma: sem foto.
  assert.equal(m.lerPaginaDaMateria('<head><meta property="og:image" content="https://x.com.br/a.jpg"><meta property="og:image:width" content="200"></head>', 'https://x.com.br').foto, null);
  assert.equal(m.lerPaginaDaMateria('<p>sem head</p>', 'https://x.com.br').foto, null);
  // Autor que é endereço não é nome.
  assert.equal(m.lerPaginaDaMateria('<head><meta name="author" content="https://x.com.br/autor"></head>', 'https://x.com.br').autor, null);
});

test('a página da matéria só é buscada no domínio do veículo', () => {
  assert.equal(m.podeBuscarPagina('https://g1.globo.com/pop-arte/musica/noticia/x.ghtml', 'https://g1.globo.com/pop-arte/musica/'), true);
  assert.equal(m.podeBuscarPagina('https://oglobo.globo.com/cultura/x', 'https://g1.globo.com/'), true); // mesmo grupo: globo.com
  assert.equal(m.podeBuscarPagina('https://agenciabrasil.ebc.com.br/cultura/x', 'https://agenciabrasil.ebc.com.br/cultura'), true);
  assert.equal(m.podeBuscarPagina('https://outro.com.br/x', 'https://ebc.com.br'), false);
  assert.equal(m.podeBuscarPagina('http://169.254.169.254/latest/meta-data', 'https://g1.globo.com/'), false);
  assert.equal(m.podeBuscarPagina('http://localhost:3000/x', 'https://g1.globo.com/'), false);
  assert.equal(m.podeBuscarPagina('https://g1.globo.com:8443/x', 'https://g1.globo.com/'), false);
  assert.equal(m.podeBuscarPagina('file:///etc/passwd', 'https://g1.globo.com/'), false);
});

test('a maior versão da foto que o endereço já entrega', () => {
  assert.equal(m.fotoMaior('http://site.com.br/wp-content/uploads/2026/foto-1024x683.webp'), 'https://site.com.br/wp-content/uploads/2026/foto.webp');
  assert.equal(m.fotoMaior('https://blogger.googleusercontent.com/img/b/R29v/s320/foto.jpg'), 'https://blogger.googleusercontent.com/img/b/R29v/s1600/foto.jpg');
  assert.equal(m.fotoMaior('https://i0.wp.com/site.com.br/foto.jpg?resize=300%2C200&ssl=1'), 'https://i0.wp.com/site.com.br/foto.jpg?ssl=1');
  assert.equal(m.fotoMaior('https://s2-g1.glbimg.com/abc=/1200x/smart/foto.jpg'), 'https://s2-g1.glbimg.com/abc=/1200x/smart/foto.jpg');
});

// ---------------------------------------------------------------------------
// Texto e matéria

test('"Por que está em pauta" conta notícias, veículos e datas', () => {
  const citam = [
    noticia({ titulo: 'a', fonte: 'g1', em: '2026-09-28T13:00:00Z' }),
    noticia({ titulo: 'b', fonte: 'Folha', em: '2026-09-30T13:00:00Z' }),
    noticia({ titulo: 'c', fonte: 'g1', em: '2026-10-01T13:00:00Z' }),
  ];
  assert.deepEqual(simples(m.porQueEstaEmPauta('Taylor Swift', 'Música', citam, 10, AGORA)), [
    'Taylor Swift está em 3 notícias de Música dos últimos 10 dias, de 2 veículos: g1 e Folha.',
    'A primeira saiu em 28 de setembro, por g1; a mais recente, em 1 de outubro, por g1.',
  ]);
  assert.match(m.porQueEstaEmPauta('Anitta', 'Música', [citam[0]], 10, AGORA)[0], /^Entre as notícias de Música dos últimos 10 dias, só g1 tratou de Anitta/);
  assert.deepEqual(simples(m.porQueEstaEmPauta('X', 'Música', [], 10, AGORA)), []);
  assert.equal(m.listaDeNomes(['g1', 'Folha', 'Estadão']), 'g1, Folha e Estadão');
  assert.equal(m.mencoes([noticia({ titulo: 'Show da ANITTA em Lisboa' }), noticia({ titulo: 'Anittaverso' })], 'Anitta').length, 1);
});

test('monta a matéria: foto da página, resumo mais completo, contexto, curiosidades e fontes', () => {
  const principal = noticia({ titulo: 'Taylor Swift anuncia shows no Brasil', fonte: 'Agência Brasil', imagem: 'https://img.ebc.com.br/feed-320.jpg', resumo: 'Cantora volta ao país.' });
  const outra = noticia({ titulo: 'Turnê de Taylor Swift terá duas datas', fonte: 'Folha', resumo: 'Datas em São Paulo.' });
  const entidade = {
    nome: 'Taylor Swift', titulo: 'Taylor Swift', descricao: 'cantora e compositora norte-americana', url: 'https://pt.wikipedia.org/wiki/Taylor_Swift',
    resumo: 'Taylor Alison Swift é uma cantora e compositora norte-americana.\nEla é conhecida por narrativas autobiográficas.',
    imagem: { url: 'https://upload.wikimedia.org/ts-1920.jpg', largura: 1920, altura: 1280, legenda: null, autor: 'Fulano', licenca: 'CC BY 3.0', pagina: 'https://commons.wikimedia.org/wiki/File:TS.jpg' },
    curiosidades: ['Em 2023, a turnê se tornou a de maior bilheteria da história.', 'Taylor Alison Swift é uma cantora e compositora norte-americana.'],
    linhaDoTempo: [{ ano: 2006, texto: 'a' }, { ano: 2014, texto: 'b' }, { ano: 2020, texto: 'c' }, { ano: 2023, texto: 'Em 2023, a turnê se tornou a de maior bilheteria da história.' }],
  };
  const pagina = { foto: { url: 'https://img.ebc.com.br/grande.jpg', largura: 1920, altura: 1080 }, descricao: 'A cantora volta ao país com dois shows em São Paulo e um no Rio, em março de 2027.', autor: 'Repórter' };
  const mat = simples(m.montarMateriaAtual({ tema: 'musica', rotuloDoTema: 'Música', grupo: [principal, outra], pagina, entidade, todas: [principal, outra], dias: 10, agora: AGORA }));
  assert.equal(mat.id, principal.id);
  assert.equal(mat.capa.url, 'https://img.ebc.com.br/grande.jpg');
  assert.equal(mat.capa.credito, 'Foto: Agência Brasil (CC BY 4.0)');
  assert.equal(mat.abertura, pagina.descricao);
  assert.equal(mat.linhaFina, 'Taylor Swift, cantora e compositora norte-americana.');
  assert.equal(mat.fonte.licenca, 'CC BY 4.0');
  assert.equal(mat.fonte.autor, 'Repórter');
  assert.equal(mat.repercussao.length, 1);
  assert.equal(mat.contexto.paragrafos.length, 2);
  // Curiosidade igual ao texto do "Para entender" não se repete.
  assert.deepEqual(mat.curiosidades, ['Em 2023, a turnê se tornou a de maior bilheteria da história.']);
  // A linha do tempo não repete a curiosidade.
  assert.deepEqual(mat.linhaDoTempo.map((l) => l.ano), [2006, 2014, 2020]);
  assert.match(mat.emPauta[0], /^Taylor Swift está em 2 notícias de Música/);
  assert.deepEqual(mat.fontes.map((f) => f.licenca), ['CC BY 4.0', 'título e resumo citados', 'CC BY-SA 4.0', 'CC BY 3.0']);

  // Sem a página: a foto do feed (ampliada); sem nenhuma foto de veículo: a do verbete, como imagem de arquivo.
  const semPagina = m.montarMateriaAtual({ tema: 'musica', rotuloDoTema: 'Música', grupo: [outra], pagina: null, entidade: null, todas: [outra], dias: 10, agora: AGORA });
  assert.equal(semPagina.capa, null);
  assert.equal(semPagina.contexto, null);
  assert.equal(semPagina.abertura, 'Datas em São Paulo.');
  const soVerbete = m.montarMateriaAtual({ tema: 'musica', rotuloDoTema: 'Música', grupo: [outra], pagina: null, entidade, todas: [outra], dias: 10, agora: AGORA });
  assert.match(soVerbete.capa.credito, /^Imagem de arquivo: Fulano, CC BY 3.0$/);
  assert.equal(soVerbete.contexto.imagem, null); // a mesma foto não aparece duas vezes
});

test('a edição: só matéria com foto, capa com foto grande e um "Você sabia?" por assunto', () => {
  const base = (titulo, capa, curiosidades = [], contexto = null) => ({
    tema: 'musica', id: parser.idDaNoticia(titulo), titulo, linhaFina: null, abertura: `${titulo}. `.repeat(10),
    fonte: { nome: 'g1', site: '', link: `https://g1.globo.com/${titulo}`, publicadaEm: '2026-10-01T10:00:00Z', autor: null, licenca: null },
    capa, emPauta: [], repercussao: [{ fonte: 'Folha', titulo: 'x', resumo: '', link: 'https://f', publicadaEm: '2026-10-01T10:00:00Z' }],
    contexto, curiosidades, linhaDoTempo: [], leituraMin: 2, fontes: [], montadaEm: '',
  });
  const foto = (largura) => ({ url: `https://img/${largura}.jpg`, largura, altura: null, credito: '', pagina: null });
  const ctx = (nome) => ({ nome, titulo: nome, descricao: null, paragrafos: [], url: '', imagem: null });
  const ed = simples(m.montarEdicao('musica', [
    base('sem foto', null, ['c0'], ctx('Z')),
    base('foto pequena', foto(600), ['c1', 'c1b'], ctx('A')),
    base('foto grande', foto(1600), ['c2'], ctx('B')),
    base('sem tamanho', foto(null), [], null),
  ], [], AGORA));
  assert.equal(ed.capa.titulo, 'foto grande');
  assert.deepEqual(ed.chamadas.map((c) => c.titulo), ['foto pequena', 'sem tamanho']);
  assert.deepEqual(ed.vocesabia.map((v) => `${v.de}:${v.texto}`), ['A:c1', 'B:c2', 'A:c1b']);
  assert.equal(ed.capa.veiculos, 2);
  assert.deepEqual(ed.fontes, ['g1', 'Folha']);
});

test('textos do verbete: seções, curiosidades e linha do tempo', () => {
  const texto = 'Abertura do verbete com o essencial sobre o assunto em uma frase longa o bastante.\n== Carreira ==\nEm 1999, lançou o primeiro disco, que vendeu um milhão de cópias no Brasil inteiro. Em 2010, fez a maior turnê da carreira, com shows em quarenta cidades do país.\n== Referências ==\nx';
  const { abertura, secoes } = wt.dividirSecoes(texto);
  assert.equal(secoes.length, 1);
  assert.equal(secoes[0].titulo, 'Carreira');
  assert.equal(wt.garimparCuriosidades(secoes, abertura.join(' ')).length, 2);
  assert.deepEqual(simples(wt.montarLinhaDoTempo(secoes, abertura.join(' '))).map((x) => x.ano), [1999, 2010]);
});

// ---------------------------------------------------------------------------
// As duas abas

test('Revista e Matérias históricas: rotas, links antigos e navegação', () => {
  // A matéria histórica mudou de endereço; o antigo redireciona.
  assert.ok(fs.existsSync('app/historicas/page.tsx'));
  assert.ok(fs.existsSync('app/historicas/[tema]/[slug]/page.tsx'));
  assert.ok(!fs.existsSync('app/revista/[tema]/[slug]'));
  const nova = fs.readFileSync('app/revista/[tema]/[id]/page.tsx', 'utf8');
  assert.match(nova, /pautaPorSlug\(tema as CategorySlug, id\)\) permanentRedirect\(`\/historicas\/\$\{tema\}\/\$\{id\}`\)/);
  // Links de moda para a matéria do evento apontam para uma histórica que existe.
  for (const e of moda.EVENTOS_DE_MODA.filter((e) => e.materia)) assert.ok(pauta.pautaPorSlug('moda', e.materia), e.materia);
  assert.match(fs.readFileSync('components/OndeComprarModa.tsx', 'utf8'), /href=\{`\/historicas\/moda\/\$\{e\.materia\}`\}/);
  // As duas abas no menu.
  const menu = fs.readFileSync('components/Navbar.tsx', 'utf8');
  assert.match(menu, /href: '\/revista', label: 'Revista'/);
  assert.match(menu, /href: '\/historicas', label: 'Matérias históricas e curiosidades'/);
  // A Revista busca a edição atual; as históricas, a do acervo.
  assert.match(fs.readFileSync('components/revista/RevistaDoTema.tsx', 'utf8'), /fetch\(`\/api\/revista\?tema=/);
  assert.match(fs.readFileSync('components/historicas/HistoricasDoTema.tsx', 'utf8'), /fetch\(`\/api\/historicas\?tema=/);
  assert.match(fs.readFileSync('app/api/revista/route.ts', 'utf8'), /edicaoAtual/);
  assert.match(fs.readFileSync('app/api/historicas/route.ts', 'utf8'), /from '@\/lib\/historicas'/);
});
