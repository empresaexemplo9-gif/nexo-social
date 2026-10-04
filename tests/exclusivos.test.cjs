process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(arquivo, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, Uint8Array, Uint8ClampedArray, Int32Array, Uint32Array, Float32Array, Map, Set, Math,
    require(nome) { if (!(nome in deps)) throw Error(nome); return deps[nome]; },
  });
  return exports;
}

const simples = (o) => JSON.parse(JSON.stringify(o));
const ex = load('lib/exclusivos.ts');
const rc = load('lib/recorte.ts');
const tipos = load('lib/aparencia-tipos.ts');
const middleware = fs.readFileSync('middleware.ts', 'utf8');
const colecao = new RegExp(middleware.match(/const COLECAO = \/(.+)\/;/)[1]);
const catalogo = fs.readFileSync('db/exclusivos-catalogo.sql', 'utf8');
const linhas = [...catalogo.matchAll(/^  \('((?:[^']|'')+)', '(\w+)', '((?:[^']|'')+)', '((?:[^']|'')*)', '([^']+)', (NULL|'[^']+'), (\d+)\)/gm)].map((m) => ({
  titulo: m[1], tipo: m[2], tema: m[3], edicao: m[4], caminho: m[5], mini: m[6] === 'NULL' ? null : m[6].slice(1, -1),
}));

test('coleção embutida: cada arquivo existe, no lugar do seu tema e tipo', () => {
  assert.equal(linhas.length, 141);
  for (const l of linhas) {
    for (const c of [l.caminho, l.mini].filter(Boolean)) {
      assert.ok(fs.existsSync(`public${c}`), c);
      assert.match(c, ex.CAMINHO_DA_COLECAO, c);
      assert.ok(colecao.test(c), `middleware libera ${c}`);
    }
    assert.equal(l.caminho.split('/')[3], ex.NOME_DO_TIPO[l.tipo].pasta, `${l.caminho} na pasta do tipo`);
    assert.equal(l.caminho.split('/')[2], ex.fatiar(l.tema), `${l.caminho} na pasta do tema`);
  }
  // Nada solto: todo arquivo de public/colecao está no catálogo.
  const usados = new Set(linhas.flatMap((l) => [l.caminho, l.mini]).filter(Boolean));
  const andar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? andar(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of andar('public/colecao')) assert.ok(usados.has(f.slice('public'.length).replace(/\\/g, '/')), `${f} fora do catálogo`);
});

test('coleção embutida: os planos de fundo de cada banda ficam todos (com miniatura)', () => {
  const fundos = linhas.filter((l) => l.tipo === 'wallpaper');
  assert.equal(fundos.length, 12);
  for (const f of fundos) assert.ok(f.mini, `${f.titulo} tem miniatura`);
  const porTema = (t) => fundos.filter((f) => f.tema === t).length;
  assert.equal(porTema('Linkin Park'), 2);
  assert.equal(porTema('System of a Down'), 2);
  assert.equal(linhas.filter((l) => l.tipo === 'button').length, 19);
  assert.equal(porTema('Gatinhos'), 3, 'os três formatos dos Gatinhos ficam');
  assert.deepEqual([...new Set(linhas.map((l) => l.tema))].sort(), ['DRAP · Inauguração', 'Gatinhos', 'Linkin Park', 'Nexo Social · Inauguração', 'System of a Down', 'Twenty One Pilots']);
});

test('itens por tema → tipo → edição, e o endereço certo de cada um', () => {
  const bucket = (p) => `https://abc.supabase.co/storage/v1/object/public/exclusivos/${p}`;
  assert.equal(ex.urlDoItem('/colecao/linkin-park/fundos/discografia.webp', bucket), '/colecao/linkin-park/fundos/discografia.webp');
  assert.equal(ex.urlDoItem('banda/adesivos/a-01.webp', bucket), bucket('banda/adesivos/a-01.webp'));
  assert.equal(ex.urlDoItem('../segredo', bucket), '');
  assert.equal(ex.urlDoItem('/colecao/../x.webp', bucket), '');
  const it = (id, kind, collection, edition) => ex.itemParaCliente({ id, kind, collection, edition, title: id, image_path: `t/${kind}/${id}.webp` }, bucket);
  const temas = ex.porTema([it('a', 'sticker', 'B', 'E1'), it('b', 'wallpaper', 'B', ''), it('c', 'sticker', 'A', ''), it('d', 'sticker', 'B', 'E2'), it('e', 'button', 'B', 'E1')]);
  assert.deepEqual(simples(temas.map((t) => t.tema)), ['B', 'A']);
  assert.deepEqual(simples(temas[0].tipos.map((k) => k.tipo)), ['wallpaper', 'sticker', 'button']);
  assert.deepEqual(simples(temas[0].tipos[1].edicoes.map((e) => e.edicao)), ['E1', 'E2']);
  assert.equal(ex.fatiar('DRAP · Inauguração'), 'drap-inauguracao');
});

/** Folha de mentira (RGBA): fundo `cor` e retângulos [x, y, w, h, [r, g, b]]. */
function folha(W, H, cor, pecas, alfaDoFundo = 255) {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) px.set([...cor, alfaDoFundo], i * 4);
  for (const [x, y, w, h, c] of pecas) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px.set([...c, 255], (yy * W + xx) * 4);
  return px;
}

test('recorte: folha de adesivos em fundo liso, na ordem de leitura', () => {
  const W = 400;
  const H = 300;
  const px = folha(W, H, [238, 236, 234], [
    [220, 30, 120, 100, [200, 30, 30]],
    [30, 40, 120, 90, [30, 30, 200]],
    [60, 170, 150, 100, [20, 160, 60]],
  ]);
  const pecas = rc.recortarAdesivos(px, W, H);
  assert.equal(pecas.length, 3);
  assert.deepEqual(simples(pecas.map((p) => [Math.round(p.x / 10), Math.round(p.y / 10)])), [[3, 4], [22, 3], [6, 17]]);
  const p = pecas[0];
  assert.equal(p.alfa[Math.floor(p.h / 2) * p.w + Math.floor(p.w / 2)], 255, 'miolo opaco');
  assert.equal(p.alfa[0], 0, 'canto (fundo) transparente');
});

test('recorte: folha transparente, papel branco do adesivo não vira fundo', () => {
  const W = 300;
  const H = 200;
  // Adesivo branco com desenho no meio, sobre fundo transparente.
  const px = folha(W, H, [0, 0, 0], [[20, 20, 110, 160, [252, 250, 246]], [170, 30, 100, 120, [252, 250, 246]], [50, 60, 50, 50, [10, 10, 10]]], 0);
  assert.ok(rc.temTransparencia(px, W, H));
  assert.equal(rc.recortarAdesivos(px, W, H).length, 2);
  // Folha opaca cinza: o papel branco (mais claro que a folha) é adesivo.
  const opaca = folha(W, H, [236, 234, 230], [[20, 20, 110, 160, [250, 249, 245]], [170, 30, 100, 120, [250, 249, 245]]]);
  assert.equal(rc.recortarAdesivos(opaca, W, H).length, 2);
});

test('recorte: folha em grade separa adesivos encostados', () => {
  const W = 300;
  const H = 200;
  const px = folha(W, H, [231, 231, 231], [[5, 5, 145, 90, [200, 40, 40]], [150, 5, 145, 90, [40, 40, 200]], [5, 105, 290, 90, [40, 160, 40]]]);
  assert.equal(rc.recortarAdesivos(px, W, H, { divisor: 1000 }).length, 2, 'encostados viram um só sem a grade');
  const grade = rc.recortarEmGrade(px, W, H, 2, 2);
  assert.equal(grade.length, 4);
  assert.ok(grade[0].x < 10 && grade[1].x >= 145, 'cada célula com o seu');
});

test('recorte: cartela de bottons acha cada círculo', () => {
  const W = 600;
  const H = 400;
  const px = new Uint8ClampedArray(W * H * 4);
  const centros = [[150, 120], [450, 120], [150, 290], [450, 290]];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dentro = centros.find(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= 80 ** 2);
      // Arte no botton e textura na cartela (suaves, como numa foto).
      const v = dentro ? 190 + 30 * Math.sin(x / 13) * Math.cos(y / 17) : 30 + 12 * Math.sin((x + 2 * y) / 9);
      px.set([v, dentro ? 120 : v, dentro ? 60 : v, 255], (y * W + x) * 4);
    }
  }
  const bottons = rc.recortarBottons(px, W, H, { quantidade: 4 });
  assert.equal(bottons.length, 4);
  bottons.forEach((b, i) => {
    const [cx, cy] = centros[i];
    assert.ok(Math.abs(b.x + b.w / 2 - cx) <= 6 && Math.abs(b.y + b.h / 2 - cy) <= 6, `centro do botton ${i + 1}`);
    assert.ok(Math.abs(b.w / 2 - 80) <= 8, `raio do botton ${i + 1}`);
  });
  assert.equal(rc.recortarBottons(px, W, H).length, 4, 'sem dizer quantos');
});

test('plano de fundo exclusivo: só na home ou em todas as abas, com endereço seguro', () => {
  const id = '11111111-2222-3333-4444-555555555555';
  const ok = tipos.formaDaAparencia({ exclusivo: { id, url: '/colecao/linkin-park/fundos/discografia.webp', escopo: 'home' } });
  assert.deepEqual(JSON.parse(JSON.stringify(ok.exclusivo)), { id, url: '/colecao/linkin-park/fundos/discografia.webp', escopo: 'home' });
  assert.equal(tipos.formaDaAparencia({ exclusivo: { id, url: '/colecao/linkin-park/fundos/discografia.webp' } }).exclusivo.escopo, 'todas');
  assert.ok(tipos.formaDaAparencia({ exclusivo: { id, url: 'https://abc.supabase.co/storage/v1/object/public/exclusivos/banda/fundos/a.webp', escopo: 'todas' } }).exclusivo);
  for (const url of ['javascript:alert(1)', 'https://mal.com/x.webp', '/colecao/a/adesivos/x.webp', '/colecao/../x.webp', 'https://abc.supabase.co/storage/v1/object/public/exclusivos/../chat/x', '"); }']) {
    assert.equal(tipos.formaDaAparencia({ exclusivo: { id, url, escopo: 'todas' } }).exclusivo, null, url);
  }
  assert.equal(tipos.APARENCIA_PADRAO.exclusivo, null);
  // O script do layout (antes de pintar) aceita os mesmos endereços.
  const layout = fs.readFileSync('app/layout.tsx', 'utf8');
  assert.ok(layout.includes(`localStorage.getItem('${tipos.CACHE_DO_FUNDO_EXCLUSIVO}')`));
  const css = fs.readFileSync('app/globals.css', 'utf8');
  assert.ok(css.includes("html[data-fundo-exclusivo='todas'] .parede-mural::before"));
  assert.ok(css.includes("html[data-fundo-exclusivo='home'] .tema-mural[data-area='inicio'] > .parede-mural::before"));
});

test('chat: adesivo e botton exclusivos usam só endereços da coleção ou do bucket', () => {
  const chat = load('lib/chat-exclusivos.ts', {
    'server-only': {},
    './chat-mensagens': { conteudoParaCliente: (row) => ({ kind: row.kind, body: '', mediaUrl: null, mediaPath: null, meta: row.media_meta }), validarMensagem: () => ({}) },
    './exclusivos': ex,
  });
  const msg = (url) => chat.conteudoParaClienteComExclusivos({ kind: 'adesivo', media_meta: { exclusiveUrl: url } }, new Map()).mediaUrl;
  assert.equal(msg('/colecao/linkin-park/adesivos/discografia-01.webp'), '/colecao/linkin-park/adesivos/discografia-01.webp');
  assert.equal(msg('https://abc.supabase.co/storage/v1/object/public/exclusivos/banda/adesivos/a.webp'), 'https://abc.supabase.co/storage/v1/object/public/exclusivos/banda/adesivos/a.webp');
  assert.equal(msg('https://mal.com/x.webp'), null);
  assert.equal(msg('/colecao/x/fundos/y.webp'), null, 'plano de fundo não vai no chat');
});

test('o middleware libera só as imagens da coleção', () => {
  for (const ruim of ['/colecao/../segredo.webp', '/colecao/a/b/c.webp', '/colecao/a/adesivos/x.webp.js', '/colecao/a/adesivos/X.webp', '/exclusivos']) {
    assert.ok(!colecao.test(ruim), ruim);
  }
});

test('aba Colecionáveis: no menu, com álbum de adesivos, painel de bottons e planos de fundo', () => {
  assert.match(fs.readFileSync('components/Navbar.tsx', 'utf8'), /href: '\/colecionaveis', label: 'Colecionáveis'/);
  const pagina = fs.readFileSync('components/colecionaveis/Colecionaveis.tsx', 'utf8');
  for (const trecho of ["id: 'adesivos'", "id: 'bottons'", "id: 'fundos'", 'album-pagina', 'painel-bottons', "id: 'home', rotulo: 'Só na home'", "id: 'todas', rotulo: 'Em todas as abas'"]) {
    assert.ok(pagina.includes(trecho), trecho);
  }
  assert.match(fs.readFileSync('app/exclusivos/page.tsx', 'utf8'), /redirect\('\/colecionaveis'\)/, 'o endereço antigo leva à aba');
  const css = fs.readFileSync('app/globals.css', 'utf8');
  for (const c of ['.album-pagina', '.painel-bottons', '.botton-preso']) assert.ok(css.includes(c), c);
  // O plano de fundo exclusivo vem depois de tudo no CSS (passa na frente dos muros).
  assert.ok(css.lastIndexOf("html[data-fundo-exclusivo='todas'] .parede-mural::before") > css.lastIndexOf('.tema-mural[data-parede='));
});

test('o superadministrador acha onde montar e enviar kits: no menu, nos Colecionáveis e na 1ª aba do painel', () => {
  const navbar = fs.readFileSync('components/Navbar.tsx', 'utf8');
  assert.match(navbar, /\{admin && \([\s\S]*href="\/admin\?aba=kits"[\s\S]*Montar e enviar kits/);
  const colecionaveis = fs.readFileSync('components/colecionaveis/Colecionaveis.tsx', 'utf8');
  assert.match(colecionaveis, /\{admin && \([\s\S]*href="\/admin\?aba=kits"/);
  const painel = fs.readFileSync('app/admin/page.tsx', 'utf8');
  assert.match(painel, /const ABAS[^=]*= \[\s*\{ tab: 'exclusivos', rotulo: '[^']*Montar e enviar kits', aba: 'kits' \}/, 'é a primeira aba');
  assert.match(painel, /useState<Tab>\('exclusivos'\)/, 'o painel abre nela');
  assert.match(painel, /activeTab === 'exclusivos' && <AdminExclusivos/);
});

test('montar o kit: um toque marca o item, sem nada aparecendo por cima (o iPhone engolia o toque)', () => {
  const painel = fs.readFileSync('components/AdminExclusivos.tsx', 'utf8');
  assert.ok(!/group-hover|group-focus-within/.test(painel), 'nada revelado ao passar o dedo ou o mouse');
  assert.match(painel, /className="kit-peca[^"]*"/);
  assert.match(painel, /onClick=\{\(\) => alternar\(setKit, \[i\.id\]\)\}\s*aria-pressed=\{no\}/);
  // Ocultar e Apagar só no modo de gerenciar, fora do botão de marcar.
  assert.match(painel, /\{gerenciar && \(\s*<span className="mt-1 grid grid-cols-2 gap-1">[\s\S]*?Ocultar[\s\S]*?Apagar/);
  assert.match(painel, /className="kit-barra /, 'no celular, a barra do kit leva até quem recebe');
  const css = fs.readFileSync('app/globals.css', 'utf8');
  for (const trecho of [".kit-peca[aria-pressed='true'] {", ".kit-peca[aria-pressed='true'] .kit-marca", '.kit-barra {']) assert.ok(css.includes(trecho), trecho);
});

test('adesivos e bottons exclusivos ficam animados no chat', () => {
  const conversa = fs.readFileSync('components/comunidade/chat/Conversa.tsx', 'utf8').replace(/\r\n/g, '\n');
  const inicio = conversa.indexOf("case 'adesivo':\n      // Animados");
  assert.ok(inicio > 0);
  const caso = conversa.slice(inicio, conversa.indexOf('default:', inicio));
  assert.match(caso, /className="adesivo-vivo adesivo-vivo--botton"/);
  assert.match(caso, /className="adesivo-vivo" style=\{\{ '--adesivo': `url\("/, 'o brilho usa a própria arte como máscara');
  const css = fs.readFileSync('app/globals.css', 'utf8');
  for (const k of ['adesivo-cola', 'adesivo-balanca', 'adesivo-brilho', 'botton-gira']) assert.ok(css.includes(`@keyframes ${k} {`), k);
  assert.match(css, /animation:\s*adesivo-cola[^;]*both,\s*adesivo-balanca[^;]*infinite;/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.adesivo-vivo,\s*\.adesivo-vivo::after \{\s*animation: none;/, 'respeita quem pediu menos movimento');
});

test('plano de fundo claro (Gatinhos) ganha mais cobertura no muro escuro; os escuros ficam como estão', () => {
  assert.equal(tipos.tomPelaLuz(0.72), 'claro');
  assert.equal(tipos.tomPelaLuz(0.41), 'escuro');
  // O tom medido fica no aparelho e o layout o aplica antes de pintar, só para a mesma imagem.
  assert.ok(fs.readFileSync('app/layout.tsx', 'utf8').includes(`localStorage.getItem('${tipos.CACHE_DO_TOM_DO_FUNDO}')`));
  assert.match(fs.readFileSync('app/layout.tsx', 'utf8'), /t\.url===f\.url&&\(t\.tom==='claro'\|\|t\.tom==='escuro'\)\)document\.documentElement\.dataset\.fundoTom=t\.tom/);
  const aplicar = fs.readFileSync('components/AplicarAparencia.tsx', 'utf8');
  assert.match(aplicar, /raiz\.dataset\.fundoTom = tom;/);
  assert.match(aplicar, /img\.crossOrigin = 'anonymous'/);
  const css = fs.readFileSync('app/globals.css', 'utf8');
  assert.ok(css.includes("html:not([data-muro='claro'])[data-fundo-tom='claro'][data-fundo-exclusivo='todas'] .parede-mural::after"));
  // Os Gatinhos: três formatos e dois bottons, no tema próprio.
  const gatos = linhas.filter((l) => l.tema === 'Gatinhos');
  assert.deepEqual(gatos.map((l) => l.tipo), ['wallpaper', 'wallpaper', 'wallpaper', 'button', 'button', 'button', 'button', 'button', 'sticker', 'sticker', 'sticker', 'sticker', 'sticker', 'sticker', 'sticker', 'sticker']);
});

test('recorte: folha com fundo em degradê, vinheta, xadrez de transparência falsa ou textura também se separa', () => {
  const W = 600;
  const H = 400;
  const ruido = (x, y) => (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1; // grão de -1 a 1
  const fundos = {
    liso: () => [226, 224, 220],
    degrade: (x, y) => { const t = (x / W) * 0.6 + (y / H) * 0.4; return [235 - 120 * t, 228 - 110 * t, 222 - 90 * t]; },
    vinheta: (x, y) => { const d = Math.hypot(x / W - 0.5, y / H - 0.5) / 0.7; return [245 - 150 * d * d, 240 - 150 * d * d, 236 - 140 * d * d]; },
    xadrez: (x, y) => ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? [255, 255, 255] : [204, 204, 204]),
    textura: (x, y) => { const n = ruido(x, y) * 34; return [190 + n, 168 + n, 132 + n]; },
  };
  const esperado = { liso: 'liso', degrade: 'degrade', vinheta: 'degrade', xadrez: 'xadrez', textura: 'degrade' };
  for (const [nome, fundo] of Object.entries(fundos)) {
    // 2 × 3 adesivos: borda branca de recorte e arte colorida.
    const px = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let cor = fundo(x, y);
        for (let k = 0; k < 6; k++) {
          const cx = (W * ((k % 3) + 0.5)) / 3;
          const cy = (H * (Math.floor(k / 3) + 0.5)) / 2;
          const d = Math.hypot(x - cx, y - cy);
          if (d <= 66) cor = d <= 58 ? [40 + 30 * k, 90 + 20 * Math.sin(x / 7), 200 - 25 * k] : [252, 251, 248];
        }
        px.set([...cor.map((v) => Math.max(0, Math.min(255, Math.round(v)))), 255], (y * W + x) * 4);
      }
    }
    assert.equal(rc.modeloDoFundo(px, W, H).tipo, esperado[nome], `fundo ${nome}`);
    const pecas = rc.recortarAdesivos(px, W, H);
    assert.equal(pecas.length, 6, `${nome}: seis adesivos`);
    for (const p of pecas) assert.ok(p.w < W / 3 && p.h < H / 2, `${nome}: cada peça é um adesivo, não a folha`);
  }
  // O painel avisa quando o fundo não foi achado, em vez de devolver a folha inteira como um adesivo.
  assert.match(fs.readFileSync('components/AdminExclusivos.tsx', 'utf8'), /pecas\.length === 1 && pecas\[0\]\.w \* pecas\[0\]\.h >= W \* H \* 0\.97/);
});
