import { NextResponse } from 'next/server';

export const revalidate = 21600;

// Só estes domínios podem ser buscados. Sem a lista, a rota viraria um proxy
// aberto: qualquer um mandaria a URL que quisesse e usaria nosso servidor para
// alcançar endereços internos (SSRF).
const HOSTS_PERMITIDOS = ['librivox.org', 'www.librivox.org', 'archive.org', 'ia800.us.archive.org'];

function hostPermitido(u: string): boolean {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return HOSTS_PERMITIDOS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export interface Capitulo {
  titulo: string;
  mp3: string;
  duracao: string | null;
}

/** Extrai os capítulos do RSS do LibriVox — cada item traz o MP3 direto. */
function parseRss(xml: string): Capitulo[] {
  const itens = xml.split(/<item[\s>]/i).slice(1);
  const capitulos: Capitulo[] = [];
  for (const bruto of itens) {
    const item = bruto.split(/<\/item>/i)[0];
    const mp3 = item.match(/<enclosure[^>]*url=["']([^"']+\.mp3)["']/i)?.[1];
    if (!mp3 || !hostPermitido(mp3)) continue;
    const titulo =
      item.match(/<title>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/title>/i)?.[1]?.trim() ||
      `Faixa ${capitulos.length + 1}`;
    const duracao = item.match(/<itunes:duration>([^<]+)<\/itunes:duration>/i)?.[1]?.trim() ?? null;
    capitulos.push({ titulo, mp3, duracao });
  }
  return capitulos;
}

/**
 * GET /api/audiolivro?feed=<url do RSS no LibriVox>
 * Devolve os capítulos com o MP3 direto, para tocar no player da plataforma.
 */
export async function GET(request: Request) {
  const feed = (new URL(request.url).searchParams.get('feed') || '').trim();
  if (!feed) return NextResponse.json({ error: 'Informe o feed.' }, { status: 400 });
  if (!hostPermitido(feed)) {
    return NextResponse.json({ error: 'Feed de origem não permitida.' }, { status: 400 });
  }

  try {
    const res = await fetch(feed, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'nexo-social/1.0 (+https://nexo-social-two.vercel.app)' },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `LibriVox respondeu ${res.status}` }, { status: 502 });
    }
    const capitulos = parseRss(await res.text());
    if (!capitulos.length) {
      return NextResponse.json({ error: 'Nenhum capítulo encontrado neste feed.' }, { status: 404 });
    }
    return NextResponse.json({ capitulos });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao ler o feed.' }, { status: 502 });
  }
}
