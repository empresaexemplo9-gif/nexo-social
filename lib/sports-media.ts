// Onde assistir de graça e o acervo de melhores momentos.
//
// Regra que vale para tudo aqui: só entram canais e plataformas do próprio
// detentor dos direitos, que transmitem ou publicam de graça e de forma
// aberta. Nada de espelhar sinal de terceiros — o que toca dentro do
// nexo.social é o player oficial do YouTube com o vídeo do dono do conteúdo,
// e a audiência continua contando para ele.

import { daily } from './rotation';
import type { SportId } from './sports';

export { daily };

// ---------------------------------------------------------------------------
// Transmissões e canais gratuitos
// ---------------------------------------------------------------------------

export type BroadcastKind = 'ao-vivo' | 'melhores-momentos' | 'acervo';

export interface Broadcaster {
  id: string;
  label: string;
  sports: SportId[];
  kind: BroadcastKind;
  url: string;
  /** Canal do YouTube (@handle), quando é essa a via gratuita. */
  youtube?: string;
  /** O que exatamente é liberado de graça — sem promessa exagerada. */
  note: string;
}

export const BROADCASTERS: Broadcaster[] = [
  // --- Futebol -------------------------------------------------------------
  {
    id: 'cazetv',
    label: 'CazéTV',
    sports: ['futebol'],
    kind: 'ao-vivo',
    url: 'https://www.youtube.com/@CazeTV',
    youtube: '@CazeTV',
    note: 'Transmite jogos ao vivo de graça no YouTube — Libertadores, Sul-Americana, séries do Brasileirão e torneios internacionais, conforme os direitos de cada temporada.',
  },
  {
    id: 'fifaplus',
    label: 'FIFA+',
    sports: ['futebol'],
    kind: 'acervo',
    url: 'https://www.plus.fifa.com/',
    youtube: '@FIFA',
    note: 'Acervo gratuito da FIFA com partidas completas de Copas do Mundo antigas, documentários e jogos ao vivo de competições de base e feminino.',
  },
  {
    id: 'uefatv',
    label: 'UEFA.tv',
    sports: ['futebol'],
    kind: 'acervo',
    url: 'https://www.uefa.tv/',
    note: 'Gratuito com cadastro: clássicos completos da Champions League, finais históricas e transmissões ao vivo de competições selecionadas.',
  },
  {
    id: 'championsleague',
    label: 'UEFA Champions League',
    sports: ['futebol'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@ChampionsLeague',
    youtube: '@ChampionsLeague',
    note: 'Canal oficial da competição: melhores momentos das rodadas e gols históricos.',
  },
  {
    id: 'premierleague',
    label: 'Premier League',
    sports: ['futebol'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@premierleague',
    youtube: '@premierleague',
    note: 'Melhores momentos oficiais. Alguns vídeos têm restrição por região.',
  },
  {
    id: 'laliga',
    label: 'LaLiga',
    sports: ['futebol'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@LaLiga',
    youtube: '@LaLiga',
    note: 'Canal oficial do campeonato espanhol, com resumos de cada rodada.',
  },
  {
    id: 'seriea',
    label: 'Lega Serie A',
    sports: ['futebol'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@SerieA',
    youtube: '@SerieA',
    note: 'Canal oficial do campeonato italiano.',
  },
  {
    id: 'bundesliga',
    label: 'Bundesliga',
    sports: ['futebol'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@bundesliga',
    youtube: '@bundesliga',
    note: 'Canal oficial do campeonato alemão, com resumos e clássicos.',
  },
  {
    id: 'ligue1',
    label: 'Ligue 1',
    sports: ['futebol'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@Ligue1',
    youtube: '@Ligue1',
    note: 'Canal oficial do campeonato francês.',
  },
  {
    id: 'libertadores',
    label: 'CONMEBOL',
    sports: ['futebol'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@CONMEBOL',
    youtube: '@CONMEBOL',
    note: 'Canal oficial da Libertadores e da Sul-Americana, com gols e resumos.',
  },

  // --- Basquete ------------------------------------------------------------
  {
    id: 'nba',
    label: 'NBA',
    sports: ['basquete'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@NBA',
    youtube: '@NBA',
    note: 'Canal oficial: melhores momentos de todos os jogos, top 10 da noite e acervo de partidas clássicas.',
  },
  {
    id: 'nbb',
    label: 'NBB / LNB',
    sports: ['basquete'],
    kind: 'ao-vivo',
    url: 'https://www.youtube.com/@LNBoficial',
    youtube: '@LNBoficial',
    note: 'A Liga Nacional de Basquete transmite parte dos jogos do NBB de graça no YouTube.',
  },

  // --- Tênis ---------------------------------------------------------------
  {
    id: 'atp',
    label: 'ATP Tour',
    sports: ['tenis'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@atptour',
    youtube: '@atptour',
    note: 'Canal oficial do circuito masculino: melhores momentos das partidas e clássicos.',
  },
  {
    id: 'wta',
    label: 'WTA',
    sports: ['tenis'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@wta',
    youtube: '@wta',
    note: 'Canal oficial do circuito feminino.',
  },
  {
    id: 'tennistv',
    label: 'Tennis TV',
    sports: ['tenis'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@TennisTV',
    youtube: '@TennisTV',
    note: 'Melhores momentos liberados de graça; as partidas completas são do serviço pago.',
  },

  // --- Vôlei ---------------------------------------------------------------
  {
    id: 'volleyballworld',
    label: 'Volleyball World',
    sports: ['volei'],
    kind: 'ao-vivo',
    url: 'https://www.youtube.com/@volleyballworld',
    youtube: '@volleyballworld',
    note: 'Transmite partidas ao vivo de graça no YouTube, incluindo a Liga das Nações, além de jogos completos no acervo.',
  },
  {
    id: 'cbv',
    label: 'Vôlei Brasil (CBV)',
    sports: ['volei'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@voleibrasil',
    youtube: '@voleibrasil',
    note: 'Canal oficial da confederação, com melhores momentos da seleção e da Superliga.',
  },

  // --- Automobilismo -------------------------------------------------------
  {
    id: 'formula1',
    label: 'Fórmula 1',
    sports: ['f1'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@Formula1',
    youtube: '@Formula1',
    note: 'Canal oficial: melhores momentos de treinos, classificação e corrida, além de corridas históricas completas.',
  },
  {
    id: 'motogp',
    label: 'MotoGP',
    sports: ['motogp'],
    kind: 'melhores-momentos',
    url: 'https://www.youtube.com/@motogp',
    youtube: '@motogp',
    note: 'Canal oficial: resumo de cada etapa, ultrapassagens e provas clássicas.',
  },

  // --- Esports -------------------------------------------------------------
  {
    id: 'lolesportsbr',
    label: 'LoL Esports Brasil',
    sports: ['esports'],
    kind: 'ao-vivo',
    url: 'https://www.youtube.com/@LoLEsportsBRs',
    youtube: '@LoLEsportsBRs',
    note: 'CBLOL e campeonatos internacionais de League of Legends transmitidos ao vivo e de graça pela Riot.',
  },
  {
    id: 'lolesports',
    label: 'LoL Esports (global)',
    sports: ['esports'],
    kind: 'ao-vivo',
    url: 'https://lolesports.com/',
    note: 'Worlds, MSI e as ligas regionais ao vivo de graça, com replays completos de todas as séries.',
  },
  {
    id: 'valorant',
    label: 'VALORANT Champions Tour',
    sports: ['esports'],
    kind: 'ao-vivo',
    url: 'https://valorantesports.com/',
    note: 'VCT ao vivo de graça no YouTube e na Twitch, com VODs das partidas.',
  },
  {
    id: 'esl',
    label: 'ESL / Counter-Strike',
    sports: ['esports'],
    kind: 'ao-vivo',
    url: 'https://www.youtube.com/@ESLCS',
    youtube: '@ESLCS',
    note: 'Majors e torneios de Counter-Strike ao vivo, com melhores momentos publicados no canal.',
  },
  {
    id: 'freefire',
    label: 'Free Fire Esports',
    sports: ['esports'],
    kind: 'ao-vivo',
    url: 'https://www.youtube.com/@FreeFireEsportsBR',
    youtube: '@FreeFireEsportsBR',
    note: 'LBFF e mundiais transmitidos ao vivo de graça pela Garena.',
  },
];

export function broadcastersOf(sport: SportId): Broadcaster[] {
  return BROADCASTERS.filter((b) => b.sports.includes(sport));
}

// ---------------------------------------------------------------------------
// Jogadores históricos
// ---------------------------------------------------------------------------

export interface Legend {
  id: string;
  name: string;
  sport: SportId;
  era: string;
  /** Onde brilhou — clubes, seleções, equipes. */
  teams: string;
  /** Por que assistir. */
  note: string;
  /** Busca usada para localizar os melhores momentos nos canais oficiais. */
  query: string;
}

export const LEGENDS: Legend[] = [
  // Futebol
  { id: 'pele', name: 'Pelé', sport: 'futebol', era: '1956–1977', teams: 'Santos, Seleção Brasileira', note: 'Tricampeão mundial e o maior artilheiro da história do Santos.', query: 'Pelé melhores momentos Santos Copa do Mundo' },
  { id: 'garrincha', name: 'Garrincha', sport: 'futebol', era: '1953–1972', teams: 'Botafogo, Seleção Brasileira', note: 'O drible mais imprevisível que o futebol já viu — decisivo em 1958 e 1962.', query: 'Garrincha dribles gols Botafogo seleção' },
  { id: 'maradona', name: 'Diego Maradona', sport: 'futebol', era: '1976–1997', teams: 'Napoli, Boca, Argentina', note: 'Carregou o Napoli a dois Scudetti e a Argentina ao título de 1986.', query: 'Maradona melhores momentos Napoli 1986' },
  { id: 'zico', name: 'Zico', sport: 'futebol', era: '1971–1994', teams: 'Flamengo, Udinese, Seleção', note: 'Bola parada, visão de jogo e a Libertadores/Mundial de 1981 pelo Flamengo.', query: 'Zico Flamengo gols faltas melhores momentos' },
  { id: 'romario', name: 'Romário', sport: 'futebol', era: '1985–2009', teams: 'Vasco, Barcelona, PSV, Seleção', note: 'Área como território próprio: mais de mil gols e o tetra em 1994.', query: 'Romário gols Barcelona 1994 melhores momentos' },
  { id: 'ronaldo', name: 'Ronaldo Fenômeno', sport: 'futebol', era: '1993–2011', teams: 'Cruzeiro, Barcelona, Inter, Real, Seleção', note: 'A arrancada mais devastadora do futebol e a redenção de 2002.', query: 'Ronaldo Fenômeno melhores momentos gols 2002' },
  { id: 'ronaldinho', name: 'Ronaldinho Gaúcho', sport: 'futebol', era: '1998–2015', teams: 'Grêmio, PSG, Barcelona, Milan', note: 'Alegria e técnica no mesmo lance — Bola de Ouro em 2005.', query: 'Ronaldinho Gaúcho Barcelona melhores momentos dribles' },
  { id: 'messi', name: 'Lionel Messi', sport: 'futebol', era: '2004–', teams: 'Barcelona, PSG, Inter Miami, Argentina', note: 'Oito Bolas de Ouro e a Copa de 2022.', query: 'Messi melhores momentos Barcelona Copa 2022' },
  { id: 'cristiano', name: 'Cristiano Ronaldo', sport: 'futebol', era: '2002–', teams: 'United, Real Madrid, Juventus, Portugal', note: 'Maior artilheiro da história da Champions League.', query: 'Cristiano Ronaldo melhores momentos Champions League gols' },
  { id: 'zidane', name: 'Zinédine Zidane', sport: 'futebol', era: '1989–2006', teams: 'Juventus, Real Madrid, França', note: 'O voleio de Glasgow e o controle absoluto do meio-campo.', query: 'Zidane melhores momentos Real Madrid 2002 final' },
  { id: 'cruyff', name: 'Johan Cruyff', sport: 'futebol', era: '1964–1984', teams: 'Ajax, Barcelona, Holanda', note: 'Inventou um jeito de jogar que o futebol ainda copia.', query: 'Johan Cruyff melhores momentos Ajax Holanda 1974' },
  { id: 'rivaldo', name: 'Rivaldo', sport: 'futebol', era: '1991–2015', teams: 'Palmeiras, Barcelona, Milan, Seleção', note: 'Canhota decisiva — Bola de Ouro em 1999 e peça do penta.', query: 'Rivaldo gols Barcelona 2002 melhores momentos' },

  // Basquete
  { id: 'jordan', name: 'Michael Jordan', sport: 'basquete', era: '1984–2003', teams: 'Chicago Bulls', note: 'Seis títulos, seis MVPs das finais — o padrão de comparação da NBA.', query: 'Michael Jordan best moments Bulls NBA finals' },
  { id: 'lebron', name: 'LeBron James', sport: 'basquete', era: '2003–', teams: 'Cavaliers, Heat, Lakers', note: 'Maior pontuador da história da liga, campeão por três franquias.', query: 'LeBron James best plays NBA career highlights' },
  { id: 'kobe', name: 'Kobe Bryant', sport: 'basquete', era: '1996–2016', teams: 'Los Angeles Lakers', note: 'Cinco títulos e os 81 pontos contra o Toronto.', query: 'Kobe Bryant best moments Lakers 81 points' },
  { id: 'oscar', name: 'Oscar Schmidt', sport: 'basquete', era: '1974–2003', teams: 'Seleção Brasileira, Palmeiras, Caserta', note: 'Maior pontuador da história do basquete e o ouro no Pan de 1987.', query: 'Oscar Schmidt melhores momentos Brasil 1987' },
  { id: 'curry', name: 'Stephen Curry', sport: 'basquete', era: '2009–', teams: 'Golden State Warriors', note: 'Reescreveu o alcance da quadra — recordista de bolas de três.', query: 'Stephen Curry best three pointers Warriors' },

  // Tênis
  { id: 'federer', name: 'Roger Federer', sport: 'tenis', era: '1998–2022', teams: 'Suíça', note: 'Vinte Grand Slams e oito títulos em Wimbledon.', query: 'Roger Federer best points Wimbledon career' },
  { id: 'nadal', name: 'Rafael Nadal', sport: 'tenis', era: '2001–2024', teams: 'Espanha', note: 'Catorze Roland Garros — domínio sem paralelo no saibro.', query: 'Rafael Nadal best points Roland Garros' },
  { id: 'djokovic', name: 'Novak Djokovic', sport: 'tenis', era: '2003–', teams: 'Sérvia', note: 'Recordista de Grand Slams e de semanas como número 1.', query: 'Novak Djokovic best points Grand Slam' },
  { id: 'guga', name: 'Gustavo Kuerten', sport: 'tenis', era: '1995–2008', teams: 'Brasil', note: 'Três Roland Garros e o coração desenhado no saibro em 2001.', query: 'Guga Kuerten Roland Garros 1997 2001 melhores momentos' },
  { id: 'serena', name: 'Serena Williams', sport: 'tenis', era: '1995–2022', teams: 'Estados Unidos', note: 'Vinte e três Grand Slams na era aberta.', query: 'Serena Williams best points career Grand Slam' },

  // Vôlei
  { id: 'giba', name: 'Giba', sport: 'volei', era: '1995–2016', teams: 'Seleção Brasileira', note: 'Capitão do ouro em Atenas 2004 e do bicampeonato mundial.', query: 'Giba melhores momentos seleção brasileira vôlei' },
  { id: 'bernardinho-time', name: 'Geração de Ouro do Brasil', sport: 'volei', era: '2003–2008', teams: 'Seleção Brasileira', note: 'A sequência que fez o vôlei brasileiro dominar o mundo.', query: 'Brasil vôlei melhores momentos Atenas 2004 final' },
  { id: 'sheilla', name: 'Sheilla Castro', sport: 'volei', era: '2003–2016', teams: 'Seleção Brasileira', note: 'Bicampeã olímpica com a seleção feminina em 2008 e 2012.', query: 'Sheilla Castro melhores momentos vôlei olimpíadas' },
  { id: 'karch', name: 'Karch Kiraly', sport: 'volei', era: '1981–2007', teams: 'Estados Unidos', note: 'Único campeão olímpico na quadra e na praia.', query: 'Karch Kiraly best moments volleyball olympics' },

  // Fórmula 1
  { id: 'senna', name: 'Ayrton Senna', sport: 'f1', era: '1984–1994', teams: 'Lotus, McLaren, Williams', note: 'Tricampeão e o melhor piloto de chuva e classificação que a F1 conheceu.', query: 'Ayrton Senna best moments qualifying Monaco Donington' },
  { id: 'schumacher', name: 'Michael Schumacher', sport: 'f1', era: '1991–2012', teams: 'Benetton, Ferrari, Mercedes', note: 'Sete títulos e a era de domínio da Ferrari.', query: 'Michael Schumacher best moments Ferrari F1' },
  { id: 'hamilton', name: 'Lewis Hamilton', sport: 'f1', era: '2007–', teams: 'McLaren, Mercedes, Ferrari', note: 'Recordista de vitórias e de pole positions.', query: 'Lewis Hamilton best moments F1 wins' },
  { id: 'fittipaldi', name: 'Emerson Fittipaldi', sport: 'f1', era: '1970–1980', teams: 'Lotus, McLaren', note: 'Primeiro campeão mundial brasileiro, em 1972.', query: 'Emerson Fittipaldi F1 1972 1974 melhores momentos' },
  { id: 'piquet', name: 'Nelson Piquet', sport: 'f1', era: '1978–1991', teams: 'Brabham, Williams, Benetton', note: 'Tricampeão mundial e mestre em estratégia de corrida.', query: 'Nelson Piquet F1 melhores momentos campeão' },

  // MotoGP
  { id: 'rossi', name: 'Valentino Rossi', sport: 'motogp', era: '1996–2021', teams: 'Honda, Yamaha, Ducati', note: 'Nove títulos mundiais e as ultrapassagens que definiram uma era.', query: 'Valentino Rossi best moments MotoGP overtakes' },
  { id: 'marquez', name: 'Marc Márquez', sport: 'motogp', era: '2013–', teams: 'Honda, Ducati', note: 'Estilo no limite do agarre — múltiplas vezes campeão da categoria.', query: 'Marc Marquez best moments MotoGP saves' },
  { id: 'doohan', name: 'Mick Doohan', sport: 'motogp', era: '1989–1999', teams: 'Honda', note: 'Cinco títulos consecutivos na 500cc.', query: 'Mick Doohan best moments 500cc Honda' },
  { id: 'lorenzo', name: 'Jorge Lorenzo', sport: 'motogp', era: '2008–2019', teams: 'Yamaha, Ducati, Honda', note: 'Pilotagem milimétrica — tricampeão da MotoGP.', query: 'Jorge Lorenzo best moments MotoGP' },

  // Esports
  { id: 'faker', name: 'Faker', sport: 'esports', era: '2013–', teams: 'T1 (League of Legends)', note: 'O jogador mais vitorioso da história do Worlds.', query: 'Faker best plays worlds League of Legends' },
  { id: 'brtt', name: 'brTT', sport: 'esports', era: '2012–2022', teams: 'paiN, KaBuM, Flamengo', note: 'O maior campeão do CBLOL e ídolo da cena brasileira.', query: 'brTT melhores momentos CBLOL' },
  { id: 'fallen', name: 'FalleN', sport: 'esports', era: '2010–', teams: 'SK/Luminosity, FURIA (CS)', note: 'Bicampeão de Major e o professor do Counter-Strike brasileiro.', query: 'FalleN melhores momentos CS Major' },
  { id: 'coldzera', name: 'coldzera', sport: 'esports', era: '2014–', teams: 'SK Gaming, FaZe (CS)', note: 'Eleito o melhor do mundo em 2016 e 2017.', query: 'coldzera best plays CS jump shot' },
  { id: 'aspas', name: 'aspas', sport: 'esports', era: '2021–', teams: 'LOUD, MIBR (VALORANT)', note: 'Campeão mundial de VALORANT com a LOUD em 2022.', query: 'aspas best plays VALORANT Champions' },
];

export function legendsOf(sport: SportId): Legend[] {
  return LEGENDS.filter((l) => l.sport === sport);
}

// ---------------------------------------------------------------------------
// YouTube — links e embed
// ---------------------------------------------------------------------------

export function youtubeSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Extrai o id de um vídeo do YouTube a partir de qualquer formato de link. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/embed\/([\w-]{11})/) ||
    url.match(/\/shorts\/([\w-]{11})/);
  return m ? m[1] : null;
}

/** URL de embed para tocar dentro do nexo.social. */
export function youtubeEmbed(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

