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
  H('tecnologia', '14bis', 'O voo do 14-bis', '1906', 'Em Paris, Santos Dumont faz o 14-bis decolar por meios próprios diante de testemunhas.', 'Santos Dumont 14-bis voo 1906 documentário'),
  H('tecnologia', 'landell', 'Padre Landell de Moura', '1861–1928', 'O padre gaúcho que fez experiências de transmissão de voz sem fio e registrou patentes nos EUA em 1904.', 'Padre Landell de Moura rádio história documentário'),
  H('tecnologia', 'eniac', 'ENIAC', '1946', 'Um dos primeiros computadores eletrônicos ocupava uma sala inteira — e foi programado por seis mulheres.', 'ENIAC 1946 primeiro computador história'),
  H('tecnologia', 'transistor', 'A invenção do transistor', '1947', 'Nos Laboratórios Bell nasce a peça que hoje se conta aos bilhões dentro de cada chip.', 'invenção do transistor 1947 Bell Labs história'),
  H('tecnologia', 'sputnik', 'Sputnik 1', '1957', 'A União Soviética põe o primeiro satélite artificial em órbita e começa a corrida espacial.', 'Sputnik 1957 primeiro satélite história'),
  H('tecnologia', 'linux', 'Linus Torvalds anuncia o Linux', '1991', 'Um "hobby" anunciado num grupo de discussão da Usenet vira o sistema que roda a maior parte dos servidores do mundo.', 'história do Linux Linus Torvalds 1991 documentário'),
  H('tecnologia', 'urna', 'A urna eletrônica brasileira', '1996', 'Estreia nas eleições municipais de 1996; em 2000, o país inteiro já vota na urna.', 'história da urna eletrônica brasileira 1996'),
  H('tecnologia', 'orkut', 'O Brasil no Orkut', '2004–2014', 'A rede social do Google que virou território brasileiro — até sair do ar em 2014.', 'história do Orkut Brasil documentário'),
  H('tecnologia', 'pix', 'O Pix entra no ar', '2020', 'O pagamento instantâneo do Banco Central muda em poucos meses o jeito de o brasileiro pagar as contas.', 'Pix Banco Central lançamento 2020 história'),

  // --- Música --------------------------------------------------------------
  H('musica', 'tropicalia', 'Tropicália', '1967–1969', 'Caetano, Gil e Gal viram o Brasil do avesso — e pagam com o exílio.', 'Tropicália Caetano Veloso Gilberto Gil 1968'),
  H('musica', 'bossanova', 'Nasce a Bossa Nova', '1958', 'João Gilberto grava Chega de Saudade e inventa uma batida nova.', 'João Gilberto Chega de Saudade bossa nova origem'),
  H('musica', 'woodstock', 'Woodstock', '1969', 'Três dias de música que definiram uma geração inteira.', 'Woodstock 1969 melhores momentos'),
  H('musica', 'elis', 'Elis Regina', '1965–1982', 'A maior intérprete da música brasileira, em performances que ninguém repetiu.', 'Elis Regina melhores apresentações'),
  H('musica', 'clara', 'Clara Nunes e o samba', '1970–1983', 'A voz que levou o samba de raiz ao primeiro lugar das paradas.', 'Clara Nunes apresentações históricas'),
  H('musica', 'jackson', 'Motown 25 — o moonwalk', '1983', 'Michael Jackson desliza para trás e a televisão nunca mais foi igual.', 'Michael Jackson moonwalk Motown 25'),
  H('musica', 'rockrio', 'Primeiro Rock in Rio', '1985', 'O Brasil descobre que cabe um festival do tamanho do mundo.', 'Rock in Rio 1985 melhores momentos'),
  H('musica', 'nirvana', 'Nirvana no MTV Unplugged', '1993', 'O show acústico que virou testamento.', 'Nirvana MTV Unplugged 1993'),
  H('musica', 'pixinguinha', 'Pixinguinha e o choro', '1897–1973', 'Com Os Oito Batutas e músicas como Carinhoso, ele deu ao choro a forma que tem até hoje.', 'Pixinguinha Carinhoso choro documentário'),
  H('musica', 'villalobos', 'Villa-Lobos e as Bachianas', '1930–1945', 'O compositor que juntou Bach e o Brasil popular e virou o nome da música erudita brasileira no mundo.', 'Villa-Lobos Bachianas Brasileiras 5 documentário'),
  H('musica', 'gonzaga', 'Luiz Gonzaga, o Rei do Baião', '1912–1989', 'A sanfona que levou o sertão nordestino para o rádio e para o Brasil inteiro.', 'Luiz Gonzaga Asa Branca apresentação histórica'),
  H('musica', 'jovemguarda', 'Jovem Guarda', '1965–1968', 'Roberto Carlos, Erasmo Carlos e Wanderléa levam o rock para a TV brasileira nas tardes de domingo.', 'Jovem Guarda Roberto Carlos Erasmo Wanderléa programa TV Record'),
  H('musica', 'festivais', 'A era dos festivais', '1965–1972', 'Festivais da canção na TV revelam Chico Buarque, Caetano, Gil, Milton e Elis de uma vez.', 'Uma Noite em 67 festival TV Record documentário'),
  H('musica', 'beatles', 'Beatles no telhado', '1969', 'O último show da banda, improvisado no telhado da Apple, em Londres.', 'Beatles rooftop concert 1969'),
  H('musica', 'clubedaesquina', 'Clube da Esquina', '1972', 'Milton Nascimento e Lô Borges lançam o disco que pôs Minas Gerais no mapa da música mundial.', 'Clube da Esquina 1972 Milton Nascimento Lô Borges documentário'),
  H('musica', 'liveaid', 'Queen no Live Aid', '1985', 'Vinte minutos em Wembley que muita gente considera a maior apresentação ao vivo do rock.', 'Queen Live Aid 1985 Wembley'),
  H('musica', 'racionais', 'Sobrevivendo no Inferno', '1997', "O disco dos Racionais MC's vendeu mais de um milhão de cópias por selo próprio e virou leitura do vestibular da Unicamp.", 'Racionais MCs Sobrevivendo no Inferno documentário'),

  // --- Moda ----------------------------------------------------------------
  H('moda', 'chanel', 'Coco Chanel e o terninho', 'anos 1920', 'Ela tira o espartilho da mulher e coloca bolso no vestido.', 'Coco Chanel história documentário'),
  H('moda', 'dior', 'O New Look de Dior', '1947', 'Depois da guerra, a cintura marcada e a saia rodada voltam como manifesto.', 'Christian Dior New Look 1947'),
  H('moda', 'mcqueen', 'Alexander McQueen', '1992–2010', 'Desfile como performance — moda que era teatro e provocação.', 'Alexander McQueen desfiles históricos'),
  H('moda', 'zuzu', 'Zuzu Angel', '1970–1976', 'Ela transforma a passarela em protesto contra a ditadura.', 'Zuzu Angel moda protesto documentário'),
  H('moda', 'yamamoto', 'A vanguarda japonesa em Paris', 'anos 1980', 'Yohji Yamamoto e Rei Kawakubo chegam de preto e quebram as regras.', 'Yohji Yamamoto Comme des Garçons anos 80 Paris'),
  H('moda', 'versace', 'A era das supermodelos', 'anos 1990', 'Versace reúne as cinco maiores e cria o mito.', 'supermodelos anos 90 Versace desfile'),
  H('moda', 'levis', 'O jeans de Levi Strauss', '1873', 'Levi Strauss e Jacob Davis patenteiam a calça com rebites que vestiria o mundo.', 'história do jeans Levi Strauss 1873 documentário'),
  H('moda', 'dener', 'Dener e a alta-costura brasileira', 'anos 1950–1970', 'O costureiro que vestiu primeira-dama e provou que o Brasil podia ter moda autoral.', 'Dener Pamplona estilista história moda brasileira'),
  H('moda', 'havaianas', 'Havaianas', '1962', 'A sandália de borracha inspirada na zori japonesa sai do pé do trabalhador e chega às passarelas.', 'história das Havaianas sandália 1962'),
  H('moda', 'quant', 'Mary Quant e a minissaia', 'anos 1960', 'Em Londres, a saia sobe acima do joelho e vira símbolo de uma geração.', 'Mary Quant minissaia história anos 60'),
  H('moda', 'ysl', 'Le Smoking de Yves Saint Laurent', '1966', 'O smoking entra no guarda-roupa feminino e a alfaiataria deixa de ter gênero.', 'Yves Saint Laurent Le Smoking 1966 história'),
  H('moda', 'westwood', 'Vivienne Westwood e o punk', 'anos 1970', "A loja da King's Road, com Malcolm McLaren, veste o punk e leva a rua para a passarela.", 'Vivienne Westwood punk documentário'),
  H('moda', 'spfw', 'Nasce a São Paulo Fashion Week', '1996', 'Criado por Paulo Borges como Morumbi Fashion, o evento vira o calendário oficial da moda brasileira.', 'história São Paulo Fashion Week Morumbi Fashion'),
  H('moda', 'gisele', 'Gisele Bündchen', 'anos 1990–2015', 'A gaúcha que dominou as passarelas do mundo e se despediu delas em 2015, na São Paulo Fashion Week.', 'Gisele Bündchen último desfile SPFW 2015'),

  // --- Cultura -------------------------------------------------------------
  H('cultura', 'semana22', 'Semana de Arte Moderna', '1922', 'Uma semana no Municipal de São Paulo que fundou o modernismo brasileiro.', 'Semana de Arte Moderna 1922 documentário'),
  H('cultura', 'cinemanovo', 'Cinema Novo', 'anos 1960', 'Uma câmera na mão e uma ideia na cabeça.', 'Cinema Novo Glauber Rocha documentário'),
  H('cultura', 'niemeyer', 'Brasília se levanta', '1956–1960', 'Niemeyer e Lúcio Costa erguem uma capital do zero no cerrado.', 'construção de Brasília Niemeyer documentário'),
  H('cultura', 'tropicalia-arte', 'Hélio Oiticica e os Parangolés', 'anos 1960', 'A arte sai da parede e vira roupa, corpo e dança.', 'Hélio Oiticica Parangolé documentário'),
  H('cultura', 'lygia', 'Lygia Clark', '1950–1988', 'Obras que só existem quando alguém as manipula.', 'Lygia Clark Bichos obra documentário'),
  H('cultura', 'carnaval', 'O carnaval como obra coletiva', 'anos 1960–', 'Desfiles que são a maior produção artística coletiva do planeta.', 'história das escolas de samba desfile documentário'),
  H('cultura', 'cirio', 'Círio de Nazaré', '1793–', 'A procissão de Belém que reúne multidões de romeiros todo mês de outubro desde o século XVIII.', 'Círio de Nazaré Belém procissão documentário'),
  H('cultura', 'frevo', 'Frevo', 'fim do século XIX–', 'A dança dos passistas de sombrinha do Recife, patrimônio imaterial da humanidade desde 2012.', 'frevo Recife passistas documentário'),
  H('cultura', 'cristo', 'Cristo Redentor', '1931', 'Inaugurada no Corcovado em 1931, a estátua foi eleita uma das sete maravilhas do mundo moderno em 2007.', 'construção do Cristo Redentor história documentário'),
  H('cultura', 'capoeira', 'Mestre Bimba, Mestre Pastinha e a capoeira', 'anos 1930–', 'Da repressão às academias da Bahia, até virar patrimônio da humanidade pela UNESCO em 2014.', 'Mestre Bimba Mestre Pastinha capoeira documentário'),
  H('cultura', 'oficina', 'Zé Celso e o Teatro Oficina', '1958–', 'A companhia que montou O Rei da Vela em 1967 e virou sinônimo de teatro radical no Brasil.', 'Teatro Oficina Zé Celso O Rei da Vela 1967'),
  H('cultura', 'parintins', 'Festival de Parintins', '1965–', 'Garantido e Caprichoso transformam a ilha no Amazonas no maior palco do boi-bumbá.', 'Festival de Parintins Garantido Caprichoso documentário'),
  H('cultura', 'masp', 'Lina Bo Bardi e o MASP', '1968', 'O vão livre de 74 metros na Avenida Paulista e os cavaletes de vidro que tiraram os quadros da parede.', 'Lina Bo Bardi MASP arquitetura documentário'),
  H('cultura', 'museunacional', 'O incêndio do Museu Nacional', '2018', 'O fogo que consumiu boa parte de 200 anos de acervo — e o trabalho para reconstruir o museu.', 'incêndio Museu Nacional 2018 reconstrução documentário'),

  // --- Esporte (complementa as lendas do /esporte) -------------------------
  H('esporte', 'maracanazo', 'Maracanaço', '1950', 'A final que calou 200 mil pessoas e virou trauma nacional.', 'Maracanaço 1950 Brasil Uruguai'),
  H('esporte', 'mexico70', 'A seleção de 1970', '1970', 'O time mais bonito que já jogou uma Copa.', 'seleção brasileira 1970 melhores momentos'),
  H('esporte', 'senna88', 'Senna em Suzuka', '1988', 'Ele cala o motor na largada, cai para 14º e vence o mundial.', 'Ayrton Senna Suzuka 1988 corrida'),
  H('esporte', 'guga97', 'Guga campeão em Paris', '1997', 'Um brasileiro desconhecido ganha Roland Garros.', 'Guga Kuerten Roland Garros 1997 final'),
  H('esporte', 'atenas04', 'O ouro do vôlei em Atenas', '2004', 'A geração que fez o Brasil dominar o vôlei mundial.', 'Brasil vôlei ouro Atenas 2004 final'),
  H('esporte', 'jordan98', 'O último arremesso de Jordan', '1998', 'O tiro que fecha a era dos Bulls.', 'Michael Jordan last shot 1998 finals'),
  H('esporte', 'adhemar', 'Adhemar Ferreira da Silva', '1952–1956', 'Bicampeão olímpico do salto triplo, em Helsinque e Melbourne, com recordes mundiais no caminho.', 'Adhemar Ferreira da Silva salto triplo ouro olímpico'),
  H('esporte', 'pele1000', 'O milésimo gol de Pelé', '1969', 'De pênalti, no Maracanã, contra o Vasco — e dedicado às criancinhas.', 'Pelé milésimo gol 1969 Maracanã Vasco'),
  H('esporte', 'comaneci', 'O 10 de Nadia Comăneci', '1976', 'Em Montreal, aos 14 anos, a primeira nota 10 da ginástica olímpica — e o placar só conseguia mostrar 1.00.', 'Nadia Comaneci nota 10 Montreal 1976'),
  H('esporte', 'maradona86', 'O gol do século', '1986', 'Maradona sai do meio-campo, dribla meio time da Inglaterra e marca no México.', 'Maradona gol do século 1986 Inglaterra'),
  H('esporte', 'pan87', 'Brasil x EUA no Pan de Indianápolis', '1987', 'Oscar Schmidt marca 46 pontos e o Brasil vence os americanos em casa na final do basquete.', 'Brasil x Estados Unidos basquete Pan 1987 Oscar Schmidt'),
  H('esporte', 'senna91', 'Senna vence em Interlagos', '1991', 'Com o câmbio preso na sexta marcha no fim da prova, ele vence em casa pela primeira vez e mal consegue sair do carro.', 'Ayrton Senna Interlagos 1991 vitória sexta marcha'),
  H('esporte', 'basquete94', 'O título mundial do basquete feminino', '1994', 'Hortência, Paula e Janeth batem a China na final e o Brasil é campeão do mundo.', 'Brasil campeão mundial basquete feminino 1994 Hortência Paula'),
  H('esporte', 'marta07', 'Marta na Copa de 2007', '2007', 'Artilheira e melhor jogadora do Mundial da China, com um gol antológico contra os Estados Unidos.', 'Marta gol contra Estados Unidos Copa 2007'),
  H('esporte', 'bolt09', 'Bolt em Berlim', '2009', 'Nove segundos e 58 centésimos: o recorde mundial dos 100 metros rasos.', 'Usain Bolt 9.58 Berlim 2009 recorde mundial'),
  H('esporte', 'rebeca24', 'Rebeca Andrade em Paris', '2024', 'O ouro no solo, à frente de Simone Biles, faz dela a maior medalhista olímpica do Brasil.', 'Rebeca Andrade ouro solo Paris 2024'),

  // --- Cinema & Séries -----------------------------------------------------
  H('cinema', 'lumiere', 'A primeira sessão dos Lumière', '1895', 'O trem chega à estação e o público sai correndo.', 'irmãos Lumière primeiro filme 1895'),
  H('cinema', 'kane', 'Cidadão Kane', '1941', 'Orson Welles reinventa a gramática do cinema aos 25 anos.', 'Cidadão Kane análise cenas clássicas'),
  H('cinema', 'deusbrasileiro', 'Deus e o Diabo na Terra do Sol', '1964', 'O sertão vira mito na câmera de Glauber Rocha.', 'Deus e o Diabo na Terra do Sol Glauber Rocha'),
  H('cinema', 'cidadededeus', 'Cidade de Deus', '2002', 'O filme que recolocou o cinema brasileiro no mapa mundial.', 'Cidade de Deus making of cenas'),
  H('cinema', 'kurosawa', 'Os Sete Samurais', '1954', 'Kurosawa cria o modelo de quase todo filme de equipe desde então.', 'Sete Samurais Kurosawa análise'),
  H('cinema', 'central', 'Central do Brasil', '1998', 'Fernanda Montenegro leva o Brasil ao Oscar.', 'Central do Brasil Fernanda Montenegro cenas'),
  H('cinema', 'melies', 'Viagem à Lua', '1902', 'Georges Méliès, mágico de palco, inventa os efeitos especiais e crava um foguete no olho da Lua.', 'Viagem à Lua Georges Méliès 1902'),
  H('cinema', 'chanchada', 'As chanchadas da Atlântida', 'anos 1940–1950', 'Oscarito e Grande Otelo lotam os cinemas com a comédia musical carioca.', 'chanchadas Atlântida Oscarito Grande Otelo'),
  H('cinema', 'mazzaropi', 'Mazzaropi e o Jeca Tatu', '1959', 'O caipira chega às telas e faz de Mazzaropi um campeão de bilheteria que produzia os próprios filmes.', 'Mazzaropi Jeca Tatu filme 1959'),
  H('cinema', 'psicose', 'A cena do chuveiro de Psicose', '1960', 'Hitchcock monta dezenas de cortes em poucos segundos e muda o suspense para sempre.', 'Psicose cena do chuveiro análise Hitchcock'),
  H('cinema', 'pagador', 'O Pagador de Promessas em Cannes', '1962', 'Anselmo Duarte leva a Palma de Ouro para o Brasil pela primeira vez.', 'O Pagador de Promessas 1962 Palma de Ouro Anselmo Duarte'),
  H('cinema', 'odisseia', '2001: Uma Odisseia no Espaço', '1968', 'Kubrick corta de um osso para uma nave e redefine a ficção científica.', '2001 Uma Odisseia no Espaço análise Kubrick'),
  H('cinema', 'auto', 'O Auto da Compadecida', '2000', 'João Grilo e Chicó, de Ariano Suassuna, saem da TV para o cinema e entram para a memória do país.', 'O Auto da Compadecida melhores cenas'),
  H('cinema', 'bacurau', 'Bacurau em Cannes', '2019', 'O filme de Kleber Mendonça Filho e Juliano Dornelles ganha o Prêmio do Júri.', 'Bacurau Cannes 2019 Prêmio do Júri'),
  H('cinema', 'aindaestouaqui', 'Ainda Estou Aqui no Oscar', '2025', 'O filme de Walter Salles dá ao Brasil o primeiro Oscar de melhor filme internacional.', 'Ainda Estou Aqui Oscar 2025 melhor filme internacional'),

  // --- Livros & Leitura ----------------------------------------------------
  H('livros', 'machado', 'Machado de Assis', '1839–1908', 'O maior escritor brasileiro, e o mais moderno deles.', 'Machado de Assis vida e obra documentário'),
  H('livros', 'clarice', 'Clarice Lispector', '1920–1977', 'A entrevista de 1977 na TV Cultura, meses antes de morrer.', 'Clarice Lispector entrevista TV Cultura 1977'),
  H('livros', 'guimaraes', 'Guimarães Rosa', '1908–1967', 'Grande Sertão: Veredas reinventa a língua portuguesa.', 'Guimarães Rosa Grande Sertão Veredas documentário'),
  H('livros', 'drummond', 'Carlos Drummond de Andrade', '1902–1987', 'No meio do caminho tinha uma pedra — e um século de poesia.', 'Drummond de Andrade poemas documentário'),
  H('livros', 'conceicao', 'Conceição Evaristo', '1946–', 'Escrevivência: a literatura como memória e resistência.', 'Conceição Evaristo escrevivência entrevista'),
  H('livros', 'borges', 'Jorge Luis Borges', '1899–1986', 'Bibliotecas infinitas e labirintos que ainda assombram a ficção.', 'Jorge Luis Borges entrevista documentário'),
  H('livros', 'pessoa', 'Fernando Pessoa e os heterônimos', '1888–1935', 'Alberto Caeiro, Ricardo Reis, Álvaro de Campos: um poeta que foi muitos.', 'Fernando Pessoa heterônimos documentário'),
  H('livros', 'lobato', 'O Sítio do Picapau Amarelo', '1920–', 'Monteiro Lobato cria Emília e Narizinho e funda a literatura infantil brasileira.', 'Monteiro Lobato Sítio do Picapau Amarelo história'),
  H('livros', 'vidassecas', 'Vidas Secas', '1938', 'Graciliano Ramos conta a seca pelos olhos de Fabiano, Sinhá Vitória e da cachorra Baleia.', 'Vidas Secas Graciliano Ramos análise'),
  H('livros', 'cecilia', 'Cecília Meireles', '1901–1964', 'Do Romanceiro da Inconfidência ao infantil Ou Isto ou Aquilo, uma das grandes vozes da poesia em português.', 'Cecília Meireles documentário poesia'),
  H('livros', 'suassuna', 'Ariano Suassuna', '1927–2014', 'O Auto da Compadecida e o Movimento Armorial: o sertão como erudito e popular ao mesmo tempo.', 'Ariano Suassuna aula espetáculo'),
  H('livros', 'carolina', 'Quarto de Despejo', '1960', 'O diário de Carolina Maria de Jesus na favela do Canindé vira best-seller e ganha o mundo em traduções.', 'Carolina Maria de Jesus Quarto de Despejo documentário'),
  H('livros', 'jorgeamado', 'Jorge Amado', '1912–2001', 'Os romances da Bahia que viraram novela, filme e best-seller em dezenas de línguas.', 'Jorge Amado vida e obra documentário'),
  H('livros', 'garciamarquez', 'Cem Anos de Solidão', '1967', 'Macondo e os Buendía levam o realismo mágico latino-americano para o mundo.', 'Gabriel García Márquez Cem Anos de Solidão documentário'),
  H('livros', 'saramago', 'Saramago ganha o Nobel', '1998', 'O primeiro Prêmio Nobel de Literatura da língua portuguesa.', 'José Saramago Nobel 1998 discurso'),

  // --- Gastronomia ---------------------------------------------------------
  H('gastronomia', 'escoffier', 'Escoffier organiza a cozinha', '1900s', 'Ele cria a brigada de cozinha que todo restaurante ainda usa.', 'Auguste Escoffier história cozinha francesa'),
  H('gastronomia', 'nouvelle', 'Nouvelle cuisine', 'anos 1970', 'Menos manteiga, mais produto — a virada que ainda ecoa.', 'nouvelle cuisine história documentário'),
  H('gastronomia', 'elbulli', 'elBulli e a cozinha técnica', '1990–2011', 'Ferran Adrià transforma o restaurante em laboratório.', 'elBulli Ferran Adrià documentário'),
  H('gastronomia', 'dom', 'A cozinha brasileira ganha o mundo', 'anos 2000–', 'Ingredientes da Amazônia e do cerrado chegam à alta gastronomia.', 'Alex Atala ingredientes brasileiros documentário'),
  H('gastronomia', 'feijoada', 'A história da feijoada', 'séculos XIX–XX', 'De prato popular a símbolo nacional — e a disputa sobre a origem.', 'história da feijoada origem documentário'),
  H('gastronomia', 'cafe', 'O ciclo do café', 'séculos XIX–XX', 'O grão que financiou cidades inteiras e moldou o país.', 'história do café no Brasil documentário'),
  H('gastronomia', 'mandioca', 'A mandioca', 'milhares de anos', 'Domesticada na Amazônia, dá farinha, tapioca, tucupi e polvilho — a base da mesa brasileira.', 'mandioca história farinha documentário'),
  H('gastronomia', 'chocolate', 'O cacau chega à Europa', 'século XVI', 'A bebida sagrada dos povos mesoamericanos atravessa o Atlântico e vira o chocolate.', 'história do chocolate documentário'),
  H('gastronomia', 'cachaca', 'A cachaça', 'século XVI–', 'O destilado nascido nos engenhos de cana do Brasil colônia virou bebida nacional.', 'história da cachaça documentário'),
  H('gastronomia', 'acaraje', 'As baianas de acarajé', 'Brasil colonial–', 'O bolinho de feijão-fradinho frito no dendê veio da África, e o ofício das baianas é patrimônio imaterial do Brasil.', 'baianas de acarajé Salvador documentário'),
  H('gastronomia', 'tacaca', 'Tacacá', 'tradição indígena', 'Tucupi, goma de mandioca, jambu e camarão seco na cuia: o fim de tarde de Belém.', 'tacacá Belém do Pará como é feito'),
  H('gastronomia', 'sushi', 'O sushi de Edo', 'século XIX', 'Na Tóquio antiga, o nigiri nasce como comida de rua rápida.', 'história do sushi documentário'),
  H('gastronomia', 'juliachild', 'Julia Child na TV', '1963', 'The French Chef estreia e leva a cozinha francesa para a casa dos americanos.', 'Julia Child The French Chef'),
  H('gastronomia', 'bocuse', 'Paul Bocuse', '1926–2018', "O chef que tirou o cozinheiro da cozinha para o salão e criou o Bocuse d'Or.", 'Paul Bocuse documentário chef'),
  H('gastronomia', 'paneleiras', 'As paneleiras de Goiabeiras', '2002', 'As panelas de barro da moqueca capixaba viraram, em 2002, um dos primeiros bens registrados como patrimônio imaterial do Brasil.', 'paneleiras de Goiabeiras panela de barro documentário'),

  // --- Viagem --------------------------------------------------------------
  H('viagem', 'estradareal', 'A Estrada Real', 'séculos XVIII–XIX', 'O caminho do ouro que virou o melhor roteiro histórico do país.', 'Estrada Real Minas Gerais documentário'),
  H('viagem', 'lencois', 'Lençóis Maranhenses', '—', 'Um deserto que enche de água doce todo ano.', 'Lençóis Maranhenses documentário'),
  H('viagem', 'transamazonica', 'A Transamazônica', '1970s', 'A rodovia que prometia integrar e revelou outra coisa.', 'Transamazônica história documentário'),
  H('viagem', 'rotainca', 'Trilha Inca a Machu Picchu', '—', 'Quatro dias a pé até a cidade que os espanhóis nunca acharam.', 'trilha inca Machu Picchu documentário'),
  H('viagem', 'iguacu', 'Cataratas do Iguaçu', '—', 'Duzentas e setenta quedas na fronteira de dois países.', 'Cataratas do Iguaçu documentário'),
  H('viagem', 'serramar', 'A Mata Atlântica que sobrou', '—', 'Sete por cento do bioma original, e o que ainda dá para ver.', 'Mata Atlântica documentário natureza'),
  H('viagem', 'capivara', 'Serra da Capivara', 'pré-história', 'Milhares de pinturas rupestres no sertão do Piauí, patrimônio mundial da UNESCO desde 1991.', 'Serra da Capivara pinturas rupestres documentário'),
  H('viagem', 'santiago', 'O Caminho de Santiago', 'Idade Média–', 'A rota de peregrinação medieval até Santiago de Compostela que ainda atrai caminhantes do mundo inteiro.', 'Caminho de Santiago documentário peregrinação'),
  H('viagem', 'ouropreto', 'Ouro Preto', 'século XVIII', 'A antiga Vila Rica foi o primeiro lugar do Brasil declarado patrimônio mundial, em 1980.', 'Ouro Preto história documentário'),
  H('viagem', 'paraty', 'Paraty', 'séculos XVII–XVIII', 'O porto por onde passava o ouro de Minas, patrimônio mundial com a Ilha Grande desde 2019.', 'Paraty centro histórico documentário'),
  H('viagem', 'roraima', 'Monte Roraima', '—', 'O tepui de topo plano na fronteira entre Brasil, Venezuela e Guiana, que teria inspirado O Mundo Perdido, de Conan Doyle.', 'Monte Roraima expedição documentário'),
  H('viagem', 'encontroaguas', 'Encontro das Águas', '—', 'Perto de Manaus, o rio Negro e o Solimões correm lado a lado por quilômetros sem se misturar.', 'Encontro das Águas Manaus rio Negro Solimões'),
  H('viagem', 'noronha', 'Fernando de Noronha', '—', 'Arquipélago de golfinhos-rotadores e visitação controlada, patrimônio natural da humanidade.', 'Fernando de Noronha documentário natureza'),
  H('viagem', 'pantanal', 'Pantanal', '—', 'Uma das maiores planícies alagáveis do planeta, onde a onça-pintada se deixa ver.', 'Pantanal documentário vida selvagem onça'),
  H('viagem', 'jalapao', 'Jalapão', '—', 'Dunas, fervedouros e capim-dourado no coração do Tocantins.', 'Jalapão fervedouros documentário'),
  H('viagem', 'uyuni', 'Salar de Uyuni', '—', 'O maior deserto de sal do mundo vira espelho do céu na estação das chuvas.', 'Salar de Uyuni documentário'),

  // --- Games ---------------------------------------------------------------
  H('games', 'pong', 'Pong', '1972', 'O jogo que provou que existia um mercado.', 'Pong 1972 história Atari'),
  H('games', 'mario', 'Super Mario Bros.', '1985', 'O jogo que salvou a indústria depois do crash de 1983.', 'Super Mario Bros 1985 história Nintendo'),
  H('games', 'doom', 'Doom e o nascimento do FPS', '1993', 'Id Software cria um gênero e o multiplayer em rede.', 'Doom 1993 história id Software'),
  H('games', 'ff7', 'Final Fantasy VII', '1997', 'O RPG japonês vira fenômeno global.', 'Final Fantasy VII 1997 história retrospectiva'),
  H('games', 'evo37', 'Evo Moment #37', '2004', 'Daigo apara quinze golpes seguidos e a plateia enlouquece.', 'Evo Moment 37 Daigo parry'),
  H('games', 'cblol', 'A cena brasileira de esports', '2012–', 'Do LAN house ao Maracanãzinho lotado.', 'história do CBLOL documentário'),
  H('games', 'mastersystem', 'O Master System da Tectoy', '1989–', 'A Tectoy lança o console da Sega no Brasil em 1989 e o mantém em produção por décadas.', 'Master System Tectoy história no Brasil'),
  H('games', 'monica', 'Mônica no Castelo do Dragão', '1991', 'A Tectoy troca o herói de Wonder Boy pela Mônica e cria um clássico do videogame brasileiro.', 'Mônica no Castelo do Dragão Master System gameplay'),
  H('games', 'sonic', 'Sonic the Hedgehog', '1991', 'A Sega responde a Mario com velocidade e o Mega Drive vira fenômeno.', 'Sonic the Hedgehog 1991 história Mega Drive'),
  H('games', 'sf2', 'Street Fighter II', '1991', 'O jogo que lotou os fliperamas e criou a cultura dos jogos de luta competitivos.', 'Street Fighter II história documentário'),
  H('games', 'topgear', 'Top Gear no Super Nintendo', '1992', 'O jogo de corrida da Kemco que virou febre no Brasil — com uma trilha que ninguém esquece.', 'Top Gear Super Nintendo 1992 gameplay trilha'),
  H('games', 'zeebo', 'Zeebo', '2009', 'Tectoy e Qualcomm lançam um console barato que baixava jogos pela rede de celular, sem cartucho nem disco.', 'Zeebo console brasileiro história'),
  H('games', 'minecraft', 'Minecraft', '2009–2011', 'Um jogo independente de blocos vira o videogame mais vendido da história.', 'história do Minecraft documentário'),
  H('games', 'horizonchase', 'Horizon Chase', '2015', 'O estúdio gaúcho Aquiris homenageia os jogos de corrida dos anos 1990, com trilha de Barry Leitch, o compositor de Top Gear.', 'Horizon Chase Turbo gameplay'),
  H('games', 'dandara', 'Dandara', '2018', 'O jogo da mineira Long Hat House, inspirado na guerreira do Quilombo dos Palmares, chega aos consoles do mundo.', 'Dandara Long Hat House gameplay trailer'),

  // --- Bem-estar -----------------------------------------------------------
  H('bem-estar', 'maratona', 'A primeira maratona olímpica', '1896', 'A corrida que recriou uma lenda grega e virou rito moderno.', 'primeira maratona olímpica 1896 história'),
  H('bem-estar', 'yoga', 'A ioga chega ao Ocidente', 'anos 1960', 'Uma prática milenar vira parte da rotina urbana.', 'história da ioga no ocidente documentário'),
  H('bem-estar', 'cooper', 'Cooper e a corrida de rua', 'anos 1970', 'Um médico transforma correr em política de saúde pública.', 'Kenneth Cooper aeróbica história corrida'),
  H('bem-estar', 'sono', 'A ciência do sono', 'anos 1950–', 'A descoberta do sono REM muda o que sabíamos sobre descansar.', 'ciência do sono REM documentário'),
  H('bem-estar', 'mindfulness', 'Meditação sai do mosteiro', 'anos 1980–', 'A prática entra em hospitais e vira objeto de estudo clínico.', 'mindfulness ciência documentário português'),
  H('bem-estar', 'nightingale', 'Florence Nightingale', '1854–1856', 'Na Guerra da Crimeia, a enfermeira usa higiene e estatística para salvar soldados e funda a enfermagem moderna.', 'Florence Nightingale história enfermagem documentário'),
  H('bem-estar', 'butantan', 'Nasce o Instituto Butantan', '1901', 'Criado por Vital Brazil contra a peste bubônica, virou referência em soro antiofídico e vacinas.', 'história do Instituto Butantan Vital Brazil'),
  H('bem-estar', 'vacina1904', 'A Revolta da Vacina', '1904', 'A vacinação obrigatória contra a varíola, na campanha de Oswaldo Cruz, termina em revolta nas ruas do Rio.', 'Revolta da Vacina 1904 Oswaldo Cruz documentário'),
  H('bem-estar', 'pilates', 'Joseph Pilates', 'anos 1920', 'O método de exercícios que ele leva para Nova York e que hoje está em academias do mundo inteiro.', 'Joseph Pilates história do método'),
  H('bem-estar', 'fleming', 'Fleming e a penicilina', '1928', 'Um fungo numa placa esquecida vira o primeiro antibiótico e muda a medicina.', 'Alexander Fleming penicilina descoberta 1928 história'),
  H('bem-estar', 'nise', 'Nise da Silveira', '1946–', 'A psiquiatra que trocou o eletrochoque pelo pincel e fundou o Museu de Imagens do Inconsciente.', 'Nise da Silveira Museu de Imagens do Inconsciente documentário'),
  H('bem-estar', 'zegotinha', 'Zé Gotinha e o fim da pólio', '1986–1989', 'O mascote criado em 1986 embala as campanhas que levam ao último caso de pólio no Brasil, em 1989.', 'Zé Gotinha história campanha vacinação poliomielite'),
  H('bem-estar', 'sus', 'Nasce o SUS', '1988', 'A Constituição define a saúde como direito de todos e dever do Estado.', 'história do SUS documentário'),
  H('bem-estar', 'guiaalimentar', 'O Guia Alimentar brasileiro', '2014', 'O Ministério da Saúde recomenda comida de verdade e evitar ultraprocessados — e vira referência no mundo.', 'Guia Alimentar para a População Brasileira ultraprocessados'),

  // --- Arte & Fotografia ---------------------------------------------------
  H('arte', 'niepce', 'A primeira fotografia', '1826', 'Oito horas de exposição para registrar um telhado.', 'primeira fotografia da história Niépce'),
  H('arte', 'cartier', 'O instante decisivo', 'anos 1930–', 'Cartier-Bresson define o que é uma boa foto — e todo mundo copia.', 'Henri Cartier-Bresson instante decisivo documentário'),
  H('arte', 'salgado', 'Sebastião Salgado', '1973–', 'A fotografia como testemunho, em preto e branco.', 'Sebastião Salgado Sal da Terra documentário'),
  H('arte', 'tarsila', 'Tarsila do Amaral e o Abaporu', '1928', 'A tela que inspirou o Manifesto Antropofágico.', 'Tarsila do Amaral Abaporu antropofagia'),
  H('arte', 'basquiat', 'Basquiat', '1980–1988', 'Do grafite em Nova York ao museu, em oito anos.', 'Jean-Michel Basquiat documentário'),
  H('arte', 'frida', 'Frida Kahlo', '1907–1954', 'A dor como matéria-prima e o autorretrato como manifesto.', 'Frida Kahlo vida e obra documentário'),
  H('arte', 'aleijadinho', 'Os profetas de Aleijadinho', '1800–1805', 'Doze profetas em pedra-sabão no adro do Santuário de Bom Jesus de Matosinhos, em Congonhas.', 'Aleijadinho profetas Congonhas documentário'),
  H('arte', 'noiteestrelada', 'A Noite Estrelada', '1889', 'Van Gogh pinta a vista da janela do sanatório de Saint-Rémy e cria o céu mais conhecido da arte.', 'A Noite Estrelada Van Gogh análise'),
  H('arte', 'monalisa', 'O roubo da Mona Lisa', '1911', 'O sumiço do quadro do Louvre, recuperado só em 1913, fez dele o mais famoso do mundo.', 'roubo da Mona Lisa 1911 história'),
  H('arte', 'anita', 'A exposição de Anita Malfatti', '1917', 'A mostra que Monteiro Lobato atacou em "Paranoia ou mistificação?" e que acendeu o modernismo brasileiro.', 'Anita Malfatti exposição 1917 Monteiro Lobato'),
  H('arte', 'guernica', 'Guernica', '1937', 'Picasso pinta o bombardeio da cidade basca e cria o maior manifesto antiguerra da pintura.', 'Guernica Picasso análise documentário'),
  H('arte', 'bienal', 'A primeira Bienal de São Paulo', '1951', 'Ciccillo Matarazzo cria a mostra que, dois anos depois, traria a Guernica de Picasso ao Brasil.', 'história da Bienal de São Paulo 1951'),
  H('arte', 'guerraepaz', 'Guerra e Paz, de Portinari', '1952–1956', 'Os painéis gigantes que o Brasil deu de presente à sede da ONU, em Nova York.', 'Guerra e Paz Portinari painéis ONU documentário'),
  H('arte', 'warhol', 'As latas de sopa de Warhol', '1962', 'Trinta e duas telas de sopa Campbell levam o supermercado para dentro do museu.', 'Andy Warhol Campbell soup cans documentário'),
  H('arte', 'bispo', 'Arthur Bispo do Rosário', '1911–1989', 'Internado por décadas na Colônia Juliano Moreira, criou mantos e bordados que hoje estão em bienais.', 'Arthur Bispo do Rosário documentário'),
  H('arte', 'kobra', 'O mural Etnias, de Kobra', '2016', 'Pintado para a Olimpíada do Rio, entrou para o Guinness como o maior grafite do mundo na época.', 'Eduardo Kobra mural Etnias Rio 2016'),
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
