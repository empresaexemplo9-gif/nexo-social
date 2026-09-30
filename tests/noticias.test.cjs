process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText, {
    exports, URL, URLSearchParams, TextDecoder, Uint8Array, Date, AbortSignal, console,
    require(name) { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, ...globals,
  });
  return exports;
}
const parser = load('lib/noticias-parser.ts');
const fonte = { nome: 'Fonte Teste', site: 'https://exemplo.com.br', feed: 'https://exemplo.com.br/feed/' };
const simples = (o) => JSON.parse(JSON.stringify(o));

test('RSS: CDATA, entities, media:content, WordPress footer and scripts', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Fonte</title><link>https://exemplo.com.br</link>
<item>
  <title><![CDATA[Café &amp; música: o “novo” álbum]]></title>
  <link>https://exemplo.com.br/musica/novo-album?utm_source=rss&amp;id=7</link>
  <pubDate>Tue, 29 Sep 2026 20:47:16 -0300</pubDate>
  <category><![CDATA[Música]]></category>
  <description><![CDATA[<p>Disco <b>novo</b> da banda&nbsp;chega hoje&hellip;</p><script>alert("x")</script><p>O post <a href="https://exemplo.com.br/x">Café</a> apareceu primeiro em <a href="https://exemplo.com.br">Fonte</a>.</p>]]></description>
  <media:content url="https://img.exemplo.com.br/capa.jpg?w=1200&amp;h=675" medium="image" width="1200" height="675"/>
</item>
</channel></rss>`;
  const [n, ...resto] = simples(parser.lerFeed(xml, fonte));
  assert.equal(resto.length, 0);
  assert.equal(n.titulo, 'Café & música: o “novo” álbum');
  assert.equal(n.resumo, 'Disco novo da banda chega hoje…');
  assert.equal(n.link, 'https://exemplo.com.br/musica/novo-album?id=7');
  assert.equal(n.imagem, 'https://img.exemplo.com.br/capa.jpg?w=1200&h=675');
  assert.equal(n.publicadaEm, '2026-09-29T23:47:16.000Z');
  assert.equal(n.fonte, 'Fonte Teste');
  assert.equal(n.site, 'https://exemplo.com.br');
  assert.ok(n.id && n.id === parser.idDaNoticia(n.link));
});

test('Atom: alternate link, escaped HTML summary, published date and Blogger thumbnail upgrade', () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<link rel='alternate' href='https://blog.exemplo.com/'/>
<entry>
  <title type="html">Análise: jogo &lt;i&gt;novo&lt;/i&gt;</title>
  <link rel="replies" href="https://blog.exemplo.com/comentarios"/>
  <link rel='alternate' type='text/html' href='https://blog.exemplo.com/2026/09/analise.html' title='x'/>
  <published>2026-09-29T08:00:00-03:00</published>
  <updated>2026-09-30T08:00:00-03:00</updated>
  <summary type="html">&lt;p&gt;Um &lt;a href="x"&gt;texto&lt;/a&gt; &amp;amp; mais&lt;/p&gt;</summary>
  <media:thumbnail xmlns:media="http://search.yahoo.com/mrss/" url="https://blogger.googleusercontent.com/img/b/abc/s72-w640-h360-c/capa.jpg" height="72" width="72"/>
</entry></feed>`;
  const [n] = simples(parser.lerFeed(xml, fonte));
  assert.equal(n.titulo, 'Análise: jogo novo');
  assert.equal(n.link, 'https://blog.exemplo.com/2026/09/analise.html');
  assert.equal(n.resumo, 'Um texto & mais');
  assert.equal(n.publicadaEm, '2026-09-29T11:00:00.000Z');
  assert.equal(n.imagem, 'https://blogger.googleusercontent.com/img/b/abc/s1200/capa.jpg');
});

test('unsafe links and images are rejected; scripts never reach the summary', () => {
  const item = (link, extra = '') => `<item><title>Item ${link.length}</title><link>${link}</link><pubDate>Tue, 29 Sep 2026 12:00:00 GMT</pubDate>${extra}</item>`;
  const xml = `<rss><channel>
${item('javascript:alert(1)')}
${item(' JaVaScRiPt:alert(document.cookie)')}
${item('data:text/html;base64,PHNjcmlwdD4=')}
<item><title>Sem data</title><link>https://exemplo.com.br/sem-data</link></item>
${item('https://exemplo.com.br/boa', `
  <media:content url="javascript:alert(1)" medium="image"/>
  <media:content url="https://cdn.exemplo.com.br/video.mp4" medium="video"/>
  <description>&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;Texto &lt;img src="data:image/png;base64,AAAA"&gt;&lt;img src="https://exemplo.com.br/pixel.png" width="1" height="1"&gt;&lt;img src="https://exemplo.com.br/logo.svg"&gt;&lt;img src="http://exemplo.com.br/foto.jpg"&gt;&lt;a href="javascript:alert(1)"&gt;seguro&lt;/a&gt;</description>`)}
</channel></rss>`;
  const itens = simples(parser.lerFeed(xml, fonte));
  assert.equal(itens.length, 1);
  const [n] = itens;
  assert.equal(n.link, 'https://exemplo.com.br/boa');
  assert.equal(n.resumo, 'Texto seguro');
  assert.doesNotMatch(n.resumo, /script|alert/);
  assert.equal(n.imagem, 'https://exemplo.com.br/foto.jpg');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd', '//']) assert.equal(parser.urlSegura(bad), null);
  assert.equal(parser.urlSegura('/materia', 'https://exemplo.com.br/feed/'), 'https://exemplo.com.br/materia');
});

test('Latin-1 feeds, Portuguese dates, feed redirects and long summaries', () => {
  const longo = 'palavra '.repeat(80);
  const bytes = new Uint8Array(Buffer.from(`<?xml version="1.0" encoding="ISO-8859-1" ?><rss version="0.91"><channel>
<item><title>Ação é notícia</title><link>https://feeds.folha.uol.com.br/redir/online/comida/rss091/*https://www1.folha.uol.com.br/comida/2026/09/x.shtml</link>
<pubDate>Ter, 29 Set 2026 23:49:30 -0300</pubDate><description>${longo}</description></item></channel></rss>`, 'latin1'));
  const [n] = simples(parser.lerFeed(parser.textoDoFeed(bytes, 'text/xml'), fonte));
  assert.equal(n.titulo, 'Ação é notícia');
  assert.equal(n.link, 'https://www1.folha.uol.com.br/comida/2026/09/x.shtml');
  assert.equal(n.publicadaEm, '2026-09-30T02:49:30.000Z');
  assert.ok(n.resumo.length <= 280 && n.resumo.endsWith('…') && !n.resumo.includes('  '));
  assert.equal(parser.lerData('26 Sep 2026 23:00:00 -0300'), Date.parse('2026-09-27T02:00:00Z'));
  assert.equal(parser.lerData('não é data'), null);
});

test('source filter and exclusion look at link, categories and title', () => {
  const item = (slug, cat) => `<item><title>Título ${slug}</title><link>https://exemplo.com.br/${slug}</link><category>${cat}</category><pubDate>Tue, 29 Sep 2026 12:00:00 GMT</pubDate></item>`;
  const xml = `<rss><channel>${item('musica/show', 'Shows')}${item('tv/novela', 'TV')}${item('musica/previsao-do-tempo', 'Clima')}${item('outra', 'Filmes')}</channel></rss>`;
  const itens = simples(parser.lerFeed(xml, { ...fonte, filtro: /\/musica\/|(^|· )Filmes( ·|$)/m, excluir: /previsao-do-tempo/g }));
  assert.deepEqual(itens.map((n) => n.link), ['https://exemplo.com.br/musica/show', 'https://exemplo.com.br/outra']);
  // Regex com /g não pode alternar resultado entre chamadas.
  assert.equal(parser.lerFeed(xml, { ...fonte, filtro: /\/musica\//g }).length, 2);
  assert.equal(parser.lerFeed(xml, { ...fonte, filtro: /\/musica\//g }).length, 2);
});

test('merging drops old and duplicate news, caps each outlet and alternates outlets', () => {
  const agora = Date.parse('2026-09-30T12:00:00Z');
  const noticia = (fonte, i, horas, titulo = `Notícia número ${i} da fonte ${fonte}`) => ({
    id: `${fonte}${i}`, titulo, resumo: '', link: `https://${fonte}.exemplo.com/${i}`, imagem: null, fonte, site: '', publicadaEm: new Date(agora - horas * 3600_000).toISOString(),
  });
  const a = Array.from({ length: 6 }, (_, i) => noticia('a', i, 1 + i * 0.1));
  const b = Array.from({ length: 6 }, (_, i) => noticia('b', i, 2 + i * 0.1));
  const c = Array.from({ length: 6 }, (_, i) => noticia('c', i, 3 + i * 0.1));
  const r = simples(parser.juntarNoticias([a, b, c], { agora, limite: 9 }));
  assert.equal(r.length, 9);
  for (const f of ['a', 'b', 'c']) assert.equal(r.filter((n) => n.fonte === f).length, 3);
  assert.notEqual(r[0].fonte, r[1].fonte);
  assert.equal(r[0].id, 'a0');

  const repetida = { ...noticia('b', 9, 5, 'Notícia número 0 da fonte a'), link: 'https://b.exemplo.com/outra' };
  const mesmoLink = { ...noticia('c', 8, 6), link: 'https://www.a.exemplo.com/0/' };
  const velha = noticia('c', 7, 22 * 24);
  const futura = noticia('c', 6, -48);
  const adiantada = noticia('c', 5, -0.5);
  const juntas = simples(parser.juntarNoticias([[a[0]], [repetida], [mesmoLink, velha, futura, adiantada]], { agora }));
  assert.deepEqual(juntas.map((n) => n.id), ['c5', 'a0']);
  assert.equal(juntas[0].publicadaEm, new Date(agora).toISOString());
});

test('theme news ignore failing, non-feed and oversized sources', async () => {
  const rss = `<rss><channel><item><title>Notícia boa</title><link>https://a.test/1</link><pubDate>${new Date(Date.now() - 3600_000).toUTCString()}</pubDate></item>
<item><title>Notícia velha</title><link>https://a.test/2</link><pubDate>${new Date(Date.now() - 40 * 86400_000).toUTCString()}</pubDate></item></channel></rss>`;
  const pedidos = [];
  const noticias = load('lib/noticias.ts', {
    'server-only': {}, 'next/cache': { unstable_cache: (fn) => fn }, './noticias-parser': parser,
    './noticias-fontes': { FONTES_DE_NOTICIA: { tecnologia: ['a', 'b', 'c', 'd'].map((x) => ({ nome: x.toUpperCase(), site: `https://${x}.test`, feed: `https://${x}.test/feed` })) } },
  }, { Response, fetch: async (url, opcoes) => {
    pedidos.push({ url, agente: opcoes.headers['User-Agent'], sinal: !!opcoes.signal });
    if (url.startsWith('https://a.')) return new Response(rss, { headers: { 'content-type': 'application/rss+xml' } });
    if (url.startsWith('https://b.')) throw Error('offline');
    if (url.startsWith('https://c.')) return new Response('<html><title>One moment, please...</title></html>');
    return new Response('<rss>' + 'x'.repeat(2_100_000) + '</rss>');
  } });
  const r = simples(await noticias.noticiasDoTema('tecnologia'));
  assert.deepEqual(r.itens.map((n) => n.titulo), ['Notícia boa']);
  assert.deepEqual(r.fontes.map((f) => f.ok), [true, false, false, false]);
  assert.equal(pedidos.length, 4);
  assert.ok(pedidos.every((p) => p.sinal && p.agente === 'nexo-social/1.0 (+https://nexo-social.drap.app.br; noticias)'));
});

test('news API validates the theme and is cacheable at the edge', async () => {
  let chamado = null;
  const api = load('app/api/noticias/route.ts', {
    'next/server': { NextResponse },
    '@/lib/data': { TOPICS: [{ slug: 'moda' }, { slug: 'bem-estar' }] },
    '@/lib/noticias': { noticiasDoTema: async (tema) => { chamado = tema; return { itens: [], fontes: [] }; } },
  });
  for (const tema of ['', 'inexistente', '__proto__', 'moda%00']) {
    const res = await api.GET(new Request(`https://nexo.example/api/noticias?tema=${tema}`));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Tema inválido.');
  }
  assert.equal(chamado, null);
  const res = await api.GET(new Request('https://nexo.example/api/noticias?tema=bem-estar'));
  assert.equal(res.status, 200);
  assert.equal(chamado, 'bem-estar');
  assert.match(res.headers.get('cache-control'), /s-maxage=600/);
});
