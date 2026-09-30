// Tradução automática dos livros para o português, pelo Google Tradutor
// (acesso gratuito, sem chave). Funciona no servidor e no navegador: o
// servidor traduz e guarda cada capítulo; se o Google recusar o servidor, o
// próprio navegador de quem lê traduz (o Google libera esse acesso).
//
// Cada parágrafo vai como um item separado no mesmo pedido e volta na mesma
// ordem — a tradução nunca embaralha os parágrafos.

export const PARA = 'pt';
const ENDERECO = 'https://translate.googleapis.com/translate_a/t';
/** Caracteres por pedido (o Google aceita bem mais; aqui fica folgado). */
const POR_PEDIDO = 9000;
/** Itens por pedido. */
const ITENS_POR_PEDIDO = 100;
/** Parágrafo maior que isto é quebrado nas frases. */
const MAIOR_PEDACO = 4000;
/** Pedidos ao mesmo tempo. */
const JUNTOS = 3;

const IDIOMAS: Record<string, string> = {
  en: 'inglês', fr: 'francês', de: 'alemão', es: 'espanhol', it: 'italiano', la: 'latim', nl: 'holandês',
  fi: 'finlandês', sv: 'sueco', da: 'dinamarquês', no: 'norueguês', ru: 'russo', pl: 'polonês', el: 'grego',
  grc: 'grego antigo', hu: 'húngaro', eo: 'esperanto', ca: 'catalão', zh: 'chinês', ja: 'japonês', cs: 'tcheco',
  tl: 'tagalo', cy: 'galês', ga: 'irlandês', is: 'islandês', ro: 'romeno', af: 'africâner', he: 'hebraico',
  ar: 'árabe', ko: 'coreano', fy: 'frísio', gl: 'galego', eu: 'basco', oc: 'occitano', sr: 'sérvio', bg: 'búlgaro',
};

/** "en" → "inglês" (null quando não sabemos). */
export function nomeDoIdioma(codigo: string | null | undefined): string | null {
  if (!codigo) return null;
  const c = codigo.toLowerCase();
  return IDIOMAS[c] ?? IDIOMAS[c.split('-')[0]] ?? null;
}

/** Livro em outra língua (ou sem língua conhecida) pede tradução. */
export const precisaTraduzir = (idioma: string | null | undefined) => !idioma || !idioma.toLowerCase().startsWith(PARA);

/** O código que o Google entende ("auto" quando não sabemos a língua). */
function origemParaOGoogle(idioma: string | null | undefined): string {
  if (!idioma) return 'auto';
  const c = idioma.toLowerCase();
  if (c === 'grc') return 'el';
  return /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(c) ? c : 'auto';
}

/** Quebra um texto longo nas frases (e, se preciso, nas palavras). */
export function quebrar(texto: string, maior = MAIOR_PEDACO): string[] {
  if (texto.length <= maior) return [texto];
  const frases = texto.match(/[^.!?;:]+[.!?;:]+["'”’»)\]]*\s*|[^.!?;:]+$/g) ?? [texto];
  const pedacos: string[] = [];
  let atual = '';
  const fechar = () => {
    if (atual.trim()) pedacos.push(atual.trim());
    atual = '';
  };
  for (const f of frases) {
    if (f.length > maior) {
      fechar();
      // Frase enorme (sem pontuação): corta nas palavras.
      let resto = f;
      while (resto.length > maior) {
        const corte = resto.lastIndexOf(' ', maior);
        const n = corte > maior / 2 ? corte : maior;
        pedacos.push(resto.slice(0, n).trim());
        resto = resto.slice(n);
      }
      atual = resto;
      continue;
    }
    if (atual.length + f.length > maior) fechar();
    atual += f;
  }
  fechar();
  return pedacos.length ? pedacos : [texto];
}

/** Agrupa os pedaços em pedidos (índices), respeitando o tamanho e a quantidade. */
export function emLotes(pedacos: string[], porPedido = POR_PEDIDO, itens = ITENS_POR_PEDIDO): number[][] {
  const lotes: number[][] = [];
  let lote: number[] = [];
  let soma = 0;
  pedacos.forEach((p, i) => {
    if (lote.length && (soma + p.length > porPedido || lote.length >= itens)) {
      lotes.push(lote);
      lote = [];
      soma = 0;
    }
    lote.push(i);
    soma += p.length;
  });
  if (lote.length) lotes.push(lote);
  return lotes;
}

export class ErroDeTraducao extends Error {}

type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

async function pedir(textos: string[], de: string, buscar: Buscar, sinal?: AbortSignal): Promise<{ textos: string[]; origem: string | null }> {
  const url = `${ENDERECO}?client=gtx&sl=${encodeURIComponent(de)}&tl=${PARA}&format=text`;
  const corpo = new URLSearchParams();
  for (const t of textos) corpo.append('q', t);
  let ultimo: unknown = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const r = await buscar(url, { method: 'POST', body: corpo, signal: sinal, cache: 'no-store' });
      if (!r.ok) throw new ErroDeTraducao(r.status === 429 ? 'O tradutor está ocupado agora.' : `O tradutor respondeu ${r.status}.`);
      // Uma lista com um item por texto: "tradução" (língua informada) ou
      // ["tradução", "língua detectada"] (língua automática).
      const lista: unknown = await r.json().catch(() => null);
      if (!Array.isArray(lista) || lista.length !== textos.length) throw new ErroDeTraducao('A tradução voltou incompleta.');
      let origem: string | null = de === 'auto' ? null : de;
      const saida = lista.map((item, i) => {
        if (typeof item === 'string') return item;
        if (Array.isArray(item) && typeof item[0] === 'string') {
          if (!origem && typeof item[1] === 'string') origem = item[1];
          return item[0];
        }
        return textos[i];
      });
      return { textos: saida, origem };
    } catch (e) {
      if (sinal?.aborted) throw e;
      ultimo = e;
      if (tentativa === 0) await new Promise((ok) => setTimeout(ok, 600));
    }
  }
  throw ultimo instanceof Error ? ultimo : new ErroDeTraducao('Não foi possível traduzir agora.');
}

/**
 * Traduz uma lista de textos (parágrafos) para o português, na mesma ordem.
 * Textos vazios continuam vazios; parágrafos enormes são quebrados e remontados.
 */
export async function traduzirTextos(
  textos: string[],
  { de, buscar = (u, i) => fetch(u, i), sinal }: { de?: string | null; buscar?: Buscar; sinal?: AbortSignal } = {},
): Promise<{ textos: string[]; origem: string | null }> {
  const origemPedida = origemParaOGoogle(de);
  // Pedaços a traduzir e de qual texto cada um veio.
  const pedacos: string[] = [];
  const dono: number[] = [];
  textos.forEach((t, i) => {
    if (!t.trim()) return;
    for (const p of quebrar(t)) {
      pedacos.push(p);
      dono.push(i);
    }
  });
  const traduzidos: string[] = new Array(pedacos.length);
  let origem: string | null = origemPedida === 'auto' ? null : origemPedida;
  const lotes = emLotes(pedacos);
  let proximo = 0;
  const trabalhar = async () => {
    while (proximo < lotes.length) {
      const lote = lotes[proximo++];
      const r = await pedir(lote.map((i) => pedacos[i]), origemPedida, buscar, sinal);
      lote.forEach((i, k) => (traduzidos[i] = r.textos[k]));
      origem = origem ?? r.origem;
    }
  };
  await Promise.all(Array.from({ length: Math.min(JUNTOS, lotes.length) }, trabalhar));

  const saida = textos.map((t) => (t.trim() ? '' : t));
  traduzidos.forEach((p, k) => {
    const i = dono[k];
    saida[i] = saida[i] ? `${saida[i]} ${p}` : p;
  });
  return { textos: saida, origem };
}
