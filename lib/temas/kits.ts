// Kits exclusivos por tema: o que cada página de tema oferece além do feed —
// guias, glossários, checklists, receitas, recursos, exercícios de respiração
// e jogos grátis ao vivo. Só dados (sem React): quem desenha é
// components/temas/KitDoTema.tsx.
//
// Critério editorial: só fatos de que temos certeza, nada que envelheça em
// semanas, perspectiva brasileira primeiro. Os links foram conferidos um a um
// (páginas iniciais oficiais, não links profundos que mudam toda hora).

import type { CategorySlug } from '../data';
import type { IconName } from '../../components/icons';

interface BlocoBase {
  id: string;
  titulo: string;
  apoio: string;
  /** Rótulo curto para a aba (o título é usado quando falta). */
  aba?: string;
  /** Ícone da aba (cada tipo tem um padrão). */
  icone?: IconName;
}

export interface ItemGuia {
  titulo: string;
  texto: string;
  tag?: string;
  /** Termo de busca do YouTube para tocar DENTRO da plataforma (InlinePlayer). */
  video?: string;
  /** Site oficial (abre em nova aba). */
  link?: string;
}

export interface Termo {
  termo: string;
  definicao: string;
}

export interface GrupoChecklist {
  nome: string;
  itens: string[];
}

export interface PassoReceita {
  texto: string;
  /** Tempo do passo — vira um cronômetro no modo cozinha. */
  minutos?: number;
}

export interface Receita {
  id: string;
  nome: string;
  regiao: string;
  tempo: string;
  rende: string;
  nivel: 'fácil' | 'médio' | 'difícil';
  ingredientes: string[];
  passos: PassoReceita[];
  /** Termo de busca do vídeo do preparo. */
  video: string;
}

export interface Recurso {
  nome: string;
  descricao: string;
  url: string;
  gratis: boolean;
  tag: string;
}

export interface FaseRespiracao {
  /** Começa com “Inspire”, “Expire” ou “Segure” — é o que move o círculo. */
  nome: string;
  segundos: number;
}

export interface TecnicaRespiracao {
  nome: string;
  descricao: string;
  fases: FaseRespiracao[];
  ciclos: number;
}

export type Bloco =
  | (BlocoBase & { tipo: 'guia'; itens: ItemGuia[] })
  | (BlocoBase & { tipo: 'glossario'; termos: Termo[] })
  | (BlocoBase & { tipo: 'checklist'; grupos: GrupoChecklist[] })
  | (BlocoBase & { tipo: 'receitas'; receitas: Receita[] })
  | (BlocoBase & { tipo: 'recursos'; itens: Recurso[] })
  | (BlocoBase & { tipo: 'respiracao'; tecnicas: TecnicaRespiracao[] })
  | (BlocoBase & { tipo: 'jogos-gratis' });

export type TipoDeBloco = Bloco['tipo'];

export interface Kit {
  titulo: string;
  apoio: string;
  blocos: Bloco[];
}

export const KITS: Record<CategorySlug, Kit> = {
  // ===========================================================================
  moda: {
    titulo: 'Kit de Moda',
    apoio: 'Tendências explicadas, dress code decifrado, marcas brasileiras autorais e um guarda-roupa cápsula para montar sem pressa.',
    blocos: [
      {
        tipo: 'guia',
        id: 'tendencias',
        aba: 'Tendências e estilos',
        icone: 'sparkles',
        titulo: 'Tendências e estilos',
        apoio: 'Os estilos que você vê nas ruas, nas passarelas e nos brechós — de onde vieram e como usar.',
        itens: [
          {
            titulo: 'Streetwear',
            tag: 'Urbano',
            texto:
              'Nasceu do skate, do surfe e do hip-hop nos anos 1980 e 1990 e chegou às passarelas. Moletom, camiseta gráfica, calça cargo, tênis e boné. No Brasil, ganhou cara própria com marcas independentes, muitas vindas da periferia.',
            video: 'história do streetwear documentário',
          },
          {
            titulo: 'Alfaiataria',
            tag: 'Clássico',
            texto:
              'Peças com modelagem de alfaiate: blazer, calça de pregas, colete. A versão de hoje é mais solta — blazer amplo com camiseta e tênis funciona no dia a dia, não só no escritório.',
          },
          {
            titulo: 'Y2K',
            tag: 'Anos 2000',
            texto:
              'A estética da virada do milênio voltou: cintura baixa, baby tee, óculos pequenos, brilho, rosa e prata. Foi redescoberta pela geração Z nos brechós e nas redes.',
          },
          {
            titulo: 'Moda sustentável (slow fashion)',
            tag: 'Consciente',
            texto:
              'Comprar menos e melhor, saber quem fez a roupa e preferir fibras duráveis. É o oposto do fast fashion, que lança coleções em ritmo acelerado. Um teste simples antes de comprar: vou usar esta peça pelo menos 30 vezes?',
          },
          {
            titulo: 'Brechó e segunda mão',
            tag: 'Consciente',
            texto:
              'O jeito mais barato e sustentável de ter peças únicas. Vá com tempo, confira costuras, zíperes e manchas na luz natural e prefira tecidos naturais, que envelhecem bem. Para desapegar, os apps de revenda ajudam.',
          },
          {
            titulo: 'Upcycling',
            tag: 'Consciente',
            texto:
              'Transformar uma peça ou um retalho em algo de valor maior: jeans que vira bolsa, camisa que vira top. Há oficinas e marcas inteiras dedicadas a isso — e dá para começar em casa com linha e agulha.',
          },
          {
            titulo: 'Minimalismo e guarda-roupa cápsula',
            tag: 'Essencial',
            texto:
              'Poucas peças versáteis, em cores que combinam entre si, para montar muitos looks. Menos decisões de manhã e menos compras por impulso. Veja o checklist “Guarda-roupa cápsula” neste kit.',
          },
          {
            titulo: 'Moda praia brasileira',
            tag: 'Brasil',
            texto:
              'O Brasil é referência mundial em moda praia: biquínis de recorte menor, estampas tropicais, tecidos que secam rápido e saídas de praia que viram roupa de cidade. Marcas de luxo e de ateliê nasceram no nosso litoral.',
          },
          {
            titulo: 'Athleisure',
            tag: 'Conforto',
            texto:
              'Roupa de treino que saiu da academia: legging, corta-vento, tênis de corrida e moletom em looks do dia a dia. O conforto virou regra — o truque é misturar com uma peça mais arrumada.',
          },
          {
            titulo: 'Gorpcore',
            tag: 'Utilitário',
            texto:
              'Roupas técnicas de trilha e montanha — fleece, corta-vento, calça com zíper, papete e bota — usadas na cidade. Funcionais, duráveis e boas para o clima imprevisível.',
          },
          {
            titulo: 'Quiet luxury (luxo silencioso)',
            tag: 'Clássico',
            texto:
              'Básicos com tecido e caimento excelentes, sem logotipo aparente. Cores neutras, linho, lã, algodão de fio longo. A ideia é que a qualidade apareça no detalhe, não na marca.',
          },
          {
            titulo: 'Moda afro-brasileira',
            tag: 'Brasil',
            texto:
              'Estampas, turbantes, tecidos e símbolos de matriz africana reinterpretados por estilistas e marcas negras, que vêm ganhando espaço nas principais passarelas do país.',
          },
          {
            titulo: 'São Paulo Fashion Week',
            tag: 'Onde acompanhar',
            texto:
              'A principal semana de moda da América Latina, criada nos anos 1990 por Paulo Borges (começou como Morumbi Fashion). É onde se vê o que as marcas autorais brasileiras estão propondo.',
            link: 'https://www.spfw.com.br',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'dress-code',
        aba: 'Dress code',
        icone: 'mail',
        titulo: 'Dress code do convite, decifrado',
        apoio: 'O que vestir quando o convite diz “esporte fino” ou “passeio completo”. Os nomes variam um pouco de convite para convite — na dúvida, pergunte a quem convidou.',
        itens: [
          {
            titulo: 'Casual',
            tag: 'Mais descontraído',
            texto:
              'Jeans, camiseta ou camisa, tênis limpo, vestido leve. Conforto com capricho. Em convite de festa, “casual” não significa roupa de academia nem chinelo.',
          },
          {
            titulo: 'Esporte fino',
            tag: 'Arrumado, sem formalidade',
            texto:
              'Calça social ou de sarja com camisa (paletó opcional, gravata dispensável); vestido midi, saia ou macacão em tecido leve. É o mais comum em casamentos de dia e em eventos de trabalho.',
          },
          {
            titulo: 'Passeio (ou social)',
            tag: 'Um degrau acima',
            texto:
              'Terno completo, com gravata opcional; vestidos e conjuntos mais elaborados, geralmente na altura do joelho ou midi. Sapato fechado ou sandália de salto.',
          },
          {
            titulo: 'Passeio completo',
            tag: 'Formal',
            texto:
              'Terno escuro com gravata; vestido midi ou longo em tecidos mais nobres. Aparece muito em casamentos à noite.',
          },
          {
            titulo: 'Black tie (traje a rigor)',
            tag: 'Gala',
            texto:
              'Smoking com gravata-borboleta preta; vestido longo. Para eventos noturnos de gala — formaturas, bailes e cerimônias especiais.',
          },
          {
            titulo: 'White tie',
            tag: 'O mais formal',
            texto:
              'Casaca com gravata-borboleta branca e colete; vestido longo de gala. É raríssimo — cerimônias de Estado e bailes oficiais.',
          },
          {
            titulo: 'Traje de praia (beach chic)',
            tag: 'Casamento no litoral',
            texto:
              'Linho, algodão, cores claras e sandálias baixas ou rasteiras — salto fino afunda na areia. Terno de linho sem gravata funciona muito bem.',
          },
          {
            titulo: 'Cores e cuidados',
            tag: 'Etiqueta',
            texto:
              'Em casamentos, o branco (e tons muito próximos) costuma ficar para quem casa, a não ser que o convite peça. Preto à luz do dia já não é tabu na maioria dos eventos.',
          },
          {
            titulo: 'Na dúvida',
            tag: 'Regra de ouro',
            texto:
              'Prefira errar pelo mais arrumado. Um blazer ou uma terceira peça sobre uma roupa simples resolve quase qualquer situação.',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'marcas',
        aba: 'Marcas brasileiras',
        icone: 'shirt',
        titulo: 'Marcas brasileiras autorais',
        apoio: 'Do luxo carioca ao streetwear baiano: marcas nacionais com assinatura própria. Toque em “Site oficial” para conhecer.',
        itens: [
          {
            titulo: 'Osklen',
            tag: 'Rio de Janeiro · luxo e natureza',
            texto:
              'Fundada por Oskar Metsavaht em 1989, traduz o estilo de vida carioca com preocupação ambiental — ficou conhecida por materiais como couro de peixe e algodão orgânico.',
            link: 'https://www.osklen.com.br',
          },
          {
            titulo: 'FARM Rio',
            tag: 'Rio de Janeiro · estampas',
            texto:
              'Criada em 1997 por Kátia Barros e Marcello Bastos, virou sinônimo de estampa tropical, cor e vestido leve — e hoje vende também fora do Brasil.',
            link: 'https://www.farmrio.com.br',
          },
          {
            titulo: 'Lenny Niemeyer',
            tag: 'Rio de Janeiro · moda praia',
            texto:
              'A estilista transformou maiôs e biquínis em peças de design, com cortes limpos e estampas gráficas. Referência em moda praia de luxo.',
            link: 'https://lennyniemeyer.com.br',
          },
          {
            titulo: 'Handred',
            tag: 'Rio de Janeiro · linho',
            texto:
              'Ateliê carioca do estilista André Namitala: peças amplas em linho e tecidos naturais, pensadas para durar, com modelagens que transitam entre o masculino e o feminino.',
            link: 'https://handred.com.br',
          },
          {
            titulo: 'Misci',
            tag: 'Design brasileiro',
            texto:
              'Criada em 2018 por Airon Martin, faz roupas, acessórios e até mobiliário que falam de brasilidade e das nossas regiões.',
            link: 'https://misci.co',
          },
          {
            titulo: 'PIET',
            tag: 'São Paulo · streetwear',
            texto:
              'Marca paulistana de Pedro Andrade, criada em 2012, que mistura streetwear, alfaiataria e referências de arte e esporte.',
            link: 'https://www.piet.com.br',
          },
          {
            titulo: 'BAW Clothing',
            tag: 'Streetwear',
            texto: 'Streetwear brasileiro de moletons, camisetas gráficas e acessórios de visual urbano.',
            link: 'https://www.bawclothing.com.br',
          },
          {
            titulo: 'Dendezeiro',
            tag: 'Salvador · streetwear',
            texto:
              'Marca baiana dirigida por Hisan Silva e Pedro Batalha, que leva o jeito de vestir de Salvador para roupas urbanas e coloridas.',
            link: 'https://dendezeiro.com.br',
          },
          {
            titulo: 'Santa Resistência',
            tag: 'Slow fashion',
            texto:
              'Roupas atemporais, desenhadas, cortadas e costuradas com calma, com uma cadeia de produção justa.',
            link: 'https://www.santaresistencia.com.br',
          },
          {
            titulo: 'ALUF',
            tag: 'São Paulo · slow fashion',
            texto:
              'Marca da estilista Ana Luisa Fernandes, de modelagens limpas e matéria-prima sustentável e nacional.',
            link: 'https://aluf.com.br',
          },
          {
            titulo: 'Reserva',
            tag: 'Rio de Janeiro · masculino',
            texto:
              'Criada em 2004 no Rio, ficou conhecida pelo pica-pau do logotipo e pela moda masculina descontraída.',
            link: 'https://www.usereserva.com',
          },
          {
            titulo: 'Cavalera',
            tag: 'São Paulo · rock e urbano',
            texto:
              'Fundada em 1995 por Alberto Hiar e Igor Cavalera, baterista do Sepultura, com raízes no rock e na cultura urbana paulistana.',
            link: 'https://www.cavalera.com.br',
          },
          {
            titulo: 'Havaianas',
            tag: 'Ícone desde 1962',
            texto:
              'As sandálias de borracha inspiradas nas zori japonesas foram lançadas em 1962 e viraram um símbolo do Brasil no mundo.',
            link: 'https://www.havaianas.com.br',
          },
          {
            titulo: 'Melissa',
            tag: 'Ícone desde 1979',
            texto:
              'Sandálias de plástico com o famoso cheirinho, nascidas em 1979 na Grendene, e colaborações com designers e arquitetos do mundo todo.',
            link: 'https://www.melissa.com.br',
          },
          {
            titulo: 'Hering',
            tag: 'Blumenau · desde 1880',
            texto:
              'Fundada por imigrantes alemães em Blumenau (SC) em 1880, é uma das marcas mais antigas do país — e dona da camiseta básica brasileira por excelência.',
            link: 'https://www.hering.com.br',
          },
          {
            titulo: 'Alexandre Birman',
            tag: 'Calçados de luxo',
            texto: 'Sandálias e scarpins do designer brasileiro, vendidos em lojas de moda do mundo todo.',
            link: 'https://www.alexandrebirman.com.br',
          },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário de moda',
        apoio: 'Os termos que aparecem em etiquetas, desfiles e vitrines, sem mistério.',
        termos: [
          { termo: 'Alfaiataria', definicao: 'Técnica de corte e costura de peças estruturadas, como paletós, coletes e calças sociais, tradicionalmente feitas sob medida.' },
          { termo: 'Alta-costura', definicao: 'Peças únicas, feitas à mão e sob medida. Na França, “haute couture” é uma denominação protegida, só usada por casas aprovadas pela federação de moda do país.' },
          { termo: 'Prêt-à-porter', definicao: '“Pronto para vestir”: roupas produzidas em série, em tamanhos-padrão. É o que se vende nas lojas.' },
          { termo: 'Athleisure', definicao: 'Estilo que leva roupas esportivas (legging, moletom, tênis) para o dia a dia.' },
          { termo: 'Barra italiana', definicao: 'Barra de calça dobrada para fora, formando uma dobra visível. Clássico da alfaiataria.' },
          { termo: 'Caimento', definicao: 'Como o tecido e a modelagem se acomodam no corpo: se a peça “cai bem”, sem sobrar nem apertar.' },
          { termo: 'Cartela de cores', definicao: 'Conjunto de cores de uma coleção — ou as cores que mais favorecem uma pessoa.' },
          { termo: 'Colorimetria', definicao: 'Análise de coloração pessoal: identifica quais cores harmonizam com o tom de pele, olhos e cabelo.' },
          { termo: 'Color blocking', definicao: 'Combinar blocos de cores fortes e lisas no mesmo look.' },
          { termo: 'Corte enviesado', definicao: 'Tecido cortado na diagonal do fio. A peça fica fluida e acompanha o corpo — comum em vestidos e saias.' },
          { termo: 'Denim', definicao: 'O tecido do jeans: sarja de algodão com o fio do urdume tingido de índigo e a trama branca.' },
          { termo: 'Selvedge', definicao: 'Ourela: a borda de acabamento do tecido feita em teares de lançadeira. Em jeans, indica tecido de tear mais tradicional.' },
          { termo: 'Drop', definicao: 'Lançamento de uma coleção pequena, em data marcada e quantidade limitada. Muito usado no streetwear.' },
          { termo: 'Collab', definicao: 'Colaboração entre marcas, ou entre marca e artista, para uma coleção especial.' },
          { termo: 'Fast fashion', definicao: 'Modelo de moda de produção rápida e barata, com coleções novas o tempo todo. Criticado pelo impacto ambiental e pelas condições de trabalho.' },
          { termo: 'Slow fashion', definicao: 'Moda feita com tempo: peças duráveis, produção em menor escala e cadeia transparente.' },
          { termo: 'Upcycling', definicao: 'Reaproveitar roupas ou retalhos para criar peças novas, de valor maior que o original.' },
          { termo: 'Lookbook', definicao: 'Catálogo de fotos com os looks de uma coleção.' },
          { termo: 'Moodboard', definicao: 'Painel de imagens, cores e texturas que resume a inspiração de uma coleção ou de um visual.' },
          { termo: 'Modelagem', definicao: 'O desenho técnico das partes de uma roupa (moldes) que define forma e tamanho da peça.' },
          { termo: 'Oversized', definicao: 'Peça propositalmente maior que o corpo, com ar solto e despojado.' },
          { termo: 'Styling', definicao: 'A arte de montar looks, combinando peças e acessórios. Quem faz é o stylist.' },
          { termo: 'Terceira peça', definicao: 'Blazer, colete, jaqueta ou cardigã usado por cima de um look básico para deixá-lo mais arrumado.' },
          { termo: 'Tecido plano', definicao: 'Tecido de fios cruzados em ângulo reto (trama e urdume), como o da camisa e do jeans. Estica pouco.' },
          { termo: 'Malha', definicao: 'Tecido de fios entrelaçados em laçadas, como o da camiseta e do moletom. Tem elasticidade natural.' },
          { termo: 'Gramatura', definicao: 'Peso do tecido em gramas por metro quadrado. Camiseta de gramatura alta é mais encorpada.' },
          { termo: 'Linho', definicao: 'Fibra natural extraída do caule do linho. Fresca, resistente e com o amassado como charme.' },
          { termo: 'Viscose', definicao: 'Fibra artificial feita de celulose. Fresca e de bom caimento, mas amassa e pode encolher.' },
          { termo: 'Lyocell (Tencel)', definicao: 'Fibra de celulose de madeira produzida em processo que reaproveita os solventes. Macia e respirável; Tencel é uma marca comercial.' },
          { termo: 'Poliéster', definicao: 'Fibra sintética derivada do petróleo. Seca rápido e amassa pouco, mas solta microplásticos na lavagem.' },
          { termo: 'Tricô e crochê', definicao: 'Tricô usa duas agulhas; crochê, uma agulha com gancho. Os dois criam tecido a partir do fio.' },
          { termo: 'Pantalona', definicao: 'Calça de pernas largas do quadril até a barra.' },
          { termo: 'Wide leg', definicao: 'Calça (geralmente jeans) de perna larga e reta.' },
          { termo: 'Cropped', definicao: 'Peça cortada mais curta, como a blusa que deixa a barriga à mostra.' },
          { termo: 'Scarpin', definicao: 'Sapato fechado de bico fino e salto, sem tiras.' },
          { termo: 'Mocassim', definicao: 'Sapato baixo, sem cadarço, de couro macio.' },
          { termo: 'Oxford', definicao: 'Sapato social de cadarço com a gáspea costurada por baixo — o mais formal dos sapatos de amarrar.' },
          { termo: 'Chelsea boot', definicao: 'Bota de cano curto com elástico nas laterais, sem cadarço.' },
          { termo: 'Trench coat', definicao: 'Casaco longo de gabardine, com cinto e botões duplos, criado originalmente para uso militar.' },
          { termo: 'Estampa corrida', definicao: 'Estampa que se repete por todo o tecido. A localizada aparece em um só ponto da peça.' },
          { termo: 'Tie-dye', definicao: 'Tingimento feito amarrando o tecido antes do banho de cor, criando manchas e espirais.' },
        ],
      },
      {
        tipo: 'checklist',
        id: 'capsula',
        aba: 'Guarda-roupa cápsula',
        titulo: 'Guarda-roupa cápsula',
        apoio: 'Uma base de peças que combinam entre si. Marque o que você já tem — o progresso fica salvo neste aparelho.',
        grupos: [
          {
            nome: 'Partes de cima',
            itens: [
              '3 a 5 camisetas lisas de boa gramatura (branca, preta, cinza ou off-white)',
              '1 camisa de botão branca ou azul-clara',
              '1 camisa de linho ou tecido leve',
              '1 malha ou tricô neutro',
              '1 moletom liso',
            ],
          },
          {
            nome: 'Partes de baixo',
            itens: [
              '1 calça jeans de lavagem escura, sem rasgos',
              '1 calça de alfaiataria (preta, cinza ou bege)',
              '1 calça leve ou saia midi para o calor',
              '1 bermuda ou short versátil',
            ],
          },
          {
            nome: 'Terceira peça',
            itens: ['1 blazer neutro', '1 jaqueta jeans ou jaqueta leve', '1 casaco para o frio de verdade da sua cidade (trench, parka ou sobretudo)'],
          },
          {
            nome: 'Calçados',
            itens: ['1 tênis branco ou neutro, sempre limpo', '1 sapato fechado (mocassim, oxford, bota ou scarpin)', '1 sandália confortável'],
          },
          {
            nome: 'Acessórios',
            itens: [
              '1 cinto que combine com os sapatos',
              '1 bolsa ou mochila neutra',
              'Óculos de sol',
              '1 peça-assinatura: lenço, bijuteria, relógio ou boné que seja a sua cara',
            ],
          },
          {
            nome: 'Antes de comprar',
            itens: [
              'Separar o que eu realmente usei nos últimos 12 meses',
              'Escolher uma paleta de 3 ou 4 cores que combinem entre si',
              'Checar se cada peça nova combina com pelo menos 3 que já tenho',
              'Preferir tecidos naturais e costuras bem-feitas',
              'Doar, vender ou trocar o que não uso mais',
            ],
          },
        ],
      },
    ],
  },

  // ===========================================================================
  games: {
    titulo: 'Kit de Games',
    apoio: 'Jogos de graça ao vivo, os clássicos que todo mundo deveria conhecer, o melhor do game brasileiro e o dicionário para não boiar no chat.',
    blocos: [
      {
        tipo: 'jogos-gratis',
        id: 'gratis',
        aba: 'Grátis agora',
        titulo: 'Jogos grátis agora',
        apoio: 'Atualizado automaticamente: os jogos de graça da semana na Epic Games Store e os free-to-play mais jogados do momento.',
      },
      {
        tipo: 'guia',
        id: 'classicos',
        aba: 'Clássicos',
        icone: 'trophy',
        titulo: 'Clássicos para conhecer',
        apoio: 'Os jogos que definiram gêneros e gerações. Toque em “Assistir aqui” para ver como eles são, sem sair do nexo.',
        itens: [
          {
            titulo: 'Tetris',
            tag: '1984 · URSS',
            texto:
              'Criado pelo engenheiro soviético Alexey Pajitnov: blocos que caem, linhas que somem. Simples de aprender, impossível de dominar. A versão do Game Boy, de 1989, levou o jogo a milhões de pessoas.',
            video: 'Tetris Game Boy 1989 gameplay',
          },
          {
            titulo: 'Super Mario Bros.',
            tag: '1985 · NES',
            texto:
              'Shigeru Miyamoto definiu o jogo de plataforma com rolagem lateral: física precisa, segredos escondidos e fases que ensinam jogando. Ajudou a reerguer o mercado de games depois da crise de 1983.',
            video: 'Super Mario Bros NES 1985 gameplay',
          },
          {
            titulo: 'Street Fighter II',
            tag: '1991 · Fliperama',
            texto:
              'Popularizou os jogos de luta e os combos. Reinou nos fliperamas brasileiros — e tem um lutador brasileiro no elenco, o Blanka.',
            video: 'Street Fighter II arcade 1991 gameplay',
          },
          {
            titulo: 'Sonic the Hedgehog',
            tag: '1991 · Mega Drive',
            texto:
              'A resposta veloz da Sega ao Mario. No Brasil, o Mega Drive teve vida longuíssima graças à Tectoy, que fabricou o console aqui por décadas.',
            video: 'Sonic the Hedgehog Mega Drive 1991 gameplay',
          },
          {
            titulo: 'Pokémon Red e Blue',
            tag: '1996 · Game Boy',
            texto:
              'Lançado no Japão em 1996 e no Ocidente em 1998: capturar, trocar e batalhar com os amigos pelo cabo link. Deu origem à franquia de mídia mais lucrativa do mundo.',
            video: 'Pokémon Red Blue Game Boy gameplay',
          },
          {
            titulo: 'Final Fantasy VII',
            tag: '1997 · PlayStation',
            texto:
              'Popularizou o RPG japonês no Ocidente com cenas em computação gráfica, uma trama sobre ecologia e corporações e uma das trilhas mais lembradas dos games.',
            video: 'Final Fantasy VII 1997 trailer',
          },
          {
            titulo: 'The Legend of Zelda: Ocarina of Time',
            tag: '1998 · Nintendo 64',
            texto:
              'Levou a aventura para o 3D e criou a mira travada no inimigo, copiada até hoje. Aparece com frequência nas listas de melhores jogos de todos os tempos.',
            video: 'Zelda Ocarina of Time trailer Nintendo 64',
          },
          {
            titulo: 'Half-Life',
            tag: '1998 · PC',
            texto:
              'Contou a história sem tirar o controle do jogador. Uma modificação dele, o Counter-Strike, virou febre nas lan houses brasileiras.',
            video: 'Half-Life 1998 gameplay',
          },
          {
            titulo: 'Metal Gear Solid',
            tag: '1998 · PlayStation',
            texto:
              'Hideo Kojima fez do jogo de espionagem um filme interativo, com furtividade, chefes memoráveis e truques que quebravam a quarta parede.',
            video: 'Metal Gear Solid 1998 trailer',
          },
          {
            titulo: 'GTA: San Andreas',
            tag: '2004 · PlayStation 2',
            texto:
              'Um mundo aberto enorme, inspirado na Califórnia dos anos 1990, que marcou uma geração inteira de jogadores brasileiros no PlayStation 2.',
            video: 'GTA San Andreas trailer oficial',
          },
          {
            titulo: 'Shadow of the Colossus',
            tag: '2005 · PlayStation 2',
            texto:
              'Só você, um cavalo e 16 colossos. Uma aula de minimalismo e melancolia, sempre lembrada no debate “games são arte?”.',
            video: 'Shadow of the Colossus trailer',
          },
          {
            titulo: 'Portal',
            tag: '2007 · PC',
            texto:
              'Quebra-cabeças com uma arma que cria portais e uma inteligência artificial sarcástica, a GLaDOS. Curto, engenhoso e engraçado.',
            video: 'Portal 2007 Valve trailer',
          },
          {
            titulo: 'Minecraft',
            tag: '2011 · Multiplataforma',
            texto:
              'Blocos, sobrevivência e criatividade sem limite. É o jogo mais vendido da história e é usado até em escolas para ensinar.',
            video: 'Minecraft trailer oficial',
          },
          {
            titulo: 'Dark Souls',
            tag: '2011 · Multiplataforma',
            texto:
              'Difícil, justo e cheio de mistério. Criou um subgênero, o “soulslike”, e mudou a forma como os jogos contam histórias pelo cenário.',
            video: 'Dark Souls trailer',
          },
          {
            titulo: 'The Last of Us',
            tag: '2013 · PlayStation 3',
            texto:
              'Drama de sobrevivência que muita gente compara ao cinema. Em 2023 virou série da HBO.',
            video: 'The Last of Us 2013 trailer',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'brasileiros',
        aba: 'Jogos brasileiros',
        icone: 'flag',
        titulo: 'Jogos brasileiros',
        apoio: 'Feitos por estúdios do Brasil e premiados lá fora. Muitos estão nas lojas de PC e consoles.',
        itens: [
          {
            titulo: 'Horizon Chase Turbo',
            tag: '2018 · Aquiris (Porto Alegre)',
            texto:
              'Corrida arcade que homenageia Top Gear e Out Run, com trilha de Barry Leitch, o compositor do Top Gear original.',
            video: 'Horizon Chase Turbo trailer oficial',
          },
          {
            titulo: 'Dandara',
            tag: '2018 · Long Hat House (Belo Horizonte)',
            texto:
              'Metroidvania em que você não anda: salta entre chão, paredes e teto. A heroína é inspirada em Dandara, guerreira do Quilombo dos Palmares.',
            video: 'Dandara Long Hat House trailer',
          },
          {
            titulo: 'Chroma Squad',
            tag: '2015 · Behold Studios (Brasília)',
            texto:
              'RPG tático em que você comanda um estúdio de série de heróis — homenagem a Power Rangers e aos tokusatsus que marcaram a TV brasileira.',
            video: 'Chroma Squad trailer',
          },
          {
            titulo: 'Knights of Pen & Paper',
            tag: '2012 · Behold Studios (Brasília)',
            texto:
              'Um RPG sobre jogar RPG de mesa: você controla os jogadores e o mestre ao redor da mesa. Fez sucesso nos celulares.',
            video: 'Knights of Pen and Paper trailer',
          },
          {
            titulo: 'Blazing Chrome',
            tag: '2019 · JoyMasher',
            texto:
              'Tiro e ação em 2D no estilo Contra, com visual de 16 bits. A JoyMasher é especialista em homenagens retrô, como Oniken e Odallus.',
            video: 'Blazing Chrome trailer',
          },
          {
            titulo: 'Kaze and the Wild Masks',
            tag: '2021 · PixelHive',
            texto:
              'Plataforma 2D que lembra Donkey Kong Country: a coelha Kaze ganha poderes diferentes com máscaras encantadas.',
            video: 'Kaze and the Wild Masks trailer',
          },
          {
            titulo: 'Unsighted',
            tag: '2021 · Studio Pixel Punk',
            texto:
              'Aventura de ação em que cada personagem tem um tempo de vida contando — e você decide com quem dividir o que resta. Feito por uma dupla brasileira.',
            video: 'Unsighted game trailer',
          },
          {
            titulo: 'Toren',
            tag: '2015 · Swordtales (Porto Alegre)',
            texto:
              'Aventura poética sobre uma menina que cresce enquanto sobe uma torre. Foi um dos primeiros jogos brasileiros lançados no PlayStation 4.',
            video: 'Toren Swordtales trailer',
          },
          {
            titulo: 'Arida: Backland’s Awakening',
            tag: '2019 · Aoca Game Lab (Salvador)',
            texto:
              'Sobrevivência no sertão baiano do fim do século XIX, com o contexto de Canudos ao fundo. Busque água, faça trocas e atravesse a seca.',
            video: 'Arida Backlands Awakening trailer',
          },
          {
            titulo: 'Aritana e a Pena da Harpia',
            tag: '2014 · Duaik Entretenimento',
            texto:
              'Plataforma 3D com um herói indígena que atravessa a floresta atrás de uma pena mágica para curar o pajé.',
            video: 'Aritana e a Pena da Harpia trailer',
          },
          {
            titulo: 'Dodgeball Academia',
            tag: '2021 · Pocket Trap',
            texto: 'RPG de ação em que as batalhas são partidas de queimada. Colorido, engraçado e cheio de personagens.',
            video: 'Dodgeball Academia trailer',
          },
          {
            titulo: 'Enigma do Medo',
            tag: '2024 · Dumativa',
            texto:
              'Investigação e terror no universo de Ordem Paranormal, a série de RPG criada por Rafael Lange, o Cellbit.',
            video: 'Enigma do Medo trailer oficial',
          },
          {
            titulo: 'Mullet MadJack',
            tag: '2024 · Hammer95',
            texto:
              'Tiro frenético em primeira pessoa com estética de anime dos anos 1990: você tem 10 segundos de vida, e cada inimigo derrotado dá mais alguns.',
            video: 'Mullet MadJack trailer',
          },
          {
            titulo: 'Hell Clock',
            tag: 'Rogue Snail',
            texto:
              'Ação roguelite ambientada na Guerra de Canudos, com o sertão transformado em pesadelo sobrenatural. Do mesmo estúdio de Relic Hunters.',
            video: 'Hell Clock Rogue Snail trailer',
          },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário gamer',
        titulo: 'Glossário gamer',
        apoio: 'De AAA a XP: o vocabulário das partidas, das lojas e dos chats.',
        termos: [
          { termo: 'AAA', definicao: 'Jogo de grande orçamento, feito por estúdios grandes — o “blockbuster” dos games.' },
          { termo: 'Indie', definicao: 'Jogo independente, feito por equipes pequenas, sem uma grande publicadora bancando.' },
          { termo: 'NPC', definicao: 'Personagem controlado pelo jogo, não por uma pessoa (non-player character).' },
          { termo: 'DLC', definicao: 'Conteúdo baixável lançado depois do jogo: fases, personagens, histórias extras.' },
          { termo: 'Patch', definicao: 'Atualização que corrige erros ou muda o equilíbrio do jogo.' },
          { termo: 'Nerf', definicao: 'Quando uma atualização enfraquece uma arma, personagem ou habilidade.' },
          { termo: 'Buff', definicao: 'O contrário do nerf: um reforço. Também é um efeito temporário que melhora o personagem.' },
          { termo: 'Meta', definicao: 'As estratégias e escolhas mais eficientes num momento do jogo. “Jogar no meta” é seguir o que está mais forte.' },
          { termo: 'Tier list', definicao: 'Ranking em camadas (S, A, B, C…) dos personagens ou itens mais fortes.' },
          { termo: 'Speedrun', definicao: 'Terminar um jogo no menor tempo possível, muitas vezes explorando falhas. Há competições e recordes mundiais.' },
          { termo: 'Roguelike', definicao: 'Gênero de fases geradas aleatoriamente e morte permanente: morreu, começa do zero.' },
          { termo: 'Roguelite', definicao: 'Parente do roguelike em que parte do progresso fica entre uma tentativa e outra.' },
          { termo: 'Metroidvania', definicao: 'Jogo de exploração em mapa interligado, que se abre à medida que você ganha habilidades. Nome vem de Metroid e Castlevania.' },
          { termo: 'Soulslike', definicao: 'Jogo difícil e punitivo inspirado em Dark Souls, com checkpoints espaçados e chefes exigentes.' },
          { termo: 'FPS', definicao: 'Dois sentidos: jogo de tiro em primeira pessoa (first-person shooter) ou quadros por segundo (frames per second).' },
          { termo: 'MMORPG', definicao: 'RPG online com milhares de jogadores no mesmo mundo, como World of Warcraft.' },
          { termo: 'MOBA', definicao: 'Arena de batalha online em equipes, como League of Legends e Dota 2.' },
          { termo: 'Battle royale', definicao: 'Muitos jogadores num mapa que encolhe; ganha quem sobrar. Free Fire e Fortnite são exemplos.' },
          { termo: 'Free-to-play', definicao: 'Jogo gratuito para baixar e jogar, que costuma ganhar dinheiro com itens pagos.' },
          { termo: 'Gacha', definicao: 'Mecânica de sorteio de personagens ou itens, pagos com moeda do jogo — inspirada nas máquinas de cápsulas japonesas.' },
          { termo: 'Loot', definicao: 'Os itens que você coleta: armas, equipamentos, moedas.' },
          { termo: 'Farmar', definicao: 'Repetir uma tarefa para acumular itens, experiência ou dinheiro no jogo. Também chamado de grind.' },
          { termo: 'Spawn e respawn', definicao: 'Spawn é o lugar onde o personagem ou inimigo aparece; respawn é reaparecer depois de morrer.' },
          { termo: 'Hitbox', definicao: 'A área invisível que o jogo usa para decidir se um golpe ou tiro acertou.' },
          { termo: 'Lag e ping', definicao: 'Ping é o tempo de resposta da conexão, em milissegundos; lag é o atraso que você sente quando ele sobe.' },
          { termo: 'Crossplay', definicao: 'Jogar online com pessoas de outras plataformas (PC, console, celular).' },
          { termo: 'Co-op', definicao: 'Modo cooperativo: jogadores do mesmo lado contra o jogo.' },
          { termo: 'Early access', definicao: 'Acesso antecipado: jogo vendido ainda em desenvolvimento, que evolui com o retorno dos jogadores.' },
          { termo: 'Checkpoint', definicao: 'Ponto salvo automaticamente para onde você volta se morrer.' },
          { termo: 'Easter egg', definicao: 'Segredo ou referência escondida pelos desenvolvedores.' },
          { termo: 'GG', definicao: '“Good game”: bom jogo. Cumprimento de fim de partida.' },
          { termo: 'Noob', definicao: 'Novato. Pode ser carinhoso ou provocação, depende do tom.' },
          { termo: 'Smurf', definicao: 'Jogador experiente usando uma conta nova para enfrentar iniciantes.' },
          { termo: 'Boss', definicao: 'Chefe: o inimigo mais forte de uma fase ou do jogo.' },
          { termo: 'Cutscene', definicao: 'Cena de história em que você só assiste, sem controlar o personagem.' },
          { termo: 'Mundo aberto', definicao: 'Mapa grande que dá para explorar livremente, sem caminho fixo.' },
          { termo: 'Sandbox', definicao: 'Jogo “caixa de areia”, com ferramentas para criar e experimentar, como Minecraft.' },
          { termo: 'Skin', definicao: 'Visual alternativo para personagem ou arma, sem mudar o desempenho.' },
          { termo: 'Passe de batalha', definicao: 'Trilha de recompensas por temporada, desbloqueadas jogando; costuma ter versão paga.' },
          { termo: 'Remake e remaster', definicao: 'Remake é o jogo refeito do zero; remaster é o original com melhorias técnicas (resolução, desempenho).' },
          { termo: 'Port', definicao: 'Versão de um jogo adaptada para outra plataforma.' },
        ],
      },
      {
        tipo: 'recursos',
        id: 'criar',
        aba: 'Crie seu jogo',
        icone: 'bulb',
        titulo: 'Crie seu próprio jogo',
        apoio: 'Motores, ferramentas e artes livres para tirar a ideia do papel — muitos são gratuitos e de código aberto.',
        itens: [
          { nome: 'Godot', tag: 'Motor 2D e 3D', gratis: true, url: 'https://godotengine.org', descricao: 'Motor de jogos completo, gratuito e de código aberto, sem royalties. Ótimo para começar e para projetos sérios.' },
          { nome: 'GDevelop', tag: 'Sem programar', gratis: true, url: 'https://gdevelop.io', descricao: 'Crie jogos com eventos visuais, sem escrever código. Roda no navegador e é de código aberto.' },
          { nome: 'Scratch', tag: 'Primeiros passos', gratis: true, url: 'https://scratch.mit.edu', descricao: 'Programação em blocos do MIT. Perfeito para crianças — e para adultos que querem entender lógica de jogos.' },
          { nome: 'Unity', tag: 'Motor 2D e 3D', gratis: true, url: 'https://unity.com', descricao: 'Um dos motores mais usados do mundo. Tem plano gratuito para quem está começando, com limite de faturamento.' },
          { nome: 'Unreal Engine', tag: 'Motor 3D', gratis: true, url: 'https://www.unrealengine.com', descricao: 'O motor dos gráficos de ponta. Gratuito para baixar e usar; cobra royalties só acima de um faturamento alto.' },
          { nome: 'GameMaker', tag: 'Motor 2D', gratis: true, url: 'https://gamemaker.io', descricao: 'Motor 2D veterano, de onde saíram vários indies famosos. Gratuito para uso não comercial.' },
          { nome: 'Defold', tag: 'Motor 2D', gratis: true, url: 'https://defold.com', descricao: 'Motor leve e gratuito, com scripts em Lua — a linguagem criada na PUC-Rio.' },
          { nome: 'LÖVE', tag: 'Framework em Lua', gratis: true, url: 'https://love2d.org', descricao: 'Framework minimalista e de código aberto para jogos 2D escritos em Lua.' },
          { nome: 'Twine', tag: 'Narrativa', gratis: true, url: 'https://twinery.org', descricao: 'Ferramenta de código aberto para histórias interativas e jogos de escolhas, direto no navegador.' },
          { nome: 'Bitsy', tag: 'Minijogos', gratis: true, url: 'https://make.bitsy.org', descricao: 'Editor simplíssimo para criar pequenos jogos e mundos em pixel art, no navegador.' },
          { nome: 'PICO-8', tag: 'Console de fantasia', gratis: false, url: 'https://www.lexaloffle.com/pico-8.php', descricao: 'Um “console imaginário” com limites de propósito: tela minúscula, poucas cores e muita criatividade.' },
          { nome: 'Kenney', tag: 'Artes grátis', gratis: true, url: 'https://kenney.nl', descricao: 'Milhares de sprites, modelos 3D, sons e interfaces em domínio público (CC0) para usar em qualquer projeto.' },
          { nome: 'OpenGameArt', tag: 'Artes livres', gratis: true, url: 'https://opengameart.org', descricao: 'Comunidade que compartilha artes, músicas e efeitos sonoros com licenças livres. Confira a licença de cada item.' },
          { nome: 'itch.io', tag: 'Publicar e jogar', gratis: true, url: 'https://itch.io', descricao: 'A casa dos indies: publique seu jogo de graça e descubra milhares de jogos independentes, muitos gratuitos.' },
        ],
      },
    ],
  },

  // ===========================================================================
  esporte: {
    titulo: 'Kit de Esporte',
    apoio: 'As regras em um minuto, os ídolos que fizeram história, o vocabulário das transmissões e onde assistir de graça.',
    blocos: [
      {
        tipo: 'guia',
        id: 'regras',
        aba: 'Regras em 1 minuto',
        icone: 'flag',
        titulo: 'Regras em 1 minuto',
        apoio: 'O essencial para entender a partida — e acompanhar a conversa. Cada competição pode ter detalhes próprios.',
        itens: [
          {
            titulo: 'Futebol',
            tag: '11 × 11 · 2 × 45 min',
            texto:
              'Dois tempos de 45 minutos, mais acréscimos. Impedimento: no momento do passe, o atacante não pode estar no campo adversário mais perto da linha de fundo do que a bola e o penúltimo defensor (o goleiro costuma contar). Não há impedimento em lateral, escanteio ou tiro de meta. Dois amarelos viram vermelho. O VAR revisa gols, pênaltis, expulsões diretas e erro de identidade.',
            video: 'regra do impedimento explicada futebol',
          },
          {
            titulo: 'Futsal',
            tag: '5 × 5 · 2 × 20 min',
            texto:
              'Tempo cronometrado: o relógio para quando a bola sai. Substituições ilimitadas e sem parar o jogo. O lateral é cobrado com os pés, e as cobranças têm 4 segundos. A partir da sexta falta acumulada no tempo, o adversário cobra tiro livre direto sem barreira.',
          },
          {
            titulo: 'Vôlei',
            tag: '6 × 6 · melhor de 5 sets',
            texto:
              'Todo rali vale ponto. Sets de 25 pontos, com 2 de vantagem; o tie-break (5º set) vai a 15. Cada lado tem até três toques (o bloqueio não conta). Ao recuperar o saque, o time roda no sentido horário. O líbero, de camisa diferente, é especialista em defesa: não ataca acima da rede nem bloqueia.',
            video: 'regras do vôlei explicadas',
          },
          {
            titulo: 'Vôlei de praia',
            tag: '2 × 2 · melhor de 3 sets',
            texto:
              'Sets de 21 pontos e terceiro set de 15, sempre com 2 de vantagem. Sem substituições. As duplas trocam de lado a cada 7 pontos (a cada 5 no terceiro set) por causa do sol e do vento.',
          },
          {
            titulo: 'Basquete',
            tag: '5 × 5 · 4 quartos',
            texto:
              'Quartos de 10 minutos nas regras internacionais (12 na NBA). A cesta vale 2 pontos, 3 se o arremesso for de trás da linha, e 1 no lance livre. O ataque tem 24 segundos de posse. Andar com a bola sem quicar e driblar de novo depois de segurar são violações. Com 5 faltas o jogador sai (6 na NBA).',
            video: 'regras do basquete explicadas',
          },
          {
            titulo: 'Tênis',
            tag: 'Games e sets',
            texto:
              'Pontos contam 15, 30, 40 e game. No 40 a 40 (iguais), é preciso abrir 2 pontos. O set vai a 6 games com 2 de diferença; em 6 a 6, normalmente há tie-break. Os quatro Grand Slams: Australian Open, Roland Garros (saibro), Wimbledon (grama) e US Open.',
            video: 'regras do tênis explicadas pontuação',
          },
          {
            titulo: 'Fórmula 1',
            tag: 'Pilotos e construtores',
            texto:
              'O grid sai do treino classificatório. Os 10 primeiros pontuam, 25 para o vencedor. Há dois campeonatos: de pilotos e de equipes (construtores). Bandeira amarela: perigo, proibido ultrapassar. Azul: deixe passar quem vem mais rápido. Vermelha: corrida interrompida. Quadriculada: fim.',
          },
          {
            titulo: 'Skate',
            tag: 'Street e park',
            texto:
              'Nos Jogos Olímpicos há duas provas. No street, a pista imita a rua (corrimãos, escadas, bordas) e há voltas e manobras isoladas; no park, a pista é uma grande bacia de curvas. Juízes dão notas pela dificuldade, execução e estilo.',
          },
          {
            titulo: 'Surfe',
            tag: 'Baterias',
            texto:
              'Os surfistas disputam baterias cronometradas. Cada onda recebe nota de 0 a 10 e valem as duas melhores (máximo de 20). Quem tem a prioridade tem direito à onda; atrapalhar é interferência e custa pontos.',
          },
          {
            titulo: 'Judô',
            tag: 'Ippon encerra',
            texto:
              'A luta acaba com o ippon: uma projeção perfeita (costas no chão, com força e controle), uma imobilização longa ou uma finalização. Golpes menos perfeitos valem pontos parciais. Punições (shido) se acumulam, e o excesso desclassifica. Empatou? Vai para o golden score: quem pontuar primeiro vence.',
          },
          {
            titulo: 'Handebol',
            tag: '7 × 7 · 2 × 30 min',
            texto:
              'Só o goleiro pode pisar na área de 6 metros. Com a bola na mão, o jogador pode dar até três passos e segurá-la por até três segundos. Faltas graves dão exclusão de 2 minutos; o pênalti é o tiro de 7 metros.',
          },
          {
            titulo: 'Ciclismo de estrada',
            tag: 'Grandes Voltas',
            texto:
              'Nas provas por etapas, como o Tour de France, vence quem soma o menor tempo. Camisas especiais identificam os líderes: amarela (geral), verde (pontos), de bolinhas (montanha) e branca (melhor jovem).',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'idolos',
        aba: 'Ídolos',
        icone: 'star',
        titulo: 'Ídolos do esporte brasileiro',
        apoio: 'Quem fez o país parar na frente da TV. Toque em “Assistir aqui” para rever os momentos.',
        itens: [
          {
            titulo: 'Pelé',
            tag: 'Futebol',
            texto: 'O Rei do Futebol, único jogador tricampeão mundial (1958, 1962 e 1970). Brilhou no Santos e levou o futebol aos Estados Unidos no Cosmos.',
            video: 'Pelé melhores gols',
          },
          {
            titulo: 'Marta',
            tag: 'Futebol',
            texto: 'Eleita seis vezes a melhor jogadora do mundo pela FIFA e maior artilheira da história das Copas do Mundo, entre homens e mulheres, com 17 gols.',
            video: 'Marta gols seleção brasileira',
          },
          {
            titulo: 'Ayrton Senna',
            tag: 'Fórmula 1',
            texto: 'Tricampeão mundial (1988, 1990 e 1991), mestre na chuva e nas classificações. Sua morte em Ímola, em 1994, comoveu o país.',
            video: 'Ayrton Senna vitória Interlagos 1991',
          },
          {
            titulo: 'Gustavo Kuerten, o Guga',
            tag: 'Tênis',
            texto: 'Tricampeão de Roland Garros (1997, 2000 e 2001) e número 1 do mundo ao fim de 2000. Em 2001, desenhou um coração no saibro de Paris.',
            video: 'Guga Kuerten Roland Garros 2001 coração',
          },
          {
            titulo: 'Maria Esther Bueno',
            tag: 'Tênis',
            texto: 'Pioneira: venceu Wimbledon três vezes e o US Open quatro, somando sete títulos de Grand Slam em simples.',
            video: 'Maria Esther Bueno Wimbledon',
          },
          {
            titulo: 'Rebeca Andrade',
            tag: 'Ginástica',
            texto: 'Ouro no salto em Tóquio e ouro no solo em Paris 2024, superando Simone Biles. Com seis medalhas, é a maior medalhista olímpica do Brasil.',
            video: 'Rebeca Andrade ouro solo Paris 2024',
          },
          {
            titulo: 'Daiane dos Santos',
            tag: 'Ginástica',
            texto: 'Primeira brasileira campeã mundial de ginástica, no solo, em 2003. Tem um movimento de solo com seu nome no código de pontuação, o “Dos Santos”.',
            video: 'Daiane dos Santos campeã mundial 2003 solo',
          },
          {
            titulo: 'Oscar Schmidt',
            tag: 'Basquete',
            texto: 'O Mão Santa, um dos maiores pontuadores da história do basquete. Comandou a vitória sobre os EUA na final do Pan de Indianápolis, em 1987.',
            video: 'Oscar Schmidt final Pan 1987 Brasil x Estados Unidos',
          },
          {
            titulo: 'Hortência',
            tag: 'Basquete',
            texto: 'A Rainha do basquete brasileiro, campeã mundial em 1994 e prata olímpica em Atlanta 1996, ao lado de Magic Paula.',
            video: 'Hortência Brasil campeão mundial basquete feminino 1994',
          },
          {
            titulo: 'Adhemar Ferreira da Silva',
            tag: 'Atletismo',
            texto: 'Bicampeão olímpico do salto triplo (1952 e 1956) — o primeiro grande herói olímpico do Brasil.',
            video: 'Adhemar Ferreira da Silva salto triplo',
          },
          {
            titulo: 'Joaquim Cruz',
            tag: 'Atletismo',
            texto: 'Ouro nos 800 metros em Los Angeles 1984, numa das provas mais bonitas da história do atletismo brasileiro.',
            video: 'Joaquim Cruz ouro 800 metros 1984',
          },
          {
            titulo: 'Torben Grael e Robert Scheidt',
            tag: 'Vela',
            texto: 'Cada um conquistou cinco medalhas olímpicas, duas delas de ouro. Durante anos, foram os maiores medalhistas olímpicos do país.',
            video: 'Robert Scheidt Torben Grael vela olímpica',
          },
          {
            titulo: 'Gabriel Medina',
            tag: 'Surfe',
            texto: 'Primeiro brasileiro campeão mundial de surfe, em 2014 — e tricampeão (2014, 2018 e 2021). Abriu caminho para a “Brazilian Storm”.',
            video: 'Gabriel Medina campeão mundial 2014',
          },
          {
            titulo: 'Rayssa Leal',
            tag: 'Skate',
            texto: 'A Fadinha foi prata em Tóquio aos 13 anos e bronze em Paris 2024 no skate street.',
            video: 'Rayssa Leal Tóquio 2020 prata skate',
          },
          {
            titulo: 'Isaquias Queiroz',
            tag: 'Canoagem',
            texto: 'O baiano de Ubaitaba tem cinco medalhas olímpicas, entre elas o ouro no C1 1000 m em Tóquio.',
            video: 'Isaquias Queiroz ouro Tóquio C1 1000',
          },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário esportivo',
        apoio: 'O dicionário da resenha e da transmissão, do chapéu ao tie-break.',
        termos: [
          { termo: 'Impedimento', definicao: 'Posição irregular do atacante no momento do passe: estar mais perto da linha de fundo do que a bola e o penúltimo adversário.' },
          { termo: 'Escanteio', definicao: 'Cobrança do canto do campo quando a defesa manda a bola pela própria linha de fundo.' },
          { termo: 'Tiro de meta', definicao: 'Reposição feita da área do goleiro quando o ataque manda a bola pela linha de fundo.' },
          { termo: 'Pênalti', definicao: 'Tiro livre da marca de 11 metros, por falta cometida dentro da grande área.' },
          { termo: 'VAR', definicao: 'Árbitro de vídeo: revisa lances de gol, pênalti, expulsão direta e erro de identidade.' },
          { termo: 'Hat-trick', definicao: 'Três gols do mesmo jogador numa partida.' },
          { termo: 'Gol olímpico', definicao: 'Gol marcado direto da cobrança de escanteio. O nome vem de um gol da Argentina, em 1924, contra o Uruguai, então campeão olímpico.' },
          { termo: 'Gol de placa', definicao: 'Gol muito bonito. A expressão nasceu de um gol de Pelé contra o Fluminense, no Maracanã, em 1961, que ganhou uma placa comemorativa.' },
          { termo: 'Caneta', definicao: 'Drible em que a bola passa entre as pernas do adversário.' },
          { termo: 'Chapéu', definicao: 'Drible em que a bola passa por cima da cabeça do adversário.' },
          { termo: 'Bicicleta', definicao: 'Chute acrobático de costas, com o corpo no ar. Leônidas da Silva foi um dos que a popularizaram.' },
          { termo: 'Artilheiro', definicao: 'O maior goleador de um time ou de uma competição.' },
          { termo: 'Assistência', definicao: 'O último passe antes do gol ou da cesta.' },
          { termo: 'Líbero', definicao: 'No vôlei, jogador especialista em defesa e recepção, de camisa diferente. No futebol antigo, o zagueiro que sobrava atrás.' },
          { termo: 'Levantador', definicao: 'No vôlei, quem prepara a bola para o ataque — o cérebro do time.' },
          { termo: 'Ace', definicao: 'Saque que vira ponto direto, sem o adversário conseguir devolver. Vale no vôlei e no tênis.' },
          { termo: 'Cortada', definicao: 'O ataque do vôlei: golpe forte de cima para baixo.' },
          { termo: 'Tie-break', definicao: 'Desempate: no vôlei, o 5º set, até 15; no tênis, o game especial disputado em 6 a 6.' },
          { termo: 'Rebote', definicao: 'No basquete, recuperar a bola depois de um arremesso errado.' },
          { termo: 'Toco', definicao: 'No basquete, bloquear o arremesso do adversário.' },
          { termo: 'Enterrada', definicao: 'Cesta em que o jogador põe a bola na cesta de cima para baixo, com as mãos.' },
          { termo: 'Lance livre', definicao: 'Arremesso sem marcação, da linha de lance livre, depois de uma falta. Vale 1 ponto.' },
          { termo: 'Triplo-duplo', definicao: 'Dois dígitos em três estatísticas no mesmo jogo, como pontos, rebotes e assistências.' },
          { termo: 'Pole position', definicao: 'O primeiro lugar do grid de largada, conquistado no treino classificatório.' },
          { termo: 'Pit stop', definicao: 'Parada nos boxes para trocar pneus ou fazer reparos.' },
          { termo: 'Safety car', definicao: 'Carro de segurança que entra na pista para neutralizar a corrida após um acidente ou perigo.' },
          { termo: 'Grand Slam', definicao: 'No tênis, os quatro maiores torneios: Australian Open, Roland Garros, Wimbledon e US Open.' },
          { termo: 'Quebra (break)', definicao: 'No tênis, vencer um game no saque do adversário.' },
          { termo: 'Match point', definicao: 'O ponto que, se vencido, encerra a partida.' },
          { termo: 'Ippon', definicao: 'No judô, o ponto perfeito, que encerra a luta.' },
          { termo: 'Waza-ari', definicao: 'No judô, um golpe quase perfeito; vale meio caminho até a vitória.' },
          { termo: 'Shido', definicao: 'No judô, punição por falta leve, como passividade.' },
          { termo: 'Tubo', definicao: 'No surfe, quando o surfista passa por dentro da onda enquanto ela quebra por cima dele.' },
          { termo: 'Aéreo', definicao: 'No surfe, manobra em que a prancha sai da onda e volta a ela.' },
          { termo: 'Ollie', definicao: 'No skate, o salto básico com a prancha “grudada” no pé, sem usar as mãos.' },
          { termo: 'Kickflip', definicao: 'No skate, o salto em que a prancha gira no próprio eixo, no sentido do comprimento.' },
          { termo: 'Pace', definicao: 'Na corrida, o ritmo: quantos minutos você leva para correr 1 km.' },
          { termo: 'RP (recorde pessoal)', definicao: 'O melhor tempo ou marca de um atleta numa prova. Em inglês, PB (personal best).' },
        ],
      },
      {
        tipo: 'recursos',
        id: 'assistir',
        aba: 'Onde assistir grátis',
        icone: 'broadcast',
        titulo: 'Onde assistir de graça',
        apoio: 'Canais e sites oficiais, gratuitos e legais. Os direitos de transmissão mudam a cada temporada — confira a agenda de cada um.',
        itens: [
          { nome: 'CazéTV', tag: 'YouTube', gratis: true, url: 'https://www.youtube.com/@CazeTV', descricao: 'Canal de Casimiro Miguel que transmite ao vivo, de graça, competições cujos direitos adquire — com o clima de resenha entre amigos.' },
          { nome: 'Canal GOAT', tag: 'YouTube', gratis: true, url: 'https://www.youtube.com/@CanalGOAT', descricao: 'Canal esportivo brasileiro no YouTube, com transmissões ao vivo e programas.' },
          { nome: 'ge', tag: 'Notícias e gols', gratis: true, url: 'https://ge.globo.com', descricao: 'O portal de esporte da Globo: notícias, tabelas, resultados ao vivo e vídeos dos gols.' },
          { nome: 'Globoplay', tag: 'TV aberta · parte grátis', gratis: true, url: 'https://globoplay.globo.com', descricao: 'Uma parte do conteúdo é liberada com conta gratuita; o restante exige assinatura.' },
          { nome: 'TV Brasil', tag: 'TV pública', gratis: true, url: 'https://tvbrasil.ebc.com.br', descricao: 'A TV pública nacional, com sinal ao vivo pela internet e transmissões esportivas em sua grade.' },
          { nome: 'Time Brasil TV', tag: 'Esporte olímpico', gratis: true, url: 'https://www.youtube.com/@timebrasil', descricao: 'Canal do Comitê Olímpico do Brasil, com os atletas brasileiros, bastidores e competições.' },
          { nome: 'Olympics', tag: 'Esporte olímpico', gratis: true, url: 'https://www.youtube.com/@olympics', descricao: 'Canal oficial dos Jogos Olímpicos, com provas históricas completas e melhores momentos.' },
          { nome: 'CBF TV', tag: 'Futebol', gratis: true, url: 'https://www.youtube.com/@CBFTV', descricao: 'Canal da Confederação Brasileira de Futebol: seleções masculina e feminina, bastidores e jogos.' },
          { nome: 'World Surf League', tag: 'Surfe ao vivo', gratis: true, url: 'https://www.worldsurfleague.com', descricao: 'As etapas do circuito mundial de surfe ao vivo e de graça no site e no aplicativo da liga.' },
          { nome: 'Formula 1', tag: 'Melhores momentos', gratis: true, url: 'https://www.youtube.com/@Formula1', descricao: 'Canal oficial da F1, com os melhores momentos de treinos e corridas e corridas históricas.' },
          { nome: 'NBA', tag: 'Melhores momentos', gratis: true, url: 'https://www.youtube.com/@NBA', descricao: 'Canal oficial da liga americana, com os melhores momentos de todos os jogos.' },
          { nome: 'Volleyball World', tag: 'Vôlei', gratis: true, url: 'https://www.youtube.com/@volleyballworld', descricao: 'Canal oficial do vôlei internacional, com melhores momentos e jogos de quadra e de praia.' },
        ],
      },
      {
        tipo: 'checklist',
        id: 'primeiros-5km',
        aba: 'Primeiros 5 km',
        titulo: 'Rumo aos primeiros 5 km',
        apoio: 'Um roteiro para quem quer correr a primeira prova. Vá marcando — o progresso fica salvo neste aparelho.',
        grupos: [
          {
            nome: 'Antes de começar',
            itens: [
              'Fazer um check-up médico (principalmente se estou parado há tempo ou tenho alguma condição de saúde)',
              'Separar um tênis confortável de corrida — não precisa ser caro',
              'Escolher uma prova com 8 a 12 semanas de antecedência',
              'Definir 3 dias fixos de treino por semana',
            ],
          },
          {
            nome: 'Treinos',
            itens: [
              'Começar alternando caminhada e trote (ex.: 1 minuto correndo, 2 andando)',
              'Aumentar o tempo de corrida aos poucos, semana a semana',
              'Correr num ritmo em que dá para conversar',
              'Fazer um dia de fortalecimento (agachamento, prancha, panturrilha)',
              'Respeitar os dias de descanso',
              'Completar os 5 km num treino, mesmo intercalando com caminhada, duas semanas antes',
            ],
          },
          {
            nome: 'Véspera',
            itens: [
              'Retirar o kit e prender o número de peito',
              'Separar roupa e tênis já testados — nada novo no dia da prova',
              'Jantar leve e conhecido e beber água ao longo do dia',
              'Dormir cedo',
            ],
          },
          {
            nome: 'Dia da prova',
            itens: [
              'Chegar com uns 45 minutos de antecedência',
              'Aquecer com 5 a 10 minutos de caminhada e trote leve',
              'Largar devagar — a empolgação da largada engana',
              'Hidratar nos postos, se precisar',
              'Comemorar a chegada e anotar o tempo para a próxima',
            ],
          },
        ],
      },
    ],
  },

  // ===========================================================================
  tecnologia: {
    titulo: 'Kit de Tecnologia',
    apoio: 'O dicionário da tecnologia, programas gratuitos que substituem os pagos, um checklist de segurança e onde aprender a programar sem gastar nada.',
    blocos: [
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário tech',
        titulo: 'Glossário de tecnologia',
        apoio: 'IA, nuvem, API, 5G: o que as siglas querem dizer, em português claro.',
        termos: [
          { termo: 'Inteligência artificial (IA)', definicao: 'Área da computação que cria sistemas capazes de tarefas que associamos à inteligência humana: reconhecer imagens, entender e gerar textos, tomar decisões.' },
          { termo: 'Aprendizado de máquina', definicao: 'Técnica de IA em que o sistema aprende padrões a partir de exemplos, em vez de seguir regras escritas uma a uma.' },
          { termo: 'Rede neural', definicao: 'Modelo matemático inspirado, de forma bem livre, nos neurônios: camadas de “nós” que ajustam pesos durante o treinamento.' },
          { termo: 'LLM', definicao: 'Modelo de linguagem de grande escala (large language model): IA treinada com enormes volumes de texto para prever e gerar linguagem. É a base dos chatbots.' },
          { termo: 'Prompt', definicao: 'O texto ou instrução que você dá a uma IA. Quanto mais claro o contexto, melhor a resposta.' },
          { termo: 'Alucinação', definicao: 'Quando uma IA gera uma informação falsa com cara de verdadeira. Por isso vale sempre conferir fatos importantes.' },
          { termo: 'Token', definicao: 'Pedaço de texto (uma palavra ou parte dela) que os modelos de linguagem usam como unidade de leitura e escrita.' },
          { termo: 'Deepfake', definicao: 'Vídeo, áudio ou imagem manipulados por IA para parecer que alguém disse ou fez algo que não aconteceu.' },
          { termo: 'Algoritmo', definicao: 'Sequência de passos para resolver um problema. Nas redes sociais, é o conjunto de regras que decide o que aparece para você.' },
          { termo: 'Nuvem', definicao: 'Usar computadores de terceiros pela internet para guardar arquivos ou rodar sistemas, em vez de fazer tudo na sua máquina.' },
          { termo: 'API', definicao: 'Interface que permite a um programa conversar com outro de forma padronizada — é como os apps trocam dados entre si.' },
          { termo: 'Open source', definicao: 'Software de código aberto: qualquer pessoa pode ver, estudar, modificar e redistribuir o código, conforme a licença.' },
          { termo: 'Front-end e back-end', definicao: 'Front-end é a parte que você vê e toca num site ou app; back-end é o que roda no servidor, com dados e regras.' },
          { termo: 'Banco de dados', definicao: 'Sistema organizado para guardar e consultar informações, como cadastros, pedidos e mensagens.' },
          { termo: 'Bug', definicao: 'Erro num programa. O nome ficou famoso por um inseto real encontrado num computador em 1947.' },
          { termo: 'Git', definicao: 'Ferramenta que registra o histórico de mudanças no código e permite que muitas pessoas trabalhem juntas.' },
          { termo: 'Framework', definicao: 'Conjunto de ferramentas e regras prontas que acelera o desenvolvimento de um tipo de software.' },
          { termo: 'Criptografia', definicao: 'Técnica que embaralha dados para que só quem tem a chave consiga ler.' },
          { termo: 'Criptografia de ponta a ponta', definicao: 'Só quem envia e quem recebe conseguem ler a mensagem — nem a empresa que transporta tem acesso.' },
          { termo: 'Autenticação em dois fatores (2FA)', definicao: 'Uma segunda prova de identidade além da senha, como um código no app autenticador. Protege mesmo se a senha vazar.' },
          { termo: 'Passkey', definicao: 'Chave de acesso que substitui a senha, usando a biometria ou o PIN do seu aparelho. É resistente a phishing.' },
          { termo: 'Phishing', definicao: 'Golpe que imita bancos, lojas ou pessoas conhecidas para roubar senhas e dados, por e-mail, SMS ou mensagem.' },
          { termo: 'Malware', definicao: 'Qualquer programa malicioso: vírus, spyware, cavalo de troia.' },
          { termo: 'Ransomware', definicao: 'Malware que sequestra os arquivos com criptografia e pede resgate para liberá-los.' },
          { termo: 'VPN', definicao: 'Rede privada virtual: cria um túnel criptografado entre o seu aparelho e um servidor. Útil em Wi-Fi público.' },
          { termo: 'Cookie', definicao: 'Pequeno arquivo que um site guarda no navegador para lembrar login, preferências ou rastrear navegação.' },
          { termo: 'Backup', definicao: 'Cópia de segurança dos seus arquivos. A regra 3-2-1: três cópias, em dois tipos de mídia, uma fora de casa (ou na nuvem).' },
          { termo: 'LGPD', definicao: 'Lei Geral de Proteção de Dados (Lei 13.709/2018): regula como empresas e governo coletam e tratam dados pessoais no Brasil.' },
          { termo: 'Pix', definicao: 'Sistema de pagamentos instantâneos do Banco Central, lançado em 2020. Funciona 24 horas por dia, todos os dias.' },
          { termo: '5G', definicao: 'Quinta geração da rede móvel: mais velocidade, menos latência e mais aparelhos conectados ao mesmo tempo.' },
          { termo: 'Latência', definicao: 'O tempo que um dado leva para ir e voltar pela rede. Importa muito em jogos online e chamadas de vídeo.' },
          { termo: 'Fibra óptica', definicao: 'Cabo que transmite dados como pulsos de luz, com alta velocidade e estabilidade.' },
          { termo: 'Bit e byte', definicao: 'Bit é a menor unidade de informação (0 ou 1); um byte tem 8 bits. Velocidade de internet é medida em bits; tamanho de arquivo, em bytes.' },
          { termo: 'Processador (CPU)', definicao: 'O “cérebro” do computador, que executa as instruções dos programas.' },
          { termo: 'GPU', definicao: 'Processador gráfico: feito para muitos cálculos em paralelo. Roda jogos e treina modelos de IA.' },
          { termo: 'Memória RAM', definicao: 'Memória rápida e temporária onde ficam os programas abertos. Apaga quando o aparelho desliga.' },
          { termo: 'SSD', definicao: 'Armazenamento sem partes móveis, muito mais rápido que o HD tradicional.' },
          { termo: 'Sistema operacional', definicao: 'O programa-base que gerencia o aparelho: Windows, macOS, Linux, Android, iOS.' },
          { termo: 'Firmware', definicao: 'Software gravado no próprio hardware (roteador, TV, celular) que controla suas funções básicas.' },
          { termo: 'Internet das coisas (IoT)', definicao: 'Objetos do dia a dia conectados à internet: lâmpadas, câmeras, eletrodomésticos, sensores.' },
          { termo: 'Realidade virtual e aumentada', definicao: 'Na virtual, você entra num ambiente todo digital (com óculos); na aumentada, elementos digitais aparecem sobre o mundo real.' },
          { termo: 'Blockchain', definicao: 'Registro distribuído em blocos encadeados, difícil de adulterar. É a base das criptomoedas.' },
          { termo: 'Computação quântica', definicao: 'Computação com qubits, que exploram fenômenos da física quântica para certos cálculos. Ainda experimental.' },
          { termo: 'SaaS', definicao: 'Software como serviço: você usa pelo navegador e paga assinatura, sem instalar.' },
          { termo: 'Startup', definicao: 'Empresa nova, com modelo de negócio escalável e em busca de crescimento rápido, normalmente de base tecnológica.' },
        ],
      },
      {
        tipo: 'recursos',
        id: 'ferramentas',
        aba: 'Ferramentas grátis',
        icone: 'download',
        titulo: 'Ferramentas gratuitas e open source',
        apoio: 'Programas de qualidade profissional que não custam nada — a maioria de código aberto. Baixe sempre do site oficial.',
        itens: [
          { nome: 'LibreOffice', tag: 'Escritório', gratis: true, url: 'https://pt-br.libreoffice.org', descricao: 'Editor de textos, planilhas e apresentações compatível com os formatos do Office.' },
          { nome: 'Firefox', tag: 'Navegador', gratis: true, url: 'https://www.firefox.com/pt-BR/', descricao: 'Navegador independente, da Mozilla, com foco em privacidade e extensões.' },
          { nome: 'Thunderbird', tag: 'E-mail', gratis: true, url: 'https://www.thunderbird.net', descricao: 'Cliente de e-mail e agenda que junta várias contas num lugar só.' },
          { nome: 'Bitwarden', tag: 'Senhas', gratis: true, url: 'https://bitwarden.com', descricao: 'Gerenciador de senhas de código aberto, com plano gratuito que sincroniza entre aparelhos.' },
          { nome: 'KeePassXC', tag: 'Senhas', gratis: true, url: 'https://keepassxc.org', descricao: 'Cofre de senhas que fica só no seu computador, sem nuvem.' },
          { nome: 'Signal', tag: 'Mensagens', gratis: true, url: 'https://signal.org', descricao: 'Mensageiro com criptografia de ponta a ponta, mantido por uma fundação sem fins lucrativos.' },
          { nome: 'GIMP', tag: 'Imagem', gratis: true, url: 'https://www.gimp.org', descricao: 'Editor de imagens e fotos, alternativa gratuita a programas de edição profissional.' },
          { nome: 'Krita', tag: 'Ilustração', gratis: true, url: 'https://krita.org', descricao: 'Programa de pintura digital e ilustração, muito usado por artistas e quadrinistas.' },
          { nome: 'Inkscape', tag: 'Vetor', gratis: true, url: 'https://inkscape.org', descricao: 'Desenho vetorial para logos, ilustrações e diagramas, com SVG nativo.' },
          { nome: 'Blender', tag: '3D e animação', gratis: true, url: 'https://www.blender.org', descricao: 'Modelagem 3D, animação, efeitos e edição de vídeo — usado até em filmes premiados.' },
          { nome: 'darktable', tag: 'Fotografia', gratis: true, url: 'https://www.darktable.org', descricao: 'Revelação de fotos RAW e organização de acervo, no estilo dos programas profissionais de fotografia.' },
          { nome: 'Kdenlive', tag: 'Vídeo', gratis: true, url: 'https://kdenlive.org', descricao: 'Editor de vídeo com linha do tempo em várias faixas, transições e efeitos.' },
          { nome: 'Shotcut', tag: 'Vídeo', gratis: true, url: 'https://shotcut.org', descricao: 'Editor de vídeo simples e leve, que abre quase qualquer formato.' },
          { nome: 'OBS Studio', tag: 'Gravação e live', gratis: true, url: 'https://obsproject.com', descricao: 'Grave a tela e faça transmissões ao vivo com cenas, câmeras e sobreposições.' },
          { nome: 'Audacity', tag: 'Áudio', gratis: true, url: 'https://www.audacityteam.org', descricao: 'Grave e edite áudio: podcasts, entrevistas, limpeza de ruído.' },
          { nome: 'VLC', tag: 'Player', gratis: true, url: 'https://www.videolan.org/vlc/', descricao: 'Toca praticamente qualquer vídeo ou áudio, sem instalar codecs extras.' },
          { nome: 'VS Code', tag: 'Programação', gratis: true, url: 'https://code.visualstudio.com', descricao: 'Editor de código da Microsoft, gratuito e com base de código aberto, com milhares de extensões.' },
          { nome: '7-Zip', tag: 'Utilitário', gratis: true, url: 'https://www.7-zip.org', descricao: 'Compacta e descompacta arquivos (ZIP, RAR, 7z e outros).' },
          { nome: 'LocalSend', tag: 'Utilitário', gratis: true, url: 'https://localsend.org', descricao: 'Mande arquivos entre celular e computador pela rede de casa, sem cabo e sem internet.' },
          { nome: 'Joplin', tag: 'Notas', gratis: true, url: 'https://joplinapp.org', descricao: 'Anotações e listas em Markdown, com sincronização e criptografia.' },
          { nome: 'Zotero', tag: 'Estudos', gratis: true, url: 'https://www.zotero.org', descricao: 'Organiza referências e gera citações e bibliografias — salva vidas no TCC.' },
          { nome: 'Linux Mint', tag: 'Sistema', gratis: true, url: 'https://linuxmint.com', descricao: 'Sistema operacional Linux amigável para quem vem do Windows. Dá vida nova a computadores antigos.' },
          { nome: 'Ubuntu', tag: 'Sistema', gratis: true, url: 'https://ubuntu.com', descricao: 'Uma das distribuições Linux mais populares, para desktop e servidores.' },
        ],
      },
      {
        tipo: 'checklist',
        id: 'seguranca',
        aba: 'Segurança digital',
        icone: 'lock',
        titulo: 'Checklist de segurança digital',
        apoio: 'Proteja suas contas, seu celular e seu dinheiro contra os golpes mais comuns. O progresso fica salvo neste aparelho.',
        grupos: [
          {
            nome: 'Contas',
            itens: [
              'Ativar a verificação em duas etapas no e-mail principal',
              'Ativar a confirmação em duas etapas no WhatsApp (com PIN)',
              'Ativar dois fatores ou passkeys no banco, nas redes sociais e nas lojas',
              'Usar um gerenciador de senhas',
              'Ter uma senha diferente para cada serviço importante',
              'Verificar se meu e-mail apareceu em vazamentos (Have I Been Pwned)',
            ],
          },
          {
            nome: 'Celular e computador',
            itens: [
              'Bloqueio de tela com PIN forte ou biometria',
              'Atualizações automáticas ligadas (sistema e apps)',
              'Instalar apps só das lojas oficiais',
              'Ativar o “Encontre meu dispositivo” e anotar o IMEI',
              'Ter backup automático de fotos e contatos',
            ],
          },
          {
            nome: 'Golpes',
            itens: [
              'Nunca informar códigos recebidos por SMS ou WhatsApp a ninguém',
              'Desconfiar de urgência: “sua conta será bloqueada”, “pague agora”',
              'Confirmar por ligação qualquer pedido de dinheiro de parente ou amigo',
              'Não clicar em links de SMS e e-mail: acessar o site ou app oficial direto',
              'Lembrar que banco não pede senha nem manda motoboy buscar cartão',
            ],
          },
          {
            nome: 'Dinheiro e dados',
            itens: [
              'Ajustar os limites do Pix no app do banco, principalmente à noite',
              'Cadastrar chaves Pix só nos canais oficiais do banco',
              'Consultar o Registrato, do Banco Central, para ver contas e empréstimos no meu CPF',
              'Cadastrar meu número no “Não Me Perturbe” contra telemarketing',
              'Revisar quais apps têm acesso à localização, câmera e microfone',
            ],
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'aprender',
        aba: 'Aprenda de graça',
        icone: 'book',
        titulo: 'Aprenda de graça',
        apoio: 'Cursos gratuitos e de qualidade para programar, entender IA e dominar as ferramentas do dia a dia.',
        itens: [
          {
            titulo: 'Curso em Vídeo',
            tag: 'Programação · em português',
            texto:
              'Cursos completos e gratuitos do professor Gustavo Guanabara: Python, HTML e CSS, JavaScript, Git e algoritmos, pensados para quem está começando.',
            video: 'Curso em Vídeo Python aula 1 Gustavo Guanabara',
            link: 'https://www.cursoemvideo.com',
          },
          {
            titulo: 'CS50 (Harvard)',
            tag: 'Ciência da computação · inglês',
            texto:
              'A famosa introdução à computação de Harvard, com aulas gravadas, exercícios e certificado gratuito. Começa no Scratch e chega a C, Python, SQL e web.',
            video: 'CS50x Lecture 0 Scratch',
            link: 'https://cs50.harvard.edu/x/',
          },
          {
            titulo: 'freeCodeCamp',
            tag: 'Web e dados · inglês',
            texto: 'Currículo interativo e gratuito de desenvolvimento web, JavaScript, Python e dados, com projetos práticos e certificados.',
            link: 'https://www.freecodecamp.org',
          },
          {
            titulo: 'Khan Academy',
            tag: 'Fundamentos · em português',
            texto: 'Matemática, ciências e computação em português, com exercícios. Ótimo para reforçar a base antes de programar.',
            link: 'https://pt.khanacademy.org',
          },
          {
            titulo: 'Escola Virtual da Fundação Bradesco',
            tag: 'Informática e carreira · em português',
            texto: 'Cursos gratuitos com certificado: informática básica, planilhas, programação, empreendedorismo e mais.',
            link: 'https://www.ev.org.br',
          },
          {
            titulo: 'MDN Web Docs',
            tag: 'Referência · português e inglês',
            texto: 'A referência mais confiável de HTML, CSS e JavaScript, mantida pela Mozilla, com guias para iniciantes.',
            link: 'https://developer.mozilla.org/pt-BR/',
          },
          {
            titulo: 'Tutorial oficial do Python',
            tag: 'Python · em português',
            texto: 'O tutorial da própria documentação do Python, traduzido para o português pela comunidade.',
            link: 'https://docs.python.org/pt-br/3/tutorial/',
          },
          {
            titulo: 'The Odin Project',
            tag: 'Web completo · inglês',
            texto: 'Trilha gratuita e de código aberto para virar dev web, com projetos reais do começo ao fim.',
            link: 'https://www.theodinproject.com',
          },
          {
            titulo: 'Elements of AI',
            tag: 'Inteligência artificial',
            texto: 'Curso online gratuito, criado pela Universidade de Helsinque, que explica o que é IA e como ela funciona — sem precisar programar.',
            link: 'https://www.elementsofai.com',
          },
          {
            titulo: 'Microsoft Learn',
            tag: 'Nuvem e ferramentas',
            texto: 'Trilhas gratuitas de nuvem, dados, IA e ferramentas de escritório, com boa parte em português.',
            link: 'https://learn.microsoft.com/pt-br/training/',
          },
          {
            titulo: 'Scratch',
            tag: 'Primeiros passos',
            texto: 'Linguagem visual do MIT em que você programa encaixando blocos. Ideal para crianças — e para qualquer adulto que queira entender lógica.',
            link: 'https://scratch.mit.edu',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'dna-brasileiro',
        aba: 'DNA brasileiro',
        icone: 'flag',
        titulo: 'Tecnologia com DNA brasileiro',
        apoio: 'Invenções, linguagens e sistemas nascidos aqui que chegaram ao mundo.',
        itens: [
          {
            titulo: 'Linguagem Lua',
            tag: '1993 · PUC-Rio',
            texto:
              'Criada na PUC-Rio por Roberto Ierusalimschy, Luiz Henrique de Figueiredo e Waldemar Celes. Leve e fácil de embutir, é usada em games — o Roblox usa uma derivada dela, a Luau.',
            link: 'https://www.lua.org',
          },
          {
            titulo: 'Linguagem Elixir',
            tag: '2012 · José Valim',
            texto:
              'Linguagem funcional criada pelo brasileiro José Valim, que roda sobre a máquina virtual do Erlang e é usada em sistemas que precisam aguentar milhões de conexões.',
            link: 'https://elixir-lang.org',
          },
          {
            titulo: 'Urna eletrônica',
            tag: '1996 · Justiça Eleitoral',
            texto:
              'O Brasil começou a votar em urnas eletrônicas em 1996 e, desde 2000, as eleições são inteiramente eletrônicas — a apuração sai em poucas horas.',
            video: 'como funciona a urna eletrônica TSE',
          },
          {
            titulo: 'Pix',
            tag: '2020 · Banco Central',
            texto:
              'O pagamento instantâneo criado pelo Banco Central foi lançado em novembro de 2020, funciona 24 horas por dia e virou o meio de pagamento mais usado do país.',
            link: 'https://www.bcb.gov.br/estabilidadefinanceira/pix',
          },
          {
            titulo: 'TV digital e o Ginga',
            tag: '2007 · SBTVD',
            texto:
              'O padrão brasileiro de TV digital, baseado no japonês ISDB-T, estreou em 2007 e foi adotado por vários países da América Latina. Sua camada de interatividade, o Ginga, nasceu em universidades brasileiras (PUC-Rio e UFPB).',
          },
          {
            titulo: '14-Bis',
            tag: '1906 · Santos Dumont',
            texto:
              'Em 1906, em Paris, Alberto Santos Dumont voou com o 14-Bis diante do público e de uma comissão oficial, decolando por meios próprios — por isso, no Brasil, é chamado de pai da aviação.',
            video: '14-Bis Santos Dumont voo 1906',
          },
          {
            titulo: 'Landell de Moura',
            tag: 'c. 1900 · Rádio',
            texto:
              'O padre gaúcho Roberto Landell de Moura fez experimentos de transmissão de voz sem fio em São Paulo por volta de 1900 e patenteou seus inventos no Brasil e nos Estados Unidos.',
          },
          {
            titulo: 'Embraer',
            tag: '1969 · São José dos Campos',
            texto:
              'Nasceu como estatal ligada ao ITA e ao antigo CTA e virou uma das maiores fabricantes de aviões comerciais do mundo, líder em jatos regionais.',
            link: 'https://www.embraer.com',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  gastronomia: {
    titulo: 'Kit de Gastronomia',
    apoio: 'Receitas clássicas com modo cozinha e cronômetro, os pratos típicos de cada canto do país e o vocabulário das receitas.',
    blocos: [
      {
        tipo: 'receitas',
        id: 'receitas',
        aba: 'Receitas',
        titulo: 'Clássicos da cozinha brasileira',
        apoio: 'Escolha uma receita, marque os ingredientes que já separou e siga o passo a passo em letra grande — com cronômetro nos passos que pedem tempo.',
        receitas: [
          {
            id: 'pao-de-queijo',
            nome: 'Pão de queijo mineiro',
            regiao: 'Minas Gerais · Sudeste',
            tempo: '1 h',
            rende: '≈ 35 unidades',
            nivel: 'fácil',
            ingredientes: [
              '500 g de polvilho azedo (ou metade azedo, metade doce)',
              '1 xícara (240 ml) de leite',
              '½ xícara (120 ml) de óleo',
              '1 colher (chá) de sal',
              '2 ovos grandes',
              '200 g de queijo meia-cura (ou parmesão) ralado fino',
            ],
            passos: [
              { texto: 'Preaqueça o forno a 180 °C. Numa panela, leve o leite, o óleo e o sal ao fogo até ferver.' },
              { texto: 'Coloque o polvilho numa tigela grande e despeje o líquido fervente por cima, mexendo até virar uma massa grudenta, sem pó seco. Isso é escaldar o polvilho.' },
              { texto: 'Deixe a massa amornar até dar para mexer com as mãos sem se queimar.', minutos: 10 },
              { texto: 'Junte os ovos, um de cada vez, sovando bem até a massa ficar lisa e elástica.' },
              { texto: 'Acrescente o queijo e sove mais um pouco. Se estiver mole demais para enrolar, junte um pouco de polvilho; se estiver seca, um fio de leite.' },
              { texto: 'Unte as mãos com óleo e faça bolinhas de uns 3 cm. Arrume numa assadeira com espaço entre elas — elas crescem.' },
              { texto: 'Asse até crescerem e dourarem. Evite abrir o forno nos primeiros 15 minutos.', minutos: 30 },
              { texto: 'Sirva quente. Dica: dá para congelar as bolinhas cruas e assar direto do congelador, com alguns minutos a mais.' },
            ],
            video: 'pão de queijo mineiro receita tradicional polvilho escaldado',
          },
          {
            id: 'moqueca-baiana',
            nome: 'Moqueca baiana de peixe',
            regiao: 'Bahia · Nordeste',
            tempo: '1 h (com a marinada)',
            rende: '4 a 6 porções',
            nivel: 'médio',
            ingredientes: [
              '1 kg de peixe de carne firme em postas (robalo, badejo, cação ou pescada amarela)',
              'Suco de 1 limão',
              '3 dentes de alho amassados',
              'Sal a gosto',
              '1 cebola grande em rodelas',
              '2 tomates maduros em rodelas',
              '1 pimentão vermelho e 1 amarelo em rodelas',
              '1 maço de coentro picado',
              '200 ml de leite de coco',
              '3 colheres (sopa) de azeite de dendê',
              'Pimenta-de-cheiro ou malagueta a gosto',
            ],
            passos: [
              { texto: 'Tempere as postas com o limão, o alho e o sal e deixe marinar na geladeira.', minutos: 30 },
              { texto: 'Numa panela larga (de barro, se tiver), faça uma camada com metade da cebola, do tomate e dos pimentões.' },
              { texto: 'Arrume o peixe por cima e cubra com o resto dos legumes e metade do coentro. Junte a pimenta.' },
              { texto: 'Regue com o leite de coco e o dendê, tampe e leve ao fogo médio. Não mexa: se precisar, balance a panela pelas alças para não grudar.', minutos: 15 },
              { texto: 'Prove o caldo e acerte o sal. Desligue, espalhe o resto do coentro e deixe descansar tampado.', minutos: 5 },
              { texto: 'Sirva com arroz branco, farofa de dendê e pirão feito com um pouco do caldo e farinha de mandioca.' },
            ],
            video: 'moqueca baiana de peixe receita com dendê e leite de coco',
          },
          {
            id: 'feijao-tropeiro',
            nome: 'Feijão tropeiro',
            regiao: 'Minas Gerais · Sudeste',
            tempo: '45 min (com o feijão já cozido)',
            rende: '6 porções',
            nivel: 'fácil',
            ingredientes: [
              '500 g de feijão (carioca ou roxinho) cozido “al dente” e bem escorrido',
              '200 g de bacon em cubos',
              '250 g de linguiça calabresa em rodelas finas',
              '3 ovos',
              '1 cebola picada',
              '3 dentes de alho picados',
              '2 xícaras de farinha de mandioca',
              'Cheiro-verde (salsinha e cebolinha) picado',
              'Sal e pimenta-do-reino a gosto',
              'Couve em tiras finas e torresmo para acompanhar (opcional)',
            ],
            passos: [
              { texto: 'Numa panela larga, frite o bacon em fogo médio até dourar e soltar a gordura. Reserve o bacon.' },
              { texto: 'Na mesma gordura, frite a calabresa até dourar e reserve com o bacon.' },
              { texto: 'Quebre os ovos na panela e mexa rapidamente, só até firmarem. Reserve.' },
              { texto: 'Refogue a cebola até ficar transparente e junte o alho por mais 1 minuto.' },
              { texto: 'Acrescente o feijão escorrido e mexa com cuidado para não desmanchar. Volte as carnes e os ovos.' },
              { texto: 'Junte a farinha aos poucos, mexendo, até o tropeiro ficar úmido e soltinho. Acerte o sal e a pimenta.' },
              { texto: 'Finalize com o cheiro-verde e sirva com arroz, couve refogada e torresmo.' },
            ],
            video: 'feijão tropeiro mineiro receita',
          },
          {
            id: 'brigadeiro',
            nome: 'Brigadeiro de panela',
            regiao: 'Brasil inteiro',
            tempo: '1 h 30 (com o descanso)',
            rende: '≈ 25 docinhos',
            nivel: 'fácil',
            ingredientes: [
              '1 lata (395 g) de leite condensado',
              '1 colher (sopa) de manteiga, e mais um pouco para untar',
              '2 colheres (sopa) de cacau em pó (ou 4 de achocolatado)',
              'Chocolate granulado para enrolar',
            ],
            passos: [
              { texto: 'Coloque o leite condensado, a manteiga e o cacau numa panela de fundo grosso e misture antes de ligar o fogo.' },
              { texto: 'Cozinhe em fogo baixo, mexendo sem parar, até a massa engrossar e desgrudar do fundo quando você inclina a panela.', minutos: 12 },
              { texto: 'Passe para um prato untado com manteiga e deixe esfriar por completo (depois de amornar, pode ir à geladeira).', minutos: 60 },
              { texto: 'Unte as mãos com manteiga, enrole bolinhas, passe no granulado e coloque em forminhas.' },
              { texto: 'Para brigadeiro de colher, desligue o fogo alguns minutos antes, com a massa ainda cremosa.' },
            ],
            video: 'brigadeiro tradicional receita ponto de enrolar',
          },
          {
            id: 'escondidinho',
            nome: 'Escondidinho de carne-seca',
            regiao: 'Nordeste',
            tempo: '1 h 30 (+ dessalga na véspera)',
            rende: '6 porções',
            nivel: 'médio',
            ingredientes: [
              '500 g de carne-seca',
              '1 kg de mandioca (aipim, macaxeira) descascada',
              '2 colheres (sopa) de manteiga',
              '½ a 1 xícara de leite quente',
              '1 cebola picada',
              '2 dentes de alho picados',
              '1 tomate sem sementes picado',
              'Cheiro-verde picado',
              '150 g de queijo coalho ou muçarela ralado',
              'Sal a gosto (cuidado: a carne já é salgada)',
            ],
            passos: [
              { texto: 'Na véspera, corte a carne-seca em pedaços e deixe de molho em água na geladeira, trocando a água umas 4 vezes, para tirar o excesso de sal.' },
              { texto: 'Cozinhe a carne em água limpa na panela de pressão até ficar macia (conte o tempo depois que pegar pressão).', minutos: 35 },
              { texto: 'Enquanto isso, cozinhe a mandioca em água até ficar bem macia. Tire a fibra do meio.', minutos: 25 },
              { texto: 'Escorra e amasse a mandioca ainda quente com a manteiga, juntando leite até virar um purê liso. Acerte o sal.' },
              { texto: 'Desfie a carne. Refogue a cebola e o alho, junte o tomate e a carne e deixe pegar gosto. Finalize com cheiro-verde.' },
              { texto: 'Preaqueça o forno a 200 °C. Num refratário, espalhe metade do purê, depois a carne, e cubra com o resto do purê.' },
              { texto: 'Cubra com o queijo e leve ao forno para gratinar.', minutos: 20 },
            ],
            video: 'escondidinho de carne seca com mandioca receita',
          },
          {
            id: 'baiao-de-dois',
            nome: 'Baião de dois',
            regiao: 'Ceará · Nordeste',
            tempo: '1 h',
            rende: '6 porções',
            nivel: 'médio',
            ingredientes: [
              '2 xícaras de feijão-de-corda (ou feijão verde)',
              '2 xícaras de arroz branco',
              '200 g de bacon em cubos',
              '250 g de carne de sol dessalgada em cubos (ou linguiça)',
              '1 cebola picada',
              '3 dentes de alho picados',
              '½ pimentão picado',
              '200 g de queijo coalho em cubos',
              '2 colheres (sopa) de manteiga de garrafa',
              'Coentro e cebolinha picados',
              'Sal a gosto',
            ],
            passos: [
              { texto: 'Cozinhe o feijão-de-corda em água sem sal até ficar macio mas inteiro (ele não precisa ficar de molho). Escorra e guarde o caldo.', minutos: 25 },
              { texto: 'Numa panela grande, frite o bacon e a carne de sol até dourarem.' },
              { texto: 'Junte a cebola, o alho e o pimentão e refogue até murchar.' },
              { texto: 'Acrescente o arroz e refogue por 2 minutos. Junte o feijão e 4 xícaras de líquido (o caldo do feijão completado com água quente). Acerte o sal.' },
              { texto: 'Tampe e cozinhe em fogo baixo até o arroz secar e ficar macio.', minutos: 20 },
              { texto: 'Desligue e misture o queijo coalho, a manteiga de garrafa, o coentro e a cebolinha. Tampe para o queijo amolecer e sirva.', minutos: 5 },
            ],
            video: 'baião de dois cearense receita com feijão de corda',
          },
          {
            id: 'bolo-de-cenoura',
            nome: 'Bolo de cenoura com cobertura de chocolate',
            regiao: 'Brasil inteiro',
            tempo: '1 h',
            rende: '12 fatias',
            nivel: 'fácil',
            ingredientes: [
              'Massa: 3 cenouras médias (≈ 300 g) em pedaços',
              'Massa: 3 ovos',
              'Massa: 1 xícara (240 ml) de óleo',
              'Massa: 2 xícaras de açúcar',
              'Massa: 2 ½ xícaras de farinha de trigo',
              'Massa: 1 colher (sopa) de fermento químico em pó',
              'Cobertura: 1 colher (sopa) de manteiga',
              'Cobertura: 3 colheres (sopa) de chocolate ou cacau em pó',
              'Cobertura: 1 xícara de açúcar',
              'Cobertura: ½ xícara de leite',
            ],
            passos: [
              { texto: 'Preaqueça o forno a 180 °C e unte e enfarinhe uma forma retangular (≈ 20 × 30 cm) ou de furo central.' },
              { texto: 'Bata no liquidificador a cenoura, os ovos e o óleo até ficar bem liso.' },
              { texto: 'Numa tigela, misture o açúcar e a farinha, despeje o creme de cenoura e mexa até ficar homogêneo. Por último, incorpore o fermento com delicadeza.' },
              { texto: 'Despeje na forma e asse até crescer, dourar e o palito sair limpo.', minutos: 40 },
              { texto: 'Cobertura: numa panela, junte a manteiga, o chocolate, o açúcar e o leite. Leve ao fogo médio, mexendo, até ferver e engrossar levemente.', minutos: 5 },
              { texto: 'Fure o bolo com um garfo e despeje a cobertura ainda quente por cima.' },
            ],
            video: 'bolo de cenoura com cobertura de chocolate receita fofinho',
          },
          {
            id: 'tapioca',
            nome: 'Tapioca',
            regiao: 'Nordeste · herança indígena',
            tempo: '15 min',
            rende: '4 tapiocas',
            nivel: 'fácil',
            ingredientes: [
              '2 xícaras de goma de tapioca já hidratada (a vendida pronta)',
              'Ou, para hidratar em casa: 500 g de polvilho doce, cerca de 1 xícara de água e 1 pitada de sal',
              'Recheio salgado: queijo coalho ralado, manteiga, tomate, carne de sol desfiada',
              'Recheio doce: coco ralado com leite condensado, ou banana com canela',
            ],
            passos: [
              { texto: 'Para hidratar em casa: misture o polvilho e o sal e vá pingando a água, esfarelando com as mãos, até a massa ficar úmida mas se soltando em flocos. Deixe descansar.', minutos: 10 },
              { texto: 'Passe a goma por uma peneira, esfregando, até virar uma farinha fina e fofa. Sem peneirar, a tapioca fica dura.' },
              { texto: 'Aqueça uma frigideira antiaderente em fogo médio, sem óleo.' },
              { texto: 'Espalhe 3 a 4 colheres (sopa) de goma formando um disco fino e uniforme, apertando de leve com as costas da colher.' },
              { texto: 'Quando os grãos se unirem e a borda soltar, coloque o recheio numa metade.', minutos: 1 },
              { texto: 'Dobre ao meio, espere mais alguns segundos para aquecer o recheio e sirva na hora.' },
            ],
            video: 'como fazer tapioca na frigideira goma hidratada',
          },
          {
            id: 'cuscuz',
            nome: 'Cuscuz nordestino',
            regiao: 'Nordeste',
            tempo: '25 min',
            rende: '4 porções',
            nivel: 'fácil',
            ingredientes: [
              '2 xícaras de flocão de milho',
              'Cerca de 1 xícara de água',
              '½ colher (chá) de sal',
              'Manteiga (ou manteiga de garrafa) para servir',
              'Para acompanhar: ovo, queijo coalho, carne de sol ou leite',
            ],
            passos: [
              { texto: 'Numa tigela, misture o flocão e o sal. Vá juntando a água aos poucos, mexendo com as mãos, até todo o milho ficar úmido, sem empapar.' },
              { texto: 'Deixe hidratar.', minutos: 10 },
              { texto: 'Coloque água na parte de baixo da cuscuzeira, sem chegar ao disco furado, e leve ao fogo.' },
              { texto: 'Solte o flocão com um garfo e coloque na cuscuzeira sem apertar. Tampe e cozinhe no vapor até ficar macio e perfumado.', minutos: 12 },
              { texto: 'Desenforme, coloque manteiga por cima e sirva com ovo, queijo coalho ou carne de sol.' },
            ],
            video: 'cuscuz nordestino na cuscuzeira flocão receita',
          },
          {
            id: 'farofa',
            nome: 'Farofa de bacon e ovos',
            regiao: 'Brasil inteiro',
            tempo: '20 min',
            rende: '6 porções',
            nivel: 'fácil',
            ingredientes: [
              '2 xícaras de farinha de mandioca (crua ou torrada)',
              '3 colheres (sopa) de manteiga',
              '150 g de bacon em cubinhos',
              '1 cebola picada',
              '2 dentes de alho picados',
              '2 ovos',
              'Cheiro-verde picado',
              'Sal a gosto',
            ],
            passos: [
              { texto: 'Numa frigideira grande, frite o bacon até ficar crocante.' },
              { texto: 'Junte a manteiga e a cebola e refogue até dourar levemente. Acrescente o alho por mais 1 minuto.' },
              { texto: 'Quebre os ovos na frigideira e mexa até cozinharem, em pedacinhos.' },
              { texto: 'Abaixe o fogo e junte a farinha aos poucos, mexendo sempre, até ficar dourada e cheirosa.', minutos: 6 },
              { texto: 'Acerte o sal, desligue e misture o cheiro-verde.' },
            ],
            video: 'farofa de bacon com ovos receita',
          },
          {
            id: 'arroz-carreteiro',
            nome: 'Arroz carreteiro',
            regiao: 'Rio Grande do Sul · Sul',
            tempo: '1 h (+ dessalga)',
            rende: '6 porções',
            nivel: 'fácil',
            ingredientes: [
              '500 g de charque (ou sobras de churrasco) em cubos',
              '2 xícaras de arroz',
              '1 cebola picada',
              '3 dentes de alho picados',
              '1 tomate picado (opcional)',
              '2 colheres (sopa) de óleo',
              'Cerca de 4 xícaras de água fervente',
              'Cheiro-verde picado',
            ],
            passos: [
              { texto: 'Dessalgue o charque: deixe de molho em água por algumas horas (ou de um dia para o outro, na geladeira), trocando a água várias vezes. Com sobras de churrasco, pule esta etapa.' },
              { texto: 'Afervente o charque em água limpa, descarte a água e escorra.', minutos: 10 },
              { texto: 'Numa panela, frite o charque no óleo até dourar bem.' },
              { texto: 'Junte a cebola e o alho e refogue. Acrescente o tomate, se for usar.' },
              { texto: 'Junte o arroz e refogue por 2 minutos. Cubra com a água fervente, prove o sal (o charque já salga) e tampe.' },
              { texto: 'Cozinhe em fogo baixo até o arroz secar.', minutos: 20 },
              { texto: 'Finalize com cheiro-verde e sirva com salada verde.' },
            ],
            video: 'arroz carreteiro gaúcho com charque receita',
          },
          {
            id: 'pudim',
            nome: 'Pudim de leite condensado',
            regiao: 'Brasil inteiro',
            tempo: '2 h (+ 4 h de geladeira)',
            rende: '10 fatias',
            nivel: 'médio',
            ingredientes: [
              'Calda: 1 xícara de açúcar',
              'Pudim: 1 lata (395 g) de leite condensado',
              'Pudim: 2 medidas (da lata) de leite',
              'Pudim: 3 ovos',
            ],
            passos: [
              { texto: 'Calda: derreta o açúcar em fogo médio, direto na forma de pudim (com furo central) ou numa panela, até virar um caramelo dourado. Cuidado, caramelo queima. Espalhe pelo fundo e pelas laterais da forma.' },
              { texto: 'Preaqueça o forno a 180 °C. Bata no liquidificador o leite condensado, o leite e os ovos.' },
              { texto: 'Despeje sobre a calda, cubra a forma com papel-alumínio e coloque-a dentro de uma assadeira maior com água quente (banho-maria).' },
              { texto: 'Asse até firmar: ao balançar a forma, o centro deve tremer pouco, como gelatina.', minutos: 90 },
              { texto: 'Deixe esfriar e leve à geladeira por pelo menos 4 horas.' },
              { texto: 'Para desenformar, passe uma faca rente às bordas, aqueça o fundo da forma rapidamente no fogo e vire sobre um prato com borda.' },
            ],
            video: 'pudim de leite condensado receita tradicional banho maria',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'regioes',
        aba: 'Pratos por região',
        icone: 'mapPin',
        titulo: 'Pratos típicos por região',
        apoio: 'Uma volta pelo Brasil à mesa, do tucupi paraense ao barreado paranaense.',
        itens: [
          {
            titulo: 'Pato no tucupi',
            tag: 'Pará · Norte',
            texto:
              'Pato assado e depois cozido no tucupi, servido com jambu e arroz. É o prato do almoço do Círio de Nazaré, em Belém.',
            video: 'pato no tucupi paraense receita',
          },
          {
            titulo: 'Tacacá',
            tag: 'Amazônia · Norte',
            texto:
              'Caldo quente de tucupi com goma de tapioca, jambu e camarão seco, servido na cuia e tomado no fim da tarde nas bancas de Belém e Manaus.',
            video: 'tacacá Belém como é feito',
          },
          {
            titulo: 'Maniçoba',
            tag: 'Pará · Norte',
            texto:
              'A “feijoada paraense”: folhas de mandioca-brava moídas e cozidas por cerca de uma semana — para eliminar a toxicidade — com carnes de porco.',
            video: 'maniçoba paraense como é feita',
          },
          {
            titulo: 'Acarajé',
            tag: 'Bahia · Nordeste',
            texto:
              'Bolinho de feijão-fradinho frito no dendê, recheado com vatapá, caruru, camarão seco e salada. O ofício das baianas de acarajé é patrimônio imaterial registrado pelo IPHAN.',
            video: 'acarajé baiana de acarajé Salvador como é feito',
          },
          {
            titulo: 'Carne de sol com macaxeira',
            tag: 'Sertão · Nordeste',
            texto:
              'Carne levemente salgada e seca ao ar, grelhada e servida com macaxeira, queijo coalho e manteiga de garrafa.',
            video: 'carne de sol com macaxeira e manteiga de garrafa',
          },
          {
            titulo: 'Bolo de rolo',
            tag: 'Pernambuco · Nordeste',
            texto:
              'Camadas finíssimas de massa amanteigada enroladas com goiabada. É reconhecido por lei como patrimônio cultural e imaterial de Pernambuco.',
            video: 'bolo de rolo pernambucano como fazer',
          },
          {
            titulo: 'Arroz com pequi',
            tag: 'Goiás · Centro-Oeste',
            texto:
              'Arroz refogado com pequi, fruto do Cerrado de cor amarela e cheiro forte. Atenção: o caroço tem espinhos por dentro — roa a polpa com cuidado, nunca morda.',
            video: 'arroz com pequi goiano receita',
          },
          {
            titulo: 'Sopa paraguaia',
            tag: 'Mato Grosso do Sul · Centro-Oeste',
            texto:
              'Apesar do nome, é uma torta salgada de milho, queijo e cebola, herança da fronteira com o Paraguai.',
            video: 'sopa paraguaia receita Mato Grosso do Sul',
          },
          {
            titulo: 'Feijoada',
            tag: 'Rio de Janeiro · Sudeste',
            texto:
              'Feijão-preto com carnes de porco salgadas e defumadas, servido com arroz, couve, farofa e laranja. A história de que nasceu nas senzalas é contestada por historiadores: ela tem parentesco com cozidos europeus, como o português.',
            video: 'feijoada completa receita tradicional',
          },
          {
            titulo: 'Moqueca capixaba',
            tag: 'Espírito Santo · Sudeste',
            texto:
              'Sem dendê e sem leite de coco: peixe, tomate, coentro, azeite e urucum, na panela de barro das paneleiras de Goiabeiras, ofício registrado como patrimônio pelo IPHAN. “Moqueca é capixaba, o resto é peixada”, dizem por lá.',
            video: 'moqueca capixaba panela de barro receita',
          },
          {
            titulo: 'Virado à paulista',
            tag: 'São Paulo · Sudeste',
            texto:
              'Tutu de feijão com farinha, bisteca de porco, couve, ovo frito, banana empanada e torresmo. É o prato tradicional das segundas-feiras nos restaurantes paulistanos.',
            video: 'virado à paulista receita',
          },
          {
            titulo: 'Barreado',
            tag: 'Litoral do Paraná · Sul',
            texto:
              'Carne cozida por horas em panela de barro “barreada”, vedada com uma massa de farinha e água. Servido com farinha de mandioca e banana em Morretes, Antonina e Paranaguá.',
            video: 'barreado paranaense Morretes como é feito',
          },
          {
            titulo: 'Churrasco gaúcho',
            tag: 'Rio Grande do Sul · Sul',
            texto:
              'Carne no espeto, fogo de chão ou churrasqueira e sal grosso — e só. A costela assada por horas é a estrela, e o chimarrão circula na roda.',
            video: 'churrasco gaúcho costela fogo de chão',
          },
          {
            titulo: 'Cuca',
            tag: 'Santa Catarina e RS · Sul',
            texto:
              'Bolo fofo coberto de farofa doce, com frutas como banana e uva — herança da imigração alemã no Sul.',
            video: 'cuca alemã com farofa receita',
          },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário de cozinha',
        apoio: 'Técnicas, medidas e ingredientes brasileiros explicados — para nenhuma receita te pegar de surpresa.',
        termos: [
          { termo: 'Al dente', definicao: 'Cozido, mas ainda firme ao morder. Vale para massas, arroz e legumes.' },
          { termo: 'Banho-maria', definicao: 'Cozinhar ou aquecer um recipiente dentro de outro com água quente, para um calor suave e uniforme — como no pudim.' },
          { termo: 'Branquear', definicao: 'Mergulhar rapidamente em água fervente e logo depois em água com gelo. Fixa a cor e interrompe o cozimento dos legumes.' },
          { termo: 'Caramelizar', definicao: 'Aquecer o açúcar (ou alimentos com açúcar natural, como a cebola) até dourar e ganhar sabor tostado.' },
          { termo: 'Deglaçar', definicao: 'Jogar um líquido (vinho, caldo, água) na panela quente para soltar o tostadinho do fundo, que vira sabor no molho.' },
          { termo: 'Emulsão', definicao: 'Mistura estável de dois líquidos que normalmente não se misturam, como óleo e água. A maionese é uma emulsão.' },
          { termo: 'Escaldar', definicao: 'Despejar líquido fervente sobre um ingrediente. No pão de queijo, é o que cozinha o polvilho e dá a textura elástica.' },
          { termo: 'Flambar', definicao: 'Pôr fogo numa bebida alcoólica adicionada à panela para evaporar o álcool e deixar o aroma.' },
          { termo: 'Gratinar', definicao: 'Levar ao forno ou ao grill até formar uma crosta dourada por cima, geralmente com queijo.' },
          { termo: 'Julienne', definicao: 'Corte em tiras finas e compridas, como palitos.' },
          { termo: 'Brunoise', definicao: 'Corte em cubinhos bem pequenos, de 2 a 3 mm.' },
          { termo: 'Marinar', definicao: 'Deixar o alimento descansando num tempero líquido (ácido, óleo, ervas) para ganhar sabor.' },
          { termo: 'Mise en place', definicao: '“Tudo no lugar”: separar, medir e cortar todos os ingredientes antes de começar a cozinhar.' },
          { termo: 'Ponto de fio', definicao: 'Ponto da calda de açúcar em que, ao levantar a colher, escorre um fio fino. Usado em doces.' },
          { termo: 'Refogar', definicao: 'Cozinhar rapidamente em pouca gordura, mexendo — o começo do arroz, do feijão e de quase todo prato brasileiro.' },
          { termo: 'Reduzir', definicao: 'Ferver um líquido sem tampa para evaporar a água e concentrar o sabor.' },
          { termo: 'Roux', definicao: 'Farinha e manteiga cozidas juntas; a base para engrossar molhos como o bechamel.' },
          { termo: 'Selar', definicao: 'Dourar a superfície da carne em fogo alto, formando uma crosta cheia de sabor.' },
          { termo: 'Sovar', definicao: 'Trabalhar a massa com as mãos, dobrando e apertando, para desenvolver o glúten (no pão) ou deixá-la lisa.' },
          { termo: 'Descansar', definicao: 'Deixar a carne ou a massa paradas depois do preparo. Na carne, os sucos se redistribuem; na massa, o glúten relaxa.' },
          { termo: 'Preaquecer', definicao: 'Ligar o forno antes, até chegar à temperatura pedida — de 10 a 15 minutos, em média.' },
          { termo: 'Untar e enfarinhar', definicao: 'Passar gordura na forma e polvilhar farinha por cima, para o bolo desenformar sem grudar.' },
          { termo: 'Fundo', definicao: 'Caldo caseiro de ossos, legumes e ervas, cozido longamente; base de molhos e sopas.' },
          { termo: 'Medidas caseiras', definicao: '1 xícara = 240 ml; 1 colher (sopa) = 15 ml; 1 colher (chá) = 5 ml.' },
          { termo: 'Pitada', definicao: 'A quantidade que cabe entre as pontas do polegar e do indicador.' },
          { termo: 'Vinagrete', definicao: 'Molho de tomate, cebola e pimentão picados com vinagre, óleo e sal. Companheiro do churrasco.' },
          { termo: 'Tucupi', definicao: 'Caldo amarelo extraído da mandioca-brava, fermentado e fervido por horas para eliminar a toxicidade. Base do pato no tucupi e do tacacá.' },
          { termo: 'Jambu', definicao: 'Erva amazônica que deixa a boca levemente dormente e formigando.' },
          { termo: 'Azeite de dendê', definicao: 'Óleo alaranjado do fruto da palmeira-de-dendê, de origem africana. Alma da cozinha baiana: moqueca, acarajé, vatapá.' },
          { termo: 'Polvilho doce e azedo', definicao: 'Os dois são fécula de mandioca. O azedo passa por fermentação natural e deixa o pão de queijo mais crescido e aerado.' },
          { termo: 'Goma de tapioca', definicao: 'Fécula de mandioca hidratada, pronta para virar tapioca na frigideira.' },
          { termo: 'Farinha d’água', definicao: 'Farinha de mandioca amarelada e granulosa, fermentada na água, típica do Pará e do Maranhão.' },
          { termo: 'Manteiga de garrafa', definicao: 'Manteiga clarificada, líquida em temperatura ambiente, típica do sertão nordestino.' },
          { termo: 'Queijo coalho', definicao: 'Queijo nordestino firme que não derrete ao ser assado — o do espetinho na praia.' },
          { termo: 'Carne de sol, charque e carne-seca', definicao: 'Carne de sol: pouco sal e secagem curta em local ventilado; fica úmida e macia. Charque: muito sal, prensado e seco ao sol, dura meses. Carne-seca: nome usado para o charque em boa parte do país (e para versões industrializadas). Charque e carne-seca pedem dessalga.' },
        ],
      },
      {
        tipo: 'checklist',
        id: 'despensa',
        aba: 'Despensa básica',
        titulo: 'Primeira cozinha: o básico',
        apoio: 'O que ter em casa para cozinhar a maior parte das receitas brasileiras. Marque o que você já tem.',
        grupos: [
          { nome: 'Grãos e farinhas', itens: ['Arroz', 'Feijão (carioca e preto)', 'Farinha de mandioca', 'Farinha de trigo', 'Flocão ou fubá de milho', 'Polvilho (doce ou azedo)'] },
          { nome: 'Temperos', itens: ['Sal', 'Alho e cebola', 'Pimenta-do-reino', 'Colorau (urucum)', 'Louro', 'Cominho', 'Orégano', 'Cheiro-verde (fresco ou congelado)'] },
          { nome: 'Gorduras e líquidos', itens: ['Óleo', 'Azeite', 'Manteiga', 'Vinagre', 'Leite'] },
          { nome: 'Coringas', itens: ['Ovos', 'Leite condensado', 'Extrato ou molho de tomate', 'Achocolatado ou cacau em pó', 'Fermento químico em pó'] },
          {
            nome: 'Utensílios',
            itens: ['Uma faca de chef bem afiada', 'Tábua de corte', 'Panela de pressão', 'Frigideira antiaderente', 'Peneira', 'Assadeira e forma de bolo', 'Xícara e colheres medidoras'],
          },
        ],
      },
    ],
  },

  // ===========================================================================
  musica: {
    titulo: 'Kit de Música',
    apoio: 'Os discos essenciais da música brasileira para ouvir aqui mesmo, os gêneros do país explicados, acervos gratuitos e o vocabulário da roda.',
    blocos: [
      {
        tipo: 'guia',
        id: 'discos',
        aba: 'Discos essenciais',
        icone: 'headphones',
        titulo: 'Discos essenciais da música brasileira',
        apoio: 'Uma discoteca básica, da bossa nova ao rap. Toque em “Assistir aqui” para ouvir uma faixa marcante de cada um.',
        itens: [
          {
            titulo: 'Chega de Saudade — João Gilberto',
            tag: '1959 · Bossa nova',
            texto:
              'O disco que inaugurou a bossa nova: a batida de violão de João Gilberto e as canções de Tom Jobim e Vinicius de Moraes mudaram a música brasileira.',
            video: 'João Gilberto Chega de Saudade',
          },
          {
            titulo: 'Samba Esquema Novo — Jorge Ben',
            tag: '1963 · Samba-rock',
            texto: 'A estreia de Jorge Ben, com “Mas Que Nada” e um violão que misturava samba, rock e soul.',
            video: 'Jorge Ben Mas Que Nada 1963',
          },
          {
            titulo: 'Getz/Gilberto',
            tag: '1964 · Bossa nova',
            texto:
              'Stan Getz, João Gilberto e Tom Jobim, com “Garota de Ipanema” na voz de Astrud Gilberto. Levou a bossa nova ao mundo e ganhou o Grammy de álbum do ano.',
            video: 'The Girl from Ipanema Getz Gilberto Astrud',
          },
          {
            titulo: 'Tropicália ou Panis et Circencis',
            tag: '1968 · Tropicália',
            texto:
              'O disco-manifesto de Caetano Veloso, Gilberto Gil, Gal Costa, Os Mutantes, Tom Zé e Nara Leão, com arranjos de Rogério Duprat.',
            video: 'Tropicália ou Panis et Circencis Miserere Nobis',
          },
          {
            titulo: 'Os Mutantes',
            tag: '1968 · Rock psicodélico',
            texto:
              'Rita Lee, Arnaldo Baptista e Sérgio Dias misturaram psicodelia, humor e brasilidade. São cultuados até hoje por músicos do mundo todo.',
            video: 'Os Mutantes Panis et Circenses',
          },
          {
            titulo: 'Construção — Chico Buarque',
            tag: '1971 · MPB',
            texto:
              'A faixa-título, com versos que terminam sempre em palavras proparoxítonas, é uma das canções mais estudadas do Brasil.',
            video: 'Chico Buarque Construção',
          },
          {
            titulo: 'Acabou Chorare — Novos Baianos',
            tag: '1972 · MPB',
            texto:
              'Samba, choro e rock com o violão de Moraes Moreira e a guitarra de Pepeu Gomes. Em 2007, a Rolling Stone Brasil o elegeu o maior disco brasileiro de todos os tempos.',
            video: 'Novos Baianos Preta Pretinha',
          },
          {
            titulo: 'Clube da Esquina — Milton Nascimento e Lô Borges',
            tag: '1972 · MPB',
            texto:
              'A turma de Belo Horizonte uniu Beatles, jazz, música mineira e sacra num disco duplo que atravessou gerações.',
            video: 'Clube da Esquina Tudo o que você podia ser Milton Nascimento',
          },
          {
            titulo: 'Secos & Molhados',
            tag: '1973 · Rock',
            texto:
              'Ney Matogrosso e a banda de João Ricardo musicaram poetas, pintaram o rosto e desafiaram a ditadura com androginia e teatralidade.',
            video: 'Secos e Molhados Sangue Latino',
          },
          {
            titulo: 'Elis & Tom',
            tag: '1974 · MPB',
            texto: 'Elis Regina e Tom Jobim num disco sublime, com a gravação mais célebre de “Águas de Março”.',
            video: 'Elis e Tom Águas de Março',
          },
          {
            titulo: 'A Tábua de Esmeralda — Jorge Ben',
            tag: '1974 · Samba-rock',
            texto: 'Alquimia, samba e soul: é considerado a obra-prima de Jorge Ben.',
            video: 'Jorge Ben Os Alquimistas Estão Chegando',
          },
          {
            titulo: 'Cartola',
            tag: '1974 e 1976 · Samba',
            texto:
              'O mestre da Mangueira só estreou em disco já veterano, em 1974. O segundo álbum, de 1976, traz “As Rosas Não Falam” e “O Mundo É um Moinho”.',
            video: 'Cartola As Rosas Não Falam',
          },
          {
            titulo: 'Alucinação — Belchior',
            tag: '1976 · MPB',
            texto:
              'Com “Como Nossos Pais” e “Apenas um Rapaz Latino-Americano”, o cearense fez uma crônica afiada da juventude sob a ditadura.',
            video: 'Belchior Apenas um Rapaz Latino Americano',
          },
          {
            titulo: 'Da Lama ao Caos — Chico Science & Nação Zumbi',
            tag: '1994 · Manguebeat',
            texto: 'Maracatu, rock, hip-hop e funk juntos: o disco que pôs o Recife no mapa da música mundial.',
            video: 'Chico Science Nação Zumbi A Cidade',
          },
          {
            titulo: 'Sobrevivendo no Inferno — Racionais MC’s',
            tag: '1997 · Rap',
            texto:
              'Retrato contundente da periferia de São Paulo. Em 2018, virou leitura obrigatória no vestibular da Unicamp.',
            video: 'Racionais MCs Diário de um Detento',
          },
          {
            titulo: 'A Mulher do Fim do Mundo — Elza Soares',
            tag: '2015 · Samba sujo',
            texto:
              'Elza se reinventou com a vanguarda paulistana num disco sobre violência, corpo e resistência. Venceu o Grammy Latino de melhor álbum de MPB.',
            video: 'Elza Soares A Mulher do Fim do Mundo',
          },
          {
            titulo: 'AmarElo — Emicida',
            tag: '2019 · Rap',
            texto: 'Rap, samba e gospel num disco sobre afeto e saúde mental, que ganhou um documentário na Netflix.',
            video: 'Emicida AmarElo Majur Pabllo Vittar',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'generos',
        aba: 'Gêneros do Brasil',
        icone: 'music',
        titulo: 'Gêneros brasileiros',
        apoio: 'De onde vem cada som do país — e uma faixa para ouvir aqui mesmo.',
        itens: [
          {
            titulo: 'Samba',
            tag: 'Rio de Janeiro · 1910s',
            texto:
              'Nasceu nas rodas das casas das “tias” baianas no Rio, como a Tia Ciata. “Pelo Telefone”, registrado em 1916, é tido como o primeiro samba gravado. O samba de roda do Recôncavo Baiano é Patrimônio da Humanidade pela UNESCO.',
            video: 'Pelo Telefone Donga samba',
          },
          {
            titulo: 'Choro',
            tag: 'Rio de Janeiro · fim do séc. XIX',
            texto:
              'Virtuosismo de flauta, cavaquinho, violão de 7 cordas e pandeiro. Pixinguinha, Jacob do Bandolim e Waldir Azevedo são grandes nomes. O Dia Nacional do Choro, 23 de abril, é o aniversário de Pixinguinha.',
            video: 'Pixinguinha Carinhoso',
          },
          {
            titulo: 'Bossa nova',
            tag: 'Rio de Janeiro · fim dos anos 1950',
            texto: 'Samba desacelerado, harmonias do jazz e voz quase falada: João Gilberto, Tom Jobim, Vinicius de Moraes, Nara Leão.',
            video: 'Tom Jobim Garota de Ipanema',
          },
          {
            titulo: 'MPB',
            tag: 'Anos 1960',
            texto:
              'A sigla ganhou força nos festivais da canção da TV e reúne Chico Buarque, Elis Regina, Milton Nascimento, Caetano, Gil, Gal e muitos outros.',
            video: 'Elis Regina Como Nossos Pais',
          },
          {
            titulo: 'Tropicália',
            tag: '1967–1968',
            texto:
              'Guitarra elétrica, cultura pop, poesia concreta e crítica à ditadura, com inspiração na antropofagia de Oswald de Andrade.',
            video: 'Caetano Veloso Alegria Alegria festival 1967',
          },
          {
            titulo: 'Forró',
            tag: 'Nordeste',
            texto:
              'Guarda-chuva para baião, xote, xaxado e arrasta-pé, com sanfona, zabumba e triângulo. Luiz Gonzaga levou o som do sertão ao país inteiro. O nome vem de “forrobodó” — não do inglês “for all”, que é lenda.',
            video: 'Luiz Gonzaga Asa Branca',
          },
          {
            titulo: 'Frevo',
            tag: 'Recife',
            texto:
              'Metais acelerados e passos acrobáticos com a sombrinha colorida, nascido no carnaval do Recife no fim do século XIX. Patrimônio Imaterial da Humanidade pela UNESCO.',
            video: 'frevo Vassourinhas carnaval Recife',
          },
          {
            titulo: 'Maracatu',
            tag: 'Pernambuco',
            texto:
              'O maracatu nação, de baque virado, é um cortejo com rei, rainha e tambores (as alfaias); o maracatu rural, de baque solto, tem os caboclos de lança.',
            video: 'maracatu nação baque virado Recife',
          },
          {
            titulo: 'Samba-reggae e axé',
            tag: 'Salvador · anos 1980',
            texto:
              'O samba-reggae dos blocos afro, como Olodum e Ilê Aiyê, e o axé dos trios elétricos, de Luiz Caldas a Daniela Mercury e Ivete Sangalo.',
            video: 'Olodum samba reggae Pelourinho',
          },
          {
            titulo: 'Manguebeat',
            tag: 'Recife · anos 1990',
            texto:
              'Maracatu com guitarra distorcida, hip-hop e funk. O manifesto “Caranguejos com Cérebro” (1992) e Chico Science & Nação Zumbi são o marco.',
            video: 'Chico Science Maracatu Atômico',
          },
          {
            titulo: 'Sertanejo',
            tag: 'Interior do Brasil',
            texto:
              'Da música caipira de viola, de duplas como Tonico & Tinoco, ao sertanejo romântico dos anos 1990 e ao universitário. Há anos está entre os gêneros mais ouvidos do país.',
            video: 'Tonico e Tinoco Tristeza do Jeca',
          },
          {
            titulo: 'Pagode',
            tag: 'Rio de Janeiro · anos 1970–80',
            texto:
              'Samba de quintal com banjo, tantã e repique de mão, que surgiu nas rodas do Cacique de Ramos e do Fundo de Quintal.',
            video: 'Fundo de Quintal ao vivo pagode',
          },
          {
            titulo: 'Funk carioca',
            tag: 'Rio de Janeiro · anos 1980–90',
            texto:
              'Nasceu nos bailes a partir do Miami bass e ganhou batida própria, o tamborzão. Do funk melody às produções de hoje, toca no mundo inteiro.',
            video: 'Cidinho e Doca Rap da Felicidade',
          },
          {
            titulo: 'Rap nacional',
            tag: 'São Paulo · anos 1980–90',
            texto:
              'Dos encontros na estação São Bento do metrô aos Racionais MC’s, Sabotage, Emicida e Criolo: a crônica da periferia em rima.',
            video: 'Sabotage Um Bom Lugar',
          },
          {
            titulo: 'Carimbó',
            tag: 'Pará',
            texto:
              'Raízes indígenas e africanas, tambores de tronco (os curimbós) e saias rodadas. É patrimônio cultural do Brasil, registrado pelo IPHAN.',
            video: 'Pinduca carimbó',
          },
          {
            titulo: 'Tecnobrega',
            tag: 'Belém',
            texto:
              'Nasceu nas aparelhagens de Belém, com batida eletrônica, produção independente e venda direta nas festas e nas ruas.',
            video: 'Gaby Amarantos Xirley',
          },
        ],
      },
      {
        tipo: 'recursos',
        id: 'acervos',
        aba: 'Acervos grátis',
        icone: 'library',
        titulo: 'Acervos e rádios gratuitos',
        apoio: 'Para ouvir, pesquisar e tocar música brasileira de graça.',
        itens: [
          { nome: 'Rádio Batuta', tag: 'Rádio online', gratis: true, url: 'https://radiobatuta.com.br', descricao: 'A rádio do Instituto Moreira Salles, com programas e documentários sonoros sobre a história da música brasileira.' },
          { nome: 'Discografia Brasileira', tag: 'Gravações históricas', gratis: true, url: 'https://discografiabrasileira.com.br', descricao: 'Acervo do IMS para ouvir gravações históricas brasileiras, dos discos de 78 rotações em diante.' },
          { nome: 'Dicionário Cravo Albin', tag: 'Enciclopédia', gratis: true, url: 'https://dicionariompb.com.br', descricao: 'Biografias e discografias de milhares de artistas da música popular brasileira.' },
          { nome: 'Instituto Moreira Salles', tag: 'Acervos', gratis: true, url: 'https://ims.com.br', descricao: 'Guarda acervos como os de Pixinguinha e de José Ramos Tinhorão, além de fotografia e literatura.' },
          { nome: 'Musica Brasilis', tag: 'Partituras', gratis: true, url: 'https://musicabrasilis.org.br', descricao: 'Partituras gratuitas de compositores brasileiros, do período colonial ao século XX.' },
          { nome: 'Rádios EBC', tag: 'Rádio pública', gratis: true, url: 'https://radios.ebc.com.br', descricao: 'As rádios públicas Nacional e MEC ao vivo, com música brasileira e programação cultural.' },
          { nome: 'Radio Garden', tag: 'Rádios do mundo', gratis: true, url: 'https://radio.garden', descricao: 'Gire o globo e ouça rádios ao vivo de qualquer cidade do planeta.' },
          { nome: 'Cifra Club', tag: 'Aprender a tocar', gratis: true, url: 'https://www.cifraclub.com.br', descricao: 'Cifras, tablaturas e videoaulas para tocar violão, guitarra, teclado e mais.' },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Instrumentos e termos',
        apoio: 'Do agogô à zabumba, do sample à síncope.',
        termos: [
          { termo: 'Acorde', definicao: 'Três ou mais notas tocadas ao mesmo tempo. É a base do acompanhamento no violão e no piano.' },
          { termo: 'Arranjo', definicao: 'A forma como uma música é organizada: quais instrumentos tocam, o quê e quando.' },
          { termo: 'Harmonia', definicao: 'A sequência de acordes que sustenta a melodia.' },
          { termo: 'Melodia', definicao: 'A sequência de notas que a gente canta ou assobia.' },
          { termo: 'Síncope', definicao: 'Deslocamento do acento rítmico para o tempo fraco — o “balanço” característico do samba e do choro.' },
          { termo: 'BPM', definicao: 'Batidas por minuto: a velocidade de uma música.' },
          { termo: 'Timbre', definicao: 'A “cor” do som, que faz um violão soar diferente de um piano tocando a mesma nota.' },
          { termo: 'Refrão', definicao: 'A parte que se repete e todo mundo canta junto.' },
          { termo: 'Riff', definicao: 'Frase instrumental curta e repetida que vira a marca de uma música.' },
          { termo: 'Sample', definicao: 'Trecho de uma gravação reaproveitado em outra música. Base do rap e da música eletrônica.' },
          { termo: 'Beat', definicao: 'A base instrumental de uma faixa, sobretudo no rap e no funk.' },
          { termo: 'Feat.', definicao: 'Participação especial de outro artista numa faixa.' },
          { termo: 'Single, EP e LP', definicao: 'Single é uma faixa lançada sozinha; EP, um disco curto; LP (ou álbum), um disco completo.' },
          { termo: 'Mixagem', definicao: 'Etapa em que se equilibram volumes, timbres e efeitos de cada instrumento gravado.' },
          { termo: 'Masterização', definicao: 'Ajuste final do som de um disco para soar bem e com volume consistente em qualquer aparelho.' },
          { termo: 'Cavaquinho', definicao: 'Pequeno instrumento de 4 cordas, de origem portuguesa: o coração do samba e do choro.' },
          { termo: 'Violão de 7 cordas', definicao: 'Violão com uma corda grave a mais, que faz as “baixarias” do choro e do samba.' },
          { termo: 'Pandeiro', definicao: 'Tambor de moldura com platinelas. No Brasil, virou instrumento de virtuosos.' },
          { termo: 'Cuíca', definicao: 'Tambor com uma vareta presa à pele, friccionada por dentro; faz o som que “chora” e “ri” no samba.' },
          { termo: 'Surdo', definicao: 'O tambor grave que marca o pulso da bateria de escola de samba.' },
          { termo: 'Tamborim', definicao: 'Pequeno tambor tocado com baqueta, responsável pelos desenhos rítmicos agudos do samba.' },
          { termo: 'Agogô', definicao: 'Dois ou mais sinos de metal tocados com baqueta; de origem africana.' },
          { termo: 'Zabumba', definicao: 'Tambor grave do forró, tocado com maceta de um lado e bacalhau (vareta) do outro.' },
          { termo: 'Triângulo', definicao: 'Barra de metal dobrada que dá o brilho contínuo do forró.' },
          { termo: 'Sanfona', definicao: 'Acordeom; no Nordeste, o instrumento-rei do forró.' },
          { termo: 'Rabeca', definicao: 'Parente popular do violino, presente no cavalo-marinho e na música nordestina.' },
          { termo: 'Berimbau', definicao: 'Arco musical com cabaça, de origem africana, que comanda a roda de capoeira.' },
          { termo: 'Viola caipira', definicao: 'Viola de 10 cordas em 5 pares, alma da música caipira e da moda de viola.' },
          { termo: 'Alfaia', definicao: 'Tambor grave de madeira e corda do maracatu de baque virado.' },
          { termo: 'Partido-alto', definicao: 'Samba de roda com refrão fixo e versos improvisados pelos partideiros.' },
          { termo: 'Samba-enredo', definicao: 'O samba composto para o desfile de uma escola, contando o tema do ano.' },
          { termo: 'Repente', definicao: 'Poesia improvisada e cantada em duelo por repentistas, com viola ou pandeiro.' },
          { termo: 'Roda de samba', definicao: 'Encontro em volta de uma mesa em que músicos e público cantam juntos, sem palco.' },
        ],
      },
    ],
  },

  // ===========================================================================
  cinema: {
    titulo: 'Kit de Cinema & Séries',
    apoio: 'Onde ver filmes de graça e dentro da lei, os clássicos do cinema brasileiro com trailer, os movimentos que mudaram a história e o vocabulário da crítica.',
    blocos: [
      {
        tipo: 'recursos',
        id: 'assistir',
        aba: 'Assistir de graça',
        icone: 'film',
        titulo: 'Onde assistir de graça e legalmente',
        apoio: 'Plataformas gratuitas e legais — muitas com foco em cinema brasileiro. Algumas pedem um cadastro rápido.',
        itens: [
          { nome: 'Itaú Cultural Play', tag: 'Cinema brasileiro', gratis: true, url: 'https://www.itauculturalplay.com.br', descricao: 'Streaming gratuito de filmes e séries brasileiros, com mostras temáticas. Basta criar uma conta.' },
          { nome: 'Spcine Play', tag: 'Cinema brasileiro', gratis: true, url: 'https://www.spcineplay.com.br', descricao: 'Plataforma pública da Spcine, empresa de cinema da cidade de São Paulo, com títulos gratuitos e alguns para alugar.' },
          { nome: 'Sesc Digital', tag: 'Cultura', gratis: true, url: 'https://sesc.digital', descricao: 'Acervo do Sesc com filmes, shows, espetáculos, palestras e cursos livres.' },
          { nome: 'Libreflix', tag: 'Independente', gratis: true, url: 'https://libreflix.org', descricao: 'Streaming aberto e colaborativo, com produções independentes de livre exibição.' },
          { nome: 'Porta Curtas', tag: 'Curtas-metragens', gratis: true, url: 'https://portacurtas.org.br', descricao: 'Mais de mil curtas brasileiros para assistir na íntegra, de graça — ótimo para descobrir diretores.' },
          { nome: 'Embaúba Play', tag: 'Cinema contemporâneo', gratis: true, url: 'https://embaubaplay.com', descricao: 'Acervo do cinema brasileiro contemporâneo; a maioria dos filmes é disponibilizada gratuitamente.' },
          { nome: 'Banco de Conteúdos Culturais', tag: 'Cinemateca Brasileira', gratis: true, url: 'https://bcc.org.br', descricao: 'Acervo digital da Cinemateca Brasileira, com filmes, cinejornais e documentos da história do nosso cinema.' },
          { nome: 'Pluto TV', tag: 'Com anúncios', gratis: true, url: 'https://pluto.tv', descricao: 'Canais ao vivo e filmes sob demanda gratuitos, bancados por anúncios.' },
          { nome: 'Internet Archive', tag: 'Domínio público', gratis: true, url: 'https://archive.org/details/feature_films', descricao: 'Milhares de longas em domínio público, de clássicos mudos a filmes B — a maioria em inglês.' },
        ],
      },
      {
        tipo: 'guia',
        id: 'classicos',
        aba: 'Clássicos brasileiros',
        icone: 'star',
        titulo: 'Clássicos do cinema brasileiro',
        apoio: 'Uma filmoteca essencial, de 1931 até o Oscar. Toque em “Assistir aqui” para ver o trailer ou uma cena.',
        itens: [
          {
            titulo: 'Limite',
            tag: '1931 · Mário Peixoto',
            texto: 'Filme mudo e experimental, com três náufragos à deriva e imagens poéticas. Aparece com frequência entre os maiores filmes brasileiros.',
            video: 'Limite 1931 Mário Peixoto filme',
          },
          {
            titulo: 'O Pagador de Promessas',
            tag: '1962 · Anselmo Duarte',
            texto: 'Zé do Burro tenta cumprir uma promessa numa igreja de Salvador. É o único filme brasileiro a ganhar a Palma de Ouro em Cannes.',
            video: 'O Pagador de Promessas 1962 filme',
          },
          {
            titulo: 'Vidas Secas',
            tag: '1963 · Nelson Pereira dos Santos',
            texto: 'Adaptação de Graciliano Ramos, com a família de retirantes e a cachorra Baleia sob a luz estourada do sertão. Marco do Cinema Novo.',
            video: 'Vidas Secas 1963 Nelson Pereira dos Santos',
          },
          {
            titulo: 'Deus e o Diabo na Terra do Sol',
            tag: '1964 · Glauber Rocha',
            texto: 'Um vaqueiro entre um beato e um cangaceiro no sertão. O filme-símbolo do Cinema Novo.',
            video: 'Deus e o Diabo na Terra do Sol Glauber Rocha',
          },
          {
            titulo: 'Macunaíma',
            tag: '1969 · Joaquim Pedro de Andrade',
            texto: 'Grande Otelo e Paulo José vivem o “herói sem nenhum caráter” de Mário de Andrade numa comédia tropicalista.',
            video: 'Macunaíma 1969 filme Grande Otelo',
          },
          {
            titulo: 'Bye Bye Brasil',
            tag: '1980 · Cacá Diegues',
            texto: 'A Caravana Rolidei atravessa o país enquanto a TV chega ao interior. Um retrato do Brasil em transformação.',
            video: 'Bye Bye Brasil Cacá Diegues trailer',
          },
          {
            titulo: 'Pixote, a Lei do Mais Fraco',
            tag: '1980 · Hector Babenco',
            texto: 'Meninos num reformatório e nas ruas de São Paulo, vividos por atores não profissionais. Teve grande repercussão internacional.',
            video: 'Pixote a Lei do Mais Fraco trailer',
          },
          {
            titulo: 'Cabra Marcado para Morrer',
            tag: '1984 · Eduardo Coutinho',
            texto: 'Documentário que retoma, 20 anos depois, um filme interrompido pelo golpe de 1964 sobre um líder camponês assassinado.',
            video: 'Cabra Marcado para Morrer Eduardo Coutinho',
          },
          {
            titulo: 'Ilha das Flores',
            tag: '1989 · Jorge Furtado',
            texto: 'Curta de cerca de 13 minutos que segue um tomate da plantação ao lixo para falar de desigualdade. Ganhou o Urso de Prata em Berlim.',
            video: 'Ilha das Flores Jorge Furtado curta',
          },
          {
            titulo: 'Central do Brasil',
            tag: '1998 · Walter Salles',
            texto: 'Fernanda Montenegro e o menino Vinícius de Oliveira cruzam o sertão atrás de um pai. Urso de Ouro em Berlim e indicação de Fernanda ao Oscar de melhor atriz.',
            video: 'Central do Brasil trailer 1998',
          },
          {
            titulo: 'O Auto da Compadecida',
            tag: '2000 · Guel Arraes',
            texto: 'João Grilo e Chicó, de Ariano Suassuna, vividos por Matheus Nachtergaele e Selton Mello. Uma comédia que o Brasil sabe de cor.',
            video: 'O Auto da Compadecida trailer',
          },
          {
            titulo: 'Cidade de Deus',
            tag: '2002 · Fernando Meirelles e Kátia Lund',
            texto: 'A história do crime na Cidade de Deus, no Rio, pelos olhos de Buscapé. Recebeu quatro indicações ao Oscar.',
            video: 'Cidade de Deus trailer',
          },
          {
            titulo: 'Tropa de Elite',
            tag: '2007 · José Padilha',
            texto: 'O Capitão Nascimento e o BOPE num filme que dividiu o país e ganhou o Urso de Ouro em Berlim.',
            video: 'Tropa de Elite trailer',
          },
          {
            titulo: 'Que Horas Ela Volta?',
            tag: '2015 · Anna Muylaert',
            texto: 'Regina Casé vive Val, empregada doméstica cuja filha chega de Pernambuco e abala a hierarquia da casa.',
            video: 'Que Horas Ela Volta trailer',
          },
          {
            titulo: 'Bacurau',
            tag: '2019 · Kleber Mendonça Filho e Juliano Dornelles',
            texto: 'Um povoado do sertão some do mapa — e resiste. Prêmio do Júri em Cannes.',
            video: 'Bacurau trailer oficial',
          },
          {
            titulo: 'Ainda Estou Aqui',
            tag: '2024 · Walter Salles',
            texto: 'Fernanda Torres vive Eunice Paiva, que busca a verdade sobre o marido desaparecido na ditadura. Primeiro filme brasileiro a ganhar o Oscar de Filme Internacional.',
            video: 'Ainda Estou Aqui trailer oficial',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'movimentos',
        aba: 'Movimentos',
        icone: 'compass',
        titulo: 'Movimentos e escolas',
        apoio: 'As ondas que mudaram o jeito de fazer cinema — no Brasil e no mundo.',
        itens: [
          {
            titulo: 'Chanchada',
            tag: 'Anos 1930–50 · Brasil',
            texto: 'Comédias musicais populares, muitas produzidas pela Atlântida, com Oscarito, Grande Otelo e muito carnaval.',
            video: 'chanchada Atlântida Oscarito Grande Otelo',
          },
          {
            titulo: 'Cinema Novo',
            tag: 'Anos 1960 · Brasil',
            texto: '“Uma câmera na mão e uma ideia na cabeça”: Glauber Rocha, Nelson Pereira dos Santos, Joaquim Pedro de Andrade e Leon Hirszman filmaram o Brasil real, com pouco dinheiro.',
            video: 'Cinema Novo documentário',
          },
          {
            titulo: 'Cinema Marginal',
            tag: 'Fim dos anos 1960 · Brasil',
            texto: 'Anárquico, provocador e de baixíssimo orçamento. “O Bandido da Luz Vermelha” (1968), de Rogério Sganzerla, é o clássico.',
          },
          {
            titulo: 'Retomada',
            tag: 'Anos 1990 · Brasil',
            texto: 'Com o fim da Embrafilme, em 1990, a produção quase parou. Com as leis de incentivo, filmes como “Carlota Joaquina” (1995) e “Central do Brasil” marcaram a volta.',
          },
          {
            titulo: 'Expressionismo alemão',
            tag: 'Anos 1920 · Alemanha',
            texto: 'Cenários distorcidos e sombras dramáticas, como em “O Gabinete do Dr. Caligari” e “Nosferatu”. Influenciou o terror e o filme noir.',
          },
          {
            titulo: 'Neorrealismo italiano',
            tag: 'Anos 1940–50 · Itália',
            texto: 'Filmagens na rua, atores não profissionais e o pós-guerra como tema: “Roma, Cidade Aberta”, “Ladrões de Bicicleta”. Inspirou o Cinema Novo.',
          },
          {
            titulo: 'Nouvelle Vague',
            tag: 'Anos 1960 · França',
            texto: 'Críticos que viraram diretores e quebraram as regras: câmera livre, cortes bruscos, “Acossado” (Godard), “Os Incompreendidos” (Truffaut).',
          },
          {
            titulo: 'Nova Hollywood',
            tag: 'Anos 1960–70 · EUA',
            texto: 'Diretores autorais ganharam força nos estúdios: Coppola, Scorsese, Spielberg — de “O Poderoso Chefão” a “Taxi Driver”.',
          },
          {
            titulo: 'Dogma 95',
            tag: '1995 · Dinamarca',
            texto: 'Manifesto de Lars von Trier e Thomas Vinterberg: câmera na mão, luz natural, nada de trilha sonora adicionada.',
          },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário de cinema',
        apoio: 'Plano-sequência, raccord, MacGuffin: o vocabulário das críticas e dos bastidores.',
        termos: [
          { termo: 'Plano', definicao: 'Trecho filmado sem cortes, do ligar ao desligar da câmera — a unidade básica do filme.' },
          { termo: 'Plano-sequência', definicao: 'Cena inteira filmada num único plano longo, sem cortes.' },
          { termo: 'Plano geral', definicao: 'Enquadramento aberto, que mostra o ambiente todo e situa o espectador.' },
          { termo: 'Close', definicao: 'Enquadramento fechado no rosto ou num detalhe, para destacar emoção.' },
          { termo: 'Plano americano', definicao: 'Enquadra o personagem dos joelhos para cima — nasceu nos faroestes, para mostrar o revólver na cintura.' },
          { termo: 'Plongée e contra-plongée', definicao: 'Câmera de cima para baixo (diminui o personagem) ou de baixo para cima (engrandece).' },
          { termo: 'Travelling', definicao: 'Movimento da câmera se deslocando no espaço, sobre trilhos ou veículo.' },
          { termo: 'Montagem', definicao: 'A escolha e a ordem dos planos. Muda completamente o sentido de um filme.' },
          { termo: 'Corte seco', definicao: 'Passagem direta de um plano para outro, sem transição.' },
          { termo: 'Raccord', definicao: 'Continuidade entre planos: posição de objetos, figurino, olhares. Erros de raccord são as famosas “falhas de continuidade”.' },
          { termo: 'Mise-en-scène', definicao: 'Tudo o que está diante da câmera e como está disposto: cenário, atores, luz, movimento.' },
          { termo: 'Som diegético', definicao: 'Som que existe no mundo da história (um rádio tocando na cena). A trilha que só o público ouve é extradiegética.' },
          { termo: 'Fotografia', definicao: 'A imagem do filme: luz, lentes, cores e enquadramento. Quem comanda é o diretor de fotografia.' },
          { termo: 'Direção de arte', definicao: 'Cenários, objetos e a paleta visual do filme.' },
          { termo: 'Roteiro', definicao: 'O texto com as cenas, ações e diálogos do filme.' },
          { termo: 'Storyboard', definicao: 'Desenhos, como uma história em quadrinhos, que planejam os planos antes da filmagem.' },
          { termo: 'MacGuffin', definicao: 'Objeto que move a trama, mas pouco importa em si — expressão popularizada por Hitchcock.' },
          { termo: 'Plot twist', definicao: 'Reviravolta inesperada na história.' },
          { termo: 'Spoiler', definicao: 'Revelar um acontecimento importante da trama a quem ainda não viu.' },
          { termo: 'Cena pós-créditos', definicao: 'Cena extra depois dos créditos finais, muitas vezes ligando a próxima história.' },
          { termo: 'Longa, média e curta', definicao: 'Pela regra brasileira da Ancine: curta tem até 15 minutos; média, de 15 a 70; longa, mais de 70.' },
          { termo: 'Found footage', definicao: 'Filme apresentado como se fosse gravação “encontrada”, feita pelos próprios personagens.' },
          { termo: 'Stop motion', definicao: 'Animação feita fotografando objetos ou bonecos quadro a quadro.' },
          { termo: 'Rotoscopia', definicao: 'Técnica de animar desenhando por cima de imagens filmadas.' },
          { termo: 'CGI', definicao: 'Imagens geradas por computador, dos efeitos visuais aos personagens digitais.' },
          { termo: 'Chroma key', definicao: 'Fundo verde ou azul substituído depois por outra imagem.' },
          { termo: 'Janela de exibição', definicao: 'O período em que o filme fica só no cinema antes de ir para streaming ou TV.' },
          { termo: 'Road movie', definicao: 'Filme de estrada: a viagem transforma os personagens. “Central do Brasil” e “Bye Bye Brasil” são exemplos.' },
          { termo: 'Filme B', definicao: 'Produção barata e rápida, muitas vezes de gênero (terror, ficção científica). Vários viraram cult.' },
          { termo: 'Cult', definicao: 'Filme com público fiel e apaixonado, mesmo sem sucesso comercial na estreia.' },
          { termo: 'Blockbuster', definicao: 'Grande produção feita para arrasar nas bilheterias.' },
          { termo: 'Festival', definicao: 'Mostras competitivas que lançam filmes e diretores: Cannes, Berlim e Veneza, lá fora; Gramado e Brasília, aqui.' },
        ],
      },
    ],
  },

  // ===========================================================================
  livros: {
    titulo: 'Kit de Livros & Leitura',
    apoio: 'Os clássicos brasileiros que valem a vida, onde ler de graça e dentro da lei, um desafio de leitura para o ano e o vocabulário literário.',
    blocos: [
      {
        tipo: 'guia',
        id: 'classicos',
        aba: 'Clássicos brasileiros',
        icone: 'book',
        titulo: 'Clássicos brasileiros',
        apoio: 'Uma estante essencial. Os marcados como domínio público podem ser lidos de graça nos acervos da aba “Leitura grátis”.',
        itens: [
          {
            titulo: 'Memórias Póstumas de Brás Cubas',
            tag: '1881 · Machado de Assis',
            texto: 'Um defunto-autor narra a própria vida “com a pena da galhofa e a tinta da melancolia”. Marco do Realismo. Domínio público.',
          },
          {
            titulo: 'Dom Casmurro',
            tag: '1899 · Machado de Assis',
            texto: 'Bentinho conta sua história com Capitu — e o leitor nunca sabe se houve traição. Um dos narradores não confiáveis mais famosos da literatura. Domínio público.',
          },
          {
            titulo: 'O Cortiço',
            tag: '1890 · Aluísio Azevedo',
            texto: 'Um cortiço no Rio como organismo vivo: o grande romance do Naturalismo brasileiro. Domínio público.',
          },
          {
            titulo: 'Iracema',
            tag: '1865 · José de Alencar',
            texto: 'A “virgem dos lábios de mel” e o português Martim num romance indianista sobre as origens do Ceará. Domínio público.',
          },
          {
            titulo: 'Os Sertões',
            tag: '1902 · Euclides da Cunha',
            texto: 'O relato da Guerra de Canudos mistura geografia, ciência e jornalismo: “O sertanejo é, antes de tudo, um forte”. Domínio público.',
          },
          {
            titulo: 'Triste Fim de Policarpo Quaresma',
            tag: '1915 · Lima Barreto',
            texto: 'Um patriota ingênuo que quer oficializar o tupi. Sátira do nacionalismo e da República. Domínio público.',
          },
          {
            titulo: 'Macunaíma',
            tag: '1928 · Mário de Andrade',
            texto: 'O “herói sem nenhum caráter” atravessa o Brasil numa rapsódia modernista cheia de mitos e linguagem popular. Domínio público.',
          },
          {
            titulo: 'O Quinze',
            tag: '1930 · Rachel de Queiroz',
            texto: 'A seca de 1915 no Ceará, no romance de estreia de Rachel — que viria a ser a primeira mulher na Academia Brasileira de Letras.',
          },
          {
            titulo: 'Capitães da Areia',
            tag: '1937 · Jorge Amado',
            texto: 'Meninos de rua em Salvador, liderados por Pedro Bala. Exemplares do livro foram queimados em praça pública pelo Estado Novo.',
          },
          {
            titulo: 'Vidas Secas',
            tag: '1938 · Graciliano Ramos',
            texto: 'Fabiano, sinhá Vitória, os meninos e a cachorra Baleia fogem da seca. Prosa seca como o sertão. Em domínio público desde 2024.',
          },
          {
            titulo: 'A Rosa do Povo',
            tag: '1945 · Carlos Drummond de Andrade',
            texto: 'Poesia em tempos de guerra, com “A flor e a náusea” e “Procura da poesia”.',
          },
          {
            titulo: 'Morte e Vida Severina',
            tag: '1955 · João Cabral de Melo Neto',
            texto: 'Auto de Natal em versos sobre um retirante que desce o rio Capibaribe até o Recife.',
            video: 'Morte e Vida Severina animação',
          },
          {
            titulo: 'Grande Sertão: Veredas',
            tag: '1956 · Guimarães Rosa',
            texto: 'Riobaldo conta sua vida de jagunço e seu amor por Diadorim numa linguagem reinventada. “Viver é muito perigoso.”',
          },
          {
            titulo: 'Quarto de Despejo',
            tag: '1960 · Carolina Maria de Jesus',
            texto: 'O diário de uma catadora de papel na favela do Canindé, em São Paulo. Foi um fenômeno de vendas e ganhou traduções em vários idiomas.',
          },
          {
            titulo: 'A Hora da Estrela',
            tag: '1977 · Clarice Lispector',
            texto: 'Macabéa, nordestina no Rio, narrada por um escritor que hesita. O último livro publicado em vida por Clarice.',
          },
          {
            titulo: 'Torto Arado',
            tag: '2019 · Itamar Vieira Junior',
            texto: 'Duas irmãs no sertão baiano e a luta pela terra. Um clássico contemporâneo, vencedor dos prêmios LeYa, Jabuti e Oceanos.',
          },
        ],
      },
      {
        tipo: 'recursos',
        id: 'leitura-gratis',
        aba: 'Leitura grátis',
        icone: 'library',
        titulo: 'Leitura gratuita (e legal)',
        apoio: 'Acervos públicos e projetos sem fins lucrativos com milhares de livros em domínio público.',
        itens: [
          { nome: 'Domínio Público', tag: 'Governo federal', gratis: true, url: 'https://www.dominiopublico.gov.br', descricao: 'A biblioteca digital do governo, com obras em domínio público de Machado, Alencar, Aluísio Azevedo e muito mais.' },
          { nome: 'Biblioteca Brasiliana Guita e José Mindlin', tag: 'USP', gratis: true, url: 'https://www.bbm.usp.br', descricao: 'Livros raros e documentos sobre o Brasil digitalizados em alta qualidade, com primeiras edições de clássicos.' },
          { nome: 'Biblioteca Digital de Literatura de Países Lusófonos', tag: 'UFSC', gratis: true, url: 'https://literaturabrasileira.ufsc.br', descricao: 'Obras e estudos de literatura em língua portuguesa, com textos completos para ler online.' },
          { nome: 'Biblioteca Nacional', tag: 'Acervo histórico', gratis: true, url: 'https://www.gov.br/bn/pt-br', descricao: 'A BN Digital e a Hemeroteca Digital reúnem livros raros, manuscritos e jornais históricos brasileiros.' },
          { nome: 'Wikisource', tag: 'Textos livres', gratis: true, url: 'https://pt.wikisource.org', descricao: 'Biblioteca colaborativa de textos em domínio público em português, revisados por voluntários.' },
          { nome: 'Projeto Gutenberg', tag: 'Internacional', gratis: true, url: 'https://www.gutenberg.org', descricao: 'Mais de 70 mil e-books gratuitos em domínio público, inclusive em português.' },
          { nome: 'Open Library', tag: 'Empréstimo digital', gratis: true, url: 'https://openlibrary.org', descricao: 'Do Internet Archive: leia ou tome emprestados livros digitalizados, de graça.' },
          { nome: 'LibriVox', tag: 'Audiolivros', gratis: true, url: 'https://librivox.org', descricao: 'Audiolivros de obras em domínio público, gravados por voluntários — há títulos em português.' },
          { nome: 'Standard Ebooks', tag: 'Clássicos em inglês', gratis: true, url: 'https://standardebooks.org', descricao: 'Clássicos em domínio público em inglês, com diagramação e revisão caprichadas.' },
        ],
      },
      {
        tipo: 'checklist',
        id: 'desafio',
        aba: 'Desafio do ano',
        icone: 'trophy',
        titulo: 'Desafio de leitura do ano',
        apoio: 'Vinte e poucas metas para sair da zona de conforto. Marque conforme for lendo — fica salvo neste aparelho.',
        grupos: [
          {
            nome: 'Clássicos',
            itens: [
              'Um clássico brasileiro do século XIX',
              'Um livro do Modernismo brasileiro',
              'Um livro de poesia',
              'Um clássico estrangeiro que eu “sempre quis ler”',
              'Uma peça de teatro',
            ],
          },
          {
            nome: 'Descobertas',
            itens: [
              'Um livro de autor ou autora indígena',
              'Um livro de autor ou autora africana',
              'Um livro traduzido de uma língua que nunca li',
              'Uma história em quadrinhos ou graphic novel',
              'Um livro de não ficção sobre ciência',
              'Um livro de contos ou de crônicas',
              'Um livro de literatura de cordel',
            ],
          },
          {
            nome: 'Desafios',
            itens: [
              'Um livro com mais de 500 páginas',
              'Um livro publicado no ano em que nasci',
              'Um livro indicado por alguém',
              'Um autor ou autora do meu estado',
              'Um lançamento deste ano',
              'Reler um livro favorito',
            ],
          },
          {
            nome: 'Hábitos',
            itens: [
              'Ler pelo menos 20 minutos por dia durante um mês',
              'Visitar uma biblioteca pública e fazer a carteirinha',
              'Participar de um clube de leitura',
              'Anotar as citações de que mais gostei',
              'Dar um livro de presente',
            ],
          },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário literário',
        apoio: 'Os termos das aulas de literatura, das resenhas e das livrarias.',
        termos: [
          { termo: 'Romance', definicao: 'Narrativa longa em prosa, com vários personagens e acontecimentos.' },
          { termo: 'Novela', definicao: 'Narrativa em prosa mais curta que o romance e mais longa que o conto.' },
          { termo: 'Conto', definicao: 'Narrativa curta, geralmente com um único conflito.' },
          { termo: 'Crônica', definicao: 'Texto curto sobre o cotidiano, publicado em jornal ou revista. Gênero muito brasileiro — Rubem Braga fez escola.' },
          { termo: 'Narrador em 1ª pessoa', definicao: 'Um personagem conta a história do seu ponto de vista (“eu”).' },
          { termo: 'Narrador onisciente', definicao: 'Narrador em 3ª pessoa que sabe tudo, inclusive o que os personagens pensam.' },
          { termo: 'Narrador não confiável', definicao: 'Narrador cuja versão dos fatos é duvidosa. Bentinho, de “Dom Casmurro”, é o exemplo clássico.' },
          { termo: 'Fluxo de consciência', definicao: 'Técnica que reproduz o pensamento do personagem como ele acontece, sem ordem lógica. Clarice Lispector a usou muito.' },
          { termo: 'Soneto', definicao: 'Poema de 14 versos: dois quartetos e dois tercetos.' },
          { termo: 'Verso livre', definicao: 'Verso sem métrica nem rima fixas, marca da poesia modernista.' },
          { termo: 'Métrica', definicao: 'A contagem de sílabas poéticas de um verso.' },
          { termo: 'Metáfora', definicao: 'Comparação implícita: dizer que uma coisa é outra para criar sentido novo.' },
          { termo: 'Ironia', definicao: 'Dizer uma coisa querendo dizer outra, muitas vezes o contrário. Machado de Assis é mestre.' },
          { termo: 'Intertextualidade', definicao: 'Diálogo de um texto com outro, por citação, paródia ou referência.' },
          { termo: 'Epígrafe', definicao: 'Citação curta no começo de um livro ou capítulo.' },
          { termo: 'Romantismo', definicao: 'Movimento do século XIX que valorizou emoção, natureza e nacionalismo. No Brasil, o indianismo de Alencar.' },
          { termo: 'Realismo', definicao: 'Movimento que retratou a sociedade de forma crítica e objetiva. Machado de Assis é o nome maior.' },
          { termo: 'Naturalismo', definicao: 'Radicalização do Realismo: personagens determinados pelo meio e pela biologia, como em “O Cortiço”.' },
          { termo: 'Modernismo', definicao: 'Ruptura com as formas tradicionais, a partir da Semana de Arte Moderna de 1922, em busca de uma linguagem brasileira.' },
          { termo: 'Antropofagia', definicao: 'Ideia do Manifesto Antropófago (1928), de Oswald de Andrade: “devorar” a cultura estrangeira e transformá-la em algo nosso.' },
          { termo: 'Regionalismo', definicao: 'Literatura centrada numa região, seus costumes e sua fala — como o romance de 30 nordestino.' },
          { termo: 'Cordel', definicao: 'Folhetos de poesia popular, com capas em xilogravura, vendidos em feiras. A literatura de cordel é patrimônio cultural do Brasil.' },
          { termo: 'Distopia', definicao: 'Ficção sobre uma sociedade opressiva ou em colapso, como “1984”.' },
          { termo: 'Realismo mágico', definicao: 'O extraordinário tratado como parte natural da realidade, como em García Márquez.' },
          { termo: 'Romance de formação', definicao: 'História do amadurecimento de um personagem, da juventude à vida adulta.' },
          { termo: 'Domínio público', definicao: 'No Brasil, uma obra entra em domínio público 70 anos após o 1º de janeiro seguinte à morte do autor. Aí pode ser publicada livremente.' },
          { termo: 'ISBN', definicao: 'Número de identificação único de cada edição de um livro.' },
          { termo: 'Orelha', definicao: 'As abas dobradas da capa, com resumo do livro ou biografia do autor.' },
          { termo: 'Brochura e capa dura', definicao: 'Brochura tem capa flexível; capa dura, rígida e mais resistente.' },
          { termo: 'Prêmio Jabuti', definicao: 'O mais tradicional prêmio literário do Brasil, criado em 1959 pela Câmara Brasileira do Livro.' },
        ],
      },
    ],
  },

  // ===========================================================================
  viagem: {
    titulo: 'Kit de Viagem',
    apoio: 'A melhor época para cada destino brasileiro, uma mala que não esquece nada, sites oficiais que resolvem a vida e o vocabulário de aeroporto.',
    blocos: [
      {
        tipo: 'guia',
        id: 'destinos',
        aba: 'Destinos por estação',
        icone: 'calendar',
        titulo: 'Destinos brasileiros por estação',
        apoio: 'Quando ir para ver cada lugar no seu melhor. O clima varia de ano para ano — confira a previsão antes de fechar a viagem.',
        itens: [
          {
            titulo: 'Lençóis Maranhenses (MA)',
            tag: 'Melhor: junho a setembro',
            texto: 'As lagoas entre as dunas enchem com as chuvas do começo do ano e ficam no auge no meio do ano. Desde 2024, o parque é Patrimônio Mundial da UNESCO.',
            video: 'Lençóis Maranhenses lagoas documentário',
          },
          {
            titulo: 'Pantanal (MT e MS)',
            tag: 'Seca: julho a outubro',
            texto: 'Na seca, os bichos se concentram perto da água e é mais fácil ver onças, jacarés e aves. Na cheia (dezembro a março), a paisagem vira um espelho d’água.',
            video: 'Pantanal onça pintada documentário',
          },
          {
            titulo: 'Bonito (MS)',
            tag: 'O ano todo',
            texto: 'Flutuação em rios de água cristalina, grutas e cachoeiras. Os passeios têm vagas controladas e são vendidos por agências credenciadas — reserve antes. Chuvas fortes do verão podem turvar alguns rios.',
            video: 'Bonito Mato Grosso do Sul flutuação rio cristalino',
          },
          {
            titulo: 'Jalapão (TO)',
            tag: 'Seca: maio a setembro',
            texto: 'Dunas douradas, fervedouros (nascentes em que você boia sem afundar) e cachoeiras. As estradas de areia pedem veículo 4×4 — o mais comum é ir com agência.',
            video: 'Jalapão fervedouro dunas',
          },
          {
            titulo: 'Chapada dos Veadeiros (GO)',
            tag: 'Seca: abril a outubro',
            texto: 'Cerrado de altitude, cânions e cachoeiras. Na seca as trilhas ficam mais seguras; nas chuvas, as quedas d’água ficam mais cheias, mas há risco de cabeça d’água.',
            video: 'Chapada dos Veadeiros cachoeiras',
          },
          {
            titulo: 'Chapada Diamantina (BA)',
            tag: 'Trilhas: abril a setembro',
            texto: 'Morro do Pai Inácio, Poço Azul, Cachoeira da Fumaça. Nos meses secos as trilhas são mais tranquilas; depois das chuvas, as cachoeiras ganham volume.',
            video: 'Chapada Diamantina Morro do Pai Inácio',
          },
          {
            titulo: 'Amazônia (Manaus e arredores)',
            tag: 'Cheia × seca',
            texto: 'Na cheia (por volta de maio a julho), dá para navegar de canoa pelos igapós, entre as copas; na seca (setembro a novembro), surgem praias de rio. O encontro das águas é visível o ano todo.',
            video: 'encontro das águas Manaus Rio Negro Solimões',
          },
          {
            titulo: 'Fernando de Noronha (PE)',
            tag: 'O ano todo',
            texto: 'Mar azul-turquesa, golfinhos-rotadores e mergulho. Há uma taxa de preservação cobrada por dia de estadia e ingresso para o parque nacional. De dezembro a março, ondas grandes no “mar de dentro” atraem surfistas.',
            video: 'Fernando de Noronha Baía do Sancho',
          },
          {
            titulo: 'Foz do Iguaçu (PR)',
            tag: 'O ano todo',
            texto: 'As cataratas ficam mais volumosas depois de chuvas fortes. Vale ver os dois lados: o brasileiro tem a vista panorâmica; o argentino, as passarelas sobre a Garganta do Diabo.',
            video: 'Cataratas do Iguaçu Garganta do Diabo',
          },
          {
            titulo: 'Baleias em Santa Catarina e na Bahia',
            tag: 'Julho a novembro',
            texto: 'Baleias-francas visitam o litoral sul catarinense (Garopaba, Imbituba) e baleias-jubarte chegam a Abrolhos e ao litoral baiano para ter os filhotes.',
            video: 'baleia jubarte Abrolhos',
          },
          {
            titulo: 'Serra Gaúcha (RS)',
            tag: 'Inverno e fim de ano',
            texto: 'Gramado e Canela no frio, com fondue e vinícolas, o Festival de Cinema de Gramado em agosto e a decoração de Natal no fim do ano.',
            video: 'Gramado Canela Serra Gaúcha',
          },
          {
            titulo: 'Campos do Jordão (SP)',
            tag: 'Inverno: julho',
            texto: 'A cidade serrana ferve em julho com o Festival de Inverno, um dos mais tradicionais de música clássica do país.',
          },
          {
            titulo: 'Salvador (BA)',
            tag: 'Verão e Carnaval',
            texto: 'Festa de Iemanjá em 2 de fevereiro, Carnaval de trios elétricos e o Pelourinho o ano todo. Na praia, o verão é o auge.',
            video: 'Salvador Pelourinho Bahia',
          },
          {
            titulo: 'São João do Nordeste',
            tag: 'Junho',
            texto: 'Campina Grande (PB) e Caruaru (PE) disputam o título de maior São João do mundo, com forró, quadrilhas e comidas de milho.',
            video: 'São João de Campina Grande',
          },
          {
            titulo: 'Parintins (AM)',
            tag: 'Fim de junho',
            texto: 'No último fim de semana de junho, os bois Garantido e Caprichoso se enfrentam no Bumbódromo. Hospedagem esgota cedo; muita gente vai de barco a partir de Manaus.',
            video: 'Festival de Parintins Bumbódromo',
          },
          {
            titulo: 'Ouro Preto e cidades históricas (MG)',
            tag: 'O ano todo',
            texto: 'Barroco, ladeiras e comida mineira. O inverno é seco e fresco, ótimo para caminhar; a Semana Santa tem os tapetes de serragem nas ruas.',
            video: 'Ouro Preto cidade histórica',
          },
        ],
      },
      {
        tipo: 'checklist',
        id: 'mala',
        aba: 'Mala de viagem',
        icone: 'check',
        titulo: 'Mala de viagem',
        apoio: 'Marque conforme for arrumando. Dica: desmarque tudo com “Limpar” antes da próxima viagem.',
        grupos: [
          {
            nome: 'Documentos',
            itens: [
              'RG ou CNH (a digital também vale em voos nacionais)',
              'Passaporte válido, para viagens internacionais',
              'Visto, se o destino exigir',
              'Certificado internacional de vacinação (febre amarela), se o destino pedir',
              'Seguro-viagem (obrigatório em vários países, como os da Europa)',
              'Reservas e cartões de embarque salvos offline',
              'Cópia dos documentos na nuvem',
            ],
          },
          {
            nome: 'Dinheiro',
            itens: ['Cartão de crédito e de débito', 'Um pouco de dinheiro em espécie', 'Avisar o banco ou liberar o cartão para uso no exterior'],
          },
          {
            nome: 'Roupas',
            itens: [
              'Uma troca de roupa na bagagem de mão',
              'Casaco leve (avião e ônibus são frios)',
              'Calçado confortável para caminhar',
              'Roupa de banho',
              'Pijama e roupas íntimas para todos os dias (e um extra)',
            ],
          },
          {
            nome: 'Higiene e saúde',
            itens: [
              'Remédios de uso contínuo, com a receita',
              'Protetor solar e repelente',
              'Kit de primeiros socorros básico',
              'Líquidos em frascos de até 100 ml na bagagem de mão (voos internacionais)',
              'Escova, pasta e itens pessoais',
            ],
          },
          {
            nome: 'Eletrônicos',
            itens: [
              'Carregadores e cabos',
              'Bateria externa (sempre na bagagem de mão, nunca despachada)',
              'Adaptador de tomada, se for para o exterior',
              'Fones de ouvido',
            ],
          },
          {
            nome: 'Antes de sair',
            itens: [
              'Fazer o check-in online',
              'Baixar mapas offline e o app de transporte do destino',
              'Ativar roaming ou comprar um chip/eSIM',
              'Conferir a previsão do tempo',
              'Desligar aparelhos, fechar o gás e trancar tudo',
            ],
          },
        ],
      },
      {
        tipo: 'recursos',
        id: 'sites',
        aba: 'Sites oficiais',
        icone: 'globe',
        titulo: 'Sites oficiais que ajudam',
        apoio: 'Informação confiável e direto da fonte, para planejar e evitar dor de cabeça.',
        itens: [
          { nome: 'Visit Brasil', tag: 'Embratur', gratis: true, url: 'https://visitbrasil.com', descricao: 'O portal oficial de turismo do Brasil, com destinos, roteiros e inspiração.' },
          { nome: 'Unidades de Conservação (ICMBio)', tag: 'Parques nacionais', gratis: true, url: 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/unidade-de-conservacao', descricao: 'Informações sobre os parques nacionais e outras áreas protegidas: acesso, regras e visitação.' },
          { nome: 'Cadastur', tag: 'Ministério do Turismo', gratis: true, url: 'https://cadastur.turismo.gov.br', descricao: 'Confira se a agência, o guia ou a hospedagem têm cadastro oficial antes de fechar negócio.' },
          { nome: 'Direitos do passageiro (ANAC)', tag: 'Voos', gratis: true, url: 'https://www.gov.br/anac/pt-br/assuntos/passageiros', descricao: 'Bagagem, atrasos, cancelamentos e overbooking: o que as companhias aéreas devem a você.' },
          { nome: 'Portal Consular (Itamaraty)', tag: 'Exterior', gratis: true, url: 'https://www.gov.br/mre/pt-br/assuntos/portal-consular', descricao: 'Vistos, documentos, contatos de consulados e ajuda a brasileiros no exterior.' },
          { nome: 'Anvisa — viajantes', tag: 'Saúde', gratis: true, url: 'https://www.gov.br/anvisa/pt-br/assuntos/paf', descricao: 'Orientações de saúde em portos, aeroportos e fronteiras, incluindo vacinas exigidas.' },
          { nome: 'INMET', tag: 'Clima', gratis: true, url: 'https://portal.inmet.gov.br', descricao: 'Previsão do tempo e alertas meteorológicos oficiais do Instituto Nacional de Meteorologia.' },
          { nome: 'Windy', tag: 'Clima', gratis: true, url: 'https://www.windy.com', descricao: 'Mapa interativo de vento, chuva e ondas — ótimo para praia, trilha e vela.' },
          { nome: 'Rome2Rio', tag: 'Rotas', gratis: true, url: 'https://www.rome2rio.com', descricao: 'Mostra todas as formas de ir de um lugar a outro — avião, ônibus, trem, balsa — com tempos estimados.' },
          { nome: 'Parque Nacional do Iguaçu', tag: 'Ingresso pago', gratis: false, url: 'https://www.cataratasdoiguacu.com.br', descricao: 'Site oficial do lado brasileiro das cataratas, com horários, ingressos e passeios.' },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário do viajante',
        apoio: 'Conexão ou escala? No-show? Day use? Tudo explicado.',
        termos: [
          { termo: 'Alta e baixa temporada', definicao: 'Períodos de maior e menor procura. Na baixa, os preços caem e os lugares ficam mais vazios.' },
          { termo: 'Bate-volta', definicao: 'Viagem de ida e volta no mesmo dia.' },
          { termo: 'Conexão', definicao: 'Troca de avião numa cidade intermediária para seguir até o destino.' },
          { termo: 'Escala', definicao: 'Parada numa cidade intermediária sem trocar de avião.' },
          { termo: 'Voo direto', definicao: 'Voo sem troca de avião — pode ter escala. Sem nenhuma parada, é “sem escalas”.' },
          { termo: 'Stopover', definicao: 'Parada mais longa numa cidade de conexão, de propósito, para conhecê-la.' },
          { termo: 'Overbooking', definicao: 'Quando a companhia vende mais passagens que assentos. Quem fica de fora tem direito a assistência e compensação.' },
          { termo: 'No-show', definicao: 'Não comparecer ao voo ou à reserva sem cancelar. Pode gerar multa e cancelar os trechos seguintes.' },
          { termo: 'Bagagem de mão', definicao: 'A mala que vai com você na cabine, além de um item pessoal (bolsa ou mochila pequena). Confira peso e medidas da companhia.' },
          { termo: 'Bagagem despachada', definicao: 'A mala que vai no porão do avião. Em muitas tarifas, é cobrada à parte.' },
          { termo: 'Check-in e check-out', definicao: 'Registro de entrada e saída — no voo ou na hospedagem. Os horários do hotel costumam ser fixos.' },
          { termo: 'Traslado (transfer)', definicao: 'Transporte entre aeroporto, rodoviária e hospedagem.' },
          { termo: 'Voucher', definicao: 'Comprovante de um serviço já pago: passeio, hospedagem, ingresso.' },
          { termo: 'Day use', definicao: 'Usar a estrutura de um hotel ou resort durante o dia, sem dormir.' },
          { termo: 'All inclusive', definicao: 'Hospedagem com refeições e bebidas incluídas na diária.' },
          { termo: 'Hostel', definicao: 'Hospedagem econômica, com quartos compartilhados e áreas comuns.' },
          { termo: 'Pousada', definicao: 'Hospedagem menor e mais familiar, típica do litoral e das cidades históricas.' },
          { termo: 'Mochilão', definicao: 'Viagem longa e econômica, com pouca bagagem e roteiro flexível.' },
          { termo: 'Câmbio', definicao: 'A troca de moeda — e a cotação de uma moeda em relação a outra.' },
          { termo: 'IOF', definicao: 'Imposto federal cobrado em operações de câmbio e compras com cartão no exterior.' },
          { termo: 'Seguro-viagem', definicao: 'Cobre despesas médicas, bagagem e imprevistos. É obrigatório para entrar em vários países.' },
          { termo: 'Roaming', definicao: 'Usar o seu plano de celular fora da área da operadora, como no exterior. Pode sair caro.' },
          { termo: 'eSIM', definicao: 'Chip digital, instalado por QR code, que permite contratar internet no destino sem trocar de chip.' },
          { termo: 'Fuso horário', definicao: 'Diferença de horário entre regiões. O Brasil tem quatro fusos.' },
          { termo: 'Jet lag', definicao: 'Cansaço e sono desregulado depois de cruzar vários fusos de avião.' },
          { termo: 'Visto', definicao: 'Autorização de entrada emitida pelo país de destino, quando exigida.' },
          { termo: 'Espaço Schengen', definicao: 'Grupo de países europeus sem controle de fronteira entre si. Uma entrada vale para todos.' },
          { termo: 'Ecoturismo', definicao: 'Turismo em áreas naturais, com cuidado ambiental e educação.' },
          { termo: 'Turismo de base comunitária', definicao: 'Roteiros organizados pelas próprias comunidades locais — quilombolas, indígenas, ribeirinhas — com renda que fica no lugar.' },
          { termo: 'Unidade de conservação', definicao: 'Área protegida por lei, como parques nacionais. Muitas têm regras de visitação e trilhas guiadas.' },
          { termo: 'Guia credenciado', definicao: 'Guia de turismo com cadastro oficial (Cadastur). Em alguns parques, a companhia de guia é obrigatória.' },
          { termo: 'Cabeça d’água', definicao: 'Subida repentina e violenta do nível de um rio após chuva forte na cabeceira. Perigo real em cachoeiras e cânions.' },
        ],
      },
    ],
  },

  // ===========================================================================
  'bem-estar': {
    titulo: 'Kit de Bem-estar',
    apoio: 'Respiração guiada, pausas de alongamento para o dia a dia, um checklist para dormir melhor e onde buscar apoio — de graça.',
    blocos: [
      {
        tipo: 'respiracao',
        id: 'respiracao',
        aba: 'Respiração guiada',
        titulo: 'Respiração guiada',
        apoio: 'Escolha uma técnica e acompanhe o círculo: ele cresce quando você inspira e diminui quando solta o ar. Se sentir tontura ou desconforto, pare e respire normalmente.',
        tecnicas: [
          {
            nome: 'Respiração quadrada',
            descricao: 'Quatro tempos iguais — inspira, segura, solta, segura. Usada por atletas e equipes de emergência para retomar o controle em momentos de tensão.',
            fases: [
              { nome: 'Inspire', segundos: 4 },
              { nome: 'Segure', segundos: 4 },
              { nome: 'Expire', segundos: 4 },
              { nome: 'Segure', segundos: 4 },
            ],
            ciclos: 6,
          },
          {
            nome: '4-7-8',
            descricao: 'Inspire pelo nariz, segure e solte o ar devagar pela boca. A expiração longa ajuda a desacelerar — muita gente usa antes de dormir. Comece com poucos ciclos.',
            fases: [
              { nome: 'Inspire pelo nariz', segundos: 4 },
              { nome: 'Segure', segundos: 7 },
              { nome: 'Expire pela boca', segundos: 8 },
            ],
            ciclos: 4,
          },
          {
            nome: 'Respiração coerente',
            descricao: 'Cerca de seis respirações por minuto, num ritmo constante e confortável. Boa para alguns minutos de pausa no meio do dia.',
            fases: [
              { nome: 'Inspire', segundos: 5 },
              { nome: 'Expire', segundos: 5 },
            ],
            ciclos: 12,
          },
          {
            nome: 'Suspiro fisiológico',
            descricao: 'Duas inspirações pelo nariz — a segunda curtinha, para encher de vez o pulmão — e uma expiração longa pela boca. Um jeito rápido de baixar a tensão.',
            fases: [
              { nome: 'Inspire pelo nariz', segundos: 2 },
              { nome: 'Inspire mais um pouco', segundos: 1 },
              { nome: 'Expire devagar pela boca', segundos: 6 },
            ],
            ciclos: 5,
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'alongamento',
        aba: 'Pausas de alongamento',
        icone: 'activity',
        titulo: 'Pausas de alongamento',
        apoio: 'Para quem passa o dia sentado. Movimentos suaves, sem dor e sem balanço. Com lesão ou dor persistente, procure um profissional de saúde.',
        itens: [
          {
            titulo: 'Pescoço',
            tag: '1 min',
            texto: 'Sentado, coluna ereta, incline a orelha em direção ao ombro e segure de 20 a 30 segundos de cada lado. Não puxe a cabeça com a mão.',
            video: 'alongamento pescoço no trabalho',
          },
          {
            titulo: 'Ombros',
            tag: '1 min',
            texto: 'Gire os ombros para trás 10 vezes, bem devagar. Depois, cruze um braço na frente do peito e puxe levemente com o outro.',
            video: 'alongamento ombros no escritório',
          },
          {
            titulo: 'Punhos e mãos',
            tag: '1 min',
            texto: 'Para quem digita muito: braço esticado à frente, palma para fora, puxe os dedos para trás com a outra mão. Depois, palma para baixo. Uns 20 segundos cada.',
            video: 'alongamento punho e mãos para quem digita',
          },
          {
            titulo: 'Coluna: gato e vaca',
            tag: '1 min',
            texto: 'De quatro apoios (ou sentado, mãos nos joelhos), arredonde as costas ao soltar o ar e arqueie ao puxar, devagar, de 8 a 10 vezes.',
            video: 'gato vaca yoga como fazer',
          },
          {
            titulo: 'Peito e postura',
            tag: '1 min',
            texto: 'No batente de uma porta, apoie os antebraços e dê um passo à frente até sentir o peito abrir. Bom para quem passa o dia curvado.',
            video: 'alongamento peitoral na porta',
          },
          {
            titulo: 'Parte de trás da coxa',
            tag: '1 min',
            texto: 'Apoie o calcanhar num degrau baixo, perna esticada, e incline o tronco à frente com as costas retas até sentir a parte de trás da coxa.',
            video: 'alongamento posterior de coxa em pé',
          },
          {
            titulo: 'Quadril',
            tag: '1 min',
            texto: 'Em posição de avanço, com um joelho no chão (use uma almofada), leve o quadril à frente. Alonga a frente do quadril, que encurta quando ficamos muito sentados.',
            video: 'alongamento flexor do quadril',
          },
          {
            titulo: 'Panturrilha',
            tag: '1 min',
            texto: 'Mãos na parede, uma perna atrás esticada com o calcanhar no chão. Segure uns 30 segundos de cada lado.',
            video: 'alongamento panturrilha na parede',
          },
          {
            titulo: 'Olhos: regra 20-20-20',
            tag: '20 segundos',
            texto: 'A cada 20 minutos de tela, olhe para algo a uns 6 metros de distância por 20 segundos. E lembre de piscar.',
          },
          {
            titulo: 'Levante e caminhe',
            tag: '2 min',
            texto: 'A cada hora sentado, levante, beba água, suba uma escada ou dê uma volta. Mudar de posição conta tanto quanto alongar.',
          },
          {
            titulo: 'Sequência completa',
            tag: '10 min',
            texto: 'Tem mais tempo? Siga uma sequência guiada de corpo inteiro, no seu ritmo.',
            video: 'alongamento completo 10 minutos para fazer em casa',
          },
        ],
      },
      {
        tipo: 'checklist',
        id: 'sono',
        aba: 'Higiene do sono',
        icone: 'clock',
        titulo: 'Higiene do sono',
        apoio: 'Hábitos que ajudam a dormir melhor. A maioria dos adultos precisa de 7 a 9 horas por noite. Se a insônia persistir, converse com um profissional de saúde.',
        grupos: [
          {
            nome: 'Rotina',
            itens: [
              'Dormir e acordar em horários parecidos, inclusive no fim de semana',
              'Pegar luz natural logo pela manhã',
              'Mexer o corpo durante o dia (mas evitar exercício intenso perto de deitar)',
              'Se cochilar, que seja curto e antes do meio da tarde',
            ],
          },
          {
            nome: 'À tarde e à noite',
            itens: [
              'Evitar café, chá preto, mate e energéticos nas 6 horas antes de deitar',
              'Evitar álcool perto da hora de dormir — ele piora a qualidade do sono',
              'Jantar mais leve e sem pressa',
              'Criar um ritual de desaceleração: banho morno, leitura, luz baixa',
            ],
          },
          {
            nome: 'Telas',
            itens: ['Guardar o celular uns 30 a 60 minutos antes de dormir', 'Deixar o celular longe da cama', 'Ativar o modo “não perturbe” à noite'],
          },
          {
            nome: 'Quarto',
            itens: ['Quarto escuro (cortina ou máscara)', 'Silencioso (ou com ruído branco)', 'Temperatura fresca e confortável', 'Usar a cama só para dormir (e namorar)'],
          },
          {
            nome: 'Se o sono não vier',
            itens: [
              'Levantar depois de uns 20 minutos acordado e fazer algo calmo, com pouca luz',
              'Voltar para a cama só quando sentir sono',
              'Evitar olhar o relógio a noite toda',
            ],
          },
        ],
      },
      {
        tipo: 'recursos',
        id: 'apoio',
        aba: 'Onde buscar apoio',
        icone: 'heart',
        titulo: 'Onde buscar apoio',
        apoio: 'Ajuda gratuita para a saúde mental e para cuidar da rotina. Em emergência, ligue 192 (SAMU).',
        itens: [
          { nome: 'CVV — Centro de Valorização da Vida', tag: 'Ligue 188', gratis: true, url: 'https://cvv.org.br', descricao: 'Apoio emocional e prevenção do suicídio. Ligação gratuita para o 188, 24 horas por dia, ou chat pelo site. Atendimento sigiloso, por voluntários.' },
          { nome: 'Mapa da Saúde Mental', tag: 'Atendimento', gratis: true, url: 'https://mapasaudemental.com.br', descricao: 'Encontre atendimento psicológico gratuito ou de baixo custo e serviços públicos perto de você.' },
          { nome: 'Saúde mental no SUS', tag: 'Ministério da Saúde', gratis: true, url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-mental', descricao: 'Como funciona a rede pública de atenção psicossocial: UBS, CAPS e atendimento de urgência.' },
          { nome: 'Guia Alimentar para a População Brasileira', tag: 'Alimentação', gratis: true, url: 'https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_populacao_brasileira_2ed.pdf', descricao: 'O guia do Ministério da Saúde, referência internacional: prefira comida de verdade e evite ultraprocessados.' },
          { nome: 'Medito', tag: 'Meditação', gratis: true, url: 'https://meditofoundation.org', descricao: 'App de meditação totalmente gratuito, mantido por uma fundação sem fins lucrativos.' },
          { nome: 'Plum Village', tag: 'Meditação', gratis: true, url: 'https://plumvillage.app', descricao: 'App gratuito de meditação e atenção plena, da tradição do monge Thich Nhat Hanh.' },
          { nome: 'Insight Timer', tag: 'Meditação', gratis: true, url: 'https://insighttimer.com', descricao: 'Milhares de meditações guiadas gratuitas, inclusive em português. Tem plano pago opcional.' },
        ],
      },
    ],
  },

  // ===========================================================================
  arte: {
    titulo: 'Kit de Arte & Fotografia',
    apoio: 'Os movimentos que mudaram a arte, artistas brasileiros para conhecer, museus para visitar do sofá, fotografia com o celular e o vocabulário das exposições.',
    blocos: [
      {
        tipo: 'guia',
        id: 'movimentos',
        aba: 'Movimentos',
        icone: 'compass',
        titulo: 'Movimentos artísticos',
        apoio: 'Uma linha do tempo rápida, com o Brasil no mapa.',
        itens: [
          {
            titulo: 'Renascimento',
            tag: 'Séc. XV–XVI · Itália',
            texto: 'Perspectiva, anatomia e o ser humano no centro: Leonardo da Vinci, Michelangelo, Rafael.',
            video: 'Renascimento arte resumo',
          },
          {
            titulo: 'Barroco (e o barroco mineiro)',
            tag: 'Séc. XVII–XVIII',
            texto: 'Drama, movimento e luz. No Brasil, floresceu nas igrejas de Minas Gerais, com Aleijadinho e Mestre Ataíde, e nas igrejas douradas de Salvador.',
            video: 'Aleijadinho profetas Congonhas',
          },
          {
            titulo: 'Impressionismo',
            tag: 'Fim do séc. XIX · França',
            texto: 'Pintar ao ar livre a luz do momento, com pinceladas soltas: Monet, Renoir, Berthe Morisot. O nome veio de “Impressão, nascer do sol”, de Monet.',
            video: 'Impressionismo Monet explicação',
          },
          {
            titulo: 'Expressionismo',
            tag: 'Início do séc. XX',
            texto: 'Cores e formas distorcidas para expressar emoção: Munch (“O Grito”), Kirchner. No Brasil, Anita Malfatti e Lasar Segall.',
          },
          {
            titulo: 'Cubismo',
            tag: 'A partir de 1907 · Paris',
            texto: 'Picasso e Braque quebraram a perspectiva única e mostraram vários ângulos de um objeto ao mesmo tempo.',
          },
          {
            titulo: 'Modernismo brasileiro',
            tag: '1922 · São Paulo',
            texto: 'A Semana de Arte Moderna, no Theatro Municipal de São Paulo, lançou a busca por uma arte brasileira. Depois vieram Tarsila do Amaral e o Manifesto Antropófago (1928).',
            video: 'Semana de Arte Moderna de 1922 documentário',
          },
          {
            titulo: 'Surrealismo',
            tag: 'Anos 1920–30',
            texto: 'O sonho e o inconsciente na arte: Dalí, Magritte. No Brasil, Ismael Nery e a escultora Maria Martins.',
          },
          {
            titulo: 'Concretismo e Neoconcretismo',
            tag: 'Anos 1950 · Brasil',
            texto: 'Geometria e cor pura. Os neoconcretos, como Lygia Clark, Hélio Oiticica e Lygia Pape, chamaram o público a tocar e vestir a obra.',
            video: 'Neoconcretismo Lygia Clark Hélio Oiticica',
          },
          {
            titulo: 'Pop art',
            tag: 'Anos 1950–60',
            texto: 'Andy Warhol e Roy Lichtenstein levaram quadrinhos e publicidade ao museu. No Brasil, a nova figuração ganhou tom político, com Rubens Gerchman e Claudio Tozzi.',
          },
          {
            titulo: 'Arte contemporânea',
            tag: 'Dos anos 1960 até hoje',
            texto: 'Instalação, performance, vídeo e ideias acima do objeto. A Bienal de São Paulo (desde 1951) e Inhotim são vitrines no Brasil.',
          },
          {
            titulo: 'Grafite e arte urbana',
            tag: 'Dos anos 1970 até hoje',
            texto: 'Dos trens de Nova York aos muros de São Paulo, uma das capitais do grafite no mundo: OSGEMEOS, Eduardo Kobra, Nina Pandolfo.',
            video: 'grafite São Paulo Beco do Batman',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'artistas',
        aba: 'Artistas brasileiros',
        icone: 'palette',
        titulo: 'Artistas brasileiros para conhecer',
        apoio: 'Do barroco ao grafite, nomes que todo mundo deveria ver de perto.',
        itens: [
          { titulo: 'Aleijadinho', tag: 'Barroco mineiro', texto: 'Escultor e arquiteto; os 12 Profetas em pedra-sabão do santuário de Congonhas são sua obra máxima.', video: 'Aleijadinho documentário' },
          { titulo: 'Tarsila do Amaral', tag: 'Modernismo', texto: 'Pintou “Abaporu” (1928), que inspirou o Manifesto Antropófago e hoje está no MALBA, em Buenos Aires, e “Operários”. Cores caipiras e formas limpas.', video: 'Tarsila do Amaral Abaporu' },
          { titulo: 'Anita Malfatti', tag: 'Modernismo', texto: 'Sua exposição de 1917, atacada por Monteiro Lobato, virou estopim do modernismo. Obras como “A Boba” e “O Homem Amarelo”.' },
          { titulo: 'Candido Portinari', tag: 'Modernismo', texto: 'Retratou trabalhadores, retirantes e a infância no interior. Os painéis “Guerra e Paz” estão na sede da ONU, em Nova York.', video: 'Portinari Guerra e Paz painéis' },
          { titulo: 'Di Cavalcanti', tag: 'Modernismo', texto: 'Um dos idealizadores da Semana de 22, pintou o samba, a boemia e a gente do Rio com cores quentes.' },
          { titulo: 'Alfredo Volpi', tag: 'Moderna', texto: 'O pintor das bandeirinhas de festa junina, com têmpera preparada por ele mesmo.' },
          { titulo: 'Djanira', tag: 'Moderna', texto: 'Pintora que retratou o trabalho, as festas e a religiosidade do povo brasileiro.' },
          { titulo: 'Tomie Ohtake', tag: 'Abstração', texto: 'Nascida no Japão, chegou ao Brasil em 1936 e fez da cor e da curva sua marca, em telas e esculturas públicas.' },
          { titulo: 'Lygia Clark', tag: 'Neoconcretismo', texto: 'Dos “Bichos”, esculturas articuladas de metal, às propostas sensoriais: obras que só existem quando alguém participa.' },
          { titulo: 'Hélio Oiticica', tag: 'Neoconcretismo', texto: 'Criou os Parangolés, capas para vestir e dançar, e a instalação “Tropicália”, que deu nome ao movimento.', video: 'Hélio Oiticica Parangolé' },
          { titulo: 'Mestre Vitalino', tag: 'Arte popular', texto: 'Moldou em barro o cotidiano do agreste pernambucano, em Caruaru: retirantes, bandas de pífano, vaqueiros.' },
          { titulo: 'Rosana Paulino', tag: 'Contemporânea', texto: 'Costura, gravura e fotografia para falar da mulher negra e das marcas da escravidão no Brasil.' },
          { titulo: 'Sebastião Salgado', tag: 'Fotografia', texto: 'Fotógrafo de “Gênesis”, “Êxodos” e “Amazônia”, em preto e branco monumental. Com Lélia Wanick Salgado, criou o Instituto Terra, que reflorestou uma fazenda em Minas.', video: 'O Sal da Terra trailer Sebastião Salgado' },
          { titulo: 'Vik Muniz', tag: 'Contemporânea', texto: 'Recria imagens famosas com açúcar, chocolate, sucata e lixo — como no documentário “Lixo Extraordinário”.', video: 'Lixo Extraordinário trailer Vik Muniz' },
          { titulo: 'Adriana Varejão', tag: 'Contemporânea', texto: 'Azulejos, carne e barroco em obras sobre a história colonial. Tem uma galeria dedicada em Inhotim.' },
          { titulo: 'OSGEMEOS', tag: 'Arte urbana', texto: 'Os gêmeos Gustavo e Otavio Pandolfo, do Cambuci, em São Paulo: personagens amarelos em muros e museus do mundo todo.', video: 'OSGEMEOS documentário' },
        ],
      },
      {
        tipo: 'recursos',
        id: 'museus',
        aba: 'Museus online',
        icone: 'image',
        titulo: 'Museus para visitar online',
        apoio: 'Acervos digitalizados para explorar em alta resolução, de graça, do celular ou do computador.',
        itens: [
          { nome: 'Google Arts & Culture', tag: 'Online', gratis: true, url: 'https://artsandculture.google.com', descricao: 'Milhares de museus do mundo, com obras em altíssima resolução e passeios virtuais — inclusive de museus brasileiros.' },
          { nome: 'MASP', tag: 'São Paulo', gratis: true, url: 'https://masp.org.br', descricao: 'O acervo do museu da Avenida Paulista, com seus famosos cavaletes de vidro de Lina Bo Bardi, está disponível para consulta no site.' },
          { nome: 'Pinacoteca de São Paulo', tag: 'São Paulo', gratis: true, url: 'https://pinacoteca.org.br', descricao: 'O museu de arte mais antigo da cidade, com um grande acervo de arte brasileira.' },
          { nome: 'Inhotim', tag: 'Minas Gerais', gratis: true, url: 'https://www.inhotim.org.br', descricao: 'Arte contemporânea e jardim botânico em Brumadinho. O site traz as galerias, as obras e o acervo botânico.' },
          { nome: 'Museu Afro Brasil', tag: 'São Paulo', gratis: true, url: 'https://www.museuafrobrasil.org.br', descricao: 'No Parque Ibirapuera, dedicado à arte, à história e à memória afro-brasileira.' },
          { nome: 'Museu Oscar Niemeyer', tag: 'Curitiba', gratis: true, url: 'https://www.museuoscarniemeyer.org.br', descricao: 'O “Museu do Olho”, com artes visuais, arquitetura e design.' },
          { nome: 'MAM São Paulo', tag: 'São Paulo', gratis: true, url: 'https://mam.org.br', descricao: 'Museu de Arte Moderna no Ibirapuera, com arte moderna e contemporânea brasileira.' },
          { nome: 'MAM Rio', tag: 'Rio de Janeiro', gratis: true, url: 'https://mamrio.org.br', descricao: 'Museu de Arte Moderna no Aterro do Flamengo, em prédio de Affonso Eduardo Reidy.' },
          { nome: 'Instituto Tomie Ohtake', tag: 'São Paulo', gratis: true, url: 'https://www.institutotomieohtake.org.br', descricao: 'Exposições de arte, arquitetura e design e a obra da artista que dá nome ao instituto.' },
          { nome: 'Projeto Portinari', tag: 'Acervo digital', gratis: true, url: 'https://www.portinari.org.br', descricao: 'O catálogo da obra de Candido Portinari, com milhares de imagens, documentos e cartas.' },
          { nome: 'Enciclopédia Itaú Cultural', tag: 'Referência', gratis: true, url: 'https://enciclopedia.itaucultural.org.br', descricao: 'Verbetes sobre artistas, obras e movimentos da arte brasileira.' },
          { nome: 'Brasiliana Iconográfica', tag: 'Acervo digital', gratis: true, url: 'https://brasilianaiconografica.art.br', descricao: 'Pinturas, gravuras e desenhos sobre o Brasil dos séculos passados, reunidos de várias instituições.' },
          { nome: 'Rijksmuseum', tag: 'Amsterdã', gratis: true, url: 'https://www.rijksmuseum.nl/en', descricao: 'Rembrandt e Vermeer em altíssima resolução, com milhares de imagens livres para baixar.' },
          { nome: 'The Met', tag: 'Nova York', gratis: true, url: 'https://www.metmuseum.org', descricao: 'Centenas de milhares de obras com imagens em acesso aberto.' },
          { nome: 'MoMA', tag: 'Nova York', gratis: true, url: 'https://www.moma.org', descricao: 'A coleção de arte moderna e contemporânea do museu, com obras e textos online.' },
          { nome: 'Louvre', tag: 'Paris', gratis: true, url: 'https://collections.louvre.fr', descricao: 'A base de dados das coleções do Louvre, com centenas de milhares de obras.' },
          { nome: 'National Gallery', tag: 'Londres', gratis: true, url: 'https://www.nationalgallery.org.uk', descricao: 'Pintura europeia de Van Eyck a Van Gogh, com obras e visitas online.' },
        ],
      },
      {
        tipo: 'guia',
        id: 'fotografia-celular',
        aba: 'Foto com celular',
        icone: 'camera',
        titulo: 'Fotografia com o celular',
        apoio: 'Dicas que funcionam em qualquer aparelho, do básico ao modo Pro.',
        itens: [
          { titulo: 'Limpe a lente', tag: 'Básico', texto: 'A dica mais simples e mais ignorada: a lente vive engordurada no bolso. Uma passada de pano macio deixa a foto nítida na hora.' },
          { titulo: 'Ative a grade (regra dos terços)', tag: 'Composição', texto: 'Ligue a grade nas configurações da câmera. Coloque o assunto nos cruzamentos das linhas, não sempre no centro.', video: 'regra dos terços fotografia explicação' },
          { titulo: 'Procure a luz', tag: 'Luz', texto: 'Luz de janela e o fim de tarde, a “hora dourada”, valorizam qualquer rosto. Evite sol a pino e luz de teto, que criam sombras nos olhos.' },
          { titulo: 'Toque para focar e expor', tag: 'Técnica', texto: 'Toque no assunto para focar. Na maioria dos celulares, deslizar o dedo ajusta o brilho, e segurar trava foco e exposição.' },
          { titulo: 'Fuja do zoom digital', tag: 'Técnica', texto: 'Chegue mais perto com os pés. O zoom digital só corta a imagem e perde qualidade; use as lentes reais do aparelho (0,5×, 2×, 3×) quando houver.' },
          { titulo: 'Linhas e primeiro plano', tag: 'Composição', texto: 'Use estradas, trilhos, sombras e portas para guiar o olhar. Algo no primeiro plano dá profundidade à cena.' },
          { titulo: 'Modo retrato', tag: 'Técnica', texto: 'O desfoque de fundo funciona melhor com o assunto a um ou dois metros e o fundo bem longe.' },
          { titulo: 'HDR e contraluz', tag: 'Luz', texto: 'Com céu muito claro e sombras escuras, o HDR equilibra. Para uma silhueta, toque no céu para medir a luz por ele.' },
          { titulo: 'À noite', tag: 'Luz', texto: 'Apoie o celular (ou use um tripé) e o modo noite; fique firme durante toda a captura.' },
          { titulo: 'Modo Pro e RAW', tag: 'Avançado', texto: 'Se o celular tiver, o modo Pro (ou Manual) controla ISO e velocidade, e o formato RAW guarda mais informação para editar.', video: 'modo pro câmera celular ISO velocidade explicação' },
          { titulo: 'Edite com leveza', tag: 'Edição', texto: 'Apps como Snapseed (grátis) e Lightroom (com versão gratuita) resolvem quase tudo: endireitar, recortar, ajustar luz e cor. Menos é mais.' },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário de arte e fotografia',
        apoio: 'Da aquarela ao bokeh: o vocabulário dos ateliês, das exposições e das câmeras.',
        termos: [
          { termo: 'Abstração', definicao: 'Arte que não representa figuras reconhecíveis: trabalha com formas, cores e linhas em si.' },
          { termo: 'Figurativo', definicao: 'Arte que representa pessoas, objetos e paisagens reconhecíveis.' },
          { termo: 'Óleo sobre tela', definicao: 'Pintura com pigmentos misturados a óleo, de secagem lenta, que permite camadas e fusões.' },
          { termo: 'Acrílica', definicao: 'Tinta à base de resina acrílica e água: seca rápido e fica resistente.' },
          { termo: 'Aquarela', definicao: 'Pintura com pigmentos diluídos em água, transparentes, geralmente sobre papel.' },
          { termo: 'Guache', definicao: 'Tinta à base de água, mais opaca e encorpada que a aquarela.' },
          { termo: 'Têmpera', definicao: 'Tinta com pigmentos misturados a um aglutinante como a gema de ovo. Volpi preparava a sua.' },
          { termo: 'Afresco', definicao: 'Pintura feita sobre a parede com o reboco ainda úmido, como na Capela Sistina.' },
          { termo: 'Claro-escuro', definicao: 'Contraste forte entre luz e sombra para dar volume e drama. Caravaggio é mestre.' },
          { termo: 'Perspectiva', definicao: 'Técnica para representar profundidade numa superfície plana.' },
          { termo: 'Ponto de fuga', definicao: 'O ponto no horizonte para onde as linhas paralelas parecem convergir.' },
          { termo: 'Composição', definicao: 'A organização dos elementos dentro do quadro ou da foto.' },
          { termo: 'Paleta', definicao: 'O conjunto de cores usado numa obra — e a placa onde o pintor mistura as tintas.' },
          { termo: 'Readymade', definicao: 'Objeto comum apresentado como obra de arte. O urinol “A Fonte”, de Duchamp (1917), é o mais famoso.' },
          { termo: 'Instalação', definicao: 'Obra que ocupa e transforma um espaço, para ser percorrida pelo público.' },
          { termo: 'Performance', definicao: 'Obra feita com o corpo do artista, ao vivo, diante do público.' },
          { termo: 'Site-specific', definicao: 'Obra criada para um lugar específico, que perde o sentido fora dele.' },
          { termo: 'Curadoria', definicao: 'A seleção e organização das obras de uma exposição. Quem faz é o curador.' },
          { termo: 'Vernissage', definicao: 'A abertura de uma exposição, geralmente com convidados e artistas.' },
          { termo: 'Bienal', definicao: 'Exposição que acontece a cada dois anos. A Bienal de São Paulo existe desde 1951.' },
          { termo: 'Xilogravura', definicao: 'Gravura feita em matriz de madeira entalhada. Ilustra as capas dos folhetos de cordel.' },
          { termo: 'Serigrafia', definicao: 'Impressão por tela de tecido vazado. Warhol a tornou famosa.' },
          { termo: 'Litografia', definicao: 'Gravura feita a partir de desenho sobre pedra calcária, baseada na repulsão entre água e gordura.' },
          { termo: 'Biscoito', definicao: 'Na cerâmica, a peça depois da primeira queima, ainda sem esmalte.' },
          { termo: 'Esmalte', definicao: 'Camada vítrea aplicada à cerâmica antes da segunda queima, que dá cor e impermeabiliza.' },
          { termo: 'Abertura', definicao: 'Na fotografia, o tamanho do orifício por onde a luz entra (f/1.8, f/8). Abertura maior desfoca mais o fundo.' },
          { termo: 'Velocidade do obturador', definicao: 'Por quanto tempo o sensor recebe luz. Rápida congela o movimento; lenta cria rastros.' },
          { termo: 'ISO', definicao: 'Sensibilidade do sensor à luz. ISO alto clareia no escuro, mas aumenta o ruído.' },
          { termo: 'Exposição', definicao: 'A quantidade de luz que forma a foto: resultado da abertura, da velocidade e do ISO.' },
          { termo: 'Profundidade de campo', definicao: 'A faixa da imagem que aparece nítida, da frente ao fundo.' },
          { termo: 'Bokeh', definicao: 'A qualidade do desfoque do fundo, como as bolinhas de luz desfocadas.' },
          { termo: 'Hora dourada', definicao: 'O período logo depois do nascer e antes do pôr do sol, de luz quente e suave.' },
          { termo: 'Regra dos terços', definicao: 'Dividir o quadro em nove partes e posicionar o assunto nas linhas ou nos cruzamentos.' },
          { termo: 'RAW', definicao: 'Arquivo “cru” da câmera, com toda a informação do sensor, ideal para edição.' },
        ],
      },
    ],
  },

  // ===========================================================================
  cultura: {
    titulo: 'Kit de Cultura',
    apoio: 'As festas populares do país, os patrimônios da UNESCO no Brasil, onde encontrar cultura de graça e o vocabulário da cultura popular.',
    blocos: [
      {
        tipo: 'guia',
        id: 'festas',
        aba: 'Festas populares',
        icone: 'masks',
        titulo: 'Festas populares do Brasil',
        apoio: 'Um calendário afetivo do país, de janeiro a dezembro. Toque em “Assistir aqui” para sentir o clima.',
        itens: [
          {
            titulo: 'Lavagem do Bonfim',
            tag: 'Janeiro · Salvador',
            texto: 'Baianas vestidas de branco lavam as escadarias da Igreja do Senhor do Bonfim com água de cheiro, depois de um cortejo de cerca de 8 km que sai da Conceição da Praia.',
            video: 'Lavagem do Bonfim Salvador cortejo baianas',
          },
          {
            titulo: 'Festa de Iemanjá',
            tag: '2 de fevereiro · Salvador',
            texto: 'No bairro do Rio Vermelho, milhares de pessoas levam flores e presentes à Rainha do Mar, orixá das águas salgadas.',
            video: 'Festa de Iemanjá Rio Vermelho Salvador',
          },
          {
            titulo: 'Carnaval',
            tag: 'Fevereiro ou março · Brasil inteiro',
            texto: 'Desfiles das escolas de samba no Rio e em São Paulo, trios elétricos em Salvador, frevo e bonecos gigantes em Olinda e no Recife, blocos de rua em todo o país.',
            video: 'desfile escola de samba Sapucaí',
          },
          {
            titulo: 'Festa do Divino',
            tag: 'Maio ou junho · Pirenópolis, Paraty e outras',
            texto: 'Celebração do Espírito Santo, com folias, imperador e — em Pirenópolis (GO) — as Cavalhadas, encenação das batalhas entre mouros e cristãos.',
            video: 'Cavalhadas de Pirenópolis Festa do Divino',
          },
          {
            titulo: 'Festa junina e São João',
            tag: 'Junho · Nordeste e país inteiro',
            texto: 'Quadrilha, fogueira, forró, milho, pamonha e quentão. Campina Grande (PB) e Caruaru (PE) disputam o título de maior São João do mundo.',
            video: 'São João Campina Grande quadrilha junina',
          },
          {
            titulo: 'Bumba meu boi do Maranhão',
            tag: 'Junho · São Luís',
            texto: 'O auto do boi que morre e ressuscita, em diferentes sotaques — matraca, zabumba, orquestra e outros. Patrimônio Imaterial da Humanidade pela UNESCO desde 2019.',
            video: 'bumba meu boi Maranhão sotaque de matraca',
          },
          {
            titulo: 'Festival de Parintins',
            tag: 'Fim de junho · Amazonas',
            texto: 'No Bumbódromo, os bois Garantido (vermelho) e Caprichoso (azul) disputam três noites de toadas, alegorias gigantes e lendas amazônicas.',
            video: 'Festival de Parintins Garantido Caprichoso',
          },
          {
            titulo: 'Festa do Peão de Barretos',
            tag: 'Agosto · São Paulo',
            texto: 'Um dos maiores rodeios do mundo, com provas de montaria, queima do alho e shows de música sertaneja.',
            video: 'Festa do Peão de Barretos rodeio',
          },
          {
            titulo: 'Círio de Nazaré',
            tag: '2º domingo de outubro · Belém',
            texto: 'Uma das maiores procissões católicas do mundo, com a corda puxada por promesseiros. Patrimônio Imaterial da Humanidade pela UNESCO desde 2013.',
            video: 'Círio de Nazaré Belém procissão corda',
          },
          {
            titulo: 'Oktoberfest de Blumenau',
            tag: 'Outubro · Santa Catarina',
            texto: 'Uma das maiores festas de tradição alemã fora da Alemanha, realizada desde 1984, com música típica, desfiles e a culinária da imigração.',
            video: 'Oktoberfest Blumenau desfile',
          },
          {
            titulo: 'Congado e Reinado',
            tag: 'Ao longo do ano · Minas Gerais',
            texto: 'Cortejos com reis e rainhas negros, tambores e danças em louvor a Nossa Senhora do Rosário, São Benedito e Santa Ifigênia.',
            video: 'Congado Minas Gerais festa do Rosário',
          },
          {
            titulo: 'Folia de Reis',
            tag: '24 de dezembro a 6 de janeiro',
            texto: 'Grupos de foliões com bandeira, viola e palhaços mascarados visitam as casas cantando a jornada dos Reis Magos — sobretudo em Minas, Goiás, São Paulo e no Rio.',
            video: 'Folia de Reis cantoria tradicional',
          },
          {
            titulo: 'Réveillon',
            tag: '31 de dezembro · Litoral',
            texto: 'Roupa branca, sete ondas puladas para Iemanjá e fogos na praia. Em Copacabana, milhões de pessoas viram o ano na areia.',
            video: 'Réveillon Copacabana fogos',
          },
        ],
      },
      {
        tipo: 'guia',
        id: 'unesco',
        aba: 'Patrimônios UNESCO',
        icone: 'globe',
        titulo: 'Patrimônios da UNESCO no Brasil',
        apoio: 'Os lugares brasileiros na Lista do Patrimônio Mundial, com o ano de inscrição. Uma lista de viagens para a vida.',
        itens: [
          { titulo: 'Ouro Preto (MG)', tag: 'Cultural · 1980', texto: 'O primeiro sítio brasileiro da lista: a cidade do ouro, do barroco e da Inconfidência Mineira.', video: 'Ouro Preto patrimônio mundial' },
          { titulo: 'Olinda (PE)', tag: 'Cultural · 1982', texto: 'Ladeiras, igrejas e casario colonial com vista para o Recife.' },
          { titulo: 'Missões Jesuíticas Guarani (RS)', tag: 'Cultural · 1983', texto: 'As ruínas de São Miguel Arcanjo, das antigas reduções jesuítico-guaranis — sítio compartilhado com a Argentina.' },
          { titulo: 'Centro Histórico de Salvador (BA)', tag: 'Cultural · 1985', texto: 'O Pelourinho e a primeira capital do Brasil, com um dos maiores conjuntos de arquitetura colonial das Américas.' },
          { titulo: 'Santuário do Bom Jesus de Congonhas (MG)', tag: 'Cultural · 1985', texto: 'Os 12 Profetas de Aleijadinho em pedra-sabão e as capelas dos Passos da Paixão.' },
          { titulo: 'Parque Nacional do Iguaçu (PR)', tag: 'Natural · 1986', texto: 'As cataratas e a Mata Atlântica em volta, na fronteira com a Argentina.' },
          { titulo: 'Brasília (DF)', tag: 'Cultural · 1987', texto: 'A capital planejada de Lucio Costa e Oscar Niemeyer, inaugurada em 1960.', video: 'Brasília arquitetura Niemeyer Lucio Costa' },
          { titulo: 'Serra da Capivara (PI)', tag: 'Cultural · 1991', texto: 'Uma das maiores concentrações de pinturas rupestres das Américas, estudada por décadas pela arqueóloga Niède Guidon.', video: 'Serra da Capivara pinturas rupestres' },
          { titulo: 'Centro Histórico de São Luís (MA)', tag: 'Cultural · 1997', texto: 'Casarões coloniais cobertos de azulejos portugueses.' },
          { titulo: 'Diamantina (MG)', tag: 'Cultural · 1999', texto: 'A cidade dos diamantes, das serestas e de Chica da Silva, no alto da Serra do Espinhaço.' },
          { titulo: 'Mata Atlântica: Costa do Descobrimento e Reservas do Sudeste', tag: 'Natural · 1999', texto: 'Dois conjuntos de reservas na Bahia, no Espírito Santo, em São Paulo e no Paraná, com um dos biomas mais ricos — e ameaçados — do planeta.' },
          { titulo: 'Complexo de Conservação da Amazônia Central (AM)', tag: 'Natural · 2000', texto: 'Um dos maiores conjuntos de áreas protegidas da floresta tropical, com o Parque Nacional do Jaú.' },
          { titulo: 'Pantanal (MT e MS)', tag: 'Natural · 2000', texto: 'A Área de Conservação do Pantanal, na maior planície alagável do planeta.' },
          { titulo: 'Fernando de Noronha e Atol das Rocas', tag: 'Natural · 2001', texto: 'Ilhas oceânicas com golfinhos, tartarugas e aves marinhas.' },
          { titulo: 'Chapada dos Veadeiros e Parque Nacional das Emas (GO)', tag: 'Natural · 2001', texto: 'As áreas protegidas do Cerrado, a savana mais rica em espécies do mundo.' },
          { titulo: 'Cidade de Goiás (GO)', tag: 'Cultural · 2001', texto: 'A antiga capital goiana, terra da poeta Cora Coralina.' },
          { titulo: 'Praça São Francisco, em São Cristóvão (SE)', tag: 'Cultural · 2010', texto: 'Um conjunto de edifícios dos séculos XVII e XVIII em torno de uma praça, numa das cidades mais antigas do país.' },
          { titulo: 'Rio de Janeiro: paisagens cariocas', tag: 'Cultural · 2012', texto: 'As paisagens entre a montanha e o mar — Pão de Açúcar, Corcovado, Floresta da Tijuca, Copacabana —, primeira paisagem urbana inscrita como paisagem cultural.' },
          { titulo: 'Conjunto Moderno da Pampulha (MG)', tag: 'Cultural · 2016', texto: 'Niemeyer, Burle Marx e Portinari em Belo Horizonte, com a Igreja de São Francisco de Assis.' },
          { titulo: 'Cais do Valongo (RJ)', tag: 'Cultural · 2017', texto: 'Principal porto de chegada de africanos escravizados nas Américas; lugar de memória da diáspora africana.' },
          { titulo: 'Paraty e Ilha Grande (RJ)', tag: 'Misto · 2019', texto: 'O primeiro sítio misto — cultural e natural — do Brasil.' },
          { titulo: 'Sítio Roberto Burle Marx (RJ)', tag: 'Cultural · 2021', texto: 'A casa e o jardim-laboratório do paisagista, com milhares de espécies de plantas.' },
          { titulo: 'Lençóis Maranhenses (MA)', tag: 'Natural · 2024', texto: 'Dunas brancas e lagoas de água da chuva, uma paisagem única no mundo.', video: 'Lençóis Maranhenses lagoas documentário' },
          {
            titulo: 'Patrimônio imaterial',
            tag: 'Tradições vivas',
            texto: 'Também estão nas listas da UNESCO o samba de roda do Recôncavo Baiano, o frevo, a roda de capoeira, o Círio de Nazaré, o complexo cultural do bumba meu boi do Maranhão e a arte gráfica dos Wajãpi.',
          },
        ],
      },
      {
        tipo: 'recursos',
        id: 'onde',
        aba: 'Cultura de graça',
        icone: 'ticket',
        titulo: 'Onde encontrar cultura de graça',
        apoio: 'Instituições e acervos com programação e conteúdo gratuitos — online e, muitas vezes, presencial.',
        itens: [
          { nome: 'Itaú Cultural', tag: 'São Paulo e online', gratis: true, url: 'https://www.itaucultural.org.br', descricao: 'Exposições, shows e debates gratuitos na Avenida Paulista e muito conteúdo online.' },
          { nome: 'Sesc São Paulo', tag: 'Programação', gratis: true, url: 'https://www.sescsp.org.br', descricao: 'Programação cultural enorme, com muitas atividades gratuitas ou a preços populares nas unidades.' },
          { nome: 'Sesc (nacional)', tag: 'Brasil inteiro', gratis: true, url: 'https://www.sesc.com.br', descricao: 'O portal do Sesc em todos os estados, com agenda cultural, bibliotecas e esporte.' },
          { nome: 'Sesc Digital', tag: 'Online', gratis: true, url: 'https://sesc.digital', descricao: 'Shows, espetáculos, palestras e cursos para ver de graça.' },
          { nome: 'IPHAN', tag: 'Patrimônio', gratis: true, url: 'https://www.gov.br/iphan/pt-br', descricao: 'O instituto que protege o patrimônio histórico e artístico nacional, com a lista de bens tombados e registrados.' },
          { nome: 'Centro Nacional de Folclore e Cultura Popular', tag: 'Cultura popular', gratis: true, url: 'https://www.cnfcp.gov.br', descricao: 'Museu, biblioteca e pesquisas sobre as festas, os saberes e a arte do povo brasileiro.' },
          { nome: 'Museu da Língua Portuguesa', tag: 'São Paulo', gratis: true, url: 'https://www.museudalinguaportuguesa.org.br', descricao: 'Na Estação da Luz, um museu interativo sobre o nosso idioma.' },
          { nome: 'Museu Afro Brasil', tag: 'São Paulo', gratis: true, url: 'https://www.museuafrobrasil.org.br', descricao: 'Arte, história e memória afro-brasileira no Parque Ibirapuera.' },
          { nome: 'Museu do Amanhã', tag: 'Rio de Janeiro', gratis: true, url: 'https://museudoamanha.org.br', descricao: 'Museu de ciências na Praça Mauá, sobre os futuros possíveis do planeta.' },
          { nome: 'Fundação Cultural Palmares', tag: 'Cultura afro-brasileira', gratis: true, url: 'https://www.gov.br/palmares/pt-br', descricao: 'Instituição federal dedicada à cultura afro-brasileira e às comunidades quilombolas.' },
          { nome: 'Brasiliana Iconográfica', tag: 'Acervo digital', gratis: true, url: 'https://brasilianaiconografica.art.br', descricao: 'Imagens históricas do Brasil — pinturas, gravuras, desenhos — reunidas de várias instituições.' },
          { nome: 'Patrimônio Mundial no Brasil', tag: 'UNESCO', gratis: true, url: 'https://whc.unesco.org/en/statesparties/br', descricao: 'A lista oficial dos sítios brasileiros inscritos como Patrimônio Mundial (em inglês).' },
          { nome: 'Patrimônio Imaterial no Brasil', tag: 'UNESCO', gratis: true, url: 'https://ich.unesco.org/en/state/brazil-BR', descricao: 'As tradições brasileiras reconhecidas pela UNESCO, com vídeos e dossiês (em inglês).' },
        ],
      },
      {
        tipo: 'glossario',
        id: 'glossario',
        aba: 'Glossário',
        titulo: 'Glossário da cultura popular',
        apoio: 'Cordel, jongo, mamulengo, tombamento: as palavras das festas, dos terreiros e dos museus.',
        termos: [
          { termo: 'Patrimônio imaterial', definicao: 'Saberes, celebrações, formas de expressão e lugares que uma comunidade reconhece como parte da sua identidade — como o frevo e o ofício das baianas de acarajé.' },
          { termo: 'Tombamento', definicao: 'Proteção legal de um bem material (prédio, conjunto urbano, obra) contra destruição ou descaracterização.' },
          { termo: 'Registro', definicao: 'O instrumento que reconhece oficialmente um bem imaterial, como o samba de roda ou a capoeira, no Brasil.' },
          { termo: 'IPHAN', definicao: 'Instituto do Patrimônio Histórico e Artístico Nacional, criado em 1937, que tomba e registra os bens culturais do país.' },
          { termo: 'Cordel', definicao: 'Poesia popular impressa em folhetos, com capas em xilogravura, vendida em feiras. É patrimônio cultural do Brasil.' },
          { termo: 'Repente', definicao: 'Poesia improvisada e cantada em desafio por dois repentistas.' },
          { termo: 'Embolada', definicao: 'Canto rápido e improvisado, acompanhado de pandeiro, com trava-línguas e humor.' },
          { termo: 'Capoeira', definicao: 'Luta, dança, música e jogo de origem afro-brasileira. A roda de capoeira é Patrimônio Imaterial da Humanidade.' },
          { termo: 'Capoeira Angola e Regional', definicao: 'Angola é o estilo mais tradicional, cadenciado, associado a Mestre Pastinha; Regional, criada por Mestre Bimba, é mais rápida e sistematizada.' },
          { termo: 'Jongo', definicao: 'Dança de roda com tambores e versos enigmáticos (os pontos), trazida por africanos bantos ao Sudeste. Patrimônio cultural do Brasil.' },
          { termo: 'Samba de roda', definicao: 'Samba do Recôncavo Baiano, com palmas, viola e dança no meio da roda. Patrimônio Imaterial da Humanidade.' },
          { termo: 'Maracatu', definicao: 'Cortejo pernambucano com rei, rainha, damas de paço e tambores (alfaias).' },
          { termo: 'Caboclo de lança', definicao: 'Figura do maracatu rural, com cabeleira de papel celofane, gola bordada e lança enfeitada.' },
          { termo: 'Mamulengo', definicao: 'Teatro de bonecos popular de Pernambuco, com humor e improviso.' },
          { termo: 'Reisado', definicao: 'Folguedo natalino do Nordeste que encena a visita dos Reis Magos, com música e dança.' },
          { termo: 'Folia de Reis', definicao: 'Grupo de cantadores que percorre as casas entre o Natal e o Dia de Reis, com bandeira e viola.' },
          { termo: 'Congado', definicao: 'Celebração afro-brasileira com cortejos de reis e rainhas, tambores e danças, forte em Minas Gerais.' },
          { termo: 'Quadrilha', definicao: 'Dança das festas juninas, com casamento caipira e marcações vindas da quadrilha francesa (“anarriê”, “alavantu”).' },
          { termo: 'Cavalhada', definicao: 'Encenação a cavalo das batalhas entre mouros e cristãos, famosa em Pirenópolis (GO).' },
          { termo: 'Toada', definicao: 'A música do boi-bumbá de Parintins e do bumba meu boi.' },
          { termo: 'Sotaque', definicao: 'No bumba meu boi do Maranhão, cada estilo de grupo, com instrumentos e ritmos próprios (matraca, zabumba, orquestra…).' },
          { termo: 'Carranca', definicao: 'Escultura de madeira com cara de bicho ou gente na proa dos barcos do rio São Francisco, para “espantar maus espíritos”.' },
          { termo: 'Renda de bilro', definicao: 'Renda feita à mão com bilros (pequenos fusos de madeira) sobre uma almofada, tradição de rendeiras do litoral nordestino e de Santa Catarina.' },
          { termo: 'Bumbódromo', definicao: 'A arena do Festival de Parintins, onde Garantido e Caprichoso se apresentam.' },
          { termo: 'Sambódromo', definicao: 'Passarela dos desfiles das escolas de samba. O do Rio, projetado por Niemeyer, foi inaugurado em 1984.' },
          { termo: 'Samba-enredo', definicao: 'O samba que cada escola compõe para contar o tema (enredo) do seu desfile.' },
          { termo: 'Comissão de frente', definicao: 'O grupo que abre o desfile da escola de samba, apresentando a agremiação e o enredo.' },
          { termo: 'Mestre-sala e porta-bandeira', definicao: 'O casal que conduz e protege o pavilhão (a bandeira) da escola de samba.' },
          { termo: 'Ala das baianas', definicao: 'Ala obrigatória nos desfiles do Rio, homenagem às tias baianas que ajudaram a criar o samba.' },
          { termo: 'Quilombo', definicao: 'Comunidade formada por pessoas escravizadas que fugiram e resistiram — e, hoje, as comunidades remanescentes com direito à terra.' },
          { termo: 'Griô', definicao: 'Mestre da tradição oral, guardião de histórias, cantos e saberes de uma comunidade, na herança africana.' },
        ],
      },
    ],
  },
};

/** O kit de um tema (sempre existe para os 12 temas). */
export function kitDoTema(tema: CategorySlug): Kit | undefined {
  return KITS[tema];
}
