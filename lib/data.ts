// Camada central de dados do nexo-social.
// Concentra os temas (assuntos), conteúdos editoriais e eventos com
// geolocalização. É consumida tanto por componentes de servidor quanto de
// cliente, portanto contém apenas dados e funções puras.

import type { LatLng } from './geo';

export type CategorySlug =
  | 'tecnologia'
  | 'musica'
  | 'moda'
  | 'cultura'
  | 'esporte';

export interface Topic {
  slug: CategorySlug;
  label: string;
  icon: string;
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
  date: string;
  city: string;
  venue: string;
  coords: LatLng;
  imageUrl: string;
  description: string;
  price: string;
}

// ---------------------------------------------------------------------------
// Cidades (fallback de proximidade quando o GPS não está disponível)
// ---------------------------------------------------------------------------

export interface City {
  name: string;
  coords: LatLng;
}

export const CITIES: City[] = [
  { name: 'São Paulo', coords: { lat: -23.5505, lng: -46.6333 } },
  { name: 'Rio de Janeiro', coords: { lat: -22.9068, lng: -43.1729 } },
  { name: 'Belo Horizonte', coords: { lat: -19.9167, lng: -43.9345 } },
  { name: 'Curitiba', coords: { lat: -25.4284, lng: -49.2733 } },
  { name: 'Porto Alegre', coords: { lat: -30.0346, lng: -51.2177 } },
  { name: 'Florianópolis', coords: { lat: -27.5949, lng: -48.5482 } },
  { name: 'Recife', coords: { lat: -8.0476, lng: -34.877 } },
  { name: 'Salvador', coords: { lat: -12.9777, lng: -38.5016 } },
  { name: 'Brasília', coords: { lat: -15.7939, lng: -47.8828 } },
  { name: 'Fortaleza', coords: { lat: -3.7319, lng: -38.5267 } },
];

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
    icon: '💻',
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
    icon: '🎵',
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
    icon: '🧥',
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
    icon: '🎭',
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
    icon: '🏅',
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

export const EVENTS: EventItem[] = [
  // Tecnologia
  {
    id: 'ev-tec-1', topic: 'tecnologia',
    title: 'Encontro de Desenvolvimento Web & Inteligência Artificial',
    date: '15 de Agosto • 19:00', city: 'São Paulo', venue: 'Hub de Inovação Paulista',
    coords: { lat: -23.5613, lng: -46.6565 }, imageUrl: img('photo-1540575467063-178a50c2df87'),
    description: 'Painel com especialistas em engenharia de software, modelos de linguagem e o ecossistema web.',
    price: 'Gratuito',
  },
  {
    id: 'ev-tec-2', topic: 'tecnologia',
    title: 'Meetup RISC-V & Computação Aberta',
    date: '20 de Agosto • 18:30', city: 'Belo Horizonte', venue: 'San Pedro Valley Space',
    coords: { lat: -19.9327, lng: -43.9386 }, imageUrl: img('photo-1591405351990-4726e331f141'),
    description: 'Discussões técnicas sobre arquitetura aberta de processadores e computação de borda.',
    price: 'R$ 30',
  },
  {
    id: 'ev-tec-3', topic: 'tecnologia',
    title: 'Hackathon de Segurança Zero Trust',
    date: '28 de Agosto • 09:00', city: 'Curitiba', venue: 'Vila Tech',
    coords: { lat: -25.4372, lng: -49.2699 }, imageUrl: img('photo-1550751827-4bd374c3f58b'),
    description: 'Maratona de 24h para construir arquiteturas de segurança baseadas em identidade.',
    price: 'R$ 50',
  },

  // Música
  {
    id: 'ev-mus-1', topic: 'musica',
    title: 'Noite de Sintetizadores Analógicos',
    date: '16 de Agosto • 21:00', city: 'Rio de Janeiro', venue: 'Estúdio Lapa Sonora',
    coords: { lat: -22.9133, lng: -43.1794 }, imageUrl: img('photo-1511671782779-c97d3d27a1d4'),
    description: 'Sets ao vivo com módulos eurorack e conversa aberta com produtores de música eletrônica.',
    price: 'R$ 40',
  },
  {
    id: 'ev-mus-2', topic: 'musica',
    title: 'Festival de Cenas Regionais',
    date: '30 de Agosto • 15:00', city: 'Recife', venue: 'Cais do Sertão',
    coords: { lat: -8.0631, lng: -34.8711 }, imageUrl: img('photo-1459749411175-04bf5292ceea'),
    description: 'Um dia inteiro dedicado à diversidade sonora do Nordeste, com curadoria independente.',
    price: 'R$ 60',
  },

  // Moda
  {
    id: 'ev-mod-1', topic: 'moda',
    title: 'Feira de Moda Circular & Upcycling',
    date: '17 de Agosto • 12:00', city: 'São Paulo', venue: 'Galpão Vila Madalena',
    coords: { lat: -23.5546, lng: -46.6899 }, imageUrl: img('photo-1523381210434-271e8be1f52b'),
    description: 'Marcas independentes, brechós selecionados e oficinas de reforma criativa de peças.',
    price: 'Gratuito',
  },
  {
    id: 'ev-mod-2', topic: 'moda',
    title: 'Workshop de Tecidos Tecnológicos',
    date: '24 de Agosto • 14:00', city: 'Porto Alegre', venue: 'Instituto Têxtil Sul',
    coords: { lat: -30.0277, lng: -51.2287 }, imageUrl: img('photo-1441986300917-64674bd600d8'),
    description: 'Experiência prática com materiais inteligentes e prototipagem de vestuário funcional.',
    price: 'R$ 80',
  },

  // Cultura
  {
    id: 'ev-cul-1', topic: 'cultura',
    title: 'Mostra Cultural: Arte, Som & Design Digital',
    date: '22 de Agosto • 16:00', city: 'São Paulo', venue: 'Galeria de Arte do Centro',
    coords: { lat: -23.5479, lng: -46.6388 }, imageUrl: img('photo-1508997449629-303059a039c0'),
    description: 'Exposição interativa reunindo artistas gerativos, instalações audiovisuais e design de experiência.',
    price: 'Gratuito',
  },
  {
    id: 'ev-cul-2', topic: 'cultura',
    title: 'Feira Literária Independente',
    date: '25 de Agosto • 10:00', city: 'Salvador', venue: 'Casa do Benin',
    coords: { lat: -12.9718, lng: -38.5083 }, imageUrl: img('photo-1524995997946-a1c2e315a42f'),
    description: 'Encontro de editoras independentes, sessões de autógrafos e mesas sobre novas vozes.',
    price: 'Gratuito',
  },

  // Esporte
  {
    id: 'ev-esp-1', topic: 'esporte',
    title: 'Corrida Noturna & Ciência do Treino',
    date: '18 de Agosto • 19:30', city: 'Florianópolis', venue: 'Beira-Mar Norte',
    coords: { lat: -27.5817, lng: -48.5495 }, imageUrl: img('photo-1461896836934-ffe607ba8211'),
    description: 'Circuito de 5 km com aferição de dados e palestra sobre periodização para amadores.',
    price: 'R$ 25',
  },
  {
    id: 'ev-esp-2', topic: 'esporte',
    title: 'Encontro de Esportes Urbanos',
    date: '31 de Agosto • 14:00', city: 'Rio de Janeiro', venue: 'Praça XV',
    coords: { lat: -22.9026, lng: -43.1737 }, imageUrl: img('photo-1520045892732-304bc3ac5d8e'),
    description: 'Skate, escalada de boulder e mobilidade ativa ocupando o centro da cidade.',
    price: 'Gratuito',
  },
];

export function eventsByTopic(topic: CategorySlug): EventItem[] {
  return EVENTS.filter((e) => e.topic === topic);
}

export function getEvent(id: string): EventItem | undefined {
  return EVENTS.find((e) => e.id === id);
}
