// Acervo histórico de todos os temas.
//
// Cada item é um marco — pessoa, obra ou momento — que vale conhecer no nicho.
// O campo `query` é o que o /api/video usa para achar o vídeo e tocar DENTRO
// da plataforma; `externo` é a saída honesta quando não há embed possível.
//
// A seleção do dia sai de `daily()`, então muda sozinha à meia-noite de São
// Paulo, sem ninguém publicar nada.

import { daily } from './rotation';
import type { CategorySlug } from './data';

export interface HeritageItem {
  id: string;
  topic: CategorySlug;
  /** Nome do marco: pessoa, obra, momento. */
  nome: string;
  /** Período — "1969", "anos 1980", "1958–1970". */
  epoca: string;
  /** Por que isso importa. Uma frase. */
  nota: string;
  /** Termo de busca para o player embutido. */
  query: string;
}

const H = (
  topic: CategorySlug,
  id: string,
  nome: string,
  epoca: string,
  nota: string,
  query: string,
): HeritageItem => ({ id: `${topic}-${id}`, topic, nome, epoca, nota, query });

export const HERITAGE: HeritageItem[] = [
  // --- Tecnologia ----------------------------------------------------------
  H('tecnologia', 'apollo', 'Apollo 11 — a alunissagem', '1969', 'A transmissão que parou o mundo, feita com menos poder de cálculo que um celular.', 'Apollo 11 pouso na lua transmissão original'),
  H('tecnologia', 'motherof', 'A Mãe de Todas as Demos', '1968', 'Douglas Engelbart apresenta mouse, hipertexto e videoconferência de uma vez só.', 'Mother of All Demos Engelbart 1968'),
  H('tecnologia', 'mac', 'Lançamento do Macintosh', '1984', 'Steve Jobs tira o primeiro Mac da bolsa e o computador fala com a plateia.', 'Steve Jobs Macintosh 1984 introduction'),
  H('tecnologia', 'www', 'O nascimento da web', '1989–1991', 'Tim Berners-Lee propõe o hipertexto em rede no CERN e muda tudo.', 'Tim Berners-Lee World Wide Web história CERN'),
  H('tecnologia', 'deepblue', 'Deep Blue x Kasparov', '1997', 'A primeira vez que um computador venceu o campeão mundial de xadrez.', 'Deep Blue Kasparov 1997 match'),
  H('tecnologia', 'iphone', 'Apresentação do iPhone', '2007', 'Três produtos em um só — e o fim da era do teclado físico.', 'Steve Jobs iPhone 2007 keynote'),
  H('tecnologia', 'alphago', 'AlphaGo x Lee Sedol', '2016', 'O lance 37 que nenhum humano jogaria, e que mudou a percepção sobre IA.', 'AlphaGo Lee Sedol move 37 documentário'),
  H('tecnologia', 'voyager', 'Voyager e o Pálido Ponto Azul', '1990', 'A foto da Terra a 6 bilhões de km e o texto de Carl Sagan sobre ela.', 'Pale Blue Dot Carl Sagan português'),

  // --- Música --------------------------------------------------------------
  H('musica', 'tropicalia', 'Tropicália', '1967–1969', 'Caetano, Gil e Gal viram o Brasil do avesso — e pagam com o exílio.', 'Tropicália Caetano Veloso Gilberto Gil 1968'),
  H('musica', 'bossanova', 'Nasce a Bossa Nova', '1958', 'João Gilberto grava Chega de Saudade e inventa uma batida nova.', 'João Gilberto Chega de Saudade bossa nova origem'),
  H('musica', 'woodstock', 'Woodstock', '1969', 'Três dias de música que definiram uma geração inteira.', 'Woodstock 1969 melhores momentos'),
  H('musica', 'elis', 'Elis Regina', '1965–1982', 'A maior intérprete da música brasileira, em performances que ninguém repetiu.', 'Elis Regina melhores apresentações'),
  H('musica', 'clara', 'Clara Nunes e o samba', '1970–1983', 'A voz que levou o samba de raiz ao primeiro lugar das paradas.', 'Clara Nunes apresentações históricas'),
  H('musica', 'jackson', 'Motown 25 — o moonwalk', '1983', 'Michael Jackson desliza para trás e a televisão nunca mais foi igual.', 'Michael Jackson moonwalk Motown 25'),
  H('musica', 'rockrio', 'Primeiro Rock in Rio', '1985', 'O Brasil descobre que cabe um festival do tamanho do mundo.', 'Rock in Rio 1985 melhores momentos'),
  H('musica', 'nirvana', 'Nirvana no MTV Unplugged', '1993', 'O show acústico que virou testamento.', 'Nirvana MTV Unplugged 1993'),

  // --- Moda ----------------------------------------------------------------
  H('moda', 'chanel', 'Coco Chanel e o terninho', 'anos 1920', 'Ela tira o espartilho da mulher e coloca bolso no vestido.', 'Coco Chanel história documentário'),
  H('moda', 'dior', 'O New Look de Dior', '1947', 'Depois da guerra, a cintura marcada e a saia rodada voltam como manifesto.', 'Christian Dior New Look 1947'),
  H('moda', 'mcqueen', 'Alexander McQueen', '1992–2010', 'Desfile como performance — moda que era teatro e provocação.', 'Alexander McQueen desfiles históricos'),
  H('moda', 'zuzu', 'Zuzu Angel', '1970–1976', 'Ela transforma a passarela em protesto contra a ditadura.', 'Zuzu Angel moda protesto documentário'),
  H('moda', 'yamamoto', 'A vanguarda japonesa em Paris', 'anos 1980', 'Yohji Yamamoto e Rei Kawakubo chegam de preto e quebram as regras.', 'Yohji Yamamoto Comme des Garçons anos 80 Paris'),
  H('moda', 'versace', 'A era das supermodelos', 'anos 1990', 'Versace reúne as cinco maiores e cria o mito.', 'supermodelos anos 90 Versace desfile'),

  // --- Cultura -------------------------------------------------------------
  H('cultura', 'semana22', 'Semana de Arte Moderna', '1922', 'Uma semana no Municipal de São Paulo que fundou o modernismo brasileiro.', 'Semana de Arte Moderna 1922 documentário'),
  H('cultura', 'cinemanovo', 'Cinema Novo', 'anos 1960', 'Uma câmera na mão e uma ideia na cabeça.', 'Cinema Novo Glauber Rocha documentário'),
  H('cultura', 'niemeyer', 'Brasília se levanta', '1956–1960', 'Niemeyer e Lúcio Costa erguem uma capital do zero no cerrado.', 'construção de Brasília Niemeyer documentário'),
  H('cultura', 'tropicalia-arte', 'Hélio Oiticica e os Parangolés', 'anos 1960', 'A arte sai da parede e vira roupa, corpo e dança.', 'Hélio Oiticica Parangolé documentário'),
  H('cultura', 'lygia', 'Lygia Clark', '1950–1988', 'Obras que só existem quando alguém as manipula.', 'Lygia Clark Bichos obra documentário'),
  H('cultura', 'carnaval', 'O carnaval como obra coletiva', 'anos 1960–', 'Desfiles que são a maior produção artística coletiva do planeta.', 'história das escolas de samba desfile documentário'),

  // --- Esporte (complementa as lendas do /esporte) -------------------------
  H('esporte', 'maracanazo', 'Maracanaço', '1950', 'A final que calou 200 mil pessoas e virou trauma nacional.', 'Maracanaço 1950 Brasil Uruguai'),
  H('esporte', 'mexico70', 'A seleção de 1970', '1970', 'O time mais bonito que já jogou uma Copa.', 'seleção brasileira 1970 melhores momentos'),
  H('esporte', 'senna88', 'Senna em Suzuka', '1988', 'Ele cala o motor na largada, cai para 14º e vence o mundial.', 'Ayrton Senna Suzuka 1988 corrida'),
  H('esporte', 'guga97', 'Guga campeão em Paris', '1997', 'Um brasileiro desconhecido ganha Roland Garros.', 'Guga Kuerten Roland Garros 1997 final'),
  H('esporte', 'atenas04', 'O ouro do vôlei em Atenas', '2004', 'A geração que fez o Brasil dominar o vôlei mundial.', 'Brasil vôlei ouro Atenas 2004 final'),
  H('esporte', 'jordan98', 'O último arremesso de Jordan', '1998', 'O tiro que fecha a era dos Bulls.', 'Michael Jordan last shot 1998 finals'),

  // --- Cinema & Séries -----------------------------------------------------
  H('cinema', 'lumiere', 'A primeira sessão dos Lumière', '1895', 'O trem chega à estação e o público sai correndo.', 'irmãos Lumière primeiro filme 1895'),
  H('cinema', 'kane', 'Cidadão Kane', '1941', 'Orson Welles reinventa a gramática do cinema aos 25 anos.', 'Cidadão Kane análise cenas clássicas'),
  H('cinema', 'deusbrasileiro', 'Deus e o Diabo na Terra do Sol', '1964', 'O sertão vira mito na câmera de Glauber Rocha.', 'Deus e o Diabo na Terra do Sol Glauber Rocha'),
  H('cinema', 'cidadededeus', 'Cidade de Deus', '2002', 'O filme que recolocou o cinema brasileiro no mapa mundial.', 'Cidade de Deus making of cenas'),
  H('cinema', 'kurosawa', 'Os Sete Samurais', '1954', 'Kurosawa cria o modelo de quase todo filme de equipe desde então.', 'Sete Samurais Kurosawa análise'),
  H('cinema', 'central', 'Central do Brasil', '1998', 'Fernanda Montenegro leva o Brasil ao Oscar.', 'Central do Brasil Fernanda Montenegro cenas'),

  // --- Livros & Leitura ----------------------------------------------------
  H('livros', 'machado', 'Machado de Assis', '1839–1908', 'O maior escritor brasileiro, e o mais moderno deles.', 'Machado de Assis vida e obra documentário'),
  H('livros', 'clarice', 'Clarice Lispector', '1920–1977', 'A entrevista de 1977 na TV Cultura, meses antes de morrer.', 'Clarice Lispector entrevista TV Cultura 1977'),
  H('livros', 'guimaraes', 'Guimarães Rosa', '1908–1967', 'Grande Sertão: Veredas reinventa a língua portuguesa.', 'Guimarães Rosa Grande Sertão Veredas documentário'),
  H('livros', 'drummond', 'Carlos Drummond de Andrade', '1902–1987', 'No meio do caminho tinha uma pedra — e um século de poesia.', 'Drummond de Andrade poemas documentário'),
  H('livros', 'conceicao', 'Conceição Evaristo', '1946–', 'Escrevivência: a literatura como memória e resistência.', 'Conceição Evaristo escrevivência entrevista'),
  H('livros', 'borges', 'Jorge Luis Borges', '1899–1986', 'Bibliotecas infinitas e labirintos que ainda assombram a ficção.', 'Jorge Luis Borges entrevista documentário'),

  // --- Gastronomia ---------------------------------------------------------
  H('gastronomia', 'escoffier', 'Escoffier organiza a cozinha', '1900s', 'Ele cria a brigada de cozinha que todo restaurante ainda usa.', 'Auguste Escoffier história cozinha francesa'),
  H('gastronomia', 'nouvelle', 'Nouvelle cuisine', 'anos 1970', 'Menos manteiga, mais produto — a virada que ainda ecoa.', 'nouvelle cuisine história documentário'),
  H('gastronomia', 'elbulli', 'elBulli e a cozinha técnica', '1990–2011', 'Ferran Adrià transforma o restaurante em laboratório.', 'elBulli Ferran Adrià documentário'),
  H('gastronomia', 'dom', 'A cozinha brasileira ganha o mundo', 'anos 2000–', 'Ingredientes da Amazônia e do cerrado chegam à alta gastronomia.', 'Alex Atala ingredientes brasileiros documentário'),
  H('gastronomia', 'feijoada', 'A história da feijoada', 'séculos XIX–XX', 'De prato popular a símbolo nacional — e a disputa sobre a origem.', 'história da feijoada origem documentário'),
  H('gastronomia', 'cafe', 'O ciclo do café', 'séculos XIX–XX', 'O grão que financiou cidades inteiras e moldou o país.', 'história do café no Brasil documentário'),

  // --- Viagem --------------------------------------------------------------
  H('viagem', 'estradareal', 'A Estrada Real', 'séculos XVIII–XIX', 'O caminho do ouro que virou o melhor roteiro histórico do país.', 'Estrada Real Minas Gerais documentário'),
  H('viagem', 'lencois', 'Lençóis Maranhenses', '—', 'Um deserto que enche de água doce todo ano.', 'Lençóis Maranhenses documentário'),
  H('viagem', 'transamazonica', 'A Transamazônica', '1970s', 'A rodovia que prometia integrar e revelou outra coisa.', 'Transamazônica história documentário'),
  H('viagem', 'rotainca', 'Trilha Inca a Machu Picchu', '—', 'Quatro dias a pé até a cidade que os espanhóis nunca acharam.', 'trilha inca Machu Picchu documentário'),
  H('viagem', 'iguacu', 'Cataratas do Iguaçu', '—', 'Duzentas e setenta quedas na fronteira de dois países.', 'Cataratas do Iguaçu documentário'),
  H('viagem', 'serramar', 'A Mata Atlântica que sobrou', '—', 'Sete por cento do bioma original, e o que ainda dá para ver.', 'Mata Atlântica documentário natureza'),

  // --- Games ---------------------------------------------------------------
  H('games', 'pong', 'Pong', '1972', 'O jogo que provou que existia um mercado.', 'Pong 1972 história Atari'),
  H('games', 'mario', 'Super Mario Bros.', '1985', 'O jogo que salvou a indústria depois do crash de 1983.', 'Super Mario Bros 1985 história Nintendo'),
  H('games', 'doom', 'Doom e o nascimento do FPS', '1993', 'Id Software cria um gênero e o multiplayer em rede.', 'Doom 1993 história id Software'),
  H('games', 'ff7', 'Final Fantasy VII', '1997', 'O RPG japonês vira fenômeno global.', 'Final Fantasy VII 1997 história retrospectiva'),
  H('games', 'evo37', 'Evo Moment #37', '2004', 'Daigo apara quinze golpes seguidos e a plateia enlouquece.', 'Evo Moment 37 Daigo parry'),
  H('games', 'cblol', 'A cena brasileira de esports', '2012–', 'Do LAN house ao Maracanãzinho lotado.', 'história do CBLOL documentário'),

  // --- Bem-estar -----------------------------------------------------------
  H('bem-estar', 'maratona', 'A primeira maratona olímpica', '1896', 'A corrida que recriou uma lenda grega e virou rito moderno.', 'primeira maratona olímpica 1896 história'),
  H('bem-estar', 'yoga', 'A ioga chega ao Ocidente', 'anos 1960', 'Uma prática milenar vira parte da rotina urbana.', 'história da ioga no ocidente documentário'),
  H('bem-estar', 'cooper', 'Cooper e a corrida de rua', 'anos 1970', 'Um médico transforma correr em política de saúde pública.', 'Kenneth Cooper aeróbica história corrida'),
  H('bem-estar', 'sono', 'A ciência do sono', 'anos 1950–', 'A descoberta do sono REM muda o que sabíamos sobre descansar.', 'ciência do sono REM documentário'),
  H('bem-estar', 'mindfulness', 'Meditação sai do mosteiro', 'anos 1980–', 'A prática entra em hospitais e vira objeto de estudo clínico.', 'mindfulness ciência documentário português'),

  // --- Arte & Fotografia ---------------------------------------------------
  H('arte', 'niepce', 'A primeira fotografia', '1826', 'Oito horas de exposição para registrar um telhado.', 'primeira fotografia da história Niépce'),
  H('arte', 'cartier', 'O instante decisivo', 'anos 1930–', 'Cartier-Bresson define o que é uma boa foto — e todo mundo copia.', 'Henri Cartier-Bresson instante decisivo documentário'),
  H('arte', 'salgado', 'Sebastião Salgado', '1973–', 'A fotografia como testemunho, em preto e branco.', 'Sebastião Salgado Sal da Terra documentário'),
  H('arte', 'tarsila', 'Tarsila do Amaral e o Abaporu', '1928', 'A tela que inspirou o Manifesto Antropofágico.', 'Tarsila do Amaral Abaporu antropofagia'),
  H('arte', 'basquiat', 'Basquiat', '1980–1988', 'Do grafite em Nova York ao museu, em oito anos.', 'Jean-Michel Basquiat documentário'),
  H('arte', 'frida', 'Frida Kahlo', '1907–1954', 'A dor como matéria-prima e o autorretrato como manifesto.', 'Frida Kahlo vida e obra documentário'),
];

export function heritageOf(topic: CategorySlug): HeritageItem[] {
  return HERITAGE.filter((h) => h.topic === topic);
}

/** Seleção do dia para um tema — muda sozinha à meia-noite. */
export function heritageDoDia(topic: CategorySlug, n = 4): HeritageItem[] {
  const pool = heritageOf(topic);
  // O deslocamento por tema evita que todos os nichos girem em sincronia.
  const offset = topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return daily(pool, n, offset);
}

/** Seleção do dia considerando os temas que a pessoa segue. */
export function heritageParaPerfil(interests: CategorySlug[], n = 6): HeritageItem[] {
  const temas = interests.length ? interests : (['musica', 'cinema', 'tecnologia'] as CategorySlug[]);
  const pool = temas.flatMap((t) => heritageDoDia(t, 3));
  return daily(pool, n, 17);
}
