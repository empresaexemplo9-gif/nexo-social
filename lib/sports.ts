// Dados esportivos: partidas, resultados, agenda e melhores momentos.
//
// Duas fontes abertas, nenhuma exige cadastro:
//   - ESPN (site.api.espn.com) — placar, agenda e status ao vivo. Endpoint
//     público, identificado por slug de competição (eng.1, nba, f1...).
//   - TheSportsDB (chave pública de teste "3") — cobre o que a ESPN não cobre
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

const UA = 'nexo-social/1.0 (+https://nexo-social-two.vercel.app)';
const SPORTSDB = 'https://www.thesportsdb.com/api/v1/json/3';

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

function parseEspn(json: any, comp: Competition): Match[] {
  const events = Array.isArray(json?.events) ? json.events : [];
  return events.map((ev: any): Match => {
    const competition = ev.competitions?.[0] ?? {};
    const competitors = competition.competitors ?? [];
    const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0] ?? {};
    const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1] ?? {};
    const status = ev.status?.type ?? {};
    const num = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
    return {
      id: `espn-${comp.id}-${ev.id}`,
      sport: comp.sport,
      competition: comp.label,
      competitionId: comp.id,
      home: home.team?.displayName ?? home.athlete?.displayName ?? ev.shortName ?? '—',
      away: away.team?.displayName ?? away.athlete?.displayName ?? '',
      homeLogo: home.team?.logo ?? null,
      awayLogo: away.team?.logo ?? null,
      homeScore: num(home.score),
      awayScore: num(away.score),
      startsAt: ev.date,
      state: espnState(status.state),
      detail: status.shortDetail || status.description || '',
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
  return (rows ?? []).map((e: any): Match => {
    const num = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
    const startsAt = e.strTimestamp
      ? new Date(e.strTimestamp.replace(' ', 'T') + (e.strTimestamp.endsWith('Z') ? '' : 'Z')).toISOString()
      : new Date(`${e.dateEvent}T${e.strTime || '00:00:00'}Z`).toISOString();
    return {
      id: `sdb-${e.idEvent}`,
      sport: comp.sport,
      competition: comp.label,
      competitionId: comp.id,
      home: e.strHomeTeam || e.strEvent || '—',
      away: e.strAwayTeam || '',
      homeLogo: e.strHomeTeamBadge ?? null,
      awayLogo: e.strAwayTeamBadge ?? null,
      homeScore: num(e.intHomeScore),
      awayScore: num(e.intAwayScore),
      startsAt,
      state: encerrado ? 'encerrado' : 'agendado',
      detail: encerrado ? 'Encerrado' : (e.strStatus ?? ''),
      venue: e.strVenue ?? null,
      highlightUrl: e.strVideo || null,
      thumb: e.strThumb ?? null,
    };
  });
}

async function fetchSportsdb(comp: Competition): Promise<Match[]> {
  if (!comp.sportsdbLeague) return [];
  const id = await sportsdbLeagueId(comp.sportsdbLeague);
  if (!id) return [];
  const [past, next] = await Promise.allSettled([
    openFetch(`${SPORTSDB}/eventspastleague.php?id=${id}`, 1800).then((r) => r.json()),
    openFetch(`${SPORTSDB}/eventsnextleague.php?id=${id}`, 1800).then((r) => r.json()),
  ]);
  const out: Match[] = [];
  if (past.status === 'fulfilled') out.push(...parseSportsdb(past.value?.events ?? [], comp, true));
  if (next.status === 'fulfilled') out.push(...parseSportsdb(next.value?.events ?? [], comp, false));
  return out;
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
    if (c.espnPath) return { comp: c, matches: await fetchEspn(c) };
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
      const msg = r.reason instanceof Error ? r.reason.message : 'erro desconhecido';
      avisos.push(`${comp.label}: ${msg.slice(0, 120)}`);
    }
  });

  const agora = Date.now();
  const mesmoDia = (iso: string) => Math.abs(new Date(iso).getTime() - agora) < DIA_MS && new Date(iso).toDateString() === new Date(agora).toDateString();
  const porData = (a: Match, b: Match) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

  const aoVivo = todas.filter((m) => m.state === 'ao-vivo').sort(porData);
  const encerrados = todas.filter((m) => m.state === 'encerrado').sort((a, b) => porData(b, a));
  const agendados = todas.filter((m) => m.state === 'agendado').sort(porData);

  return {
    sport,
    aoVivo,
    hoje: agendados.filter((m) => mesmoDia(m.startsAt)),
    proximos: agendados.filter((m) => !mesmoDia(m.startsAt)).slice(0, 12),
    resultados: encerrados.slice(0, 12),
    replays: encerrados.filter((m) => m.highlightUrl).slice(0, 8),
    competicoes: comps,
    fonte: tentativas === 0 ? 'indisponivel' : sucessos === tentativas ? 'live' : sucessos > 0 ? 'parcial' : 'indisponivel',
    avisos: avisos.slice(0, 4),
    atualizadoEm: new Date().toISOString(),
  };
}
