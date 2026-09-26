import 'server-only';

// Registro central das integrações externas.
//
// Cada provedor declara: quais variáveis de ambiente precisa, como testar a
// conexão e (quando aplicável) como importar eventos. Tudo roda SOMENTE no
// servidor — as chaves nunca chegam ao navegador.
//
// O objetivo do `test()` é diagnóstico: quando falha, devolvemos o status HTTP,
// a mensagem do provedor e uma DICA do que fazer. É isso que o painel mostra.

export type ProviderId =
  | 'nominatim'
  | 'ibge'
  | 'deezer'
  | 'spotify'
  | 'lastfm'
  | 'youtube'
  | 'ticketmaster'
  | 'bandsintown'
  | 'espn'
  | 'thesportsdb'
  | 'sympla'
  | 'eventbrite';

export type ProviderKind = 'local' | 'eventos' | 'musica' | 'video' | 'esporte';

export interface ProviderDef {
  id: ProviderId;
  label: string;
  kind: ProviderKind;
  /** Variáveis de ambiente necessárias (vazio = não precisa de chave). */
  envVars: string[];
  docsUrl: string;
  /** Para que serve dentro do nexo-social. */
  purpose: string;
  /** Suporta importar eventos para o banco. */
  canImport?: boolean;
  /** Observação honesta (limites, cobertura, licença). */
  caveat?: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'nominatim',
    label: 'Nominatim / OpenStreetMap',
    kind: 'local',
    envVars: [],
    docsUrl: 'https://nominatim.org/release-docs/latest/api/Reverse/',
    purpose: 'Descobre a cidade real do usuário a partir do GPS.',
    caveat: 'Máximo de 1 requisição por segundo. Faça cache do resultado.',
  },
  {
    id: 'ibge',
    label: 'IBGE — Localidades',
    kind: 'local',
    envVars: [],
    docsUrl: 'https://servicodados.ibge.gov.br/api/docs/localidades',
    purpose: 'Lista oficial dos municípios brasileiros.',
    caveat: 'Não retorna latitude/longitude — é preciso geocodificar.',
  },
  {
    id: 'deezer',
    label: 'Deezer',
    kind: 'musica',
    envVars: [],
    docsUrl: 'https://developers.deezer.com/api',
    purpose: 'Busca de faixas e artistas para vincular aos eventos.',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    kind: 'musica',
    envVars: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    docsUrl: 'https://developer.spotify.com/dashboard',
    purpose: 'Artistas e playlists ligados aos temas e eventos; "Entrar com Spotify" para ouvir completo (Premium).',
    caveat: 'Login de usuários: cadastre https://SEU-DOMINIO/api/spotify/retorno como Redirect URI. No modo de desenvolvimento, só 5 contas cadastradas no painel conseguem entrar.',
  },
  {
    id: 'lastfm',
    label: 'Last.fm',
    kind: 'musica',
    envVars: ['LASTFM_API_KEY'],
    docsUrl: 'https://www.last.fm/api/account/create',
    purpose: 'Artistas similares — melhora a recomendação por afinidade.',
    caveat: 'Gratuito apenas para uso não comercial.',
  },
  {
    id: 'youtube',
    label: 'YouTube Data API v3',
    kind: 'video',
    envVars: ['YOUTUBE_API_KEY'],
    docsUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    purpose: 'Vídeos relacionados aos eventos e temas.',
    caveat: 'Cota de 10.000 unidades/dia; cada busca custa 100. Use cache.',
  },
  {
    id: 'ticketmaster',
    label: 'Ticketmaster Discovery',
    kind: 'eventos',
    envVars: ['TICKETMASTER_API_KEY'],
    docsUrl: 'https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/',
    purpose: 'Importa shows E jogos reais para a agenda, com link de compra.',
    canImport: true,
    caveat: 'Única API com busca pública de verdade — cobre música e esporte. No Brasil a cobertura é parcial: grandes casas, turnês e alguns jogos.',
  },
  {
    id: 'bandsintown',
    label: 'Bandsintown',
    kind: 'eventos',
    envVars: ['BANDSINTOWN_APP_ID'],
    docsUrl: 'https://rest.bandsintown.com/',
    purpose: 'Shows por artista.',
    caveat: 'Uso comercial exige autorização da plataforma.',
  },
  {
    id: 'sympla',
    label: 'Sympla',
    kind: 'eventos',
    envVars: ['SYMPLA_API_TOKEN'],
    docsUrl: 'https://developers.sympla.com.br/api-doc/index.html',
    purpose: 'Importa os eventos da SUA conta Sympla, com link direto de compra.',
    canImport: true,
    caveat: 'A API da Sympla devolve apenas os eventos do dono do token — não é busca no catálogo dela. Serve para quem organiza; para descobrir evento de terceiro, use o Ticketmaster. Eventos cancelados e privados são descartados na importação.',
  },
  {
    id: 'eventbrite',
    label: 'Eventbrite',
    kind: 'eventos',
    envVars: ['EVENTBRITE_TOKEN'],
    docsUrl: 'https://www.eventbrite.com/platform/api-keys',
    purpose: 'Importa os eventos da SUA organização no Eventbrite.',
    canImport: true,
    caveat: 'O Eventbrite removeu a busca pública de eventos em 2020: a API só lista os eventos da própria organização.',
  },
  {
    id: 'espn',
    label: 'ESPN — Placar público',
    kind: 'esporte',
    envVars: [],
    docsUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard',
    purpose: 'Placar ao vivo, agenda e resultados de futebol, NBA, tênis e Fórmula 1.',
    caveat: 'Endpoint público e sem cadastro, porém não documentado oficialmente — pode mudar sem aviso. O quadro degrada com aviso se cair.',
  },
  {
    id: 'thesportsdb',
    label: 'TheSportsDB',
    kind: 'esporte',
    envVars: [],
    docsUrl: 'https://www.thesportsdb.com/free_sports_api',
    purpose: 'Vôlei, MotoGP e o link de melhores momentos de cada partida.',
    caveat: 'A chave pública de teste ("3") tem limite de requisições. Para uso intenso, o plano Patreon libera chave própria.',
  },
];

export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

function envValue(name: string): string {
  return (process.env[name] || '').trim();
}

/** Quais variáveis exigidas estão faltando. */
export function missingEnv(def: ProviderDef): string[] {
  return def.envVars.filter((v) => !envValue(v));
}

export interface TestResult {
  ok: boolean;
  status?: number;
  message: string;
  /** O que o administrador deve fazer para corrigir. */
  hint?: string;
  /** Amostra do retorno, para confirmar que veio dado de verdade. */
  sample?: string;
  durationMs: number;
}

const TIMEOUT_MS = 12000;

/** fetch com timeout — evita o painel ficar pendurado num provedor lento. */
async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        // Nominatim exige identificação; os demais aceitam sem problema.
        'User-Agent': 'nexo-social/1.0 (+https://nexo-social-two.vercel.app)',
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Traduz falhas comuns em mensagem + dica acionável. */
function explainHttp(status: number, body: string, def: ProviderDef): { message: string; hint: string } {
  const short = body.replace(/\s+/g, ' ').slice(0, 220) || '(sem corpo)';
  const keyless = def.envVars.length === 0;

  // Bloqueio de rede (proxy/firewall corporativo) se disfarça de 403 —
  // não confundir o administrador com um problema de credencial.
  if (/not in allowlist|egress|blocked by|proxy/i.test(body)) {
    return {
      message: `Bloqueado pela rede (${status}): ${short}`,
      hint: 'A saída de rede do servidor bloqueou este domínio. Em produção (Vercel) normalmente funciona; se persistir, libere o domínio no firewall.',
    };
  }

  switch (true) {
    case status === 401:
      return {
        message: `Não autorizado (401): ${short}`,
        hint: keyless
          ? 'O provedor recusou a requisição. Verifique se ele passou a exigir identificação (User-Agent) ou cadastro.'
          : `A chave de ${def.label} é inválida ou expirou. Gere outra em ${def.docsUrl} e atualize ${def.envVars.join(', ')} na Vercel.`,
      };
    case status === 403:
      return {
        message: `Acesso negado (403): ${short}`,
        hint: keyless
          ? 'Requisição recusada — normalmente é limite de uso ou bloqueio por falta de User-Agent identificando a aplicação.'
          : 'A chave existe mas não tem permissão, a API não foi ativada no projeto, ou a cota diária acabou. Verifique as restrições da chave.',
      };
    case status === 404:
      return { message: `Não encontrado (404): ${short}`, hint: 'O endpoint mudou ou o recurso consultado não existe.' };
    case status === 429:
      return {
        message: `Limite de requisições (429): ${short}`,
        hint: 'Você excedeu o limite do plano gratuito. Aguarde a janela reabrir e ative cache antes de tentar de novo.',
      };
    case status >= 500:
      return { message: `Falha no servidor do provedor (${status}): ${short}`, hint: 'Problema do lado deles. Tente novamente mais tarde.' };
    default:
      return { message: `HTTP ${status}: ${short}`, hint: 'Resposta inesperada — confira a documentação do provedor.' };
  }
}

function explainNetwork(e: unknown, def: ProviderDef): { message: string; hint: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (/abort/i.test(msg)) {
    return { message: `Tempo esgotado (${TIMEOUT_MS / 1000}s)`, hint: 'O provedor não respondeu a tempo. Tente novamente.' };
  }
  return {
    message: `Falha de rede: ${msg}`,
    hint: `O servidor não conseguiu alcançar ${def.label}. Se estiver rodando localmente atrás de proxy/firewall, teste em produção.`,
  };
}

/** Executa o teste de conexão de um provedor. */
export async function testProvider(id: ProviderId): Promise<TestResult> {
  const def = getProvider(id);
  const started = Date.now();
  const done = (r: Omit<TestResult, 'durationMs'>): TestResult => ({ ...r, durationMs: Date.now() - started });

  if (!def) return done({ ok: false, message: `Provedor desconhecido: ${id}` });

  const missing = missingEnv(def);
  if (missing.length) {
    return done({
      ok: false,
      message: `Faltam credenciais: ${missing.join(', ')}`,
      hint: `Crie a chave em ${def.docsUrl} e adicione ${missing.join(', ')} em Vercel → Settings → Environment Variables. Depois faça Redeploy.`,
    });
  }

  try {
    switch (def.id) {
      case 'nominatim': {
        const res = await safeFetch('https://nominatim.openstreetmap.org/reverse?lat=-23.5505&lon=-46.6333&format=json&zoom=10');
        if (!res.ok) return done({ ok: false, status: res.status, ...explainHttp(res.status, await res.text(), def) });
        const j = await res.json();
        const city = j?.address?.city || j?.address?.town || j?.address?.municipality || j?.display_name;
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `Reverse de -23.55,-46.63 → ${city}` });
      }
      case 'ibge': {
        const res = await safeFetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
        if (!res.ok) return done({ ok: false, status: res.status, ...explainHttp(res.status, await res.text(), def) });
        const j = await res.json();
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `${Array.isArray(j) ? j.length : 0} estados retornados` });
      }
      case 'deezer': {
        const res = await safeFetch('https://api.deezer.com/search?q=jazz&limit=1');
        if (!res.ok) return done({ ok: false, status: res.status, ...explainHttp(res.status, await res.text(), def) });
        const j = await res.json();
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `Primeiro resultado: ${j?.data?.[0]?.title ?? '—'}` });
      }
      case 'spotify': {
        const basic = Buffer.from(`${envValue('SPOTIFY_CLIENT_ID')}:${envValue('SPOTIFY_CLIENT_SECRET')}`).toString('base64');
        const res = await safeFetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=client_credentials',
        });
        if (!res.ok) {
          const body = await res.text();
          const base = explainHttp(res.status, body, def);
          if (res.status === 400 || res.status === 401) {
            base.hint = 'Client ID ou Client Secret incorretos. Copie novamente no painel do Spotify (Settings do app).';
          }
          return done({ ok: false, status: res.status, ...base });
        }
        const j = await res.json();
        return done({ ok: true, status: res.status, message: 'Autenticado com sucesso', sample: `Token válido por ${j.expires_in}s` });
      }
      case 'lastfm': {
        const res = await safeFetch(
          `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=radiohead&limit=1&format=json&api_key=${encodeURIComponent(envValue('LASTFM_API_KEY'))}`,
        );
        const body = await res.text();
        if (!res.ok) return done({ ok: false, status: res.status, ...explainHttp(res.status, body, def) });
        const j = JSON.parse(body || '{}');
        if (j.error) {
          return done({
            ok: false,
            status: res.status,
            message: `Erro ${j.error}: ${j.message}`,
            hint: j.error === 10 ? 'Chave de API inválida — gere outra em last.fm/api/account/create.' : 'Confira os parâmetros da chamada.',
          });
        }
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `Similar a Radiohead: ${j?.similarartists?.artist?.[0]?.name ?? '—'}` });
      }
      case 'youtube': {
        // Endpoint barato (1 unidade) — não gasta a cota de busca (100).
        const res = await safeFetch(
          `https://www.googleapis.com/youtube/v3/i18nRegions?part=snippet&hl=pt_BR&key=${encodeURIComponent(envValue('YOUTUBE_API_KEY'))}`,
        );
        const body = await res.text();
        if (!res.ok) {
          const base = explainHttp(res.status, body, def);
          if (/API key not valid/i.test(body)) base.hint = 'Chave inválida. Gere outra no Google Cloud → Credenciais.';
          if (/has not been used|disabled/i.test(body)) base.hint = 'Ative a "YouTube Data API v3" no seu projeto do Google Cloud.';
          if (/quota/i.test(body)) base.hint = 'Cota diária esgotada (10.000 unidades). Ative cache e tente amanhã.';
          return done({ ok: false, status: res.status, ...base });
        }
        const j = JSON.parse(body || '{}');
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `${j?.items?.length ?? 0} regiões retornadas (custo: 1 unidade)` });
      }
      case 'sympla': {
        // v1.6.0 exige published, timezone e sort; sort é minúsculo.
        const res = await safeFetch(
          'https://api.sympla.com.br/public/v1.6.0/events?published=all&timezone=America/Sao_Paulo&sort=asc&page_size=1',
          { headers: { s_token: envValue('SYMPLA_API_TOKEN') } },
        );
        const body = await res.text();
        if (!res.ok) {
          const base = explainHttp(res.status, body, def);
          if (res.status === 401 || res.status === 403) {
            base.hint = 'Token inválido. Gere outro em Sympla → Minha conta → Integrações → Tokens de API.';
          }
          return done({ ok: false, status: res.status, ...base });
        }
        const j = JSON.parse(body || '{}');
        const n = Array.isArray(j?.data) ? j.data.length : 0;
        return done({
          ok: true,
          status: res.status,
          message: 'Conexão OK',
          sample: n
            ? `Primeiro evento: ${j.data[0]?.name} (total: ${j?.pagination?.quantity ?? '?'})`
            : 'Token válido, mas esta conta não tem eventos.',
        });
      }
      case 'eventbrite': {
        const res = await safeFetch('https://www.eventbriteapi.com/v3/users/me/', {
          headers: { Authorization: `Bearer ${envValue('EVENTBRITE_TOKEN')}` },
        });
        const body = await res.text();
        if (!res.ok) {
          const base = explainHttp(res.status, body, def);
          if (res.status === 401) base.hint = 'Token inválido. Gere um Private Token em eventbrite.com/platform/api-keys.';
          return done({ ok: false, status: res.status, ...base });
        }
        const j = JSON.parse(body || '{}');
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `Conta: ${j?.name ?? j?.emails?.[0]?.email ?? '—'}` });
      }
      case 'espn': {
        const res = await safeFetch('https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard');
        if (!res.ok) return done({ ok: false, status: res.status, ...explainHttp(res.status, await res.text(), def) });
        const j = await res.json();
        const n = Array.isArray(j?.events) ? j.events.length : 0;
        return done({
          ok: true,
          status: res.status,
          message: 'Conexão OK',
          sample: `Brasileirão: ${n} partida(s) no quadro atual${n ? ` — ex.: ${j.events[0]?.name}` : ''}`,
        });
      }
      case 'thesportsdb': {
        const res = await safeFetch('https://www.thesportsdb.com/api/v1/json/3/all_leagues.php');
        if (!res.ok) return done({ ok: false, status: res.status, ...explainHttp(res.status, await res.text(), def) });
        const j = await res.json();
        const n = Array.isArray(j?.leagues) ? j.leagues.length : 0;
        if (!n) {
          return done({
            ok: false,
            status: res.status,
            message: 'Respondeu sem ligas',
            hint: 'A chave pública de teste pode ter sido limitada. Cadastre uma chave própria em thesportsdb.com/free_sports_api.',
          });
        }
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `${n} ligas no catálogo` });
      }
      case 'ticketmaster': {
        const res = await safeFetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?countryCode=BR&size=1&apikey=${encodeURIComponent(envValue('TICKETMASTER_API_KEY'))}`,
        );
        const body = await res.text();
        if (!res.ok) {
          const base = explainHttp(res.status, body, def);
          if (res.status === 401) base.hint = 'Consumer Key inválida. Copie novamente em developer.ticketmaster.com → My Apps.';
          return done({ ok: false, status: res.status, ...base });
        }
        const j = JSON.parse(body || '{}');
        const total = j?.page?.totalElements ?? 0;
        return done({
          ok: true,
          status: res.status,
          message: 'Conexão OK',
          sample: `${total} evento(s) encontrados no Brasil`,
          hint: total === 0 ? 'A chave funciona, mas não há eventos no Brasil no momento — a cobertura por aqui é parcial.' : undefined,
        });
      }
      case 'bandsintown': {
        const res = await safeFetch(
          `https://rest.bandsintown.com/artists/coldplay?app_id=${encodeURIComponent(envValue('BANDSINTOWN_APP_ID'))}`,
        );
        const body = await res.text();
        if (!res.ok) return done({ ok: false, status: res.status, ...explainHttp(res.status, body, def) });
        const j = JSON.parse(body || '{}');
        return done({ ok: true, status: res.status, message: 'Conexão OK', sample: `Artista de teste: ${j?.name ?? '—'}` });
      }
      default:
        return done({ ok: false, message: 'Teste não implementado para este provedor.' });
    }
  } catch (e) {
    return done({ ok: false, ...explainNetwork(e, def) });
  }
}

// ---------------------------------------------------------------------------
// Importação de eventos (Ticketmaster)
// ---------------------------------------------------------------------------

import type { CategorySlug } from './data';

/** Mapeia o segmento do Ticketmaster para os temas do nexo-social. */
function mapSegment(segment?: string): CategorySlug {
  const s = (segment || '').toLowerCase();
  if (/music|música/.test(s)) return 'musica';
  if (/sport|esporte/.test(s)) return 'esporte';
  if (/arts|theatre|theater|film|teatro/.test(s)) return 'cultura';
  return 'cultura';
}

// --- Leitura de um evento da Discovery v2 ------------------------------------
// As funções abaixo existem porque a resposta real da API tem armadilhas que
// não aparecem na documentação. Cada uma resolve uma delas.

/**
 * Data no fuso de QUEM VAI AO EVENTO, não no nosso.
 *
 * `dates.start.dateTime` é UTC. Formatar em America/Sao_Paulo faz um show de
 * 18/set às 20:30 em Las Vegas aparecer como 19/set às 00:30 — a agenda mostra
 * o dia errado. A própria resposta traz `dates.timezone`; é ele que manda.
 */
function dataDoEvento(ev: any): string {
  const iso: string | undefined = ev?.dates?.start?.dateTime;
  const tz: string = ev?.dates?.timezone || ev?._embedded?.venues?.[0]?.timezone || 'America/Sao_Paulo';
  if (!iso) {
    // Horário a confirmar: a API manda só `localDate`.
    const d = ev?.dates?.start?.localDate;
    return d ? d.split('-').reverse().join('/') : '';
  }
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: tz });
  } catch {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
}

/**
 * Melhor imagem: a maior que não seja miniatura nem placeholder.
 *
 * `images.find(i => i.width >= 640)` pega a PRIMEIRA da lista, e a ordem que a
 * API devolve é arbitrária — dá para cair numa de 640×360 tendo uma de 2048
 * logo abaixo. `fallback: true` marca a arte genérica de categoria, que não
 * tem nada a ver com o evento.
 */
export function melhorImagem(ev: any): string {
  const imgs: any[] = Array.isArray(ev?.images) ? ev.images : [];
  const boas = imgs.filter((i) => !i.fallback && i.width >= 640);
  const pool = boas.length ? boas : imgs.filter((i) => i.width >= 640);
  if (!pool.length) return imgs[0]?.url ?? '';
  // 16_9 primeiro: é o formato dos cards. Entre iguais, a de maior largura.
  const dezesseisNove = pool.filter((i) => i.ratio === '16_9');
  const escolha = (dezesseisNove.length ? dezesseisNove : pool).sort((a, b) => b.width - a.width)[0];
  return escolha?.url ?? '';
}

/**
 * Descrição de verdade, não o aviso jurídico.
 *
 * No catálogo real, `info` costuma vir IGUAL a `pleaseNote` e conter o aviso de
 * luzes piscantes, hápticos e taxas — texto que assusta e não descreve nada.
 * Quando os dois campos coincidem, ou quando o texto começa com "PLEASE NOTE",
 * é aviso: aí montamos uma frase a partir do que o evento realmente é.
 */
export function descricaoEvento(ev: any): string {
  const info = String(ev?.info ?? '').trim();
  const aviso = String(ev?.pleaseNote ?? '').trim();
  const ehAviso = !info || info === aviso || /^please note/i.test(info);

  if (!ehAviso) return info.replace(/\s+/g, ' ').slice(0, 600);

  const atracao = ev?._embedded?.attractions?.[0]?.name;
  const local = ev?._embedded?.venues?.[0]?.name;
  const cidade = ev?._embedded?.venues?.[0]?.city?.name;
  const genero = ev?.classifications?.[0]?.genre?.name;
  const onde = [local, cidade].filter(Boolean).join(', ');

  return [
    atracao ? `${atracao} ao vivo` : ev?.name,
    onde && `em ${onde}`,
    genero && genero !== 'Undefined' && `— ${genero}`,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 600);
}

/** Preço na moeda que a API informou. Rotular USD como R$ é mentir o valor. */
export function precoEvento(ev: any): string {
  const faixa = ev?.priceRanges?.[0];
  if (faixa?.min == null) return 'Consultar';
  const moeda = String(faixa.currency ?? 'BRL').toUpperCase();
  try {
    const valor = Number(faixa.min).toLocaleString('pt-BR', { style: 'currency', currency: moeda });
    return `A partir de ${valor}`;
  } catch {
    return `A partir de ${faixa.min} ${moeda}`;
  }
}

/**
 * O evento pode entrar na agenda?
 *
 * `dates.status.code` é o mesmo tipo de armadilha do `cancelled` da Sympla:
 * a API devolve show cancelado junto com os demais, e quem não olhar o campo
 * publica um evento que não vai acontecer. `test: true` são registros de
 * homologação do próprio Ticketmaster.
 */
export function eventoPublicavel(ev: any): boolean {
  if (ev?.test === true) return false;
  const status = String(ev?.dates?.status?.code ?? 'onsale').toLowerCase();
  return status !== 'cancelled' && status !== 'canceled';
}

/**
 * Tira as duplicatas do mesmo show.
 *
 * A resposta real traz, além do show, entradas como "Eagles - Suite
 * Reservation" com a MESMA data e o MESMO local, vendidas por parceiros. São
 * upsell de camarote, não outro evento — na agenda virariam dois shows no
 * mesmo horário.
 *
 * A chave é física: um local não hospeda dois eventos diferentes no mesmo
 * instante. Entre os concorrentes fica o que tem inventário do próprio
 * Ticketmaster (`safeTix`) ou link no domínio deles.
 */
export function semDuplicatasDeShow(eventos: any[]): any[] {
  const porLocalEHora = new Map<string, any>();
  const soltos: any[] = [];

  const pontos = (ev: any) =>
    (ev?.ticketing?.safeTix?.enabled ? 2 : 0) + (/(^|\.)ticketmaster\./i.test(hostDe(ev?.url)) ? 1 : 0);

  for (const ev of eventos) {
    const venueId = ev?._embedded?.venues?.[0]?.id;
    const quando = ev?.dates?.start?.dateTime;
    if (!venueId || !quando) {
      soltos.push(ev);
      continue;
    }
    const chave = `${venueId}@${quando}`;
    const atual = porLocalEHora.get(chave);
    if (!atual || pontos(ev) > pontos(atual)) porLocalEHora.set(chave, ev);
  }

  return [...Array.from(porLocalEHora.values()), ...soltos];
}

function hostDe(url?: string): string {
  try {
    return new URL(String(url)).hostname;
  } catch {
    return '';
  }
}

export interface ImportResult {
  ok: boolean;
  fetched: number;
  inserted: number;
  skipped: number;
  message: string;
  hint?: string;
  errors: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Importa eventos do Ticketmaster para a tabela `events`.
 * Idempotente: usa (source, external_id) para não duplicar.
 */
export async function importTicketmaster(
  sb: any,
  opts: {
    city?: string; lat?: number; lng?: number; radiusKm?: number; size?: number;
    /** 'musica' traz shows; 'esporte' traz jogos; vazio traz os dois. */
    segmento?: 'musica' | 'esporte';
    /** ISO de 2 letras. 'BR' por padrão; '' busca no catálogo mundial. */
    pais?: string;
  } = {},
): Promise<ImportResult> {
  const def = getProvider('ticketmaster')!;
  const key = envValue('TICKETMASTER_API_KEY');
  const base: ImportResult = { ok: false, fetched: 0, inserted: 0, skipped: 0, message: '', errors: [] };

  if (!key) {
    return { ...base, message: 'TICKETMASTER_API_KEY não configurada.', hint: `Crie a chave em ${def.docsUrl} e adicione na Vercel.` };
  }

  const params = new URLSearchParams({ apikey: key, size: String(opts.size ?? 50), sort: 'date,asc' });
  // Sem countryCode a Discovery devolve o catálogo mundial — foi o que trouxe
  // as datas do Sphere em Las Vegas. O padrão continua Brasil.
  const pais = opts.pais === undefined ? 'BR' : opts.pais.trim().toUpperCase();
  if (pais) params.set('countryCode', pais);
  // O Ticketmaster separa o catálogo em segmentos; é o que permite pedir só
  // shows ou só jogos.
  if (opts.segmento === 'musica') params.set('classificationName', 'Music');
  if (opts.segmento === 'esporte') params.set('classificationName', 'Sports');
  if (opts.lat != null && opts.lng != null) {
    params.set('latlong', `${opts.lat},${opts.lng}`);
    params.set('radius', String(opts.radiusKm ?? 100));
    params.set('unit', 'km');
  } else if (opts.city) {
    params.set('city', opts.city);
  }

  let payload: any;
  try {
    const res = await safeFetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    const body = await res.text();
    if (!res.ok) {
      const e = explainHttp(res.status, body, def);
      return { ...base, message: e.message, hint: e.hint };
    }
    payload = JSON.parse(body || '{}');
  } catch (e) {
    const n = explainNetwork(e, def);
    return { ...base, message: n.message, hint: n.hint };
  }

  const brutos: any[] = payload?._embedded?.events ?? [];
  base.fetched = brutos.length;

  // Filtra o que não é show e junta as duplicatas ANTES de gravar.
  const publicaveis = brutos.filter(eventoPublicavel);
  const items = semDuplicatasDeShow(publicaveis);
  base.skipped = brutos.length - items.length;

  if (!items.length) {
    return {
      ...base,
      ok: true,
      message: 'Nenhum evento retornado para este filtro.',
      hint: 'A cobertura do Ticketmaster no Brasil é parcial. Tente sem filtro de cidade ou com raio maior.',
    };
  }

  const rows = items.map((ev) => {
    const venue = ev?._embedded?.venues?.[0];
    const startISO: string | undefined = ev?.dates?.start?.dateTime;
    const seg = ev?.classifications?.[0]?.segment?.name;
    return {
      source: 'ticketmaster',
      external_id: String(ev.id),
      title: ev.name,
      category: mapSegment(seg),
      event_date: dataDoEvento(ev),
      starts_at: startISO ?? null,
      ends_at: ev?.dates?.end?.dateTime ?? null,
      city: venue?.city?.name ?? '',
      location: venue?.name ?? 'Local a confirmar',
      lat: venue?.location?.latitude ? Number(venue.location.latitude) : null,
      lng: venue?.location?.longitude ? Number(venue.location.longitude) : null,
      image_url: melhorImagem(ev),
      description: descricaoEvento(ev),
      price: precoEvento(ev),
      artist: ev?._embedded?.attractions?.[0]?.name ?? null,
      // O link de compra é a razão de ser da integração — sem ele o evento
      // chega sem destino.
      ticket_url: ev?.url ?? null,
    };
  });

  const { data, error } = await sb
    .from('events')
    .upsert(rows, { onConflict: 'source,external_id', ignoreDuplicates: false })
    .select('id');

  if (error) {
    return {
      ...base,
      message: `Falha ao gravar no banco: ${error.message}`,
      hint: /column .* does not exist|source|external_id/i.test(error.message)
        ? 'Rode o db/schema.sql atualizado: faltam as colunas source/external_id na tabela events.'
        : 'Verifique as políticas de RLS da tabela events.',
      errors: [error.message],
    };
  }

  const inserted = Array.isArray(data) ? data.length : 0;
  return {
    ...base,
    ok: true,
    inserted,
    skipped: base.fetched - inserted,
    message: `${inserted} evento(s) importado(s) de ${base.fetched} recebido(s).`,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Importa os eventos da Sympla ou do Eventbrite (a conta do próprio token).
 * Mesma gravação idempotente do Ticketmaster: (source, external_id).
 */
export async function importTicketPlatform(sb: any, id: 'sympla' | 'eventbrite'): Promise<ImportResult> {
  const base: ImportResult = { ok: false, fetched: 0, inserted: 0, skipped: 0, message: '', errors: [] };
  const { buscarSympla, buscarEventbrite } = await import('./tickets');

  let resultado;
  try {
    resultado = id === 'sympla' ? await buscarSympla() : await buscarEventbrite();
  } catch (e) {
    const n = explainNetwork(e, getProvider(id)!);
    return { ...base, message: n.message, hint: n.hint };
  }

  if (resultado.erro) return { ...base, message: resultado.erro, hint: resultado.dica };

  const rows = resultado.eventos;
  base.fetched = rows.length;
  if (!rows.length) {
    return {
      ...base,
      ok: true,
      message: 'Nenhum evento publicado nesta conta.',
      hint: 'Esta API lista apenas os eventos da conta do token — para descobrir eventos de terceiros, use o Ticketmaster.',
    };
  }

  const { error } = await sb.from('events').upsert(rows, { onConflict: 'source,external_id', ignoreDuplicates: false });
  if (error) return { ...base, message: `Falha ao gravar: ${error.message}`, errors: [error.message] };

  return {
    ...base,
    ok: true,
    inserted: rows.length,
    message: `${rows.length} evento(s) importado(s) com link de compra.`,
  };
}
