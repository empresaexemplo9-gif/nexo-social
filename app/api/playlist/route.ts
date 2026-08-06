import { NextResponse } from 'next/server';
import { buildProfileSoundtrack, isSpotifyConfigured } from '@/lib/spotify';
import { MUSIC_GENRES, genreQueries } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

/**
 * Trilha do perfil — playlists e faixas do Spotify a partir dos gêneros do
 * questionário. Público: não expõe credencial, só o resultado.
 *
 * GET /api/playlist?genres=mpb,jazz
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
  const ids = (searchParams.get('genres') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Sem gêneros escolhidos, usa uma seleção neutra e agradável.
  const queries = ids.length ? genreQueries(MUSIC_GENRES, ids) : ['mpb', 'indie', 'lo-fi'];
  if (!queries.length) {
    return NextResponse.json({ error: 'Nenhum gênero válido informado.' }, { status: 400 });
  }

  try {
    const { playlists, tracks, errors } = await buildProfileSoundtrack(queries);
    return NextResponse.json({
      genres: queries,
      playlists,
      tracks,
      // Deixa claro na resposta o que não deu certo, sem quebrar o resto.
      warnings: errors.length ? errors : undefined,
      note: 'Reprodução pelo player do Spotify: no plano gratuito toca com anúncios.',
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Falha ao consultar o Spotify.', hint: 'Verifique as credenciais em /admin → Integrações.' },
      { status: 502 },
    );
  }
}
