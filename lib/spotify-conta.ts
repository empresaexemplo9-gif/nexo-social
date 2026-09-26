import 'server-only';

// Login da pessoa no Spotify (fluxo Authorization Code), para ouvir as faixas
// completas dentro da nexo.social.
//
// Não confundir com lib/spotify.ts, que usa só o token do app (Client
// Credentials) para buscar no catálogo. Aqui o token é da PESSOA: é ele que o
// Web Playback SDK usa para tocar no navegador — e o Spotify só libera esse
// player para contas Premium. Conta grátis continua ouvindo completo, com
// anúncios, no app do Spotify.
//
// Nada disso vai para o banco: a sessão fica num cookie httpOnly, cifrado com
// uma chave derivada do SPOTIFY_CLIENT_SECRET. O navegador só enxerga o token
// de acesso (curto, ~1h) pedindo a /api/spotify/token; o refresh token nunca
// sai do servidor.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

const AUTORIZAR = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';

/** Sessão da pessoa (refresh token incluso). Só o servidor lê. */
const COOKIE_SESSAO = 'nexo_spotify';
/** Estado do login em andamento, contra CSRF no retorno. */
const COOKIE_PEDIDO = 'nexo_spotify_pedido';
/**
 * Sinal legível pelo navegador: diz apenas "há uma conta ligada", sem nada
 * secreto. Evita que todo visitante pergunte a /api/spotify/token à toa.
 */
const COOKIE_SINAL = 'nexo_spotify_on';

/**
 * O que o Web Playback SDK exige (streaming + leitura do perfil) e o que o
 * player usa para mandar tocar e ler o que está tocando.
 */
const ESCOPOS = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

const SEIS_MESES = 60 * 60 * 24 * 180;

interface Sessao {
  /** refresh token */
  r: string;
  /** access token */
  a: string;
  /** quando o access token expira (ms) */
  e: number;
  /** nome de exibição no Spotify */
  n: string | null;
}

interface Pedido {
  /** state enviado ao Spotify */
  s: string;
  /** para onde voltar depois do login */
  v: string;
}

/** Como o login terminou — vai na URL de volta (?spotify=...). */
export type Desfecho = 'conectado' | 'recusado' | 'nao-liberado' | 'falhou' | 'off';

function credenciais(): { id: string; secret: string } | null {
  const id = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  return id && secret ? { id, secret } : null;
}

// ---------------------------------------------------------------------------
// Cookie cifrado (AES-256-GCM). Se o segredo do app mudar, os cookies antigos
// simplesmente deixam de abrir — a pessoa só precisa entrar de novo.
// ---------------------------------------------------------------------------
function chave(): Buffer | null {
  const c = credenciais();
  return c ? createHash('sha256').update(`nexo.social/spotify-sessao\0${c.secret}`).digest() : null;
}

function selar(dado: unknown): string {
  const k = chave();
  if (!k) throw new Error('Spotify não configurado.');
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', k, iv);
  const corpo = Buffer.concat([cifra.update(JSON.stringify(dado), 'utf8'), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), corpo]).toString('base64url');
}

function abrir<T>(texto: string | undefined): T | null {
  const k = chave();
  if (!k || !texto) return null;
  try {
    const bruto = Buffer.from(texto, 'base64url');
    const decifra = createDecipheriv('aes-256-gcm', k, bruto.subarray(0, 12));
    decifra.setAuthTag(bruto.subarray(12, 28));
    const claro = Buffer.concat([decifra.update(bruto.subarray(28)), decifra.final()]);
    return JSON.parse(claro.toString('utf8')) as T;
  } catch {
    return null;
  }
}

function opcoes(req: NextRequest, caminho: string, maxAge: number, httpOnly = true) {
  return {
    httpOnly,
    // Em http://localhost o Chrome aceita Secure; em produção é sempre https.
    secure: req.nextUrl.protocol === 'https:' || req.nextUrl.hostname === 'localhost',
    sameSite: 'lax' as const,
    path: caminho,
    maxAge,
  };
}

// ---------------------------------------------------------------------------
// Endereços
// ---------------------------------------------------------------------------

/**
 * Redirect URI — precisa ser IDÊNTICO a um dos cadastrados no painel do app no
 * Spotify. Por padrão é o próprio domínio em que a pessoa está; em previews da
 * Vercel (domínio muda a cada deploy) fixe com SPOTIFY_REDIRECT_URI.
 */
function enderecoDeRetorno(req: NextRequest): string {
  return (process.env.SPOTIFY_REDIRECT_URI || '').trim() || `${req.nextUrl.origin}/api/spotify/retorno`;
}

/** Só caminhos internos: nada de `//outro-site` ou URL absoluta. */
export function voltaSegura(v: string | null | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || v.length > 300) return '/';
  return v;
}

function urlDeVolta(req: NextRequest, volta: string, desfecho: Desfecho): URL {
  const url = new URL(volta, req.nextUrl.origin);
  url.searchParams.set('spotify', desfecho);
  return url;
}

// ---------------------------------------------------------------------------
// Conversa com o Spotify
// ---------------------------------------------------------------------------
interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

type RespostaToken = { ok: true; tokens: Tokens } | { ok: false; revogado: boolean };

async function pedirToken(corpo: Record<string, string>): Promise<RespostaToken> {
  const c = credenciais();
  if (!c) return { ok: false, revogado: false };
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(corpo).toString(),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) {
      // invalid_grant: a pessoa tirou o acesso do app ou o refresh token caiu.
      return { ok: false, revogado: json.error === 'invalid_grant' };
    }
    return { ok: true, tokens: json as Tokens };
  } catch {
    return { ok: false, revogado: false };
  }
}

/**
 * Quem entrou. No modo de desenvolvimento do Spotify, conta que o dono do app
 * não cadastrou no painel recebe 403 aqui — mesmo com o login aceito.
 */
async function quemEntrou(token: string): Promise<{ status: number; nome: string | null }> {
  try {
    const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!res.ok) return { status: res.status, nome: null };
    const json = await res.json();
    return { status: res.status, nome: json.display_name || json.id || null };
  } catch {
    return { status: 0, nome: null };
  }
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

/** GET /api/spotify/entrar?volta=/caminho — manda a pessoa para o Spotify. */
export function iniciarLogin(req: NextRequest): NextResponse {
  const volta = voltaSegura(req.nextUrl.searchParams.get('volta'));
  const c = credenciais();
  if (!c) return NextResponse.redirect(urlDeVolta(req, volta, 'off'));

  const estado = randomBytes(16).toString('base64url');
  const url = new URL(AUTORIZAR);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: c.id,
    scope: ESCOPOS,
    redirect_uri: enderecoDeRetorno(req),
    state: estado,
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE_PEDIDO, selar({ s: estado, v: volta } satisfies Pedido), opcoes(req, '/api/spotify', 600));
  return res;
}

/** GET /api/spotify/retorno — o Spotify devolve a pessoa aqui. */
export async function concluirLogin(req: NextRequest): Promise<NextResponse> {
  const p = req.nextUrl.searchParams;
  const pedido = abrir<Pedido>(req.cookies.get(COOKIE_PEDIDO)?.value);
  const volta = voltaSegura(pedido?.v);

  const terminar = (desfecho: Desfecho) => {
    const res = NextResponse.redirect(urlDeVolta(req, volta, desfecho));
    res.cookies.set(COOKIE_PEDIDO, '', opcoes(req, '/api/spotify', 0));
    return res;
  };

  // Sem o pedido que nós mesmos abrimos, ou com state diferente, o retorno
  // não é de um login iniciado aqui — descarta.
  if (!pedido || !p.get('state') || p.get('state') !== pedido.s) return terminar('falhou');
  if (p.get('error')) return terminar(p.get('error') === 'access_denied' ? 'recusado' : 'falhou');

  const code = p.get('code');
  if (!code) return terminar('falhou');

  const troca = await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: enderecoDeRetorno(req) });
  if (!troca.ok || !troca.tokens.refresh_token) return terminar('falhou');

  const quem = await quemEntrou(troca.tokens.access_token);
  if (quem.status === 403) return terminar('nao-liberado');

  const res = terminar('conectado');
  gravarSessao(req, res, {
    r: troca.tokens.refresh_token,
    a: troca.tokens.access_token,
    e: Date.now() + troca.tokens.expires_in * 1000,
    n: quem.nome,
  });
  return res;
}

function gravarSessao(req: NextRequest, res: NextResponse, sessao: Sessao) {
  res.cookies.set(COOKIE_SESSAO, selar(sessao), opcoes(req, '/api/spotify', SEIS_MESES));
  res.cookies.set(COOKIE_SINAL, '1', opcoes(req, '/', SEIS_MESES, false));
}

function apagarSessao(req: NextRequest, res: NextResponse) {
  res.cookies.set(COOKIE_SESSAO, '', opcoes(req, '/api/spotify', 0));
  res.cookies.set(COOKIE_SINAL, '', opcoes(req, '/', 0, false));
}

const SEM_CACHE = { 'Cache-Control': 'no-store' };

/**
 * GET /api/spotify/token — token de acesso para o player do navegador,
 * renovado aqui quando falta menos de 1 minuto para vencer.
 */
export async function tokenDoPlayer(req: NextRequest): Promise<NextResponse> {
  const sessao = abrir<Sessao>(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!sessao) {
    const res = NextResponse.json({ conectado: false }, { headers: SEM_CACHE });
    if (req.cookies.get(COOKIE_SINAL)) apagarSessao(req, res);
    return res;
  }

  if (sessao.e > Date.now() + 60_000) {
    return NextResponse.json({ conectado: true, token: sessao.a, expiraEm: sessao.e, nome: sessao.n }, { headers: SEM_CACHE });
  }

  const renovado = await pedirToken({ grant_type: 'refresh_token', refresh_token: sessao.r });
  if (!renovado.ok) {
    if (renovado.revogado) {
      const res = NextResponse.json({ conectado: false, expirou: true }, { headers: SEM_CACHE });
      apagarSessao(req, res);
      return res;
    }
    return NextResponse.json({ error: 'Spotify indisponível agora.' }, { status: 502, headers: SEM_CACHE });
  }

  const atual: Sessao = {
    ...sessao,
    a: renovado.tokens.access_token,
    e: Date.now() + renovado.tokens.expires_in * 1000,
    // O Spotify às vezes gira o refresh token; quando manda um novo, vale ele.
    r: renovado.tokens.refresh_token || sessao.r,
  };
  const res = NextResponse.json({ conectado: true, token: atual.a, expiraEm: atual.e, nome: atual.n }, { headers: SEM_CACHE });
  gravarSessao(req, res, atual);
  return res;
}

/** POST /api/spotify/sair — desliga a conta do Spotify neste navegador. */
export function encerrar(req: NextRequest): NextResponse {
  const res = NextResponse.json({ ok: true }, { headers: SEM_CACHE });
  apagarSessao(req, res);
  return res;
}
