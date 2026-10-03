// Recorte automático das folhas de adesivos e das cartelas de bottons.
//
// Puro (sem DOM): recebe os pixels RGBA da folha e devolve cada peça, com o
// retângulo onde ela está e a máscara de transparência. O painel do
// superadministrador usa no navegador (canvas); o catálogo embutido em
// public/exclusivos foi recortado com estas mesmas funções.

export interface Peca {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Transparência de cada pixel do retângulo (w × h, 0 a 255). */
  alfa: Uint8ClampedArray;
}

type Pixels = Uint8ClampedArray | Uint8Array;

/** A cor do fundo: a mediana de cada canal na moldura de 1 px da folha. */
export function corDoFundo(px: Pixels, W: number, H: number): [number, number, number] {
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let n = 0;
  const conta = (i: number) => {
    hist[0][px[i]]++;
    hist[1][px[i + 1]]++;
    hist[2][px[i + 2]]++;
    n++;
  };
  for (let x = 0; x < W; x++) {
    conta(x * 4);
    conta(((H - 1) * W + x) * 4);
  }
  for (let y = 1; y < H - 1; y++) {
    conta(y * W * 4);
    conta((y * W + W - 1) * 4);
  }
  return hist.map((h) => {
    let soma = 0;
    for (let v = 0; v < 256; v++) {
      soma += h[v];
      if (soma * 2 >= n) return v;
    }
    return 255;
  }) as [number, number, number];
}

/**
 * Como é o fundo da folha, pixel a pixel. Quase sempre liso (a cor da
 * moldura). Quando a moldura não é de uma cor só, pode ser o xadrez da
 * "transparência" falsa das imagens geradas (duas cores claras alternando) ou
 * um degradê, vinheta ou textura de papel: aí vale uma superfície suave
 * ajustada à moldura, com a tolerância do grão que ela tem.
 */
export type ModeloDoFundo =
  | { tipo: 'liso'; cor: [number, number, number]; tolerancia: number }
  | { tipo: 'xadrez'; cores: [number, number, number][]; tolerancia: number }
  | { tipo: 'degrade'; coef: number[][]; tolerancia: number };

const distancia = (a: number[], r: number, g: number, b: number) => Math.hypot(a[0] - r, a[1] - g, a[2] - b);

/** Resolve o sistema linear `A·x = b` (eliminação de Gauss com pivô). */
function resolver(A: number[][], b: number[]) {
  const n = b.length;
  const M = A.map((l, i) => [...l, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(M[l][c]) > Math.abs(M[p][c])) p = l;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-9) continue;
    for (let l = 0; l < n; l++) {
      if (l === c) continue;
      const f = M[l][c] / M[c][c];
      for (let k = c; k <= n; k++) M[l][k] -= f * M[c][k];
    }
  }
  return M.map((l, i) => (Math.abs(l[i]) < 1e-9 ? 0 : l[n] / l[i]));
}

const termos = (u: number, v: number) => [1, u, v, u * u, v * v, u * v];

export function modeloDoFundo(px: Pixels, W: number, H: number, tolerancia = 26): ModeloDoFundo {
  const cor = corDoFundo(px, W, H);
  // A moldura de 1 px e um anel 3 px para dentro.
  const am: number[][] = [];
  const pega = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    am.push([x, y, px[i], px[i + 1], px[i + 2]]);
  };
  for (const d of [0, Math.min(3, Math.floor(Math.min(W, H) / 4))]) {
    for (let x = d; x < W - d; x++) pega(x, d), pega(x, H - 1 - d);
    for (let y = d + 1; y < H - 1 - d; y++) pega(d, y), pega(W - 1 - d, y);
  }
  const parte = (f: (a: number[]) => boolean) => am.filter(f).length / am.length;
  if (parte((a) => distancia(cor, a[2], a[3], a[4]) < tolerancia) >= 0.7) return { tipo: 'liso', cor, tolerancia };

  // Xadrez: as duas cores mais comuns da moldura, claras e neutras, se alternando.
  const caixas = new Map<number, number[]>();
  for (const a of am) {
    const k = ((a[2] >> 4) << 8) | ((a[3] >> 4) << 4) | (a[4] >> 4);
    const c = caixas.get(k) ?? [0, 0, 0, 0];
    c[0] += a[2], c[1] += a[3], c[2] += a[4], c[3]++;
    caixas.set(k, c);
  }
  const top = Array.from(caixas.values()).sort((a, b) => b[3] - a[3]);
  if (top.length >= 2) {
    let cores = top.slice(0, 2).map((c) => [c[0] / c[3], c[1] / c[3], c[2] / c[3]]);
    for (let it = 0; it < 4; it++) {
      const soma = [[0, 0, 0, 0], [0, 0, 0, 0]];
      for (const a of am) {
        const k = distancia(cores[0], a[2], a[3], a[4]) <= distancia(cores[1], a[2], a[3], a[4]) ? 0 : 1;
        if (distancia(cores[k], a[2], a[3], a[4]) < tolerancia * 2) soma[k][0] += a[2], soma[k][1] += a[3], soma[k][2] += a[4], soma[k][3]++;
      }
      cores = cores.map((c, k) => (soma[k][3] ? [soma[k][0] / soma[k][3], soma[k][1] / soma[k][3], soma[k][2] / soma[k][3]] : c));
    }
    const de = (k: number) => parte((a) => distancia(cores[k], a[2], a[3], a[4]) < tolerancia);
    const neutra = (c: number[]) => Math.max(...c) - Math.min(...c) < 24 && 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 120;
    const entre = distancia(cores[0], cores[1][0], cores[1][1], cores[1][2]);
    // O xadrez troca de cor aos saltos (a cada quadradinho); a vinheta, aos poucos.
    let saltos = 0;
    const salta = (i: number, j: number) => distancia([px[i], px[i + 1], px[i + 2]], px[j], px[j + 1], px[j + 2]) > entre * 0.6;
    for (let x = 1; x < W; x++) if (salta(x * 4, (x - 1) * 4)) saltos++;
    for (let y = 1; y < H; y++) if (salta(y * W * 4, (y - 1) * W * 4)) saltos++;
    if (saltos >= 6 && de(0) >= 0.15 && de(1) >= 0.15 && de(0) + de(1) >= 0.8 && entre >= tolerancia && cores.every(neutra)) {
      return { tipo: 'xadrez', cores: cores.map((c) => c.map(Math.round)) as [number, number, number][], tolerancia };
    }
  }

  // Degradê, vinheta ou textura: superfície de 2º grau por canal, ajustada à
  // moldura em duas passadas (a 2ª sem o que destoa, como um adesivo encostado).
  let usar = am;
  let coef: number[][] = [];
  let erros: number[] = [];
  for (let passo = 0; passo < 2; passo++) {
    coef = [0, 1, 2].map((c) => {
      const A = Array.from({ length: 6 }, () => new Array(6).fill(0));
      const b = new Array(6).fill(0);
      for (const a of usar) {
        const t = termos(a[0] / W - 0.5, a[1] / H - 0.5);
        for (let i = 0; i < 6; i++) {
          b[i] += t[i] * a[2 + c];
          for (let j = 0; j < 6; j++) A[i][j] += t[i] * t[j];
        }
      }
      return resolver(A, b);
    });
    erros = am.map((a) => {
      const t = termos(a[0] / W - 0.5, a[1] / H - 0.5);
      const ref = coef.map((k) => k.reduce((s, v, i) => s + v * t[i], 0));
      return distancia(ref, a[2], a[3], a[4]);
    });
    const ordem = [...erros].sort((a, b) => a - b);
    const corte = Math.max(20, 2.5 * ordem[Math.floor(ordem.length / 2)]);
    usar = am.filter((_, i) => erros[i] <= corte);
  }
  const ordem = [...erros].sort((a, b) => a - b);
  const p80 = ordem[Math.floor(ordem.length * 0.8)];
  if (p80 < 60) return { tipo: 'degrade', coef, tolerancia: Math.max(tolerancia, Math.min(70, Math.round(p80 * 1.5 + 8))) };
  return { tipo: 'liso', cor, tolerancia };
}

/** Ordena as peças como se lê a folha: linha por linha, da esquerda para a direita. */
function emOrdemDeLeitura<T extends { x: number; y: number; w: number; h: number }>(pecas: T[]): T[] {
  if (pecas.length < 2) return pecas;
  const alturas = pecas.map((p) => p.h).sort((a, b) => a - b);
  const meia = alturas[Math.floor(alturas.length / 2)] / 2;
  const porY = [...pecas].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const linhas: T[][] = [];
  for (const p of porY) {
    const cy = p.y + p.h / 2;
    const linha = linhas[linhas.length - 1];
    if (linha && cy - (linha[0].y + linha[0].h / 2) < meia) linha.push(p);
    else linhas.push([p]);
  }
  return linhas.flatMap((l) => l.sort((a, b) => a.x - b.x));
}

/** Engorda uma máscara em `r` px (quadrado, em dois passos). */
function dilatar(m: Uint8Array, W: number, H: number, r: number) {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let ultimo = -1e9;
    for (let x = 0; x < W; x++) {
      if (m[y * W + x]) ultimo = x;
      if (x - ultimo <= r) tmp[y * W + x] = 1;
    }
    ultimo = 1e9;
    for (let x = W - 1; x >= 0; x--) {
      if (m[y * W + x]) ultimo = x;
      if (ultimo - x <= r) tmp[y * W + x] = 1;
    }
  }
  for (let x = 0; x < W; x++) {
    let ultimo = -1e9;
    for (let y = 0; y < H; y++) {
      if (tmp[y * W + x]) ultimo = y;
      if (y - ultimo <= r) out[y * W + x] = 1;
    }
    ultimo = 1e9;
    for (let y = H - 1; y >= 0; y--) {
      if (tmp[y * W + x]) ultimo = y;
      if (ultimo - y <= r) out[y * W + x] = 1;
    }
  }
  return out;
}

/** Tudo o que `livre` deixa passar, a partir das bordas da folha. */
function inundar(livre: Uint8Array, W: number, H: number) {
  const N = W * H;
  const marcado = new Uint8Array(N);
  const fila = new Int32Array(N);
  let ini = 0;
  let fim = 0;
  const semear = (i: number) => {
    if (!marcado[i] && livre[i]) {
      marcado[i] = 1;
      fila[fim++] = i;
    }
  };
  for (let x = 0; x < W; x++) {
    semear(x);
    semear((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    semear(y * W);
    semear(y * W + W - 1);
  }
  while (ini < fim) {
    const i = fila[ini++];
    const x = i % W;
    if (x > 0) semear(i - 1);
    if (x < W - 1) semear(i + 1);
    if (i >= W) semear(i - W);
    if (i < N - W) semear(i + W);
  }
  return marcado;
}

/** Rotula os pedaços de `m` (vizinhança de 8); devolve os rótulos e a área de cada um. */
function rotular(m: Uint8Array, W: number, H: number) {
  const N = W * H;
  const rotulo = new Int32Array(N);
  const areas: number[] = [0];
  const fila = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (!m[s] || rotulo[s]) continue;
    const id = areas.length;
    let area = 0;
    let ini = 0;
    let fim = 0;
    rotulo[s] = id;
    fila[fim++] = s;
    while (ini < fim) {
      const i = fila[ini++];
      const x = i % W;
      const y = (i - x) / W;
      area++;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if ((!dx && !dy) || xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (m[j] && !rotulo[j]) {
            rotulo[j] = id;
            fila[fim++] = j;
          }
        }
      }
    }
    areas.push(area);
  }
  return { rotulo, areas };
}

/** A folha já vem recortada (PNG/WEBP com transparência)? */
export function temTransparencia(px: Pixels, W: number, H: number) {
  let n = 0;
  for (let i = 0; i < W * H; i++) if (px[i * 4 + 3] < 16) n++;
  return n > W * H * 0.03;
}

/**
 * Folha de adesivos. Com transparência, cada adesivo é um pedaço opaco. Sem
 * ela, o fundo é uma cor lisa (branca, cinza, creme) e cada adesivo tem o
 * contorno recortado: tudo o que o fundo alcança a partir das bordas, sem
 * atravessar um contorno, é fundo; o resto, em pedaços ligados, são os
 * adesivos (pedacinhos menores que `minimo` da folha são sujeira).
 */
export function recortarAdesivos(
  px: Pixels,
  W: number,
  H: number,
  { tolerancia = 26, minimo = 0.004, divisor = 90 }: { tolerancia?: number; minimo?: number; divisor?: number } = {},
): Peca[] {
  const N = W * H;
  const transparente = temTransparencia(px, W, H);
  const dist = new Uint8Array(N);
  let fundo: Uint8Array;

  if (transparente) {
    fundo = new Uint8Array(N);
    for (let i = 0; i < N; i++) fundo[i] = px[i * 4 + 3] < 128 ? 1 : 0;
  } else {
    const modelo = modeloDoFundo(px, W, H, tolerancia);
    tolerancia = modelo.tolerancia;
    // A sombra que a folha desenha embaixo dos adesivos (cinza, um pouco mais
    // escura que o fundo) também é fundo — menos quando o fundo é branco puro,
    // em que o fio cinza do contorno é o que separa o adesivo da folha. O
    // papel do adesivo, mais claro que a folha, nunca é fundo (no fundo liso;
    // no degradê e na textura o grão do papel dá uma folga).
    const folga = modelo.tipo === 'liso' ? 6 : Math.round(tolerancia * 0.6);
    const pareceFundo = new Uint8Array(N);
    const ref = [0, 0, 0];
    const tv = modelo.tipo === 'degrade' ? new Float64Array(6) : null;
    for (let i = 0; i < N; i++) {
      const r = px[i * 4];
      const g = px[i * 4 + 1];
      const b = px[i * 4 + 2];
      if (modelo.tipo === 'liso') (ref[0] = modelo.cor[0]), (ref[1] = modelo.cor[1]), (ref[2] = modelo.cor[2]);
      else if (modelo.tipo === 'xadrez') {
        const [a, c] = modelo.cores;
        const k = distancia(a, r, g, b) <= distancia(c, r, g, b) ? a : c;
        (ref[0] = k[0]), (ref[1] = k[1]), (ref[2] = k[2]);
      } else if (tv) {
        const x = i % W;
        const u = x / W - 0.5;
        const v = (i - x) / W / H - 0.5;
        (tv[0] = 1), (tv[1] = u), (tv[2] = v), (tv[3] = u * u), (tv[4] = v * v), (tv[5] = u * v);
        for (let c = 0; c < 3; c++) {
          const k = modelo.coef[c];
          ref[c] = k[0] + k[1] * tv[1] + k[2] * tv[2] + k[3] * tv[3] + k[4] * tv[4] + k[5] * tv[5];
        }
      }
      const luzDoFundo = 0.299 * ref[0] + 0.587 * ref[1] + 0.114 * ref[2];
      const comSombra = luzDoFundo < 245;
      const dr = r - ref[0];
      const dg = g - ref[1];
      const db = b - ref[2];
      dist[i] = Math.min(255, Math.sqrt(dr * dr + dg * dg + db * db));
      const luz = 0.299 * r + 0.587 * g + 0.114 * b;
      const croma = Math.max(r, g, b) - Math.min(r, g, b);
      const mesmaCor = dist[i] < tolerancia && (luzDoFundo > 249 || luz <= luzDoFundo + folga);
      const sombra = comSombra && luz <= luzDoFundo + 2 && luzDoFundo - luz < 55 && croma < 16;
      pareceFundo[i] = mesmaCor || sombra ? 1 : 0;
    }
    // 1º: o fundo como ele é. 2º: com as frestas do contorno fechadas (o que
    // estiver na cara de fundo mas preso dentro do adesivo volta a ser adesivo).
    const R = Math.max(3, Math.round(Math.min(W, H) / 250));
    const primeiro = inundar(pareceFundo, W, H);
    const frente = new Uint8Array(N);
    for (let i = 0; i < N; i++) frente[i] = primeiro[i] ? 0 : 1;
    // Ciscos (grão do papel, ruído da compressão) não são adesivo.
    const ciscos = rotular(frente, W, H);
    for (let i = 0; i < N; i++) if (frente[i] && ciscos.areas[ciscos.rotulo[i]] < 400) (frente[i] = 0), (primeiro[i] = 1);
    const fechada = dilatar(frente, W, H, R);
    const livre = new Uint8Array(N);
    for (let i = 0; i < N; i++) livre[i] = fechada[i] ? 0 : 1;
    const longe = inundar(livre, W, H);
    const perto = dilatar(longe, W, H, R + 1);
    fundo = new Uint8Array(N);
    for (let i = 0; i < N; i++) fundo[i] = longe[i] || (primeiro[i] && perto[i]) ? 1 : 0;
  }

  // Os pedaços. Adesivos encostados (pela borda branca ou pela sombra) se
  // separam pelo miolo: a frente afinada em E px vira os núcleos, e cada pixel
  // da frente volta para o núcleo mais próximo.
  const E = Math.max(2, Math.round(Math.min(W, H) / divisor));
  const fundoGrosso = dilatar(fundo, W, H, E);
  const miolo = new Uint8Array(N);
  for (let i = 0; i < N; i++) miolo[i] = fundoGrosso[i] ? 0 : 1;
  const nucleos = rotular(miolo, W, H);
  const rotulo = new Int32Array(N);
  const fila = new Int32Array(N);
  let ini = 0;
  let fim = 0;
  for (let i = 0; i < N; i++) {
    const id = nucleos.rotulo[i];
    if (id && nucleos.areas[id] >= minimo * N * 0.4) (rotulo[i] = id), (fila[fim++] = i);
  }
  while (ini < fim) {
    const i = fila[ini++];
    const x = i % W;
    const vizinhos = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < N - W ? i + W : -1];
    for (const j of vizinhos) {
      if (j >= 0 && !fundo[j] && !rotulo[j]) {
        rotulo[j] = rotulo[i];
        fila[fim++] = j;
      }
    }
  }
  const caixas = new Map<number, { x0: number; y0: number; x1: number; y1: number; area: number }>();
  for (let i = 0; i < N; i++) {
    const id = rotulo[i];
    if (!id) continue;
    const x = i % W;
    const y = (i - x) / W;
    const c = caixas.get(id);
    if (!c) caixas.set(id, { x0: x, y0: y, x1: x, y1: y, area: 1 });
    else {
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      c.area++;
    }
  }
  const achados: { id: number; x0: number; y0: number; x1: number; y1: number }[] = [];
  caixas.forEach((c, id) => {
    // Pedaço ralo (sombra solta, fio) não é adesivo.
    const cheio = c.area / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1));
    if (c.area >= minimo * N && cheio >= 0.3) achados.push({ id, ...c });
  });

  // Cada adesivo com a máscara. Com transparência, a da própria folha; sem
  // ela, opaco por dentro e, no contorno, a transparência segue o quanto o
  // pixel se afasta da cor do fundo (borda suave).
  const margem = 2;
  const pecas = achados.map((a) => {
    const x = Math.max(0, a.x0 - margem);
    const y = Math.max(0, a.y0 - margem);
    const w = Math.min(W, a.x1 + margem + 1) - x;
    const h = Math.min(H, a.y1 + margem + 1) - y;
    const alfa = new Uint8ClampedArray(w * h);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const i = (y + yy) * W + (x + xx);
        if (transparente) {
          // Os pixels semitransparentes da borda vão junto com o adesivo vizinho.
          if (rotulo[i] === a.id || (fundo[i] && px[i * 4 + 3] > 0)) alfa[yy * w + xx] = px[i * 4 + 3];
          continue;
        }
        if (rotulo[i] !== a.id) continue;
        const xi = x + xx;
        const borda =
          (xi > 0 && fundo[i - 1]) || (xi < W - 1 && fundo[i + 1]) || (i >= W && fundo[i - W]) || (i < N - W && fundo[i + W]);
        alfa[yy * w + xx] = borda ? Math.max(96, Math.min(255, (dist[i] * 255) / (tolerancia * 2))) : 255;
      }
    }
    return { x, y, w, h, alfa };
  });
  return emOrdemDeLeitura(pecas);
}

/**
 * Recorta dentro de retângulos dados (x, y, largura, altura): em cada um, fica
 * o maior adesivo que o recorte achar. Serve para folhas em que os adesivos
 * se encostam.
 */
export function recortarEmCaixas(px: Pixels, W: number, H: number, caixas: [number, number, number, number][]): Peca[] {
  const pecas: Peca[] = [];
  for (const [cx, cy, cw, ch] of caixas) {
    const x0 = Math.max(0, Math.round(cx));
    const y0 = Math.max(0, Math.round(cy));
    const w = Math.min(W, Math.round(cx + cw)) - x0;
    const h = Math.min(H, Math.round(cy + ch)) - y0;
    if (w < 8 || h < 8) continue;
    const sub = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) sub.set(px.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4), y * w * 4);
    const achadas = recortarAdesivos(sub, w, h, { minimo: 0.05 });
    const maior = achadas.sort((a, b) => b.w * b.h - a.w * a.h)[0];
    if (maior) pecas.push({ ...maior, x: maior.x + x0, y: maior.y + y0 });
  }
  return pecas;
}

/** Folha em grade (adesivos encostados): `linhas` × `colunas` células iguais. */
export function recortarEmGrade(px: Pixels, W: number, H: number, linhas: number, colunas: number): Peca[] {
  const caixas: [number, number, number, number][] = [];
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      const x0 = (c * W) / colunas;
      const y0 = (l * H) / linhas;
      caixas.push([x0, y0, W / colunas, H / linhas]);
    }
  }
  return recortarEmCaixas(px, W, H, caixas);
}

/**
 * Cartela de bottons: o fundo pode ter desenho, então cada botton é achado
 * pelo círculo da borda (transformada de Hough pelo sentido do gradiente) e
 * recortado redondo. `quantidade`: quantos bottons a cartela tem (sem ela,
 * ficam os círculos fortes o bastante).
 */
export function recortarBottons(px: Pixels, W: number, H: number, { quantidade }: { quantidade?: number } = {}): Peca[] {
  // Trabalha numa versão reduzida (até ~900 px) para achar os círculos.
  const f = Math.max(1, Math.ceil(Math.max(W, H) / 900));
  const w = Math.floor(W / f);
  const h = Math.floor(H / f);
  const cinza = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const i = ((y * f + dy) * W + (x * f + dx)) * 4;
          s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        }
      }
      cinza[y * w + x] = s / (f * f);
    }
  }

  // Gradiente (Sobel).
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  const mag = new Float32Array(w * h);
  let maior = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = cinza[i - w - 1];
      const b = cinza[i - w];
      const c = cinza[i - w + 1];
      const d = cinza[i - 1];
      const e = cinza[i + 1];
      const g = cinza[i + w - 1];
      const hh = cinza[i + w];
      const k = cinza[i + w + 1];
      gx[i] = c + 2 * e + k - a - 2 * d - g;
      gy[i] = g + 2 * hh + k - a - 2 * b - c;
      mag[i] = Math.hypot(gx[i], gy[i]);
      if (mag[i] > maior) maior = mag[i];
    }
  }
  // Só as bordas mais fortes votam (os 12% de cima).
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) hist[Math.min(255, Math.floor((mag[i] / (maior || 1)) * 255))]++;
  let acima = 0;
  let corte = 255;
  while (corte > 0 && acima < w * h * 0.12) acima += hist[corte--];
  const limiar = (corte / 255) * maior;

  const lado = Math.min(w, h);
  const rMin = Math.max(6, Math.round(lado * 0.07));
  const rMax = Math.round(lado * 0.34);
  const votos = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (mag[i] < limiar) continue;
      const ux = gx[i] / mag[i];
      const uy = gy[i] / mag[i];
      for (let r = rMin; r <= rMax; r += 2) {
        for (const s of [1, -1]) {
          const cx = Math.round(x + s * ux * r);
          const cy = Math.round(y + s * uy * r);
          if (cx >= 0 && cx < w && cy >= 0 && cy < h) votos[cy * w + cx] += 1;
        }
      }
    }
  }
  // Suaviza os votos (caixa 7 × 7, em dois passos).
  const borrar = (src: Float32Array) => {
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -3; x < w + 3; x++) {
        if (x + 3 < w) s += src[y * w + x + 3];
        if (x - 4 >= 0) s -= src[y * w + x - 4];
        if (x >= 0 && x < w) tmp[y * w + x] = s;
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -3; y < h + 3; y++) {
        if (y + 3 < h) s += tmp[(y + 3) * w + x];
        if (y - 4 >= 0) s -= tmp[(y - 4) * w + x];
        if (y >= 0 && y < h) out[y * w + x] = s;
      }
    }
    return out;
  };
  const acc = borrar(votos);

  // O raio de cada centro: onde o gradiente mais aponta para fora/dentro do círculo.
  const AMOSTRAS = 180;
  const nota = (cx: number, cy: number, r: number) => {
    let s = 0;
    let n = 0;
    let forte = 0;
    for (let k = 0; k < AMOSTRAS; k++) {
      const t = (k / AMOSTRAS) * Math.PI * 2;
      const c = Math.cos(t);
      const sn = Math.sin(t);
      const x = Math.round(cx + c * r);
      const y = Math.round(cy + sn * r);
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      // O melhor de 1 px para dentro ou para fora (o círculo não é perfeito).
      let v = 0;
      for (const d of [-1, 0, 1]) {
        const xx = Math.round(cx + c * (r + d));
        const yy = Math.round(cy + sn * (r + d));
        if (xx < 1 || yy < 1 || xx >= w - 1 || yy >= h - 1) continue;
        const i = yy * w + xx;
        v = Math.max(v, Math.abs(gx[i] * c + gy[i] * sn));
      }
      s += v;
      if (v > limiar * 0.5) forte++;
      n++;
    }
    // A borda de um botton é contínua: a nota pesa quanto do contorno é borda forte.
    return n > AMOSTRAS * 0.7 ? (s / n) * (forte / n) : 0;
  };
  const melhorRaio = (cx: number, cy: number) => {
    let melhor = { r: rMin, nota: -1 };
    for (let r = rMin; r <= rMax; r++) {
      const v = nota(cx, cy, r);
      if (v > melhor.nota) melhor = { r, nota: v };
    }
    // A borda do botton é o círculo forte mais de fora (o miolo pode ter outros).
    for (let r = Math.round(melhor.r * 1.15); r > melhor.r; r--) {
      if (nota(cx, cy, r) >= melhor.nota * 0.8) return { r, nota: nota(cx, cy, r) };
    }
    return melhor;
  };

  // Candidatos: os picos de votos, um por vizinhança.
  const candidatos: { cx: number; cy: number; votos: number }[] = [];
  const usado = new Uint8Array(w * h);
  const limite = Math.max(24, (quantidade ?? 8) * 3);
  let primeiro = 0;
  while (candidatos.length < limite) {
    let mi = -1;
    let mv = 0;
    for (let i = 0; i < w * h; i++) if (!usado[i] && acc[i] > mv) (mv = acc[i]), (mi = i);
    if (mi < 0) break;
    if (!primeiro) primeiro = mv;
    if (mv < primeiro * 0.15) break;
    const cx = mi % w;
    const cy = (mi - cx) / w;
    candidatos.push({ cx, cy, votos: mv });
    const raio = rMin * 1.6;
    for (let y = Math.max(0, Math.floor(cy - raio)); y < Math.min(h, cy + raio); y++) {
      for (let x = Math.max(0, Math.floor(cx - raio)); x < Math.min(w, cx + raio); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= raio * raio) usado[y * w + x] = 1;
      }
    }
  }

  // Os bottons de uma cartela têm o mesmo tamanho: o raio de referência vem
  // dos candidatos mais votados, e cada um é medido perto dele.
  const medir = (cx: number, cy: number, de: number, ate: number) => {
    let melhor = { cx, cy, r: de, nota: -1 };
    for (let r = Math.round(de); r <= Math.round(ate); r++) {
      const v = nota(cx, cy, r);
      if (v > melhor.nota) melhor = { cx, cy, r, nota: v };
    }
    // Ajuste fino: anda o centro e o raio enquanto a borda fica mais nítida.
    for (let passo = 0; passo < 24; passo++) {
      let achou = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dr = -2; dr <= 2; dr++) {
            const r = melhor.r + dr;
            if (r < de * 0.9 || r > ate * 1.1) continue;
            const v = nota(melhor.cx + dx, melhor.cy + dy, r);
            if (v > melhor.nota * 1.0001) {
              melhor = { cx: melhor.cx + dx, cy: melhor.cy + dy, r, nota: v };
              achou = true;
            }
          }
        }
      }
      if (!achou) break;
    }
    return melhor;
  };
  const topo = candidatos.slice(0, Math.max(3, quantidade ?? Math.ceil(candidatos.length / 3)));
  const raios = topo.map((c) => melhorRaio(c.cx, c.cy).r).sort((a, b) => a - b);
  const rRef = raios[Math.floor((raios.length - 1) / 2)] ?? rMin;
  // O maior entre os raios fortes perto da referência (a borda, não o miolo).
  const medidos = candidatos.map((c) => medir(c.cx, c.cy, rRef * 0.85, Math.min(rMax, rRef * 1.2)));
  medidos.sort((a, b) => b.nota - a.nota);
  const circulos: typeof medidos = [];
  for (const c of medidos) {
    // O botton inteiro cabe na cartela.
    if (c.cx - c.r < 0 || c.cy - c.r < 0 || c.cx + c.r >= w || c.cy + c.r >= h) continue;
    if (circulos.some((o) => Math.hypot(o.cx - c.cx, o.cy - c.cy) < (o.r + c.r) * 0.85)) continue;
    circulos.push(c);
    if (quantidade && circulos.length >= quantidade) break;
  }
  const notas = circulos.map((c) => c.nota);
  const referencia = notas[Math.floor((notas.length - 1) / 2)] ?? 0;
  const bons = quantidade ? circulos : circulos.filter((c) => c.nota >= referencia * 0.55);

  // De volta ao tamanho original: um disco com a borda suavizada (um tiquinho
  // para dentro, para não levar a sombra da cartela).
  const pecas = bons.map((c) => {
    const cx = (c.cx + 0.5) * f;
    const cy = (c.cy + 0.5) * f;
    const r = c.r * f * 0.985;
    const x = Math.max(0, Math.floor(cx - r - 1));
    const y = Math.max(0, Math.floor(cy - r - 1));
    const pw = Math.min(W, Math.ceil(cx + r + 1)) - x;
    const ph = Math.min(H, Math.ceil(cy + r + 1)) - y;
    const alfa = new Uint8ClampedArray(pw * ph);
    for (let yy = 0; yy < ph; yy++) {
      for (let xx = 0; xx < pw; xx++) {
        const d = Math.hypot(x + xx + 0.5 - cx, y + yy + 0.5 - cy);
        alfa[yy * pw + xx] = Math.max(0, Math.min(1, r - d + 0.5)) * 255;
      }
    }
    return { x, y, w: pw, h: ph, alfa };
  });
  return emOrdemDeLeitura(pecas);
}
