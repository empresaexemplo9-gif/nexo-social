// O que a plataforma sabe tocar ou abrir por dentro — compartilhado entre o
// servidor (que monta as indicações) e o reprodutor (components/midia).

export type Midia =
  /** Vídeo do YouTube (inclui Shorts: `vertical`). */
  | { tipo: 'youtube'; id: string; vertical?: boolean }
  /** Item do Internet Archive: filme, audiolivro (lista de capítulos) ou livro. */
  | { tipo: 'archive'; id: string; formato: 'video' | 'audio' | 'texto' }
  /** Livro do Projeto Gutenberg, aberto no leitor da plataforma. */
  | { tipo: 'livro'; gutenberg: number }
  /** Audiolivro do LibriVox pelo feed de capítulos (MP3 direto). */
  | { tipo: 'audiolivro'; feed: string };

export interface ItemDeMidia {
  midia: Midia;
  titulo: string;
  autor?: string | null;
  capa?: string | null;
  /** Rótulo da origem: "Internet Archive", "YouTube"… */
  fonte?: string;
  /** Página original, para quem quiser abrir lá. */
  link?: string | null;
}

/** Id do YouTube de qualquer formato de link (watch, youtu.be, embed, shorts). */
export function idDoYoutube(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/embed\/([\w-]{11})/) ||
    url.match(/\/shorts\/([\w-]{11})/);
  return m ? m[1] : null;
}

/** Títulos do YouTube chegam com entidades HTML (&amp;, &#39;…). */
export function decodificarEntidades(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
