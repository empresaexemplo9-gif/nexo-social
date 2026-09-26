import 'server-only';

// Livro do Projeto Gutenberg pronto para o leitor da plataforma: baixa o texto
// puro, tira o cabeçalho e o rodapé de licença do Gutenberg e divide em
// capítulos (ou em partes, quando o livro não marca capítulos).

export interface Capitulo {
  titulo: string;
  paragrafos: string[];
}

export interface LivroParaLer {
  id: number;
  titulo: string;
  autor: string | null;
  idioma: string | null;
  capitulos: Capitulo[];
  link: string;
}

const UMA_SEMANA = { next: { revalidate: 604800 } } as const;

/** Só texto de domínios do Gutenberg — a rota não vira proxy aberto. */
function doGutenberg(u: string): boolean {
  try {
    const h = new URL(u).hostname;
    return h === 'gutenberg.org' || h.endsWith('.gutenberg.org');
  } catch {
    return false;
  }
}

const CABECA = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG[^*]*\*\*\*/i;
const PE = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG[^*]*\*\*\*/i;
const TITULO_DE_CAPITULO =
  /^(?:(?:CHAPTER|CAP[IÍ]TULO|CAP\.|LIVRO|BOOK|PART|PARTE|ACT|ATO|CANTO|SCENE|CENA)\b.{0,70}|[IVXLCDM]{1,7}\.?|\d{1,3}\.?)$/i;

/** Texto puro → capítulos. Exportado para teste. */
export function dividirEmCapitulos(bruto: string): Capitulo[] {
  let texto = bruto.replace(/\r\n?/g, '\n');
  const ini = texto.search(CABECA);
  if (ini >= 0) texto = texto.slice(ini).replace(CABECA, '');
  const fim = texto.search(PE);
  if (fim >= 0) texto = texto.slice(0, fim);

  // Parágrafo = bloco entre linhas em branco; as quebras internas do
  // Gutenberg (linhas de ~70 colunas) viram espaço.
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter((p) => p && !/^[*\s]+$/.test(p));

  const capitulos: Capitulo[] = [];
  let atual: Capitulo = { titulo: 'Início', paragrafos: [] };
  for (const p of paragrafos) {
    if (p.length <= 80 && TITULO_DE_CAPITULO.test(p)) {
      if (atual.paragrafos.length) capitulos.push(atual);
      atual = { titulo: p.replace(/\.$/, ''), paragrafos: [] };
    } else {
      atual.paragrafos.push(p);
    }
  }
  if (atual.paragrafos.length) capitulos.push(atual);

  // Sem marcação (ou marcação demais, tipo índice): partes de ~40 parágrafos.
  const bons = capitulos.filter((c) => c.paragrafos.length >= 3);
  if (bons.length >= 2 && bons.length <= 400) return capitulos.filter((c) => c.paragrafos.length > 0);
  const partes: Capitulo[] = [];
  for (let i = 0; i < paragrafos.length; i += 40) {
    partes.push({ titulo: `Parte ${partes.length + 1}`, paragrafos: paragrafos.slice(i, i + 40) });
  }
  return partes;
}

export async function carregarLivro(id: number): Promise<LivroParaLer> {
  const meta = await fetch(`https://gutendex.com/books/${id}`, { ...UMA_SEMANA, signal: AbortSignal.timeout(12000) })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const formatos: Record<string, string> = meta?.formats ?? {};
  const candidatos = [
    ...Object.entries(formatos)
      .filter(([k, v]) => k.startsWith('text/plain') && !v.endsWith('.zip'))
      .map(([, v]) => v),
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
  ].filter(doGutenberg);

  let texto = '';
  for (const url of candidatos) {
    try {
      const res = await fetch(url, {
        ...UMA_SEMANA,
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'nexo-social/1.0 (+https://nexo-social-two.vercel.app)' },
      });
      if (res.ok) {
        texto = await res.text();
        if (texto.length > 500) break;
      }
    } catch {
      // tenta o próximo endereço
    }
  }
  if (!texto) throw new Error('Não foi possível baixar o texto deste livro no Projeto Gutenberg.');

  const autorBruto: string | undefined = meta?.authors?.[0]?.name;
  const [sobrenome, nome] = (autorBruto ?? '').split(', ');
  return {
    id,
    titulo: String(meta?.title ?? `Livro ${id}`).replace(/\s*\n\s*/g, ' — '),
    autor: autorBruto ? (nome ? `${nome} ${sobrenome}` : autorBruto) : null,
    idioma: meta?.languages?.[0] ?? null,
    capitulos: dividirEmCapitulos(texto),
    link: `https://www.gutenberg.org/ebooks/${id}`,
  };
}
