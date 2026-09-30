// De onde vêm as "Notícias ao vivo" de cada tema: feeds RSS/Atom de veículos
// brasileiros (ou em português). Só dados — quem baixa e lê é lib/noticias.ts.
//
// Feeds conferidos em 2026-09-30: todos responderam 200 com RSS/Atom válido e
// itens publicados nos últimos dias. Veículos testados e deixados de fora
// naquela data: Tecmundo/Voxel (204 vazio), Jovem Nerd, Omelete, AdoroCinema,
// CNN Brasil por editoria, Blog da Companhia (404), Adrenaline, PublishNews,
// Whiplash (403), The Enemy (certificado inválido), Monkeybuzz e FFW (feed
// vazio ou parado), Lilian Pacce (parado desde 2023), Viaje na Viagem (quase
// sem itens recentes) e Suplemento Pernambuco (o domínio virou site de
// suplementos e cupons — não voltar a usar). A Dasartes às vezes responde com
// uma página "One moment, please…" (anti-robô): a fonte cai e as outras seguram.
//
// `filtro`/`excluir` são testados contra "link · categorias · título · resumo"
// do item — servem para feeds que misturam assuntos (uma revista inteira, uma
// editoria de cultura usada só para livros…).

import type { CategorySlug } from './data';

export interface FonteDeNoticia {
  /** Nome do veículo como aparece no card e no botão "Ler a matéria completa em…". */
  nome: string;
  /** Página do veículo (ou da editoria) — também base para links relativos. */
  site: string;
  /** Endereço do feed RSS/Atom. */
  feed: string;
  /** Só passam os itens em que isto casa. */
  filtro?: RegExp;
  /** Itens em que isto casa ficam de fora (mesmo depois do filtro). */
  excluir?: RegExp;
}

const G1 = (editoria: string): Pick<FonteDeNoticia, 'site' | 'feed'> => ({
  site: `https://g1.globo.com/${editoria}/`,
  feed: `https://g1.globo.com/rss/g1/${editoria}/`,
});

const ESTADAO = (secao: string) => `https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/${secao}/`;

const O_GLOBO = (secao: string): Pick<FonteDeNoticia, 'nome' | 'site' | 'feed'> => ({
  nome: 'O Globo',
  site: `https://oglobo.globo.com/${secao}/`,
  feed: `https://oglobo.globo.com/rss/oglobo/${secao}/`,
});

const VEJA_SP = { nome: 'Veja SP', site: 'https://vejasp.abril.com.br', feed: 'https://vejasp.abril.com.br/feed/' };

export const FONTES_DE_NOTICIA: Record<CategorySlug, FonteDeNoticia[]> = {
  tecnologia: [
    { nome: 'g1', ...G1('tecnologia') },
    { nome: 'Tecnoblog', site: 'https://tecnoblog.net', feed: 'https://tecnoblog.net/feed/' },
    { nome: 'Canaltech', site: 'https://canaltech.com.br', feed: 'https://canaltech.com.br/rss/' },
    { nome: 'Olhar Digital', site: 'https://olhardigital.com.br', feed: 'https://olhardigital.com.br/feed/' },
    { nome: 'Meio Bit', site: 'https://meiobit.com', feed: 'https://meiobit.com/feed/' },
  ],
  musica: [
    { nome: 'g1', ...G1('pop-arte/musica') },
    // A Rolling Stone mistura TV e cinema: só as editorias de música.
    { nome: 'Rolling Stone Brasil', site: 'https://rollingstone.com.br', feed: 'https://rollingstone.com.br/feed/', filtro: /rollingstone\.com\.br\/(musica|lista-rs)\// },
    { nome: 'Tenho Mais Discos Que Amigos!', site: 'https://www.tenhomaisdiscosqueamigos.com', feed: 'https://www.tenhomaisdiscosqueamigos.com/feed/' },
    { nome: 'Music Non Stop', site: 'https://musicnonstop.uol.com.br', feed: 'https://musicnonstop.uol.com.br/feed/' },
    O_GLOBO('cultura/musica'),
  ],
  moda: [
    // Metade do feed da Vogue é celebridade: fica só moda, desfiles e beleza.
    { nome: 'Vogue Brasil', site: 'https://vogue.globo.com', feed: 'https://vogue.globo.com/rss/vogue/', filtro: /vogue\.globo\.com\/(moda|desfiles|beleza)\// },
    { nome: 'ELLE Brasil', site: 'https://elle.com.br', feed: 'https://elle.com.br/feed', filtro: /elle\.com\.br\/(moda|desfiles|beleza)\// },
    { nome: "Harper's Bazaar Brasil", site: 'https://harpersbazaar.uol.com.br', feed: 'https://harpersbazaar.uol.com.br/feed/' },
    { nome: 'Glamour', site: 'https://glamour.globo.com', feed: 'https://glamour.globo.com/rss/glamour/', filtro: /glamour\.globo\.com\/(moda|beleza)\// },
    { nome: 'Fashion Bubbles', site: 'https://fashionbubbles.com', feed: 'https://fashionbubbles.com/feed/', filtro: /fashionbubbles\.com\/estilo\// },
  ],
  cultura: [
    { nome: 'g1', ...G1('pop-arte') },
    { nome: 'Estadão', site: 'https://www.estadao.com.br/cultura/', feed: ESTADAO('cultura') },
    // A Ilustrada inclui o F5 (fofoca de TV e famosos): fica de fora.
    { nome: 'Folha de S.Paulo', site: 'https://www1.folha.uol.com.br/ilustrada/', feed: 'https://feeds.folha.uol.com.br/ilustrada/rss091.xml', excluir: /f5\.folha\.uol\.com\.br/ },
    { nome: 'Agência Brasil', site: 'https://agenciabrasil.ebc.com.br/cultura', feed: 'https://agenciabrasil.ebc.com.br/rss/cultura/feed.xml' },
    { nome: 'CartaCapital', site: 'https://www.cartacapital.com.br/cultura/', feed: 'https://www.cartacapital.com.br/cultura/feed/' },
  ],
  esporte: [
    { nome: 'ge', site: 'https://ge.globo.com', feed: 'https://ge.globo.com/rss/ge/' },
    { nome: 'Gazeta Esportiva', site: 'https://www.gazetaesportiva.com', feed: 'https://www.gazetaesportiva.com/feed/' },
    { nome: 'Trivela', site: 'https://trivela.com.br', feed: 'https://trivela.com.br/feed/' },
    { nome: 'Olimpíada Todo Dia', site: 'https://www.olimpiadatododia.com.br', feed: 'https://www.olimpiadatododia.com.br/feed/' },
    { nome: 'Agência Brasil', site: 'https://agenciabrasil.ebc.com.br/esportes', feed: 'https://agenciabrasil.ebc.com.br/rss/esportes/feed.xml' },
  ],
  cinema: [
    { nome: 'g1', ...G1('pop-arte/cinema') },
    { nome: 'CinePOP', site: 'https://cinepop.com.br', feed: 'https://cinepop.com.br/feed/' },
    { nome: 'Pipoca Moderna', site: 'https://pipocamoderna.com.br', feed: 'https://pipocamoderna.com.br/feed/' },
    O_GLOBO('cultura/filmes'),
    { nome: 'Cinema com Rapadura', site: 'https://cinemacomrapadura.com.br', feed: 'https://cinemacomrapadura.com.br/feed/' },
  ],
  livros: [
    { nome: 'Revista Bula', site: 'https://www.revistabula.com', feed: 'https://www.revistabula.com/feed' },
    { nome: 'Quatro Cinco Um', site: 'https://www.quatrocincoum.com.br', feed: 'https://www.quatrocincoum.com.br/feed' },
    O_GLOBO('cultura/livros'),
    { nome: 'Rascunho', site: 'https://rascunho.com.br', feed: 'https://rascunho.com.br/feed/' },
    { nome: 'Estadão', site: 'https://www.estadao.com.br/cultura/literatura/', feed: ESTADAO('cultura'), filtro: /estadao\.com\.br\/cultura\/literatura\// },
  ],
  gastronomia: [
    { nome: 'Paladar', site: 'https://www.estadao.com.br/paladar/', feed: ESTADAO('paladar') },
    { nome: 'Folha de S.Paulo', site: 'https://www1.folha.uol.com.br/comida/', feed: 'https://feeds.folha.uol.com.br/comida/rss091.xml' },
    { nome: 'Veja Rio', site: 'https://vejario.abril.com.br/comer-e-beber/', feed: 'https://vejario.abril.com.br/comer-e-beber/feed/' },
    // Críticas de restaurante (Arnaldo Lorencato) e bares/drinques (Notas Etílicas).
    { ...VEJA_SP, filtro: /vejasp\.abril\.com\.br\/(coluna\/(arnaldo-lorencato|notas-etilicas)|comida-bebida)\// },
    { nome: 'Revista Adega', site: 'https://revistaadega.uol.com.br', feed: 'https://revistaadega.uol.com.br/feed/' },
  ],
  viagem: [
    { nome: 'g1', ...G1('turismo-e-viagem') },
    { nome: 'Viagem e Turismo', site: 'https://viagemeturismo.abril.com.br', feed: 'https://viagemeturismo.abril.com.br/feed/', excluir: /\/previsao-do-tempo\// },
    { nome: 'Estadão', site: 'https://www.estadao.com.br/viagem/', feed: ESTADAO('viagem') },
    O_GLOBO('boa-viagem'),
    { nome: 'Melhores Destinos', site: 'https://www.melhoresdestinos.com.br', feed: 'https://www.melhoresdestinos.com.br/feed' },
  ],
  games: [
    { nome: 'IGN Brasil', site: 'https://br.ign.com', feed: 'https://br.ign.com/feed.xml' },
    { nome: 'GameBlast', site: 'https://www.gameblast.com.br', feed: 'https://www.gameblast.com.br/feeds/posts/default' },
    { nome: 'Arkade', site: 'https://www.arkade.com.br', feed: 'https://www.arkade.com.br/feed/' },
    { nome: 'GameHall', site: 'https://gamehall.com.br', feed: 'https://gamehall.com.br/feed/' },
    { nome: 'GameVicio', site: 'https://www.gamevicio.com', feed: 'https://www.gamevicio.com/rss/' },
  ],
  'bem-estar': [
    { nome: 'g1', ...G1('bemestar') },
    { nome: 'Veja Saúde', site: 'https://saude.abril.com.br', feed: 'https://saude.abril.com.br/feed/' },
    { nome: 'Drauzio Varella', site: 'https://drauziovarella.uol.com.br', feed: 'https://drauziovarella.uol.com.br/feed/' },
    { nome: 'Boa Forma', site: 'https://boaforma.abril.com.br', feed: 'https://boaforma.abril.com.br/feed/' },
    { nome: 'Agência Brasil', site: 'https://agenciabrasil.ebc.com.br/saude', feed: 'https://agenciabrasil.ebc.com.br/rss/saude/feed.xml' },
  ],
  arte: [
    { nome: 'Dasartes', site: 'https://dasartes.com.br', feed: 'https://dasartes.com.br/feed/' },
    { nome: 'arte!brasileiros', site: 'https://artebrasileiros.com.br', feed: 'https://artebrasileiros.com.br/feed/' },
    { nome: 'Arteref', site: 'https://www.arteref.com', feed: 'https://www.arteref.com/feed/' },
    O_GLOBO('cultura/artes-visuais'),
    { ...VEJA_SP, filtro: /vejasp\.abril\.com\.br\/coluna\/arte-ao-redor\// },
  ],
};
