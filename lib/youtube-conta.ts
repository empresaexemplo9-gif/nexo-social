import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from './api-helpers';

const SESSION = 'nexo_youtube';
const REQUEST = 'nexo_youtube_oauth';
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api' };
interface Session { uid: string; access: string; refresh: string; expires: number }
interface Pending { uid: string; state: string; verifier: string; redirect: string; expires: number }
function config() {
  return { id: process.env.YOUTUBE_OAUTH_CLIENT_ID?.trim(), secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim(),
    key: process.env.YOUTUBE_SESSION_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() };
}
export function youtubeContaConfigurada() { const c = config(); return Boolean(c.id && c.secret && c.key); }
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
function save(session: Session) { cookies().set(SESSION, seal(session), { ...opts, maxAge: 180 * 86400 }); }
function clear() { cookies().set(SESSION, '', { ...opts, maxAge: 0 }); }
async function exchange(params: Record<string,string>) {
  const c = config();
  const res = await fetch('https://oauth2.googleapis.com/token', { method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({...params,client_id:c.id || '',client_secret:c.secret || ''}),
    cache:'no-store', signal:AbortSignal.timeout(12000) });
  const data = await res.json();
  return { ok:res.ok, data };
}
export async function youtubeAccess(uid: string): Promise<string | null> {
  const s = unseal<Session>(cookies().get(SESSION)?.value);
  if (!s || s.uid !== uid || !youtubeContaConfigurada()) return null;
  if (s.expires > Date.now()+60000) return s.access;
  try {
    const res = await exchange({grant_type:'refresh_token',refresh_token:s.refresh});
    if (!res.ok || !res.data.access_token) {
      if (res.data.error === 'invalid_grant') clear();
      return null;
    }
    const next = {...s,access:res.data.access_token,refresh:res.data.refresh_token || s.refresh,expires:Date.now()+Number(res.data.expires_in)*1000};
    save(next); return next.access;
  } catch { return null; }
}
export async function youtubeApi(token: string, path: string, params: Record<string,string>) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams(params)}`, {
    headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(12000),
  });
  if (!res.ok) throw Error('Não foi possível consultar sua conta do YouTube.');
  return res.json();
}
export async function youtubeAccount(request: Request, action: string) {
  const {user} = await getSession();
  if (!user || user.is_anonymous) return NextResponse.json({error:'Faça login.'},{status:401});
  const origin = new URL(request.url).origin;
  const finish = (status: string) => NextResponse.redirect(new URL(`/?youtube=${status}#trilha`, origin));
  if (action === 'entrar') {
    if (!youtubeContaConfigurada()) return finish('indisponivel');
    const redirect = process.env.YOUTUBE_OAUTH_REDIRECT_URI?.trim() || `${origin}/api/youtube/retorno`;
    // O cookie do pedido precisa chegar ao mesmo domínio do retorno.
    if (new URL(redirect).origin !== origin) return finish('dominio');
    const pending: Pending = {uid:user.id,state:randomBytes(24).toString('base64url'),verifier:randomBytes(48).toString('base64url'),redirect,expires:Date.now()+600000};
    cookies().set(REQUEST,seal(pending),{...opts,maxAge:600});
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({client_id:config().id!,redirect_uri:redirect,response_type:'code',scope:SCOPE,
      access_type:'offline',prompt:'consent',state:pending.state,code_challenge_method:'S256',
      code_challenge:createHash('sha256').update(pending.verifier).digest('base64url')}).toString();
    return NextResponse.redirect(url);
  }
  if (action === 'retorno') {
    const p = unseal<Pending>(cookies().get(REQUEST)?.value);
    cookies().set(REQUEST,'',{...opts,maxAge:0});
    const query = new URL(request.url).searchParams;
    if (!p || p.uid !== user.id || p.expires < Date.now() || query.get('state') !== p.state) return finish('falhou');
    if (query.get('error')) return finish('cancelado');
    const code = query.get('code');
    if (!code) return finish('falhou');
    try {
      const res = await exchange({grant_type:'authorization_code',code,code_verifier:p.verifier,redirect_uri:p.redirect});
      if (!res.ok || !res.data.access_token || !res.data.refresh_token || !String(res.data.scope || '').split(' ').includes(SCOPE)) return finish('falhou');
      await youtubeApi(res.data.access_token,'channels',{part:'id',mine:'true'});
      save({uid:user.id,access:res.data.access_token,refresh:res.data.refresh_token,expires:Date.now()+Number(res.data.expires_in)*1000});
      return finish('conectado');
    } catch { return finish('falhou'); }
  }
  if (action === 'sair') {
    const session = unseal<Session>(cookies().get(SESSION)?.value);
    if (session?.uid === user.id) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({token:session.refresh}),signal:AbortSignal.timeout(10000)});
        if (!res.ok) throw Error('revocation failed');
      } catch { return NextResponse.json({error:'Não foi possível desconectar agora. Tente novamente.'},{status:502}); }
    }
    clear(); return NextResponse.json({conectado:false});
  }
  return NextResponse.json({configurado:youtubeContaConfigurada(),conectado:Boolean(await youtubeAccess(user.id))}, {headers:{'Cache-Control':'private, no-store'}});
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
