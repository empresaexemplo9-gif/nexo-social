// Camada central de dados do nexo-social.
// Concentra os temas (assuntos), conteúdos editoriais e eventos com
// geolocalização. É consumida tanto por componentes de servidor quanto de
// cliente, portanto contém apenas dados e funções puras.

import { haversineKm, type LatLng } from './geo';
import { formatEventDate } from './datetime';

export type CategorySlug =
  | 'tecnologia'
  | 'musica'
  | 'moda'
  | 'cultura'
  | 'esporte';

export interface Topic {
  slug: CategorySlug;
  label: string;
  /** Chave do ícone SVG (components/icons.tsx) — sem emoji. */
  icon: 'cpu' | 'music' | 'shirt' | 'masks' | 'activity';
  tagline: string;
  description: string;
  subtopics: string[];
  /** Classes Tailwind literais (mantidas aqui e varridas via glob do config). */
  accent: {
    text: string;
    bg: string;
    border: string;
    solid: string;
    gradient: string;
  };
}

export interface ContentItem {
  id: string;
  topic: CategorySlug;
  subtopic: string;
  title: string;
  snippet: string;
  body: string;
  readTime: string;
  date: string;
  imageUrl: string;
}

export interface EventItem {
  id: string;
  topic: CategorySlug;
  title: string;
  /** Texto de exibição (derivado de startsAt quando disponível). */
  date: string;
  /** Início em ISO. Opcional: linhas antigas do banco podem não ter. */
  startsAt?: string;
  endsAt?: string;
  city: string;
  venue: string;
  coords: LatLng;
  imageUrl: string;
  description: string;
  price: string;
  /** Palavras-chave usadas pelo algoritmo de indicação e pelas buscas externas. */
  tags?: string[];
  /** Artista/atração principal — usado para links de música e vídeo. */
  artist?: string;
}

// ---------------------------------------------------------------------------
// Cidades (fallback de proximidade quando o GPS não está disponível)
// ---------------------------------------------------------------------------

export interface City {
  name: string;
  coords: LatLng;
}

export const CITIES: City[] = [
  // Grande São Paulo e interior
  { name: 'São Paulo', coords: { lat: -23.5505, lng: -46.6333 } },
  { name: 'Guarulhos', coords: { lat: -23.4543, lng: -46.5337 } },
  { name: 'Santo André', coords: { lat: -23.6639, lng: -46.5383 } },
  { name: 'Osasco', coords: { lat: -23.5329, lng: -46.7918 } },
  { name: 'Campinas', coords: { lat: -22.9099, lng: -47.0626 } },
  { name: 'Santos', coords: { lat: -23.9608, lng: -46.3336 } },
  { name: 'São José dos Campos', coords: { lat: -23.1896, lng: -45.8841 } },
  { name: 'Sorocaba', coords: { lat: -23.5015, lng: -47.4526 } },
  // Rio e região
  { name: 'Rio de Janeiro', coords: { lat: -22.9068, lng: -43.1729 } },
  { name: 'Niterói', coords: { lat: -22.8832, lng: -43.1034 } },
  { name: 'Petrópolis', coords: { lat: -22.505, lng: -43.1786 } },
  // Sudeste / Sul
  { name: 'Belo Horizonte', coords: { lat: -19.9167, lng: -43.9345 } },
  { name: 'Juiz de Fora', coords: { lat: -21.7642, lng: -43.3496 } },
  { name: 'Vitória', coords: { lat: -20.3155, lng: -40.3128 } },
  { name: 'Curitiba', coords: { lat: -25.4284, lng: -49.2733 } },
  { name: 'Joinville', coords: { lat: -26.3044, lng: -48.8487 } },
  { name: 'Florianópolis', coords: { lat: -27.5949, lng: -48.5482 } },
  { name: 'Porto Alegre', coords: { lat: -30.0346, lng: -51.2177 } },
  { name: 'Caxias do Sul', coords: { lat: -29.1685, lng: -51.1796 } },
  // Centro-Oeste / Norte / Nordeste
  { name: 'Brasília', coords: { lat: -15.7939, lng: -47.8828 } },
  { name: 'Goiânia', coords: { lat: -16.6869, lng: -49.2648 } },
  { name: 'Salvador', coords: { lat: -12.9777, lng: -38.5016 } },
  { name: 'Recife', coords: { lat: -8.0476, lng: -34.877 } },
  { name: 'João Pessoa', coords: { lat: -7.1195, lng: -34.845 } },
  { name: 'Maceió', coords: { lat: -9.6498, lng: -35.7089 } },
  { name: 'Natal', coords: { lat: -5.7945, lng: -35.211 } },
  { name: 'Fortaleza', coords: { lat: -3.7319, lng: -38.5267 } },
  { name: 'Belém', coords: { lat: -1.4558, lng: -48.5039 } },
  { name: 'Manaus', coords: { lat: -3.119, lng: -60.0217 } },
];

/** Cidades dentro de um raio (km) da origem, ordenadas da mais próxima. */
export function citiesWithin(origin: LatLng | null, radiusKm: number): (City & { distanceKm: number })[] {
  if (!origin) return [];
  return CITIES.map((c) => ({ ...c, distanceKm: haversineKm(origin, c.coords) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function cityCoords(name: string | null | undefined): LatLng | null {
  if (!name) return null;
  return CITIES.find((c) => c.name === name)?.coords ?? null;
}

// ---------------------------------------------------------------------------
// Temas / assuntos
// ---------------------------------------------------------------------------

export const TOPICS: Topic[] = [
  {
    slug: 'tecnologia',
    label: 'Tecnologia',
    icon: 'cpu',
    tagline: 'Inovação, IA e o futuro do software',
    description:
      'Cobertura profunda sobre engenharia de software, inteligência artificial, hardware, segurança e o ecossistema de startups.',
    subtopics: ['Inteligência Artificial', 'Desenvolvimento Web', 'Hardware', 'Cibersegurança', 'Startups', 'Open Source'],
    accent: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/50',
      solid: 'bg-emerald-500',
      gradient: 'from-emerald-500/20 to-emerald-900/10',
    },
  },
  {
    slug: 'musica',
    label: 'Música',
    icon: 'music',
    tagline: 'Do analógico ao generativo',
    description:
      'Produção musical, cena independente, tecnologia de áudio e a cultura sonora que move festivais e estúdios.',
    subtopics: ['Produção', 'Cena Independente', 'Festivais', 'Vinil & Analógico', 'Áudio & Tech', 'DJ Sets'],
    accent: {
      text: 'text-fuchsia-400',
      bg: 'bg-fuchsia-950/40',
      border: 'border-fuchsia-800/50',
      solid: 'bg-fuchsia-500',
      gradient: 'from-fuchsia-500/20 to-fuchsia-900/10',
    },
  },
  {
    slug: 'moda',
    label: 'Moda',
    icon: 'shirt',
    tagline: 'Estética, materiais e cultura urbana',
    description:
      'Design de vestuário, moda sustentável, streetwear e a interseção entre tecnologia têxtil e comportamento.',
    subtopics: ['Streetwear', 'Sustentabilidade', 'Alfaiataria', 'Tecidos Tech', 'Tendências', 'Upcycling'],
    accent: {
      text: 'text-rose-400',
      bg: 'bg-rose-950/40',
      border: 'border-rose-800/50',
      solid: 'bg-rose-500',
      gradient: 'from-rose-500/20 to-rose-900/10',
    },
  },
  {
    slug: 'cultura',
    label: 'Cultura',
    icon: 'masks',
    tagline: 'Arte, cidades e ideias',
    description:
      'Artes visuais, literatura, cinema, arquitetura e as manifestações culturais que redesenham as cidades.',
    subtopics: ['Artes Visuais', 'Cinema', 'Literatura', 'Arquitetura', 'Teatro', 'Arte Digital'],
    accent: {
      text: 'text-amber-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/50',
      solid: 'bg-amber-500',
      gradient: 'from-amber-500/20 to-amber-900/10',
    },
  },
  {
    slug: 'esporte',
    label: 'Esporte',
    icon: 'activity',
    tagline: 'Performance, dados e movimento',
    description:
      'Alta performance, esportes urbanos, ciência do treino e a cultura que envolve corrida, ciclismo e coletivos.',
    subtopics: ['Corrida', 'Ciclismo', 'Esportes Urbanos', 'Ciência do Treino', 'Coletivos', 'Wellness'],
    accent: {
      text: 'text-sky-400',
      bg: 'bg-sky-950/40',
      border: 'border-sky-800/50',
      solid: 'bg-sky-500',
      gradient: 'from-sky-500/20 to-sky-900/10',
    },
  },
];

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export function topicLabel(slug: CategorySlug): string {
  return getTopic(slug)?.label ?? slug;
}

// ---------------------------------------------------------------------------
// Conteúdos editoriais (vários itens por assunto)
// ---------------------------------------------------------------------------

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const CONTENTS: ContentItem[] = [
  // ----- Tecnologia -----
  {
    id: 'tec-1', topic: 'tecnologia', subtopic: 'Desenvolvimento Web',
    title: 'A revolução dos frameworks leves na web moderna',
    snippet: 'Novas arquiteturas buscam máxima performance e menor consumo de recursos sem comprometer a experiência.',
    body: 'A pressão por Core Web Vitals melhores e a explosão de dispositivos móveis empurraram o ecossistema para runtimes menores, hidratação parcial e renderização no edge. Analisamos como bibliotecas orientadas a ilhas e compiladores como o do Svelte redefinem o custo do JavaScript no navegador.',
    readTime: '4 min', date: 'Hoje', imageUrl: img('photo-1518770660439-4636190af475'),
  },
  {
    id: 'tec-2', topic: 'tecnologia', subtopic: 'Inteligência Artificial',
    title: 'Modelos de linguagem locais: privacidade sem abrir mão de qualidade',
    snippet: 'A onda de LLMs que rodam no dispositivo promete personalização com dados que nunca saem do aparelho.',
    body: 'Com quantização agressiva e aceleradores dedicados, modelos de alguns bilhões de parâmetros já rodam em notebooks e celulares. Discutimos os trade-offs de latência, custo e privacidade frente às APIs em nuvem.',
    readTime: '6 min', date: 'Hoje', imageUrl: img('photo-1677442136019-21780ecad995'),
  },
  {
    id: 'tec-3', topic: 'tecnologia', subtopic: 'Cibersegurança',
    title: 'Zero trust deixou de ser buzzword e virou arquitetura padrão',
    snippet: 'Empresas abandonam o perímetro tradicional em favor de verificação contínua de identidade e contexto.',
    body: 'O trabalho distribuído tornou o modelo de castelo-e-fosso obsoleto. Mostramos como políticas baseadas em identidade, segmentação e verificação contínua reduzem a superfície de ataque.',
    readTime: '5 min', date: 'Ontem', imageUrl: img('photo-1550751827-4bd374c3f58b'),
  },
  {
    id: 'tec-4', topic: 'tecnologia', subtopic: 'Hardware',
    title: 'Chips RISC-V e a disputa aberta pela próxima década de silício',
    snippet: 'A arquitetura aberta ganha tração em edge, automotivo e data centers.',
    body: 'Sem royalties e com extensibilidade, o RISC-V atrai desde startups até gigantes. Avaliamos onde a arquitetura já é competitiva e onde ainda precisa amadurecer.',
    readTime: '7 min', date: '02 Ago', imageUrl: img('photo-1591405351990-4726e331f141'),
  },
  {
    id: 'tec-5', topic: 'tecnologia', subtopic: 'Startups',
    title: 'Como comunidades open source viram motor de novos negócios',
    snippet: 'O modelo open-core reformula a maneira de construir e monetizar software de infraestrutura.',
    body: 'Da observabilidade aos bancos de dados, projetos abertos constroem confiança antes de vender. Analisamos os padrões de sucesso e as armadilhas do licenciamento.',
    readTime: '5 min', date: '01 Ago', imageUrl: img('photo-1559136555-9303baea8ebd'),
  },
  {
    id: 'tec-6', topic: 'tecnologia', subtopic: 'Open Source',
    title: 'Sustentabilidade de mantenedores: o gargalo invisível da tecnologia',
    snippet: 'Bibliotecas críticas dependem de poucas pessoas — e o burnout é um risco sistêmico.',
    body: 'Boa parte da internet roda sobre projetos mantidos por voluntários. Discutimos financiamento, governança e o papel das empresas na saúde do ecossistema.',
    readTime: '6 min', date: '31 Jul', imageUrl: img('photo-1461749280684-dccba630e2f6'),
  },

  // ----- Música -----
  {
    id: 'mus-1', topic: 'musica', subtopic: 'Vinil & Analógico',
    title: 'Sintetizadores analógicos e o resgate da textura sonora',
    snippet: 'Produtores que preferem a calidez orgânica dos circuitos analógicos no estúdio digital.',
    body: 'A imperfeição dos osciladores analógicos virou assinatura estética. Conversamos com produtores sobre híbridos analógico-digitais e o mercado de módulos eurorack.',
    readTime: '6 min', date: 'Hoje', imageUrl: img('photo-1511671782779-c97d3d27a1d4'),
  },
  {
    id: 'mus-2', topic: 'musica', subtopic: 'Cena Independente',
    title: 'Selos independentes redesenham a economia do artista',
    snippet: 'Distribuição direta e comunidades pagantes mudam a relação entre músicos e público.',
    body: 'Sem intermediários, artistas constroem receita previsível com assinaturas, edições limitadas e shows íntimos. Mapeamos as ferramentas que sustentam essa nova economia.',
    readTime: '5 min', date: 'Ontem', imageUrl: img('photo-1470225620780-dba8ba36b745'),
  },
  {
    id: 'mus-3', topic: 'musica', subtopic: 'Áudio & Tech',
    title: 'Áudio espacial: quando a produção pensa em 360 graus',
    snippet: 'Formatos imersivos exigem uma nova gramática de mixagem e masterização.',
    body: 'Do cinema aos fones do dia a dia, o áudio espacial reposiciona instrumentos no espaço. Explicamos os desafios criativos e técnicos dessa mudança.',
    readTime: '4 min', date: '02 Ago', imageUrl: img('photo-1598488035139-bdbb2231ce04'),
  },
  {
    id: 'mus-4', topic: 'musica', subtopic: 'Festivais',
    title: 'Curadoria de festivais no Brasil aposta em cenas regionais',
    snippet: 'Line-ups valorizam a diversidade sonora de norte a sul do país.',
    body: 'Festivais deixam de importar fórmulas e passam a revelar cenas locais. Analisamos como a curadoria regional fortalece o circuito nacional.',
    readTime: '5 min', date: '01 Ago', imageUrl: img('photo-1459749411175-04bf5292ceea'),
  },
  {
    id: 'mus-5', topic: 'musica', subtopic: 'Produção',
    title: 'IA na produção musical: ferramenta, não substituta',
    snippet: 'Separação de stems, masterização assistida e geração de ideias entram no fluxo criativo.',
    body: 'Longe de substituir músicos, a IA acelera tarefas técnicas e amplia a experimentação. Ouvimos produtores sobre onde ela ajuda e onde atrapalha.',
    readTime: '6 min', date: '30 Jul', imageUrl: img('photo-1493225457124-a3eb161ffa5f'),
  },

  // ----- Moda -----
  {
    id: 'mod-1', topic: 'moda', subtopic: 'Streetwear',
    title: 'Minimalismo e utilitarismo na moda urbana',
    snippet: 'Cortes limpos, tecidos tecnológicos e funcionalidade na cena urbana contemporânea.',
    body: 'O streetwear amadurece e abraça a durabilidade. Analisamos a estética utilitária que une conforto, resistência e discrição.',
    readTime: '5 min', date: 'Hoje', imageUrl: img('photo-1490481651871-ab68de25d43d'),
  },
  {
    id: 'mod-2', topic: 'moda', subtopic: 'Sustentabilidade',
    title: 'Moda circular: quando a roupa não termina no aterro',
    snippet: 'Aluguel, revenda e upcycling reconfiguram o ciclo de vida das peças.',
    body: 'A indústria mais poluente busca circularidade. Mostramos modelos de negócio que estendem a vida útil das roupas sem perder desejo.',
    readTime: '6 min', date: 'Ontem', imageUrl: img('photo-1523381210434-271e8be1f52b'),
  },
  {
    id: 'mod-3', topic: 'moda', subtopic: 'Tecidos Tech',
    title: 'Tecidos inteligentes saem do laboratório para a rua',
    snippet: 'Materiais que regulam temperatura e monitoram o corpo chegam ao vestuário do dia a dia.',
    body: 'Da termorregulação à captação de dados, os têxteis técnicos redefinem o que uma roupa pode fazer. Avaliamos maturidade e limites atuais.',
    readTime: '5 min', date: '02 Ago', imageUrl: img('photo-1441986300917-64674bd600d8'),
  },
  {
    id: 'mod-4', topic: 'moda', subtopic: 'Alfaiataria',
    title: 'A nova alfaiataria: estrutura com liberdade de movimento',
    snippet: 'Modelagens descontraídas reinterpretam o terno para o cotidiano.',
    body: 'A alfaiataria se solta do escritório formal e ganha versatilidade. Conversamos com ateliês sobre modelagem, caimento e conforto.',
    readTime: '4 min', date: '31 Jul', imageUrl: img('photo-1507003211169-0a1dd7228f2d'),
  },

  // ----- Cultura -----
  {
    id: 'cul-1', topic: 'cultura', subtopic: 'Arquitetura',
    title: 'Arquitetura bioclimática nas grandes metrópoles',
    snippet: 'O design urbano se adapta às mudanças climáticas integrando vegetação nativa aos edifícios.',
    body: 'Fachadas verdes, ventilação passiva e materiais locais reduzem o consumo energético. Mostramos projetos que unem estética e desempenho ambiental.',
    readTime: '5 min', date: 'Hoje', imageUrl: img('photo-1513694203232-719a280e022f'),
  },
  {
    id: 'cul-2', topic: 'cultura', subtopic: 'Arte Digital',
    title: 'Arte generativa entre o código e a galeria',
    snippet: 'Artistas transformam algoritmos em obras que existem em movimento constante.',
    body: 'Da criação por regras aos sistemas que evoluem sozinhos, a arte generativa questiona autoria e permanência. Visitamos exposições e ateliês de código.',
    readTime: '6 min', date: 'Ontem', imageUrl: img('photo-1508997449629-303059a039c0'),
  },
  {
    id: 'cul-3', topic: 'cultura', subtopic: 'Cinema',
    title: 'Cinema independente encontra novas janelas de exibição',
    snippet: 'Mostras híbridas e coletivos de exibição ampliam o alcance do audiovisual autoral.',
    body: 'Fora do circuito comercial, o cinema independente reinventa a distribuição. Analisamos festivais, cineclubes e plataformas de nicho.',
    readTime: '5 min', date: '02 Ago', imageUrl: img('photo-1489599849927-2ee91cede3ba'),
  },
  {
    id: 'cul-4', topic: 'cultura', subtopic: 'Literatura',
    title: 'Feiras literárias reconectam autores e leitores',
    snippet: 'O encontro presencial volta a ser central para a cadeia do livro.',
    body: 'Depois de anos de digitalização, a experiência física da feira literária ganha novo fôlego. Exploramos o papel das feiras na descoberta de novas vozes.',
    readTime: '4 min', date: '30 Jul', imageUrl: img('photo-1524995997946-a1c2e315a42f'),
  },

  // ----- Esporte -----
  {
    id: 'esp-1', topic: 'esporte', subtopic: 'Corrida',
    title: 'Ciência do treino: dados que transformam corredores amadores',
    snippet: 'Zonas de frequência, variabilidade cardíaca e periodização deixam de ser exclusividade de elite.',
    body: 'Wearables acessíveis democratizam o treino baseado em dados. Explicamos como interpretar métricas sem cair em obsessão por números.',
    readTime: '6 min', date: 'Hoje', imageUrl: img('photo-1461896836934-ffe607ba8211'),
  },
  {
    id: 'esp-2', topic: 'esporte', subtopic: 'Esportes Urbanos',
    title: 'Skate e escalada urbana redesenham o uso da cidade',
    snippet: 'Espaços públicos viram território de prática esportiva e encontro comunitário.',
    body: 'Do skate à escalada em boulder, os esportes urbanos ressignificam praças e viadutos. Mostramos coletivos que ocupam a cidade com movimento.',
    readTime: '5 min', date: 'Ontem', imageUrl: img('photo-1520045892732-304bc3ac5d8e'),
  },
  {
    id: 'esp-3', topic: 'esporte', subtopic: 'Ciclismo',
    title: 'Cicloativismo e a disputa por cidades mais pedaláveis',
    snippet: 'Infraestrutura cicloviária vira pauta de mobilidade, saúde e clima.',
    body: 'Coletivos pressionam por ciclovias seguras e integração modal. Analisamos dados de mobilidade e o impacto na qualidade de vida urbana.',
    readTime: '5 min', date: '02 Ago', imageUrl: img('photo-1517649763962-0c623066013b'),
  },
  {
    id: 'esp-4', topic: 'esporte', subtopic: 'Wellness',
    title: 'Recuperação ativa: o descanso como parte do treino',
    snippet: 'Sono, mobilidade e nutrição ganham o mesmo peso que o esforço.',
    body: 'A performance sustentável depende tanto do descanso quanto do treino. Reunimos evidências sobre recuperação ativa e prevenção de lesões.',
    readTime: '4 min', date: '31 Jul', imageUrl: img('photo-1544367567-0f2fcb009e0b'),
  },
];

export function contentsByTopic(topic: CategorySlug): ContentItem[] {
  return CONTENTS.filter((c) => c.topic === topic);
}

export function getContent(id: string): ContentItem | undefined {
  return CONTENTS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Eventos (com geolocalização para ordenação por proximidade)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Eventos
//
// As datas são geradas a partir da meia-noite UTC de hoje + um deslocamento em
// dias, de modo que a agenda esteja SEMPRE atual (nada de eventos vencidos) e
// que servidor e cliente calculem exatamente o mesmo valor.
// ---------------------------------------------------------------------------

/** ISO de "hoje (UTC) + days" às `hourUtc` (22h UTC ≈ 19h de Brasília). */
function inDays(days: number, hourUtc = 22, durationH = 3): { startsAt: string; endsAt: string } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0),
  );
  start.setUTCDate(start.getUTCDate() + days);
  const end = new Date(start.getTime() + durationH * 3600000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

/**
 * Coordenada do local do evento: centro da cidade + um deslocamento pequeno e
 * DETERMINÍSTICO (derivado do id). Sem isso, todos os locais da mesma cidade
 * cairiam no mesmo ponto e a distância apareceria como "0 m" para todos.
 * Determinístico = servidor e cliente calculam igual.
 */
function venueCoords(cityName: string, seedId: string): LatLng {
  const base = CITIES.find((c) => c.name === cityName)?.coords ?? CITIES[0].coords;
  let h = 0;
  for (let i = 0; i < seedId.length; i++) h = (h * 31 + seedId.charCodeAt(i)) >>> 0;
  // Até ~±0.055° (~6 km) — escala urbana plausível.
  const dLat = (((h % 1000) / 1000) - 0.5) * 0.11;
  const dLng = (((Math.floor(h / 1000) % 1000) / 1000) - 0.5) * 0.11;
  return { lat: +(base.lat + dLat).toFixed(5), lng: +(base.lng + dLng).toFixed(5) };
}

type EventSeed = {
  id: string;
  topic: CategorySlug;
  title: string;
  city: string;
  venue: string;
  /** dias a partir de hoje (0 = hoje) */
  inDays: number;
  hourUtc?: number;
  durationH?: number;
  price: string;
  image: string;
  description: string;
  tags?: string[];
  artist?: string;
};

const EVENT_SEEDS: EventSeed[] = [
  // ---------------- Tecnologia ----------------
  { id: 'ev-tec-1', topic: 'tecnologia', title: 'Encontro de Desenvolvimento Web & Inteligência Artificial', city: 'São Paulo', venue: 'Hub de Inovação Paulista', inDays: 2, price: 'Gratuito', image: 'photo-1540575467063-178a50c2df87', description: 'Painel com especialistas em engenharia de software, modelos de linguagem e o ecossistema web.', tags: ['IA', 'web', 'devs'] },
  { id: 'ev-tec-2', topic: 'tecnologia', title: 'Meetup RISC-V & Computação Aberta', city: 'Belo Horizonte', venue: 'San Pedro Valley Space', inDays: 6, price: 'R$ 30', image: 'photo-1591405351990-4726e331f141', description: 'Discussões técnicas sobre arquitetura aberta de processadores e computação de borda.', tags: ['hardware', 'open source'] },
  { id: 'ev-tec-3', topic: 'tecnologia', title: 'Hackathon de Segurança Zero Trust', city: 'Curitiba', venue: 'Vila Tech', inDays: 12, hourUtc: 12, durationH: 24, price: 'R$ 50', image: 'photo-1550751827-4bd374c3f58b', description: 'Maratona de 24h para construir arquiteturas de segurança baseadas em identidade.', tags: ['segurança', 'hackathon'] },
  { id: 'ev-tec-4', topic: 'tecnologia', title: 'Summit de Dados & Engenharia de Plataforma', city: 'Campinas', venue: 'Centro de Convenções Unicamp', inDays: 0, hourUtc: 13, durationH: 9, price: 'R$ 120', image: 'photo-1551288049-bebda4e38f71', description: 'Trilhas sobre pipelines de dados, observabilidade e plataformas internas.', tags: ['dados', 'devops'] },
  { id: 'ev-tec-5', topic: 'tecnologia', title: 'Noite de Robótica & Maker', city: 'São José dos Campos', venue: 'Parque Tecnológico', inDays: 4, price: 'Gratuito', image: 'photo-1518770660439-4636190af475', description: 'Demonstrações de robótica, impressão 3D e eletrônica embarcada.', tags: ['maker', 'robótica'] },
  { id: 'ev-tec-6', topic: 'tecnologia', title: 'Startup Pitch Night', city: 'Florianópolis', venue: 'ACATE', inDays: 9, price: 'R$ 25', image: 'photo-1559136555-9303baea8ebd', description: 'Rodada de pitches de startups locais com investidores e mentores.', tags: ['startups', 'negócios'] },

  // ---------------- Música ----------------
  { id: 'ev-mus-1', topic: 'musica', title: 'Noite de Sintetizadores Analógicos', city: 'Rio de Janeiro', venue: 'Estúdio Lapa Sonora', inDays: 1, price: 'R$ 40', image: 'photo-1511671782779-c97d3d27a1d4', description: 'Sets ao vivo com módulos eurorack e conversa aberta com produtores de música eletrônica.', tags: ['eletrônica', 'synth'], artist: 'Coletivo Modular' },
  { id: 'ev-mus-2', topic: 'musica', title: 'Festival de Cenas Regionais', city: 'Recife', venue: 'Cais do Sertão', inDays: 15, hourUtc: 18, durationH: 8, price: 'R$ 60', image: 'photo-1459749411175-04bf5292ceea', description: 'Um dia inteiro dedicado à diversidade sonora do Nordeste, com curadoria independente.', tags: ['festival', 'regional'], artist: 'Vários artistas' },
  { id: 'ev-mus-3', topic: 'musica', title: 'Jazz & Improviso no Porão', city: 'São Paulo', venue: 'Casa de Jazz Vila Buarque', inDays: 0, hourUtc: 23, price: 'R$ 35', image: 'photo-1493225457124-a3eb161ffa5f', description: 'Quarteto de jazz contemporâneo com jam session aberta ao final.', tags: ['jazz', 'ao vivo'], artist: 'Quarteto Noturno' },
  { id: 'ev-mus-4', topic: 'musica', title: 'Show de MPB Contemporânea', city: 'Niterói', venue: 'Teatro Popular', inDays: 3, price: 'R$ 50', image: 'photo-1470225620780-dba8ba36b745', description: 'Novas vozes da MPB apresentam repertório autoral em formato intimista.', tags: ['MPB', 'autoral'], artist: 'Nova MPB' },
  { id: 'ev-mus-5', topic: 'musica', title: 'Festa de Música Eletrônica Underground', city: 'Porto Alegre', venue: 'Galpão 4º Distrito', inDays: 7, hourUtc: 1, durationH: 7, price: 'R$ 70', image: 'photo-1598488035139-bdbb2231ce04', description: 'Line-up de DJs locais com sistema de som analógico e visuais generativos.', tags: ['techno', 'DJ'], artist: 'DJs residentes' },
  { id: 'ev-mus-6', topic: 'musica', title: 'Roda de Samba de Raiz', city: 'Salvador', venue: 'Largo do Pelourinho', inDays: 5, hourUtc: 20, price: 'Gratuito', image: 'photo-1516450360452-9312f5e86fc7', description: 'Roda de samba tradicional ao ar livre com participação do público.', tags: ['samba', 'ao ar livre'], artist: 'Grupo Raiz' },

  // ---------------- Moda ----------------
  { id: 'ev-mod-1', topic: 'moda', title: 'Feira de Moda Circular & Upcycling', city: 'São Paulo', venue: 'Galpão Vila Madalena', inDays: 2, hourUtc: 15, durationH: 8, price: 'Gratuito', image: 'photo-1523381210434-271e8be1f52b', description: 'Marcas independentes, brechós selecionados e oficinas de reforma criativa de peças.', tags: ['sustentável', 'brechó'] },
  { id: 'ev-mod-2', topic: 'moda', title: 'Workshop de Tecidos Tecnológicos', city: 'Porto Alegre', venue: 'Instituto Têxtil Sul', inDays: 10, hourUtc: 17, price: 'R$ 80', image: 'photo-1441986300917-64674bd600d8', description: 'Experiência prática com materiais inteligentes e prototipagem de vestuário funcional.', tags: ['têxtil', 'workshop'] },
  { id: 'ev-mod-3', topic: 'moda', title: 'Desfile de Novos Estilistas', city: 'Rio de Janeiro', venue: 'Museu de Arte Moderna', inDays: 8, price: 'R$ 45', image: 'photo-1490481651871-ab68de25d43d', description: 'Coleções de formandos e marcas emergentes com foco em alfaiataria contemporânea.', tags: ['desfile', 'autoral'] },
  { id: 'ev-mod-4', topic: 'moda', title: 'Bazar Streetwear & Sneakers', city: 'Belo Horizonte', venue: 'Mercado Central Anexo', inDays: 1, hourUtc: 14, durationH: 9, price: 'Gratuito', image: 'photo-1507003211169-0a1dd7228f2d', description: 'Troca e venda de peças de streetwear, sneakers raros e customização ao vivo.', tags: ['streetwear', 'sneakers'] },

  // ---------------- Cultura ----------------
  { id: 'ev-cul-1', topic: 'cultura', title: 'Mostra Cultural: Arte, Som & Design Digital', city: 'São Paulo', venue: 'Galeria de Arte do Centro', inDays: 0, hourUtc: 19, durationH: 6, price: 'Gratuito', image: 'photo-1508997449629-303059a039c0', description: 'Exposição interativa reunindo artistas gerativos, instalações audiovisuais e design de experiência.', tags: ['arte digital', 'exposição'] },
  { id: 'ev-cul-2', topic: 'cultura', title: 'Feira Literária Independente', city: 'Salvador', venue: 'Casa do Benin', inDays: 11, hourUtc: 13, durationH: 8, price: 'Gratuito', image: 'photo-1524995997946-a1c2e315a42f', description: 'Encontro de editoras independentes, sessões de autógrafos e mesas sobre novas vozes.', tags: ['literatura', 'feira'] },
  { id: 'ev-cul-3', topic: 'cultura', title: 'Mostra de Cinema Autoral', city: 'Curitiba', venue: 'Cine Passeio', inDays: 3, hourUtc: 22, price: 'R$ 20', image: 'photo-1489599849927-2ee91cede3ba', description: 'Sessões de curtas e longas independentes com debate mediado após as exibições.', tags: ['cinema', 'mostra'] },
  { id: 'ev-cul-4', topic: 'cultura', title: 'Circuito de Arquitetura Bioclimática', city: 'Brasília', venue: 'Museu Nacional', inDays: 6, hourUtc: 14, durationH: 5, price: 'Gratuito', image: 'photo-1513694203232-719a280e022f', description: 'Visitas guiadas e palestras sobre arquitetura adaptada ao clima local.', tags: ['arquitetura', 'sustentável'] },
  { id: 'ev-cul-5', topic: 'cultura', title: 'Noite de Teatro Experimental', city: 'Santos', venue: 'Teatro Coliseu', inDays: 4, price: 'R$ 30', image: 'photo-1503095396549-807759245b35', description: 'Montagens curtas de grupos experimentais com linguagem física e multimídia.', tags: ['teatro', 'experimental'] },

  // ---------------- Esporte ----------------
  { id: 'ev-esp-1', topic: 'esporte', title: 'Corrida Noturna & Ciência do Treino', city: 'Florianópolis', venue: 'Beira-Mar Norte', inDays: 2, hourUtc: 22, price: 'R$ 25', image: 'photo-1461896836934-ffe607ba8211', description: 'Circuito de 5 km com aferição de dados e palestra sobre periodização para amadores.', tags: ['corrida', '5k'] },
  { id: 'ev-esp-2', topic: 'esporte', title: 'Encontro de Esportes Urbanos', city: 'Rio de Janeiro', venue: 'Praça XV', inDays: 5, hourUtc: 17, durationH: 6, price: 'Gratuito', image: 'photo-1520045892732-304bc3ac5d8e', description: 'Skate, escalada de boulder e mobilidade ativa ocupando o centro da cidade.', tags: ['skate', 'urbano'] },
  { id: 'ev-esp-3', topic: 'esporte', title: 'Pedal Coletivo pela Cidade', city: 'São Paulo', venue: 'Ciclovia Paulista', inDays: 1, hourUtc: 12, durationH: 4, price: 'Gratuito', image: 'photo-1517649763962-0c623066013b', description: 'Passeio de bicicleta guiado com foco em mobilidade urbana e segurança viária.', tags: ['ciclismo', 'mobilidade'] },
  { id: 'ev-esp-4', topic: 'esporte', title: 'Clínica de Recuperação Ativa & Mobilidade', city: 'Campinas', venue: 'Centro Esportivo Taquaral', inDays: 9, hourUtc: 13, price: 'R$ 40', image: 'photo-1544367567-0f2fcb009e0b', description: 'Workshop prático sobre sono, mobilidade articular e prevenção de lesões.', tags: ['wellness', 'treino'] },
  { id: 'ev-esp-5', topic: 'esporte', title: 'Torneio de Vôlei de Praia', city: 'Niterói', venue: 'Praia de Icaraí', inDays: 13, hourUtc: 12, durationH: 8, price: 'Gratuito', image: 'photo-1612872087720-bb876e2e67d1', description: 'Torneio amador aberto a duplas, com categorias iniciante e avançada.', tags: ['vôlei', 'praia'] },
];

export const EVENTS: EventItem[] = EVENT_SEEDS.map((s) => {
  const { startsAt, endsAt } = inDays(s.inDays, s.hourUtc ?? 22, s.durationH ?? 3);
  return {
    id: s.id,
    topic: s.topic,
    title: s.title,
    date: formatEventDate(startsAt),
    startsAt,
    endsAt,
    city: s.city,
    venue: s.venue,
    coords: venueCoords(s.city, s.id),
    imageUrl: img(s.image),
    description: s.description,
    price: s.price,
    tags: s.tags,
    artist: s.artist,
  };
});
export function eventsByTopic(topic: CategorySlug): EventItem[] {
  return EVENTS.filter((e) => e.topic === topic);
}

export function getEvent(id: string): EventItem | undefined {
  return EVENTS.find((e) => e.id === id);
}
