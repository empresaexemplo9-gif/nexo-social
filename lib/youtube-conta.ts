import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from './api-helpers';
import { isPlatformAdmin } from './auth';

const SESSION = 'nexo_youtube';
const REQUEST = 'nexo_youtube_oauth';
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api' };
const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
interface Session { uid: string; access: string; refresh: string; expires: number }
interface Pending { uid: string; state: string; verifier: string; redirect: string; expires: number; next?: string }
function config() {
  // Pares completos: nunca combinar o ID de um app com o segredo de outro.
  const pairs = [
    [process.env.YOUTUBE_OAUTH_CLIENT_ID, process.env.YOUTUBE_OAUTH_CLIENT_SECRET],
    [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET],
    [process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET],
  ];
  const pair = pairs.find(([id, secret]) => id?.trim() && secret?.trim());
  return { id: pair?.[0]?.trim(), secret: pair?.[1]?.trim(),
    key: process.env.YOUTUBE_SESSION_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() };
}
export function youtubeContaConfigurada() { const c = config(); return Boolean(c.id && c.secret && c.key); }
function returnPath(value?: string | null) {
  // Apenas páginas conhecidas; não aceitar URLs externas, barras duplas ou callbacks.
  if (!value || !/^\/(?:conta|shorts)?(?:#[a-zA-Z0-9_-]+)?$/.test(value)) return '/conta#youtube';
  return value;
}
function redirectFor(origin: string) {
  try {
    const uri = new URL(process.env.YOUTUBE_OAUTH_REDIRECT_URI?.trim() || `${origin}/api/youtube/retorno`);
    if (uri.pathname !== '/api/youtube/retorno' || uri.search || uri.hash || uri.username || uri.password) return null;
    if (uri.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && uri.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(uri.hostname))) return null;
    return uri;
  } catch { return null; }
}
function seal(data: unknown) {
  const key = config().key;
  if (!key) throw Error('Conexão não configurada');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(`youtube:${key}`).digest(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
function unseal<T>(value?: string): T | null {
  try {
    const key = config().key;
    if (!key || !value) return null;
    const raw = Buffer.from(value, 'base64url');
    const cipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(`youtube:${key}`).digest(), raw.subarray(0,12));
    cipher.setAuthTag(raw.subarray(12,28));
    return JSON.parse(Buffer.concat([cipher.update(raw.subarray(28)), cipher.final()]).toString('utf8'));
  } catch { return null; }
}
function save(session: Session) {
  const maxAge = session.refresh ? 180 * 86400 : Math.max(1, Math.floor((session.expires - Date.now()) / 1000));
  cookies().set(SESSION, seal(session), { ...opts, maxAge });
}
function clear() { cookies().set(SESSION, '', { ...opts, maxAge: 0 }); }
async function exchange(params: Record<string,string>) {
  const c = config();
  const res = await fetch('https://oauth2.googleapis.com/token', { method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({...params,client_id:c.id || '',client_secret:c.secret || ''}),
    cache:'no-store', signal:AbortSignal.timeout(12000) });
  return { ok:res.ok, data:await res.json() };
}
function expiresAt(value: unknown) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Date.now() + Math.min(seconds, 86400) * 1000 : null;
}
export async function youtubeAccess(uid: string): Promise<string | null> {
  const s = unseal<Session>(cookies().get(SESSION)?.value);
  if (!s || s.uid !== uid || !youtubeContaConfigurada()) return null;
  if (s.expires > Date.now()+60000) return s.access;
  if (!s.refresh) { clear(); return null; }
  try {
    const res = await exchange({grant_type:'refresh_token',refresh_token:s.refresh});
    const expires = expiresAt(res.data.expires_in);
    if (!res.ok || !res.data.access_token || !expires) {
      if (res.data.error === 'invalid_grant') clear();
      return null;
    }
    save({...s,access:res.data.access_token,refresh:res.data.refresh_token || s.refresh,expires});
    return res.data.access_token;
  } catch { return null; }
}
export async function youtubeApi(token: string, path: string, params: Record<string,string>) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams(params)}`, {
    headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const reason = data?.error?.errors?.[0]?.reason;
    if (reason === 'accessNotConfigured' || reason === 'serviceDisabled') throw Error('api_desativada');
    throw Error('youtube_indisponivel');
  }
  return res.json();
}
export async function youtubeAccount(request: Request, action: string) {
  const incoming = new URL(request.url);
  const origin = incoming.origin;
  const query = incoming.searchParams;
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders });
  const finish = (status: string, next?: string) => {
    const target = new URL(returnPath(next), origin);
    target.searchParams.set('youtube', status);
    return NextResponse.redirect(target, { headers: privateHeaders });
  };
  const {user} = await getSession();
  if (!user || user.is_anonymous) {
    if (action === 'entrar' || action === 'retorno') {
      const login = new URL('/login', origin);
      login.searchParams.set('next', '/conta?youtube=sessao_expirada#youtube');
      return NextResponse.redirect(login, { headers: privateHeaders });
    }
    return json({error:'Faça login.'},401);
  }
  if (action === 'entrar') {
    const next = returnPath(query.get('next'));
    if (!youtubeContaConfigurada()) return finish('indisponivel', next);
    const redirect = redirectFor(origin);
    if (!redirect) return finish('configuracao', next);
    if (redirect.origin !== origin) return finish('dominio', next);
    const pending: Pending = {uid:user.id,state:randomBytes(24).toString('base64url'),verifier:randomBytes(48).toString('base64url'),redirect:redirect.href,expires:Date.now()+600000,next};
    cookies().set(REQUEST,seal(pending),{...opts,maxAge:600});
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({client_id:config().id!,redirect_uri:redirect.href,response_type:'code',scope:SCOPE,
      access_type:'offline',prompt:'consent select_account',state:pending.state,code_challenge_method:'S256',
      code_challenge:createHash('sha256').update(pending.verifier).digest('base64url')}).toString();
    return NextResponse.redirect(url, { headers: privateHeaders });
  }
  if (action === 'retorno') {
    const p = unseal<Pending>(cookies().get(REQUEST)?.value);
    cookies().set(REQUEST,'',{...opts,maxAge:0});
    if (!p || p.uid !== user.id || query.get('state') !== p.state) return finish('falhou');
    if (p.expires < Date.now()) return finish('expirado', p.next);
    if (query.get('error')) return finish(query.get('error') === 'access_denied' ? 'cancelado' : 'falhou', p.next);
    const code = query.get('code');
    if (!code) return finish('falhou', p.next);
    try {
      const res = await exchange({grant_type:'authorization_code',code,code_verifier:p.verifier,redirect_uri:p.redirect});
      if (!res.ok) return finish(['invalid_client', 'unauthorized_client'].includes(res.data.error) ? 'configuracao' : res.data.error === 'invalid_grant' ? 'expirado' : 'falhou', p.next);
      const expires = expiresAt(res.data.expires_in);
      if (!res.data.access_token || !expires) return finish('falhou', p.next);
      if (!String(res.data.scope || '').split(' ').includes(SCOPE)) return finish('permissao', p.next);
      await youtubeApi(res.data.access_token,'channels',{part:'id',mine:'true'});
      // Google pode não emitir outro refresh_token. Não reutilizar um de outra conta.
      save({uid:user.id,access:res.data.access_token,refresh:res.data.refresh_token || '',expires});
      return finish('conectado', p.next);
    } catch(e) { return finish(e instanceof Error && e.message === 'api_desativada' ? 'api_desativada' : 'falhou', p.next); }
  }
  if (action === 'sair') {
    if (request.headers.get('origin') && request.headers.get('origin') !== origin) return json({error:'Origem inválida.'},403);
    const session = unseal<Session>(cookies().get(SESSION)?.value);
    if (session?.uid === user.id) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({token:session.refresh || session.access}),signal:AbortSignal.timeout(10000)});
        // Um token já revogado também permite encerrar a sessão local.
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.error !== 'invalid_token') throw Error('revocation failed');
        }
      } catch { return json({error:'Não foi possível desconectar agora. Tente novamente.'},502); }
    }
    clear(); return json({conectado:false});
  }
  const redirect = redirectFor(origin);
  const configured = youtubeContaConfigurada();
  const setup = isPlatformAdmin(user.email) ? {
    credenciais: Boolean(config().id && config().secret),
    chaveSessao: Boolean(config().key),
    retorno: redirect?.href ?? null,
    dominioCorreto: redirect?.origin === origin,
  } : undefined;
  return json({configurado: configured && Boolean(redirect) && redirect?.origin === origin,
    conectado:Boolean(await youtubeAccess(user.id)), setup});
}

/** Dados pessoais nunca entram no cache compartilhado. A seleção é nossa, não o feed privado do YouTube. */
export async function preferenciasYoutube(uid: string, shorts = false, rodada = 0) {
  const access = await youtubeAccess(uid);
  if (!access) return { conectado:false, videos:[] as any[] };
  try {
    const [liked, subscriptions] = await Promise.all([
      youtubeApi(access,'videos',{part:'snippet,contentDetails,status',myRating:'like',maxResults:'50'}),
      youtubeApi(access,'subscriptions',{part:'snippet',mine:'true',maxResults:'50',order:'relevance'}),
    ]);
    let items: any[] = liked.items || [];
    const channels: string[] = (subscriptions.items || []).map((s:any)=>s.snippet?.resourceId?.channelId).filter(Boolean);
    const offset = (Math.floor(Date.now()/3600000)+rodada*3)%Math.max(1,channels.length);
    const selected = [...channels.slice(offset),...channels.slice(0,offset)].slice(0,3);
    if (selected.length) {
      const data = await youtubeApi(access,'channels',{part:'contentDetails',id:selected.join(',')});
      const playlists = (data.items || []).map((c:any)=>c.contentDetails?.relatedPlaylists?.uploads).filter(Boolean);
      const recent = await Promise.all(playlists.map((playlistId:string)=>youtubeApi(access,'playlistItems',{part:'contentDetails',playlistId,maxResults:'10'})));
      const ids = recent.flatMap(p=>(p.items || []).map((v:any)=>v.contentDetails?.videoId)).filter(Boolean);
      if(ids.length) items = [...items,...(await youtubeApi(access,'videos',{part:'snippet,contentDetails,status',id:ids.join(',')})).items || []];
    }
    const videos = items.filter((v:any,i:number) => {
      if (!v.id || items.findIndex((x:any)=>x.id===v.id)!==i || v.status?.embeddable===false) return false;
      if (!shorts) return v.snippet?.categoryId === '10';
      // A API não identifica Shorts por duração: só aceitar sinal explícito no título/descrição.
      return /#shorts\b/i.test(`${v.snippet?.title} ${v.snippet?.description}`) && /^PT(?:(?:[012]M)?(?:\d+S)?|3M)$/.test(v.contentDetails?.duration || '');
    }).map((v:any)=>({id:v.id,title:v.snippet.title,channel:v.snippet.channelTitle,thumb:v.snippet.thumbnails?.medium?.url || null}));
    return {conectado:true,videos};
  } catch { return {conectado:true,indisponivel:true,videos:[] as any[]}; }
}
