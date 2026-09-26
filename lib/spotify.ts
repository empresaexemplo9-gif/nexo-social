import 'server-only';

// Integração com a Web API do Spotify (fluxo Client Credentials).
//
// LIMITE IMPORTANTE: Client Credentials acessa apenas o catálogo público — não
// cria playlist dentro da conta do usuário (isso exigiria login do usuário com
// escopo playlist-modify). Por isso montamos a trilha do perfil a partir de
// buscas no catálogo. Sem login, o player embutido do Spotify toca prévias de
// 30 s; quem entra com o Spotify Premium ouve completo pelo player da
// plataforma — ver lib/spotify-conta.ts.
//
// LIMITE DE 2026: apps no modo de desenvolvimento perderam recomendações,
// artistas relacionados, "mais tocadas do artista", buscas em lote e o campo
// `popularity`; a busca devolve no máximo 10 itens. A descoberta musical é
// feita só com a busca — ver lib/descoberta-musical.ts.

import {
  embaralhar,
  entre,
  escolherPlaylist,
  foraDoObvio,
  sorteador,
  type EstiloDePlaylist,
  type Faixa,
  type Playlist,
} from './descoberta-musical';
import type { MusicaNoSpotify } from './taxonomy';

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

/* eslint-disable @typescript-eslint/no-explicit-any */
function paraFaixa(t: any): Faixa {
  const artistas: string[] = (t.artists ?? []).map((a: any) => a?.name).filter(Boolean);
  const ano = Number(String(t.album?.release_date ?? '').slice(0, 4));
  return {
    id: t.id,
    name: t.name,
    artist: artistas.join(', '),
    artistaPrincipal: artistas[0] ?? '',
    album: t.album?.name ?? '',
    image: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null,
    ano: Number.isFinite(ano) && ano > 0 ? ano : null,
    duracaoMs: typeof t.duration_ms === 'number' ? t.duration_ms : null,
    url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
    embedUrl: `https://open.spotify.com/embed/track/${t.id}`,
  };
}

function paraPlaylist(p: any): Playlist {
  return {
    id: p.id,
    name: p.name ?? '',
    description: (p.description ?? '').replace(/<[^>]+>/g, ''),
    owner: p.owner?.display_name ?? 'Spotify',
    image: p.images?.[0]?.url ?? null,
    url: p.external_urls?.spotify ?? `https://open.spotify.com/playlist/${p.id}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${p.id}`,
  };
}

// Desde fevereiro de 2026 a busca devolve no máximo 10 itens por chamada em
// apps no modo de desenvolvimento — pedir mais faz a chamada falhar.
const LIMITE = 10;

async function buscarFaixas(q: string, offset: number, market: string): Promise<Faixa[]> {
  const json = await api(
    `/search?q=${encodeURIComponent(q)}&type=track&market=${market}&limit=${LIMITE}&offset=${Math.max(0, offset)}`,
  );
  return ((json?.tracks?.items ?? []) as any[]).filter((t) => t?.id).map(paraFaixa);
}

async function buscarPlaylists(q: string, market: string): Promise<Playlist[]> {
  const json = await api(`/search?q=${encodeURIComponent(q)}&type=playlist&market=${market}&limit=${LIMITE}`);
  return ((json?.playlists?.items ?? []) as any[]).filter((p) => p?.id).map(paraPlaylist);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Como a pessoa quer ouvir — as duas perguntas de música do questionário. */
export interface JeitoDeOuvir {
  /** Gosta dos hits e clássicos do estilo? */
  hits: boolean;
  mix: 'misturar' | 'famosas' | 'lancamentos';
}

export interface ListaDaTrilha {
  id: string;
  titulo: string;
  apoio: string;
  faixas: Faixa[];
}

export interface TrilhaDoGenero {
  /** Nome do gênero no Spotify que respondeu ao filtro (ou null se nenhum). */
  generoSpotify: string | null;
  playlist: Playlist | null;
  listas: ListaDaTrilha[];
  avisos: string[];
}

/**
 * Monta a trilha de UM gênero conforme o jeito de ouvir da pessoa.
 *
 * Tudo sai do filtro `genre:"…"` — que olha o gênero do artista —, então não
 * entra faixa de outro estilo. Não há busca por palavra de reserva: ela é que
 * trazia "Rock With You" (pop) para quem escolheu rock. Se nenhum nome de
 * gênero responder, a trilha vem só com a playlist, sem faixas soltas.
 *
 * A primeira página do gênero são os mais tocados. Para quem gosta de hits ela
 * é conteúdo; para quem não gosta, é a lista do que NÃO indicar.
 *
 * `semente` (dia + rodada) decide as páginas e o sorteio: a seleção muda todo
 * dia e a cada "outras descobertas", mas é estável dentro do mesmo dia — o que
 * permite guardar em cache.
 */
export async function trilhaDoGenero(
  cfg: MusicaNoSpotify,
  semente: string,
  jeito: JeitoDeOuvir = { hits: false, mix: 'misturar' },
  opts: { ano?: number; market?: string } = {},
): Promise<TrilhaDoGenero> {
  const ano = opts.ano ?? new Date().getFullYear();
  const market = opts.market ?? 'BR';
  const rand = sorteador(semente);
  const avisos: string[] = [];
  const recentes = `year:${ano - 1}-${ano}`;

  // 1) A primeira página do gênero — descobre qual nome o Spotify reconhece.
  let genero: string | null = null;
  let topo: Faixa[] = [];
  for (const g of cfg.generos) {
    try {
      topo = await buscarFaixas(`genre:"${g}"`, 0, market);
    } catch (e: any) {
      avisos.push(`genre:"${g}": ${e?.message || e}`);
      continue;
    }
    if (topo.length) {
      genero = g;
      break;
    }
  }

  const busca = (extra: string, offset: number) =>
    buscarFaixas(`genre:"${genero}"${extra ? ` ${extra}` : ''}`, offset, market).catch(() => [] as Faixa[]);

  // 2) As listas, conforme as duas respostas.
  const montarListas = async (): Promise<ListaDaTrilha[]> => {
    if (!genero) return [];
    const { hits, mix } = jeito;
    const lista = (id: string, titulo: string, apoio: string, faixas: Faixa[]): ListaDaTrilha => ({ id, titulo, apoio, faixas });
    // Quem não quer hits: a primeira página do gênero é a lista do que NÃO entra.
    const semHits = { topo, barrarTopo: true };
    const comHits = { barrarTopo: false };

    if (mix === 'famosas') {
      if (hits) {
        // Os hits do estilo: as três primeiras páginas, até duas por artista.
        const [p2, p3] = await Promise.all([busca('', 10), busca('', 20)]);
        return [
          lista('hits', 'Os hits do estilo', 'As que todo mundo conhece.', foraDoObvio([...topo, ...p2, ...p3], { ...comHits, porArtista: 2 }).slice(0, 10)),
        ];
      }
      // Famosas, mas sem as mais batidas: as páginas logo abaixo do topo.
      const [a, b] = await Promise.all([busca('', entre(rand, 10, 30)), busca('', entre(rand, 30, 70))]);
      const idsTopo = new Set(topo.map((f) => f.id));
      const conhecidas = foraDoObvio(embaralhar([...a, ...b], rand), comHits).filter((f) => !idsTopo.has(f.id));
      return [lista('conhecidas', 'Conhecidas, mas não as de sempre', 'Sucessos do estilo que não tocam em todo lugar.', conhecidas.slice(0, 10))];
    }

    if (mix === 'lancamentos') {
      if (hits) {
        const [alta, mais] = await Promise.all([busca(recentes, 0), busca(recentes, entre(rand, 10, 40))]);
        const emAlta = foraDoObvio(alta, comHits).slice(0, 8);
        return [
          lista('em-alta', 'Lançamentos em alta', `O que saiu de ${ano - 1} para cá e está tocando.`, emAlta),
          lista('mais-lancamentos', 'Mais lançamentos', 'Outras estreias recentes do estilo.', foraDoObvio(embaralhar(mais, rand), { ...comHits, jaEscolhidas: emAlta }).slice(0, 8)),
        ];
      }
      const [a, b] = await Promise.all([busca(recentes, entre(rand, 0, 20)), busca(recentes, entre(rand, 20, 80))]);
      const novos = foraDoObvio(embaralhar(a, rand), semHits).slice(0, 8);
      return [
        lista('lancamentos', 'Lançamentos', `Saíram de ${ano - 1} para cá — longe dos mais tocados.`, novos),
        lista('radar', 'Lançamentos fora do radar', 'Estreias de artistas que ainda não estouraram.', foraDoObvio(embaralhar(b, rand), { ...semHits, jaEscolhidas: novos }).slice(0, 8)),
      ];
    }

    // misturar: lançamentos com antigas.
    const [novas, fundo1, fundo2, segunda] = await Promise.all([
      busca(recentes, hits ? entre(rand, 0, 10) : entre(rand, 0, 20)),
      busca('', entre(rand, 40, 200)),
      busca('', entre(rand, 200, 600)),
      hits ? busca('', 10) : Promise.resolve([] as Faixa[]),
    ]);
    // Página funda além do fim do catálogo volta vazia: tenta mais perto.
    const fundo = fundo1.length + fundo2.length ? [...fundo1, ...fundo2] : await busca('', 20);
    const lancamentos = foraDoObvio(embaralhar(novas, rand), hits ? comHits : semHits).slice(0, 6);
    const listas = [
      lista('lancamentos', 'Lançamentos', hits ? `O que saiu de ${ano - 1} para cá.` : `Saíram de ${ano - 1} para cá — longe dos mais tocados.`, lancamentos),
    ];
    if (hits) {
      // Os clássicos podem ser dos mesmos artistas dos lançamentos: é o hit de
      // antes de quem lançou agora. Só a mesma faixa não repete.
      const classicos = foraDoObvio(embaralhar([...topo, ...segunda], rand), { ...comHits, jaEscolhidas: lancamentos, variarEntreListas: false }).slice(0, 6);
      listas.push(lista('classicos', 'Clássicos e hits', 'Os que todo mundo conhece, para cantar junto.', classicos));
      listas.push(lista('descobertas', 'Descobertas', 'Artistas fora do topo do estilo, um de cada.', foraDoObvio(embaralhar(fundo, rand), { ...semHits, jaEscolhidas: [...lancamentos, ...classicos] }).slice(0, 6)));
    } else {
      listas.push(lista('descobertas', 'Descobertas', 'Artistas fora do topo do estilo, um de cada.', foraDoObvio(embaralhar(fundo, rand), { ...semHits, jaEscolhidas: lancamentos }).slice(0, 8)));
    }
    return listas;
  };

  // 3) A playlist, com o mesmo critério.
  const escolher = async () => {
    const { hits, mix } = jeito;
    const t = cfg.termo;
    const [estilo, termos]: [EstiloDePlaylist, string[]] =
      mix === 'famosas'
        ? // "Só as mais famosas" pede playlist de sucessos em qualquer caso; o
          // "sem os hits mais batidos" já vale nas faixas avulsas.
          ['hits', [`${t} hits`, `melhores ${t}`, `${t} clássicos`, `${t} sucessos`]]
        : mix === 'lancamentos'
          ? [hits ? 'lancamentos' : 'descoberta', [`${t} lançamentos ${ano}`, `${t} novidades`, `${t} novas ${ano}`, `${t} lançamentos`]]
          : hits
            ? ['mista', [`${t} novidades`, `${t} clássicos`, `${t} hits ${ano}`, `${t} antigas e novas`]]
            : ['descoberta', [`${t} novidades`, `${t} novos artistas`, `${t} descobertas`, `${t} independente`, `${t} lançamentos ${ano}`]];
    const escolhidos = embaralhar(termos, rand).slice(0, 2);
    const listas = await Promise.all(escolhidos.map((q) => buscarPlaylists(q, market).catch(() => [] as Playlist[])));
    return escolherPlaylist(listas.flat(), cfg.sinais, ano, rand, estilo);
  };

  const [listas, playlist] = await Promise.all([montarListas(), escolher()]);
  if (!genero) avisos.push('Nenhum nome de gênero respondeu ao filtro do Spotify — sem faixas avulsas hoje.');
  return { generoSpotify: genero, playlist, listas: listas.filter((l) => l.faixas.length), avisos };
}
