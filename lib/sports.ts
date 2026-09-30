// Dados esportivos: partidas, resultados, agenda e melhores momentos.
//
// Duas fontes abertas, nenhuma exige cadastro:
//   - ESPN (site.api.espn.com) — placar, agenda e status ao vivo. Endpoint
//     público, identificado por slug de competição (eng.1, nba, f1...).
//   - TheSportsDB (chave pública "123") — cobre o que a ESPN não cobre
//     (vôlei, MotoGP) e, principalmente, traz o link de melhores momentos de
//     cada partida no campo strVideo.
//
// O link de melhores momentos do TheSportsDB é um vídeo do YouTube do próprio
// detentor dos direitos — por isso pode ser embutido e assistido dentro do
// nexo.social, sem espelhar sinal de ninguém.

import type { IconName } from '@/components/icons';

// ---------------------------------------------------------------------------
// Modalidades e competições
// ---------------------------------------------------------------------------

export type SportId = 'futebol' | 'basquete' | 'tenis' | 'volei' | 'f1' | 'motogp' | 'esports';

export interface SportDef {
  id: SportId;
  label: string;
  icon: IconName;
  /** Classe de destaque (Tailwind) usada nos cartões. */
  accent: string;
}

export const SPORTS: SportDef[] = [
  { id: 'futebol', label: 'Futebol', icon: 'trophy', accent: 'text-emerald-400' },
  { id: 'basquete', label: 'Basquete / NBA', icon: 'basketball', accent: 'text-clay-300' },
  { id: 'tenis', label: 'Tênis', icon: 'tennis', accent: 'text-lime-300' },
  { id: 'volei', label: 'Vôlei', icon: 'volleyball', accent: 'text-sky-300' },
  { id: 'f1', label: 'Fórmula 1', icon: 'flag', accent: 'text-red-300' },
  { id: 'motogp', label: 'MotoGP', icon: 'motorcycle', accent: 'text-orange-300' },
  { id: 'esports', label: 'Jogos eletrônicos', icon: 'gamepad', accent: 'text-violet-300' },
];

export function getSport(id: string): SportDef | undefined {
  return SPORTS.find((s) => s.id === id);
}

export interface Competition {
  id: string;
  sport: SportId;
  label: string;
  /** Caminho na API pública da ESPN, quando a competição é coberta. */
  espnPath?: string;
  /** Nome exato da liga no TheSportsDB, usado para resolver o id em runtime. */
  sportsdbLeague?: string;
  /** Site oficial da competição. */
  site: string;
  /** Relevância para ordenar quando não há jogo acontecendo. */
  weight: number;
}

export const COMPETITIONS: Competition[] = [
  // --- Futebol -------------------------------------------------------------
  { id: 'champions', sport: 'futebol', label: 'UEFA Champions League', espnPath: 'soccer/uefa.champions', sportsdbLeague: 'UEFA Champions League', site: 'https://www.uefa.com/uefachampionsleague/', weight: 100 },
  { id: 'libertadores', sport: 'futebol', label: 'CONMEBOL Libertadores', espnPath: 'soccer/conmebol.libertadores', sportsdbLeague: 'Copa Libertadores', site: 'https://www.conmebol.com/libertadores/', weight: 98 },
  { id: 'brasileirao', sport: 'futebol', label: 'Brasileirão Série A', espnPath: 'soccer/bra.1', sportsdbLeague: 'Brazilian Serie A', site: 'https://www.cbf.com.br/futebol-brasileiro/competicoes/campeonato-brasileiro-serie-a', weight: 96 },
  { id: 'premier', sport: 'futebol', label: 'Premier League (Inglaterra)', espnPath: 'soccer/eng.1', sportsdbLeague: 'English Premier League', site: 'https://www.premierleague.com/', weight: 94 },
  { id: 'laliga', sport: 'futebol', label: 'LaLiga (Espanha)', espnPath: 'soccer/esp.1', sportsdbLeague: 'Spanish La Liga', site: 'https://www.laliga.com/', weight: 92 },
  { id: 'seriea', sport: 'futebol', label: 'Serie A (Itália)', espnPath: 'soccer/ita.1', sportsdbLeague: 'Italian Serie A', site: 'https://www.legaseriea.it/', weight: 90 },
  { id: 'bundesliga', sport: 'futebol', label: 'Bundesliga (Alemanha)', espnPath: 'soccer/ger.1', sportsdbLeague: 'German Bundesliga', site: 'https://www.bundesliga.com/', weight: 88 },
  { id: 'ligue1', sport: 'futebol', label: 'Ligue 1 (França)', espnPath: 'soccer/fra.1', sportsdbLeague: 'French Ligue 1', site: 'https://www.ligue1.com/', weight: 86 },
  { id: 'sudamericana', sport: 'futebol', label: 'CONMEBOL Sul-Americana', espnPath: 'soccer/conmebol.sudamericana', site: 'https://www.conmebol.com/sudamericana/', weight: 84 },
  { id: 'europa', sport: 'futebol', label: 'UEFA Europa League', espnPath: 'soccer/uefa.europa', site: 'https://www.uefa.com/uefaeuropaleague/', weight: 82 },
  { id: 'copadobrasil', sport: 'futebol', label: 'Copa do Brasil', espnPath: 'soccer/bra.copa_do_brasil', site: 'https://www.cbf.com.br/', weight: 80 },
  { id: 'primeira', sport: 'futebol', label: 'Primeira Liga (Portugal)', espnPath: 'soccer/por.1', site: 'https://www.ligaportugal.pt/', weight: 74 },
  { id: 'eredivisie', sport: 'futebol', label: 'Eredivisie (Holanda)', espnPath: 'soccer/ned.1', site: 'https://eredivisie.nl/', weight: 72 },
  { id: 'argentina', sport: 'futebol', label: 'Liga Profesional (Argentina)', espnPath: 'soccer/arg.1', site: 'https://www.ligaprofesional.ar/', weight: 70 },

  // --- Basquete ------------------------------------------------------------
  { id: 'nba', sport: 'basquete', label: 'NBA', espnPath: 'basketball/nba', sportsdbLeague: 'NBA', site: 'https://www.nba.com/', weight: 100 },
  { id: 'nbb', sport: 'basquete', label: 'NBB (Brasil)', sportsdbLeague: 'Brazilian NBB', site: 'https://lnb.com.br/nbb/', weight: 80 },
  { id: 'euroleague', sport: 'basquete', label: 'EuroLeague', sportsdbLeague: 'Euroleague', site: 'https://www.euroleaguebasketball.net/', weight: 78 },
  { id: 'wnba', sport: 'basquete', label: 'WNBA', espnPath: 'basketball/wnba', site: 'https://www.wnba.com/', weight: 70 },

  // --- Tênis ---------------------------------------------------------------
  { id: 'atp', sport: 'tenis', label: 'ATP Tour', espnPath: 'tennis/atp', site: 'https://www.atptour.com/', weight: 100 },
  { id: 'wta', sport: 'tenis', label: 'WTA Tour', espnPath: 'tennis/wta', site: 'https://www.wtatennis.com/', weight: 98 },

  // --- Vôlei ---------------------------------------------------------------
  { id: 'superliga', sport: 'volei', label: 'Superliga (Brasil)', sportsdbLeague: 'Brazilian Superliga', site: 'https://volei.cbv.com.br/', weight: 100 },
  { id: 'vnl', sport: 'volei', label: 'Volleyball Nations League', sportsdbLeague: 'FIVB Volleyball Nations League', site: 'https://en.volleyballworld.com/volleyball/competitions/vnl/', weight: 96 },
  { id: 'italia-volei', sport: 'volei', label: 'SuperLega (Itália)', sportsdbLeague: 'Italian SuperLega', site: 'https://www.legavolley.it/', weight: 80 },

  // --- Automobilismo -------------------------------------------------------
  { id: 'f1', sport: 'f1', label: 'Fórmula 1', espnPath: 'racing/f1', sportsdbLeague: 'Formula 1', site: 'https://www.formula1.com/', weight: 100 },
  { id: 'motogp', sport: 'motogp', label: 'MotoGP', sportsdbLeague: 'MotoGP', site: 'https://www.motogp.com/', weight: 100 },

  // --- Esports -------------------------------------------------------------
  { id: 'cblol', sport: 'esports', label: 'CBLOL (League of Legends)', site: 'https://lolesports.com/', weight: 100 },
  { id: 'worlds', sport: 'esports', label: 'League of Legends Worlds', site: 'https://lolesports.com/', weight: 98 },
  { id: 'valorant', sport: 'esports', label: 'VALORANT Champions Tour', site: 'https://valorantesports.com/', weight: 94 },
  { id: 'csmajor', sport: 'esports', label: 'Counter-Strike Majors', site: 'https://www.hltv.org/', weight: 92 },
  { id: 'dota', sport: 'esports', label: 'Dota 2 — The International', site: 'https://www.dota2.com/esports/', weight: 88 },
  { id: 'freefire', sport: 'esports', label: 'Free Fire — LBFF', site: 'https://ff.garena.com/', weight: 84 },
];

export function competitionsOf(sport: SportId): Competition[] {
  return COMPETITIONS.filter((c) => c.sport === sport).sort((a, b) => b.weight - a.weight);
}

// ---------------------------------------------------------------------------
// Partidas
// ---------------------------------------------------------------------------

export type MatchState = 'ao-vivo' | 'agendado' | 'encerrado';

export interface Match {
  id: string;
  sport: SportId;
  competition: string;
  competitionId: string;
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  startsAt: string;
  state: MatchState;
  /** "2º tempo, 67'" / "Encerrado" / "Sáb, 20:00" */
  detail: string;
  venue: string | null;
  /** Melhores momentos (YouTube), quando a fonte informa. */
  highlightUrl: string | null;
  thumb: string | null;
}

const UA = 'nexo-social/1.0 (+https://nexo-social.drap.app.br)';
const SPORTSDB = `https://www.thesportsdb.com/api/v1/json/${process.env.THESPORTSDB_API_KEY?.trim() || '123'}`;
// IDs conferidos na API; all_leagues é limitado no plano gratuito.
const SPORTSDB_IDS: Record<string, string> = {
  champions: '4480', libertadores: '4501', brasileirao: '4351', premier: '4328',
  laliga: '4335', seriea: '4332', bundesliga: '4331', ligue1: '4334', nba: '4387', f1: '4370',
};

async function openFetch(url: string, revalidate: number): Promise<Response> {
  return fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
}

// --- ESPN -------------------------------------------------------------------

function espnState(raw: string | undefined): MatchState {
  if (raw === 'in') return 'ao-vivo';
  if (raw === 'post') return 'encerrado';
  return 'agendado';
}

/**
 * Texto de situação — só o do jogo em andamento.
 *
 * A ESPN preenche `shortDetail` sempre, em inglês: um jogo que começa daqui a
 * três horas vem com "Scheduled", e o `detail` é pior ainda ("Sun, August 9th
 * at 3:00 PM EDT" — inglês e no fuso de Nova York). Devolvendo vazio, o card
 * cai no `formatEventDateLong`, que já escreve a data em português e no fuso
 * de São Paulo. Encerrado o card já diz "Encerrado" sozinho.
 *
 * Ao vivo o texto é o relógio da partida ("31'", "HT"), que é o que interessa
 * e não depende de tradução.
 */
function espnDetalhe(state: string | undefined, tipo: any): string {
  return state === 'in' ? (tipo?.shortDetail || tipo?.detail || '') : '';
}

/**
 * Placar — nulo enquanto a bola não rola.
 *
 * A ESPN manda `score: "0"` para jogo que ainda vai começar. Convertido
 * direto, o card mostrava "Bahia 0 x 0 Vasco" três horas antes do apito, com
 * cara de empate sem gols em andamento.
 */
function espnPlacar(bruto: unknown, state: MatchState): number | null {
  if (state === 'agendado') return null;
  if (bruto === undefined || bruto === null || bruto === '') return null;
  const n = Number(bruto);
  return Number.isFinite(n) ? n : null;
}

function parseEspn(json: any, comp: Competition): Match[] {
  const events = Array.isArray(json?.events) ? json.events : [];
  return events.map((ev: any): Match => {
    const competition = ev.competitions?.[0] ?? {};
    const competitors = competition.competitors ?? [];
    const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0] ?? {};
    const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1] ?? {};
    const status = ev.status?.type ?? {};
    const state = espnState(status.state);
    // `ev.date` vem como "2026-08-09T14:00Z", sem segundos. O caminho do
    // TheSportsDB devolve ISO completo; normalizar aqui deixa as duas fontes
    // com o mesmo formato.
    const quando = new Date(ev.date);
    return {
      id: `espn-${comp.id}-${ev.id}`,
      sport: comp.sport,
      competition: comp.label,
      competitionId: comp.id,
      home: home.team?.displayName ?? home.athlete?.displayName ?? ev.shortName ?? '—',
      away: away.team?.displayName ?? away.athlete?.displayName ?? '',
      homeLogo: home.team?.logo ?? null,
      awayLogo: away.team?.logo ?? null,
      homeScore: espnPlacar(home.score, state),
      awayScore: espnPlacar(away.score, state),
      startsAt: Number.isNaN(quando.getTime()) ? ev.date : quando.toISOString(),
      state,
      detail: espnDetalhe(status.state, status),
      venue: competition.venue?.fullName ?? null,
      highlightUrl: null,
      thumb: null,
    };
  });
}

async function fetchEspn(comp: Competition): Promise<Match[]> {
  if (!comp.espnPath) return [];
  const res = await openFetch(`https://site.api.espn.com/apis/site/v2/sports/${comp.espnPath}/scoreboard`, 300);
  if (!res.ok) throw new Error(`ESPN ${comp.id} respondeu ${res.status}`);
  return parseEspn(await res.json(), comp);
}

// --- TheSportsDB ------------------------------------------------------------

/** Resolve o id numérico da liga pelo nome — evita depender de id fixo. */
async function sportsdbLeagueId(name: string): Promise<string | null> {
  const res = await openFetch(`${SPORTSDB}/all_leagues.php`, 86400);
  if (!res.ok) throw new Error(`TheSportsDB respondeu ${res.status}`);
  const json = (await res.json()) as { leagues?: { idLeague: string; strLeague: string; strLeagueAlternate?: string }[] };
  const alvo = name.toLowerCase();
  const hit = (json.leagues ?? []).find(
    (l) =>
      l.strLeague?.toLowerCase() === alvo ||
      (l.strLeagueAlternate ?? '').toLowerCase().split(',').some((a) => a.trim() === alvo),
  );
  return hit?.idLeague ?? null;
}

function parseSportsdb(rows: any[], comp: Competition, encerrado: boolean): Match[] {
  return rows.flatMap((e: any): Match[] => {
    if (!e?.idEvent || /postponed|cancelled|canceled|abandoned/i.test(e.strStatus || '')) return [];
    const raw = e.strTimestamp || (e.dateEvent ? `${e.dateEvent}T${e.strTime || '00:00:00'}` : '');
    const timestamp = raw.replace(' ', 'T');
    const date = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(timestamp) ? timestamp : timestamp + 'Z');
    if (!Number.isFinite(date.getTime())) return [];
    const num = (v: unknown) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v); return Number.isFinite(n) ? n : null;
    };
    const homeScore = num(e.intHomeScore), awayScore = num(e.intAwayScore);
    // Past endpoints may contain postponed or unplayed fixtures.
    const finished = /^(Match Finished|FT|AET|AP|Finished)$/i.test(e.strStatus || '')
      || (encerrado && date.getTime() < Date.now() && homeScore !== null && awayScore !== null);
    if (!finished && date.getTime() < Date.now()) return [];
    return [{
      id: `sdb-${e.idEvent}`, sport: comp.sport, competition: comp.label, competitionId: comp.id,
      home: e.strHomeTeam || e.strEvent || '—', away: e.strAwayTeam || '',
      homeLogo: e.strHomeTeamBadge ?? null, awayLogo: e.strAwayTeamBadge ?? null,
      homeScore: finished ? homeScore : null, awayScore: finished ? awayScore : null,
      startsAt: date.toISOString(), state: finished ? 'encerrado' : 'agendado',
      detail: finished ? 'Encerrado' : '', venue: e.strVenue ?? null,
      highlightUrl: e.strVideo || null, thumb: e.strThumb ?? null,
    }];
  });
}

async function fetchSportsdb(comp: Competition): Promise<Match[]> {
  if (!comp.sportsdbLeague) return [];
  const id = SPORTSDB_IDS[comp.id] || await sportsdbLeagueId(comp.sportsdbLeague);
  if (!id) throw Error('Competição não disponível na fonte alternativa.');
  const request = async (endpoint: string) => {
    const response = await openFetch(`${SPORTSDB}/${endpoint}?id=${id}`, 1800);
    if (!response.ok) throw Error('Agenda temporariamente indisponível.');
    const data = await response.json();
    if (!Object.prototype.hasOwnProperty.call(data, 'events') || (data.events !== null && !Array.isArray(data.events))) {
      throw Error('Resposta inválida da agenda.');
    }
    return data.events || [];
  };
  const [past, next] = await Promise.all([
    request('eventspastleague.php'), request('eventsnextleague.php'),
  ]);
  return Array.from(new Map([...parseSportsdb(past, comp, true), ...parseSportsdb(next, comp, false)]
    .map(match => [match.id, match])).values());
}

// ---------------------------------------------------------------------------
// Quadro de uma modalidade
// ---------------------------------------------------------------------------

export interface SportsBoard {
  sport: SportId;
  aoVivo: Match[];
  hoje: Match[];
  proximos: Match[];
  resultados: Match[];
  /** Partidas com link de melhores momentos, prontas para tocar aqui dentro. */
  replays: Match[];
  competicoes: Competition[];
  fonte: 'live' | 'parcial' | 'indisponivel';
  avisos: string[];
  atualizadoEm: string;
}

const DIA_MS = 86400000;

/**
 * Monta o quadro da modalidade: ao vivo, hoje, próximos e resultados.
 * Consulta a ESPN nas competições que ela cobre e o TheSportsDB no resto —
 * o que falhar vira aviso, sem derrubar o restante.
 */
export async function buildSportsBoard(sport: SportId): Promise<SportsBoard> {
  const comps = competitionsOf(sport);
  const avisos: string[] = [];
  const todas: Match[] = [];
  let sucessos = 0;
  let tentativas = 0;

  const jobs = comps.map(async (c) => {
    if (c.espnPath) {
      try {
        const matches = await fetchEspn(c);
        // The daily scoreboard alone does not provide the upcoming schedule.
        if (c.sportsdbLeague && !matches.some(m => m.state === 'agendado' && new Date(m.startsAt).getTime() > Date.now() + 86400000)) {
          try {
            const extra = await fetchSportsdb(c);
            const key = (m: Match) => `${m.home.toLowerCase()}|${m.away.toLowerCase()}|${m.startsAt.slice(0, 10)}`;
            const seen = new Set(matches.map(key));
            matches.push(...extra.filter(m => !seen.has(key(m))));
          } catch { avisos.push(`${c.label}: agenda complementar temporariamente indisponível.`); }
        }
        return { comp: c, matches };
      } catch {
        if (!c.sportsdbLeague) throw Error('Placar temporariamente indisponível.');
        const matches = await fetchSportsdb(c);
        avisos.push(`${c.label}: agenda e resultados pela fonte alternativa; placar ao vivo indisponível.`);
        return { comp: c, matches };
      }
    }
    if (c.sportsdbLeague) return { comp: c, matches: await fetchSportsdb(c) };
    return { comp: c, matches: [] as Match[] };
  });

  const resultados = await Promise.allSettled(jobs);
  resultados.forEach((r, i) => {
    const comp = comps[i];
    if (!comp.espnPath && !comp.sportsdbLeague) return; // competição só curada
    tentativas++;
    if (r.status === 'fulfilled') {
      sucessos++;
      todas.push(...r.value.matches);
    } else {
      const msg = 'Não foi possível atualizar esta competição. Consulte o site oficial abaixo.';
      avisos.push(`${comp.label}: ${msg.slice(0, 120)}`);
    }
  });

  const agora = Date.now();
  const day = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const mesmoDia = (iso: string) => day(new Date(iso)) === day(new Date(agora));
  const porData = (a: Match, b: Match) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

  const aoVivo = todas.filter((m) => m.state === 'ao-vivo').sort(porData);
  const encerrados = todas.filter((m) => m.state === 'encerrado').sort((a, b) => porData(b, a));
  const agendados = todas.filter((m) => m.state === 'agendado' && new Date(m.startsAt).getTime() >= agora).sort(porData);

  return {
    sport,
    aoVivo,
    hoje: agendados.filter((m) => mesmoDia(m.startsAt)),
    proximos: agendados.filter((m) => !mesmoDia(m.startsAt)).slice(0, 12),
    resultados: encerrados.slice(0, 12),
    replays: encerrados.filter((m) => m.highlightUrl).slice(0, 8),
    competicoes: comps,
    fonte: tentativas === 0 ? 'indisponivel' : sucessos === tentativas && avisos.length === 0 ? 'live' : sucessos > 0 ? 'parcial' : 'indisponivel',
    avisos: avisos.slice(0, 4),
    atualizadoEm: new Date().toISOString(),
  };
}
