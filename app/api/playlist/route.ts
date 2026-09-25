import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { isSpotifyConfigured, trilhaDoGenero, type JeitoDeOuvir } from '@/lib/spotify';
import { MUSICA_SPOTIFY, MUSIC_GENRES } from '@/lib/taxonomy';
import { diaDeHoje } from '@/lib/descoberta-musical';

export const dynamic = 'force-dynamic';

/** Quantas seleções diferentes o botão "outras descobertas" alterna por dia. */
const RODADAS = 5;

const MIXES: JeitoDeOuvir['mix'][] = ['misturar', 'famosas', 'lancamentos'];

// A seleção de um gênero é a mesma para todo mundo no mesmo dia, rodada e
// jeito de ouvir: guardar evita gastar a cota do Spotify (contada por conta de
// desenvolvedor) a cada visita à home. Erro não é guardado — a função lança e
// a próxima visita tenta de novo.
const trilhaEmCache = unstable_cache(
  async (id: string, dia: string, rodada: number, hits: boolean, mix: JeitoDeOuvir['mix']) => {
    const t = await trilhaDoGenero(MUSICA_SPOTIFY[id], `${id}:${dia}:${rodada}:${hits ? 'h' : 'd'}:${mix}`, { hits, mix });
    if (!t.playlist && !t.listas.length) {
      throw new Error(t.avisos[0] || 'O Spotify não devolveu nada para este gênero.');
    }
    return t;
  },
  ['trilha-genero-v3'],
  { revalidate: 60 * 60 * 12 },
);

/**
 * Trilha de UM gênero do perfil: uma playlist e listas de faixas escolhidas
 * conforme o jeito de ouvir da pessoa — sempre do gênero pedido.
 *
 * GET /api/playlist?genre=samba&rodada=0&hits=0&mix=misturar
 *
 * `hits` e `mix` são as duas perguntas de música do questionário: se a pessoa
 * gosta dos hits do estilo e se quer misturar novas com antigas, só as mais
 * famosas ou só lançamentos.
 *
 * Um gênero por chamada (o que a pessoa abriu), e não todos de uma vez: cada
 * gênero custa algumas buscas, e o perfil pode ter dezoito.
 */
export async function GET(request: Request) {
  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      {
        error: 'Spotify não configurado.',
        hint: 'Adicione SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET na Vercel e faça Redeploy.',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('genre') || '').trim();
  const opcao = MUSIC_GENRES.find((g) => g.id === id);
  // Só gêneros do questionário: nada de "seleção neutra" com estilos que a
  // pessoa não escolheu.
  if (!opcao || !MUSICA_SPOTIFY[id]) {
    return NextResponse.json({ error: 'Gênero desconhecido.' }, { status: 400 });
  }
  const rodada = Math.abs(Math.trunc(Number(searchParams.get('rodada')) || 0)) % RODADAS;
  const hits = searchParams.get('hits') === '1';
  const mixPedido = searchParams.get('mix') as JeitoDeOuvir['mix'];
  const mix = MIXES.includes(mixPedido) ? mixPedido : 'misturar';

  try {
    const t = await trilhaEmCache(id, diaDeHoje(), rodada, hits, mix);
    return NextResponse.json(
      {
        genre: { id: opcao.id, label: opcao.label },
        rodada,
        rodadas: RODADAS,
        generoSpotify: t.generoSpotify,
        jeito: { hits, mix },
        playlist: t.playlist,
        listas: t.listas,
        warnings: t.avisos.length ? t.avisos : undefined,
        note: 'Reprodução pelo player do Spotify: no plano gratuito toca com anúncios.',
      },
      // A resposta é igual para todos no mesmo dia: a CDN também pode guardar.
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Falha ao consultar o Spotify.', hint: 'Verifique as credenciais em /admin → Integrações.' },
      { status: 502 },
    );
  }
}
