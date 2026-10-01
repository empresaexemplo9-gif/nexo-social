// Texto da Wikipédia → peças de matéria: seções, frases, "Você sabia?", linha
// do tempo e citação. Funções puras, usadas pelas Matérias históricas e pela
// Revista (o "Para entender" das matérias atuais). Ver tests/revista.test.cjs.

export interface Secao {
  titulo: string;
  paragrafos: string[];
}

/** Seções que não viram matéria: referências, links, notas… */
const SECOES_FORA = /^(ver também|referências|ligações externas|bibliografia|notas|fontes|leitura adicional|galeria|discografia|filmografia|obras|prêmios e indicações|notas e referências)$/i;

/** Texto puro da API (exsectionformat=wiki) → abertura e seções. */
export function dividirSecoes(texto: string): { abertura: string[]; secoes: Secao[] } {
  const linhas = texto.split('\n');
  const abertura: string[] = [];
  const secoes: Secao[] = [];
  let atual: Secao | null = null;
  let nivel = 0;
  for (const bruta of linhas) {
    const linha = bruta.trim();
    const titulo = linha.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (titulo) {
      nivel = titulo[1].length;
      // Subseções (===) entram na seção de cima, com o título como parágrafo curto.
      if (nivel === 2) {
        atual = { titulo: titulo[2], paragrafos: [] };
        secoes.push(atual);
      } else if (atual) {
        atual.paragrafos.push(`§ ${titulo[2]}`);
      }
      continue;
    }
    if (!linha) continue;
    (atual ? atual.paragrafos : abertura).push(linha);
  }
  return {
    abertura,
    secoes: secoes
      .filter((s) => !SECOES_FORA.test(s.titulo))
      .map((s) => ({ ...s, paragrafos: s.paragrafos.filter((p, i, arr) => !(p.startsWith('§ ') && (arr[i + 1] ?? '').startsWith('§ '))) }))
      .filter((s) => s.paragrafos.some((p) => !p.startsWith('§ '))),
  };
}

export function frases(texto: string): string[] {
  return texto
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(])/)
    .map((f) => f.trim())
    .filter((f) => f.length >= 50 && f.length <= 280 && !f.includes('§'));
}

/** "Você sabia?": frases com número, ano ou superlativo — o fato curioso. */
export function garimparCuriosidades(secoes: Secao[], abertura: string, n = 5): string[] {
  const curiosa = /(\b1[0-9]{3}\b|\b20[0-2][0-9]\b|primeir[oa]|maior|menor|mais antig|recorde|únic[oa]|milh(ão|ões)|bilh|curios|inusitad|famos)/i;
  const porSecao = secoes.map((s) => frases(s.paragrafos.join(' ')).filter((f) => curiosa.test(f)));
  const escolhidas: string[] = [];
  const vistas = new Set<string>([abertura.slice(0, 80)]);
  // Primeiro uma por seção (variedade); depois completa com as que sobraram.
  for (let rodada = 0; rodada < 3 && escolhidas.length < n; rodada++) {
    for (const lista of porSecao) {
      const f = lista[rodada];
      if (!f || vistas.has(f.slice(0, 80))) continue;
      vistas.add(f.slice(0, 80));
      escolhidas.push(f);
      if (escolhidas.length >= n) break;
    }
  }
  return escolhidas;
}

/** Linha do tempo: frases que começam por (ou trazem) um ano, em ordem. */
export function montarLinhaDoTempo(secoes: Secao[], abertura: string): { ano: number; texto: string }[] {
  const itens = new Map<number, string>();
  for (const f of frases([abertura, ...secoes.flatMap((s) => s.paragrafos)].join(' '))) {
    const m = f.match(/^(?:Em|No ano de|Desde|A partir de|Até)?\s*(?:\w+ de )?(1[0-9]{3}|20[0-2][0-9])\b/) ?? f.match(/\b(1[5-9][0-9]{2}|20[0-2][0-9])\b/);
    if (!m) continue;
    const ano = Number(m[1]);
    if (!itens.has(ano)) itens.set(ano, f);
  }
  return Array.from(itens.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 12)
    .map(([ano, texto]) => ({ ano, texto }));
}

export function escolherCitacao(secoes: Secao[]): string | null {
  const pool = secoes.slice(1).flatMap((s) => frases(s.paragrafos.join(' '))).filter((f) => f.length >= 90 && f.length <= 200 && !/[()\[\]]/.test(f));
  return pool[Math.floor(pool.length / 2)] ?? null;
}
