import 'server-only';

// Integração com a Web API do Spotify (fluxo Client Credentials).
//
// LIMITE IMPORTANTE: Client Credentials acessa apenas o catálogo público — não
// cria playlist dentro da conta do usuário (isso exigiria login do usuário com
// escopo playlist-modify). Por isso montamos a trilha do perfil a partir de
// buscas no catálogo e reproduzimos por meio do player embutido do Spotify,
// que no plano gratuito toca com anúncios.

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';

let cachedToken: { value: string; expiresAt: number } | null = null;

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/** Token de aplicação, com cache em memória até expirar. */
async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const id = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  if (!id || !secret) throw new Error('SPOTIFY_CLIENT_ID/SECRET não configurados.');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao autenticar no Spotify (${res.status}): ${body.slice(0, 160)}`);
  }
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function api(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify ${res.status}: ${body.slice(0, 160)}`);
  }
  return res.json();
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string | null;
  /** Trecho de 30s (nem toda faixa tem). */
  previewUrl: string | null;
  url: string;
  embedUrl: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: string;
  image: string | null;
  url: string;
  /** Player embutido — no plano gratuito toca com anúncios. */
  embedUrl: string;
  genre: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTrack(t: any): SpotifyTrack {
  return {
    id: t.id,
    name: t.name,
    artist: (t.artists ?? []).map((a: any) => a.name).join(', '),
    album: t.album?.name ?? '',
    image: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null,
    previewUrl: t.preview_url ?? null,
    url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
    embedUrl: `https://open.spotify.com/embed/track/${t.id}`,
  };
}

/** Faixas do catálogo para um gênero. */
export async function tracksByGenre(genre: string, limit = 6, market = 'BR'): Promise<SpotifyTrack[]> {
  const q = encodeURIComponent(`genre:"${genre}"`);
  let json = await api(`/search?q=${q}&type=track&market=${market}&limit=${limit}`);
  let items: any[] = json?.tracks?.items ?? [];

  // Alguns gêneros não respondem ao filtro `genre:` — cai para busca livre.
  if (!items.length) {
    json = await api(`/search?q=${encodeURIComponent(genre)}&type=track&market=${market}&limit=${limit}`);
    items = json?.tracks?.items ?? [];
  }
  return items.filter(Boolean).map(mapTrack);
}

/** Playlists públicas para um gênero — é o que embutimos como "rádio" do perfil. */
export async function playlistsByGenre(genre: string, limit = 3, market = 'BR'): Promise<SpotifyPlaylist[]> {
  const json = await api(`/search?q=${encodeURIComponent(genre)}&type=playlist&market=${market}&limit=${limit}`);
  const items: any[] = (json?.playlists?.items ?? []).filter(Boolean);
  return items.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    owner: p.owner?.display_name ?? 'Spotify',
    image: p.images?.[0]?.url ?? null,
    url: p.external_urls?.spotify ?? `https://open.spotify.com/playlist/${p.id}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${p.id}`,
    genre,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Monta a trilha do perfil: uma playlist embutida por gênero preferido + uma
 * seleção de faixas. Falhas por gênero não derrubam o conjunto.
 */
export async function buildProfileSoundtrack(genres: string[], opts: { tracksPerGenre?: number } = {}) {
  const chosen = genres.slice(0, 4);
  const playlists: SpotifyPlaylist[] = [];
  const tracks: SpotifyTrack[] = [];
  const errors: string[] = [];

  await Promise.all(
    chosen.map(async (g) => {
      try {
        const [pl, tr] = await Promise.all([
          playlistsByGenre(g, 1),
          tracksByGenre(g, opts.tracksPerGenre ?? 4),
        ]);
        playlists.push(...pl);
        tracks.push(...tr);
      } catch (e: any) {
        errors.push(`${g}: ${e?.message || e}`);
      }
    }),
  );

  // Remove faixas repetidas entre gêneros.
  const seen = new Set<string>();
  const unique = tracks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));

  return { playlists, tracks: unique, errors };
}
