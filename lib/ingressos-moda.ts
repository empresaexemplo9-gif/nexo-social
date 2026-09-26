// Onde comprar ingresso de evento de moda — guia curado, usável no navegador.
//
// A moda quase não passa pelo Ticketmaster: as semanas de moda vendem pela
// Eventim, os eventos autorais e as feiras pela Sympla, e alguns distribuem
// ingresso grátis no Instagram. Cada item abaixo foi conferido nas páginas
// oficiais e na imprensa (setembro de 2026); datas e preços mudam a cada
// edição, então o guia aponta para a página que a organização mantém.

export interface EventoDeModa {
  nome: string;
  cidade: string;
  /** Como o ingresso funciona, em uma ou duas frases. */
  comoFunciona: string;
  gratuito?: boolean;
  /** Próxima edição com data confirmada; some sozinha depois de `ate`. */
  proxima?: { texto: string; ate: string };
  /** Onde garantir o ingresso (ou o credenciamento). */
  ingresso: { rotulo: string; url: string; /** Verbo do botão quando não é compra (ex.: credenciamento). */ acao?: string };
  /** Página oficial com programação e regras. */
  oficial?: { rotulo: string; url: string };
  /** Matéria da Revista sobre o evento, quando houver. */
  materia?: string;
}

export const EVENTOS_DE_MODA: EventoDeModa[] = [
  {
    nome: 'São Paulo Fashion Week',
    cidade: 'São Paulo',
    comoFunciona:
      'Ingressos na Eventim. O HUB dá acesso às áreas comuns, exposições e ativações (sem sala de desfile); os de desfile são por sessão.',
    proxima: { texto: '13 a 18 de outubro de 2026, no Parque Ibirapuera', ate: '2026-10-18' },
    ingresso: { rotulo: 'Eventim', url: 'https://www.eventim.com.br/artist/spfw-2026/' },
    oficial: { rotulo: 'Como funciona a venda', url: 'https://spfw.com.br/saiba-tudo-sobre-a-venda-de-ingressos-no-spfw/' },
    materia: 'sao-paulo-fashion-week',
  },
  {
    nome: 'Rio Fashion Week',
    cidade: 'Rio de Janeiro',
    comoFunciona:
      'De volta em 2026, no Píer Mauá. Ingressos na Eventim em quatro tipos — hub, sessões de negócios, desfiles (em pé ou sentado) e club —, a partir de R$ 50.',
    ingresso: { rotulo: 'Eventim', url: 'https://www.eventim.com.br/artist/riofw/' },
    oficial: { rotulo: 'Tipos de ingresso', url: 'https://riofw.com.br/ingressos/' },
  },
  {
    nome: 'Casa de Criadores',
    cidade: 'São Paulo',
    comoFunciona:
      'A principal semana de moda autoral do país. Entrada gratuita: os ingressos saem a cada dia de evento, só nos stories do Instagram oficial.',
    gratuito: true,
    ingresso: { rotulo: 'Instagram @casadecriadores', url: 'https://www.instagram.com/casadecriadores/' },
    oficial: { rotulo: 'Site oficial', url: 'https://casadecriadores.com.br/' },
  },
  {
    nome: 'DFB Festival',
    cidade: 'Fortaleza',
    comoFunciona:
      'O maior evento de moda independente da América Latina, na Praia de Iracema. A programação de rua é gratuita; a sala de desfiles tem ingresso na Sympla, com cadastro facial para a entrada.',
    ingresso: { rotulo: 'Sympla', url: 'https://www.sympla.com.br/eventos?s=DFB%20Festival' },
  },
  {
    nome: 'Brasil Eco Fashion Week',
    cidade: 'São Paulo',
    comoFunciona: 'Moda sustentável: palestras e desfiles com entrada gratuita e inscrição pela Sympla.',
    gratuito: true,
    ingresso: { rotulo: 'Sympla', url: 'https://www.sympla.com.br/eventos?s=Brasil%20Eco%20Fashion%20Week' },
    oficial: { rotulo: 'Site oficial', url: 'https://brasilecofashion.com.br/' },
  },
  {
    nome: 'Minas Trend',
    cidade: 'Belo Horizonte',
    comoFunciona:
      'Salão de negócios da FIEMG, para lojistas e expositores; imprensa e criadores de conteúdo pedem credenciamento. Algumas edições abrem palestras e desfiles gratuitos ao público.',
    ingresso: { rotulo: 'FIEMG', url: 'https://www.fiemg.com.br/minas-trend/', acao: 'Credenciamento' },
  },
];

/** A data da próxima edição ainda vale? */
export function proximaValida(e: EventoDeModa, hoje = new Date()): boolean {
  return Boolean(e.proxima && new Date(`${e.proxima.ate}T23:59:59-03:00`).getTime() >= hoje.getTime());
}

export function eventoDeModaDaMateria(slug: string): EventoDeModa | null {
  return EVENTOS_DE_MODA.find((e) => e.materia === slug) ?? null;
}

const UF: Record<string, string> = {
  'São Paulo': 'sp', Guarulhos: 'sp', 'Santo André': 'sp', Osasco: 'sp', Campinas: 'sp', Santos: 'sp', 'São José dos Campos': 'sp', Sorocaba: 'sp',
  'Rio de Janeiro': 'rj', Niterói: 'rj', Petrópolis: 'rj', 'Belo Horizonte': 'mg', 'Juiz de Fora': 'mg', Vitória: 'es', Curitiba: 'pr',
  Joinville: 'sc', Florianópolis: 'sc', 'Porto Alegre': 'rs', 'Caxias do Sul': 'rs', Brasília: 'df', Goiânia: 'go', Salvador: 'ba',
  Recife: 'pe', 'João Pessoa': 'pb', Maceió: 'al', Natal: 'rn', Fortaleza: 'ce', Belém: 'pa', Manaus: 'am',
};

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Plataformas onde os eventos de moda vendem ingresso, já na cidade da
 * pessoa quando ela está no perfil.
 */
export function plataformasDeModa(cidade?: string | null): { nome: string; para: string; url: string }[] {
  const c = cidade?.trim() || '';
  const uf = UF[c];
  return [
    {
      nome: 'Sympla',
      para: 'desfiles autorais, feiras, bazares e workshops',
      url: uf ? `https://www.sympla.com.br/eventos/${slug(c)}-${uf}/moda-e-beleza` : 'https://www.sympla.com.br/eventos/moda-e-beleza',
    },
    { nome: 'Eventim', para: 'as grandes semanas de moda', url: 'https://www.eventim.com.br/search/?affiliate=BR1&searchterm=fashion%20week' },
    {
      nome: 'Eventbrite',
      para: 'cursos, palestras e encontros',
      url: `https://www.eventbrite.com.br/d/brazil${c ? `--${encodeURIComponent(c.toLowerCase().replace(/\s+/g, '-'))}` : ''}/moda/`,
    },
    {
      nome: 'Google Eventos',
      para: 'tudo o que foi divulgado na sua região',
      url: `https://www.google.com/search?q=${encodeURIComponent(`eventos de moda${c ? ` em ${c}` : ''}`)}&ibp=htl;events`,
    },
  ];
}
