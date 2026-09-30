// Cada adesivo pertence a um tema, e o tema define a estética inteira do
// convite: cores, fontes, textura, ornamentos e o próprio texto. Os valores
// foram tirados dos adesivos (cores medidas nas pranchas, tipografia escolhida
// para imitar a letra de cada um).

export type FontKey =
  | 'archivo' | 'archivo-semibold' | 'archivo-regular' | 'archivo-black' | 'archivo-condensed'
  | 'anton' | 'bangers' | 'silkscreen' | 'silkscreen-bold' | 'vt323' | 'yellowtail' | 'permanent-marker'
  | 'space-mono' | 'space-mono-bold' | 'dm-serif' | 'dm-serif-italic' | 'special-elite' | 'rubik-wet-paint'
  | 'dela-gothic' | 'bungee-shade' | 'black-ops' | 'press-start' | 'caveat';

export const FONT_FILES: Record<FontKey, string> = {
  archivo: 'archivo-extrabold.ttf', 'archivo-semibold': 'archivo-semibold.ttf', 'archivo-regular': 'archivo-regular.ttf',
  'archivo-black': 'archivo-black.ttf', 'archivo-condensed': 'archivo-condensed.ttf', anton: 'anton.ttf', bangers: 'bangers.ttf',
  silkscreen: 'silkscreen.ttf', 'silkscreen-bold': 'silkscreen-bold.ttf', vt323: 'vt323.ttf', yellowtail: 'yellowtail.ttf',
  'permanent-marker': 'permanent-marker.ttf', 'space-mono': 'space-mono.ttf', 'space-mono-bold': 'space-mono-bold.ttf',
  'dm-serif': 'dm-serif.ttf', 'dm-serif-italic': 'dm-serif-italic.ttf', 'special-elite': 'special-elite.ttf',
  'rubik-wet-paint': 'rubik-wet-paint.ttf', 'dela-gothic': 'dela-gothic.ttf', 'bungee-shade': 'bungee-shade.ttf',
  'black-ops': 'black-ops.ttf', 'press-start': 'press-start.ttf', caveat: 'caveat.ttf',
};

export type TexKey =
  | 'lona' | 'couro-preto' | 'couro-azul' | 'couro-vermelho' | 'couro-oliva' | 'couro-caramelo' | 'couro-marinho'
  | 'marmore' | 'rachado' | 'papel' | 'concreto' | 'ondas' | 'topo' | 'holo' | 'nuvem' | 'pincel' | 'rabisco';

export const TEX_FILES: Record<TexKey, string> = {
  lona: 'lona.jpg', 'couro-preto': 'couro-preto.jpg', 'couro-azul': 'couro-azul.jpg', 'couro-vermelho': 'couro-vermelho.jpg',
  'couro-oliva': 'couro-oliva.jpg', 'couro-caramelo': 'couro-caramelo.jpg', 'couro-marinho': 'couro-marinho.jpg',
  marmore: 'marmore.jpg', rachado: 'rachado.jpg', papel: 'papel.jpg', concreto: 'concreto.jpg', ondas: 'ondas.jpg',
  topo: 'topo.jpg', holo: 'holo.jpg', nuvem: 'nuvem.jpg', pincel: 'pincel.png', rabisco: 'rabisco.png',
};

export type Efeito = 'contorno' | 'sombra3d' | 'relevo' | 'holo' | 'cromo' | 'brilho' | 'repeticao' | 'recorte' | 'fita';

export type Ornamento =
  | { t: 'barra'; cor: string; espessura?: number }            // a barra diagonal do logo
  | { t: 'ponto'; cor: string }                                  // ponto de gravação vermelho
  | { t: 'halftone'; cor: string }                               // retícula de quadrinhos
  | { t: 'explosao'; cores: [string, string, string] }          // balão "POW" atrás do adesivo
  | { t: 'estrelas'; cor: string }
  | { t: 'xadrez'; cor: string }                                 // faixas quadriculadas
  | { t: 'globo'; cor: string; opacidade?: number }             // globo em arame
  | { t: 'anel'; texto: string; cor: string; fundo?: string }    // texto circular do selo
  | { t: 'oval'; cor: string }
  | { t: 'orbitas'; cor: string }
  | { t: 'grade'; cor: string; passo?: number }
  | { t: 'cantos'; cor: string }                                 // marcas de registro
  | { t: 'cotas'; cor: string }                                  // linhas de cota de projeto
  | { t: 'raios'; cor: string }                                  // op-art radial
  | { t: 'painel'; textura: TexKey }                             // textura só atrás do adesivo
  | { t: 'pincelada' }                                           // faixa de pincel atrás do título
  | { t: 'rabisco' }                                             // rabisco vermelho
  | { t: 'carregando'; cor: string; fundo: string }             // barra de loading 8-bit
  | { t: 'pixels'; cor: string }
  | { t: 'pontilhado'; cor: string }                             // matriz de LED
  | { t: 'arco-iris' }
  | { t: 'scanlines'; cor: string }
  | { t: 'codigo-barras'; cor: string }
  | { t: 'campos'; cor: string }                                 // campos da etiqueta de envio
  | { t: 'sol'; cor: string; tinta: string }                     // sol e montanha
  | { t: 'katakana'; cor: string }
  | { t: 'velocidade'; cor: string }                             // linhas de ação do mangá
  | { t: 'tag'; texto: string; cor: string; tinta: string }
  | { t: 'mira'; cor: string }
  | { t: 'carimbo'; texto: string; cor: string }
  | { t: 'tarja'; cor: string; tinta: string }
  | { t: 'doodles'; cor: string }                                // traços de energia
  | { t: 'gotas'; cor: string }
  | { t: 'lacos'; cor: string }
  | { t: 'sublinhado'; cor: string }
  | { t: 'circulos'; cores: string[] }
  | { t: 'costura'; cor: string }
  | { t: 'filete'; cor: string };

export interface Theme {
  nome: string;
  fundo: string;
  gradiente?: string;
  textura?: TexKey;
  texturaOpacidade?: number;
  tinta: string;
  suave: string;
  destaque: string;
  sobreDestaque: string;
  titulo: {
    texto: string; fonte: FontKey; tamanho: number; caixaAlta?: boolean; espacamento?: number;
    altura?: number; efeito?: Efeito; cor?: string; inclinado?: boolean;
  };
  corpo: FontKey;
  rotulo: FontKey;
  linha: string;
  rodape: string;
  ornamentos?: Ornamento[];
  espelhar?: boolean;
  moldura?: 'costura' | 'etiqueta' | 'borda';
  // Outros títulos do mesmo tema, para adesivos diferentes não repetirem a frase.
  variacoes?: { titulo: string; linha?: string }[];
}

const CREME = '#f2ecdf';
const PRETO = '#0d0d0f';
const VERMELHO = '#ff3419';
const AZUL = '#1f4ff5';
const TAGS = 'PESSOAS · CULTURA · DESCOBERTAS · CONEXÕES';

const patch = (nome: string, textura: TexKey, tinta: string, suave: string, linha: string, costura: string, destaque = VERMELHO): Theme => ({
  nome, fundo: '#222', textura, texturaOpacidade: 1, tinta, suave, destaque, sobreDestaque: '#fff',
  titulo: { texto: 'Costurado sob medida.', fonte: 'archivo-black', tamanho: 74, altura: 1, efeito: 'relevo' },
  corpo: 'archivo-semibold', rotulo: 'archivo', linha, rodape: TAGS, moldura: 'costura',
  ornamentos: [{ t: 'costura', cor: costura }, { t: 'filete', cor: destaque }],
  variacoes: [
    { titulo: 'Costurado sob medida.' }, { titulo: 'Um distintivo só seu.' }, { titulo: 'Ponto por ponto, até você.' },
    { titulo: 'Pregue na sua jaqueta.' }, { titulo: 'Bordado com o seu nome.' }, { titulo: 'Feito para durar.' },
  ],
});

const selo = (nome: string, fundo: string, tinta: string, suave: string): Theme => ({
  nome, fundo, tinta, suave, destaque: tinta, sobreDestaque: fundo,
  titulo: { texto: 'Selo de pertencimento.', fonte: 'archivo-black', tamanho: 76, altura: 0.98 },
  corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Este selo só existe uma vez. Ele abre as portas do Nexo Social para você.',
  rodape: TAGS, ornamentos: [{ t: 'anel', texto: 'CONVITE · NEXO SOCIAL · PESSOAL · USO ÚNICO · ACESSO RESERVADO · ', cor: tinta }],
  variacoes: [{ titulo: 'Selo de pertencimento.' }, { titulo: 'Carimbado para você.' }, { titulo: 'Selo oficial de entrada.' }],
});

const THEMES_RAW = {
  'creme-grotesk': {
    nome: 'Edição Original', fundo: CREME, tinta: PRETO, suave: '#57524a', destaque: PRETO, sobreDestaque: CREME,
    titulo: { texto: 'Seu lugar já tem nome.', fonte: 'archivo-black', tamanho: 80, altura: 0.98 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Um convite individual para o ecossistema Nexo Social: pessoas, cultura e descobertas no seu ritmo.',
    rodape: TAGS, ornamentos: [{ t: 'barra', cor: PRETO, espessura: 3 }, { t: 'filete', cor: PRETO }],
    variacoes: [{ titulo: 'Seu lugar já tem nome.' }, { titulo: 'Tem um lugar com o seu nome.' }, { titulo: 'Bem-vindo ao seu lugar.' }, { titulo: 'Guardamos este lugar para você.' }],
  },
  'creme-condensado': {
    nome: 'Edição Condensada', fundo: '#f4eee3', tinta: PRETO, suave: '#57524a', destaque: PRETO, sobreDestaque: CREME,
    titulo: { texto: 'Raro por natureza', fonte: 'anton', tamanho: 128, caixaAlta: true, altura: 0.9 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Tem gente que não se repete. Este convite foi feito para uma delas.',
    rodape: TAGS, ornamentos: [{ t: 'barra', cor: PRETO, espessura: 4 }],
    variacoes: [{ titulo: 'Raro por natureza' }, { titulo: 'Fora do comum' }, { titulo: 'Único. De verdade.' }, { titulo: 'Sem cópia' }, { titulo: 'Edição de um só' }, { titulo: 'Feito sob medida' }],
  },
  'creme-pincel': {
    nome: 'Edição Traço', fundo: '#f4efe4', tinta: PRETO, suave: '#57524a', destaque: PRETO, sobreDestaque: CREME,
    titulo: { texto: 'Traço único. Igual ao seu.', fonte: 'archivo-black', tamanho: 78, altura: 0.98 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Nada de molde: o Nexo Social é feito das pessoas que chegam. E agora chegou a sua vez.',
    rodape: TAGS, ornamentos: [{ t: 'sublinhado', cor: PRETO }],
  },
  'creme-rabisco': {
    nome: 'Edição Rabisco', fundo: '#f4efe4', tinta: PRETO, suave: '#57524a', destaque: VERMELHO, sobreDestaque: '#fff',
    titulo: { texto: 'Assinado por você', fonte: 'anton', tamanho: 120, caixaAlta: true, altura: 0.9 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Um convite com a sua assinatura: pessoas, cultura e descobertas esperando o seu traço.',
    rodape: TAGS, ornamentos: [{ t: 'rabisco' }],
  },
  'preto-tech': {
    nome: 'Edição Noturna', fundo: PRETO, tinta: '#f5f4f0', suave: '#a3a19b', destaque: VERMELHO, sobreDestaque: '#fff',
    titulo: { texto: 'Acesso liberado.', fonte: 'archivo', tamanho: 96, altura: 0.95 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'PESSOAS.\nCULTURA.\nDESCOBERTAS.\nCONEXÕES.',
    rodape: 'CONVITE PESSOAL · USO ÚNICO', ornamentos: [{ t: 'ponto', cor: VERMELHO }, { t: 'filete', cor: VERMELHO }],
    variacoes: [{ titulo: 'Acesso liberado.' }, { titulo: 'Sua vez chegou.' }, { titulo: 'Entrada confirmada.' }, { titulo: 'Você está na lista.' }, { titulo: 'Porta aberta.' }, { titulo: 'Bem-vindo ao lado de dentro.' }, { titulo: 'Senha: você.' }],
  },
  'preto-minimal': {
    nome: 'Edição Essencial', fundo: '#0b0b0c', tinta: '#fafafa', suave: '#9d9d9d', destaque: '#fafafa', sobreDestaque: PRETO,
    titulo: { texto: 'Simples assim: você está dentro.', fonte: 'archivo', tamanho: 74, altura: 0.98 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Sem ruído, sem fila, sem algoritmo decidindo por você. Só gente boa e coisa boa.',
    rodape: TAGS, ornamentos: [{ t: 'oval', cor: 'rgba(255,255,255,.55)' }],
    variacoes: [{ titulo: 'Simples assim: você está dentro.' }, { titulo: 'Menos ruído. Mais você.' }, { titulo: 'Só o essencial: você.' }, { titulo: 'Preto no branco: entrou.' }, { titulo: 'Direto ao ponto.' }],
  },
  'pop-comic': {
    nome: 'Edição Quadrinhos', fundo: '#ffd41f', tinta: '#111', suave: '#3a2f00', destaque: '#ff2a1a', sobreDestaque: '#fff',
    titulo: { texto: 'POW! Você foi escolhido!', fonte: 'bangers', tamanho: 112, altura: 0.92, efeito: 'sombra3d', cor: '#ff2a1a', espacamento: 2 },
    corpo: 'archivo-semibold', rotulo: 'bangers', linha: 'Chegou um convite com superpoderes: pessoas, cultura e descobertas de outro planeta.',
    rodape: 'BAM! · ZAP! · CONEXÕES!', ornamentos: [{ t: 'halftone', cor: 'rgba(255,42,26,.55)' }, { t: 'explosao', cores: ['#1d6dff', '#ffe600', '#111'] }, { t: 'estrelas', cor: '#111' }],
    variacoes: [{ titulo: 'POW! Você foi escolhido!' }, { titulo: 'BAM! Chegou seu convite!' }, { titulo: 'ZAP! Você está dentro!' }],
  },
  holografico: {
    nome: 'Edição Holográfica', fundo: '#e6dcff', textura: 'holo', texturaOpacidade: 1, tinta: '#0b0b12', suave: '#2e2a45', destaque: '#0b0b12', sobreDestaque: '#fff',
    titulo: { texto: 'Você brilha de qualquer ângulo.', fonte: 'archivo-black', tamanho: 76, altura: 0.98 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Um convite iridescente, que muda com a luz — como as pessoas que você vai conhecer.',
    rodape: TAGS, ornamentos: [{ t: 'estrelas', cor: '#fff' }],
    variacoes: [{ titulo: 'Você brilha de qualquer ângulo.' }, { titulo: 'Luz própria, cor rara.' }, { titulo: 'Reflexo de quem é único.' }, { titulo: 'Cada ângulo, uma cor sua.' }, { titulo: 'Iridescente como você.' }],
  },
  'holo-noturno': {
    nome: 'Edição Holo Noturna', fundo: '#070709', tinta: '#f4f4f6', suave: '#a6a6b3', destaque: '#c7b8ff', sobreDestaque: PRETO,
    titulo: { texto: 'Brilho próprio.', fonte: 'archivo-black', tamanho: 108, altura: 0.95, efeito: 'holo', inclinado: true },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'No escuro é que dá para ver quem tem luz. Este convite encontrou a sua.',
    rodape: TAGS, ornamentos: [{ t: 'grade', cor: 'rgba(255,255,255,.07)', passo: 42 }, { t: 'orbitas', cor: 'rgba(255,255,255,.35)' }],
    variacoes: [{ titulo: 'Brilho próprio.' }, { titulo: 'Luz no escuro.' }],
  },
  xadrez: {
    nome: 'Edição Largada', fundo: '#f7f5f0', tinta: PRETO, suave: '#55524c', destaque: VERMELHO, sobreDestaque: '#fff',
    titulo: { texto: 'Largada autorizada.', fonte: 'archivo-black', tamanho: 84, altura: 0.96 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Bandeira quadriculada no alto: sua volta pelo Nexo Social começa agora.',
    rodape: TAGS, ornamentos: [{ t: 'xadrez', cor: PRETO }, { t: 'ponto', cor: VERMELHO }],
    variacoes: [{ titulo: 'Largada autorizada.' }, { titulo: 'Bandeirada: é você.' }],
  },
  'azul-eletrico': {
    nome: 'Edição Elétrica', fundo: AZUL, tinta: '#ffffff', suave: 'rgba(255,255,255,.8)', destaque: '#ffffff', sobreDestaque: AZUL,
    titulo: { texto: 'Conexão direta com você.', fonte: 'archivo', tamanho: 82, altura: 0.96 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Alta voltagem de gente interessante, cultura e descobertas. O cabo já está ligado.',
    rodape: TAGS, ornamentos: [{ t: 'oval', cor: 'rgba(255,255,255,.7)' }],
    variacoes: [{ titulo: 'Conexão direta com você.' }, { titulo: 'Energia que conecta.' }, { titulo: 'Ligado em você.' }],
  },
  'globo-wire': {
    nome: 'Edição Global', fundo: '#0a0a0b', tinta: '#f5f5f2', suave: '#a09f9a', destaque: '#f5f5f2', sobreDestaque: PRETO,
    titulo: { texto: 'Um mundo inteiro esperando você.', fonte: 'archivo', tamanho: 72, altura: 0.98 },
    corpo: 'archivo-regular', rotulo: 'space-mono-bold', linha: 'Ideias viram planos. Planos viram encontros. E tudo começa com este convite.',
    rodape: TAGS, ornamentos: [{ t: 'globo', cor: '#ffffff', opacidade: 0.22 }, { t: 'anel', texto: 'IDEIAS VIRAM PLANOS · PLANOS VIRAM ENCONTROS · ENCONTROS GERAM VALOR · ', cor: 'rgba(255,255,255,.75)' }],
    variacoes: [{ titulo: 'Um mundo inteiro esperando você.' }, { titulo: 'Seu lugar no mapa.' }, { titulo: 'Conexões em todos os fusos.' }, { titulo: 'O mundo ficou menor.' }, { titulo: 'Latitude: você.' }, { titulo: 'Volta ao mundo em um convite.' }],
  },
  'pincel-grunge': {
    nome: 'Edição Grunge', fundo: '#efede8', tinta: '#fbfaf7', suave: '#3c3a36', destaque: PRETO, sobreDestaque: '#fff',
    titulo: { texto: 'Feito à mão. Pra você.', fonte: 'archivo-black', tamanho: 78, altura: 0.98, inclinado: true },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Cru, direto e cheio de personalidade — do jeito que um convite de verdade deve ser.',
    rodape: TAGS, ornamentos: [{ t: 'pincelada' }],
    variacoes: [{ titulo: 'Feito à mão. Pra você.' }, { titulo: 'Sem filtro, com atitude.' }, { titulo: 'Traço forte, convite certo.' }, { titulo: 'Cru e verdadeiro.' }, { titulo: 'Marca registrada: você.' }],
  },
  'vermelho-suico': {
    nome: 'Edição Suíça', fundo: VERMELHO, tinta: '#0b0b0b', suave: '#3d0c05', destaque: '#0b0b0b', sobreDestaque: VERMELHO,
    titulo: { texto: 'Convite', fonte: 'archivo-black', tamanho: 86, caixaAlta: true, altura: 0.9, efeito: 'repeticao', cor: '#ffffff' },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Repetimos até ficar claro: este lugar foi guardado para você.',
    rodape: TAGS, ornamentos: [{ t: 'barra', cor: '#0b0b0b', espessura: 6 }],
    variacoes: [{ titulo: 'Convite' }, { titulo: 'Você' }],
  },
  'selo-vermelho': selo('Edição Selo Vermelho', VERMELHO, '#ffffff', 'rgba(255,255,255,.82)'),
  'selo-preto': selo('Edição Selo Preto', '#0b0b0c', '#ffffff', '#a9a9a9'),
  'selo-creme': selo('Edição Selo Creme', '#f1ebdd', PRETO, '#57524a'),
  marmore: {
    nome: 'Edição Mármore', fundo: '#111', textura: 'marmore', texturaOpacidade: 1, tinta: '#ffffff', suave: '#c9c9c9', destaque: '#ffffff', sobreDestaque: '#111',
    titulo: { texto: 'Sólido como você.', fonte: 'archivo-black', tamanho: 90, altura: 0.96 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Veios únicos, desenho que nunca se repete. Este convite foi talhado para uma pessoa só.',
    rodape: TAGS,
  },
  'marmore-claro': {
    nome: 'Edição Pedra', fundo: '#e4e4e2', textura: 'rachado', texturaOpacidade: 0.55, tinta: '#0c0c0c', suave: '#3b3b3b', destaque: '#0c0c0c', sobreDestaque: '#fff',
    titulo: { texto: 'Marca que fica.', fonte: 'archivo-black', tamanho: 96, altura: 0.96 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'As rachaduras contam histórias. A próxima começa quando você aceitar este convite.',
    rodape: TAGS,
  },
  'pixel-8bit': {
    nome: 'Edição 8-bit', fundo: AZUL, tinta: '#ffffff', suave: 'rgba(255,255,255,.85)', destaque: '#ffffff', sobreDestaque: AZUL,
    titulo: { texto: 'Player 2\nentrou!', fonte: 'press-start', tamanho: 50, caixaAlta: true, altura: 1.35 },
    corpo: 'silkscreen', rotulo: 'silkscreen', linha: 'Nova fase desbloqueada: pessoas, cultura e descobertas.',
    rodape: 'PRESS START', ornamentos: [{ t: 'pixels', cor: 'rgba(255,255,255,.18)' }, { t: 'carregando', cor: '#ffffff', fundo: AZUL }],
  },
  'led-matriz': {
    nome: 'Edição Painel', fundo: '#060607', tinta: '#ffffff', suave: '#9a9a9a', destaque: '#ff3b30', sobreDestaque: '#fff',
    titulo: { texto: 'Acesso\nao vivo', fonte: 'silkscreen-bold', tamanho: 84, caixaAlta: true, altura: 1 },
    corpo: 'space-mono', rotulo: 'silkscreen', linha: 'No letreiro, um nome acendeu. É o seu, entrando no Nexo Social.',
    rodape: TAGS, ornamentos: [{ t: 'pontilhado', cor: 'rgba(255,255,255,.09)' }, { t: 'arco-iris' }],
  },
  'crt-retro': {
    nome: 'Edição Terminal', fundo: '#051208', gradiente: 'radial-gradient(circle at 30% 40%, #0d2a14 0%, #051208 60%, #020703 100%)',
    tinta: '#4dff7c', suave: '#2fb857', destaque: '#4dff7c', sobreDestaque: '#051208',
    titulo: { texto: '> convite_\n  recebido', fonte: 'vt323', tamanho: 108, altura: 0.86, efeito: 'brilho' },
    corpo: 'vt323', rotulo: 'vt323', linha: 'ACESSO CONCEDIDO. Carregando pessoas, cultura e descobertas... 100%',
    rodape: 'C:\\NEXO\\SOCIAL> _', ornamentos: [{ t: 'scanlines', cor: 'rgba(0,0,0,.35)' }],
  },
  'neon-lima': {
    nome: 'Edição Lima', fundo: '#d9ff2b', tinta: '#0b0b0b', suave: '#2e3a00', destaque: '#0b0b0b', sobreDestaque: '#d9ff2b',
    titulo: { texto: 'Foco em você.', fonte: 'anton', tamanho: 134, caixaAlta: true, altura: 0.9, inclinado: true },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Menos ruído. Mais gente que importa. De fato.',
    rodape: TAGS, ornamentos: [{ t: 'filete', cor: '#0b0b0b' }, { t: 'globo', cor: '#0b0b0b', opacidade: 0.12 }],
  },
  'lilas-script': {
    nome: 'Edição Lilás', fundo: '#c9a8f7', tinta: '#15101a', suave: '#3b2c52', destaque: '#15101a', sobreDestaque: '#c9a8f7',
    titulo: { texto: 'Com carinho,', fonte: 'yellowtail', tamanho: 132, altura: 1 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'um convite escrito à mão, só para você, para o ecossistema Nexo Social.',
    rodape: TAGS, ornamentos: [{ t: 'sublinhado', cor: '#15101a' }],
  },
  'script-noturno': {
    nome: 'Edição Caligrafia', fundo: '#0c0c0d', tinta: '#fafafa', suave: '#a5a5a5', destaque: '#fafafa', sobreDestaque: '#0c0c0d',
    titulo: { texto: 'Com estilo,', fonte: 'yellowtail', tamanho: 132, altura: 1 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'caligrafia de quem sabe convidar. O Nexo Social está esperando você.',
    rodape: TAGS, ornamentos: [{ t: 'sublinhado', cor: '#fafafa' }],
  },
  'op-art': {
    nome: 'Edição Óptica', fundo: '#fbfbf9', tinta: PRETO, suave: '#4a4a48', destaque: PRETO, sobreDestaque: '#fff',
    titulo: { texto: 'Tudo converge pra você.', fonte: 'archivo-black', tamanho: 80, altura: 0.96 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Olhe de novo: todas as linhas deste convite apontam na mesma direção. A sua.',
    rodape: TAGS, ornamentos: [{ t: 'raios', cor: PRETO }],
    variacoes: [{ titulo: 'Tudo converge pra você.' }, { titulo: 'Olhe de novo: é você.' }, { titulo: 'Hipnoticamente convidado.' }, { titulo: 'Ilusão nenhuma: é real.' }, { titulo: 'O centro é você.' }, { titulo: 'Onda certa, hora certa.' }],
  },
  brutalista: {
    nome: 'Edição Brutalista', fundo: VERMELHO, tinta: '#0b0b0b', suave: '#3a0a03', destaque: '#0b0b0b', sobreDestaque: VERMELHO,
    titulo: { texto: 'De planos a encontros reais.', fonte: 'archivo-black', tamanho: 76, altura: 0.96 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Estrutura de concreto, gente de verdade. Uma obra que só fica pronta com você.',
    rodape: TAGS, ornamentos: [{ t: 'painel', textura: 'concreto' }, { t: 'mira', cor: '#0b0b0b' }],
  },
  concreto: {
    nome: 'Edição Concreto', fundo: '#777', textura: 'concreto', texturaOpacidade: 1, tinta: '#ffffff', suave: '#ececec', destaque: '#0b0b0b', sobreDestaque: '#fff',
    titulo: { texto: 'Base sólida para novas conexões.', fonte: 'archivo-black', tamanho: 70, altura: 0.98 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Linhas retas, luz natural, espaço de sobra. Tem um andar inteiro reservado para você.',
    rodape: TAGS, ornamentos: [{ t: 'grade', cor: 'rgba(0,0,0,.18)', passo: 90 }],
  },
  etiqueta: {
    nome: 'Edição Remessa', fundo: '#ffffff', tinta: '#1446e8', suave: '#1446e8', destaque: '#1446e8', sobreDestaque: '#fff',
    titulo: { texto: 'Entrega especial.', fonte: 'archivo-black', tamanho: 80, altura: 0.96 },
    corpo: 'space-mono', rotulo: 'space-mono-bold', linha: 'DESTINATÁRIO: VOCÊ\nCONTEÚDO: 1 CONVITE RARO\nMANUSEAR COM ENTUSIASMO',
    rodape: 'REMETENTE: NEXO SOCIAL', moldura: 'etiqueta', ornamentos: [{ t: 'codigo-barras', cor: '#111' }, { t: 'campos', cor: '#1446e8' }],
    variacoes: [{ titulo: 'Entrega especial.' }, { titulo: 'Frágil: convite raro.' }, { titulo: 'Para: você.' }],
  },
  'couro-preto': {
    nome: 'Edição Couro', fundo: '#1b1b1d', textura: 'couro-preto', texturaOpacidade: 1, tinta: '#3a3a3e', suave: '#8b8882', destaque: '#8b8882', sobreDestaque: '#111',
    titulo: { texto: 'Gravado para durar.', fonte: 'archivo-black', tamanho: 88, altura: 0.96, efeito: 'relevo' },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Prensado a quente, sem pressa. Um convite que não se apaga.',
    rodape: TAGS, moldura: 'costura', ornamentos: [{ t: 'costura', cor: 'rgba(160,156,150,.55)' }],
  },
  'patch-lona': {
    ...patch('Edição Patch Lona', 'lona', '#101010', '#3f3a31', 'Bordado em lona crua, ponto por ponto. Um patch que só você tem.', 'rgba(120,98,66,.75)'),
  },
  'patch-preto': patch('Edição Patch Preto', 'couro-preto', '#f3efe6', '#b9b4aa', 'Costura firme, preto profundo. Um distintivo reservado para você.', 'rgba(200,196,188,.55)'),
  'patch-marinho': patch('Edição Patch Marinho', 'couro-marinho', '#f3efe6', '#aeb2bf', 'Tecido noturno e costura clara. Um distintivo reservado para você.', 'rgba(200,204,220,.5)'),
  'patch-azul': patch('Edição Patch Azul', 'couro-azul', '#ffffff', 'rgba(255,255,255,.82)', 'Azul intenso e costura à mostra. Planejar, criar, entregar — e convidar você.', 'rgba(255,255,255,.6)', '#ffffff'),
  'patch-vermelho': patch('Edição Patch Vermelho', 'couro-vermelho', '#ffffff', 'rgba(255,255,255,.85)', 'Vermelho de quem chega com presença. Costurado para a sua jaqueta digital.', 'rgba(255,255,255,.6)', '#ffffff'),
  'patch-oliva': patch('Edição Patch Oliva', 'couro-oliva', '#f1ecd9', '#c9c3a8', 'Verde de campo, costura de quem vai longe. Tecnologia que gera encontros.', 'rgba(230,224,196,.55)'),
  'patch-caramelo': patch('Edição Patch Caramelo', 'couro-caramelo', '#3b220e', '#5b3a1c', 'Couro caramelo com gravação em relevo. Envelhece bem, como toda boa conexão.', 'rgba(90,56,26,.6)'),
  blueprint: {
    nome: 'Edição Projeto', fundo: AZUL, tinta: '#ffffff', suave: 'rgba(255,255,255,.82)', destaque: '#ffffff', sobreDestaque: AZUL,
    titulo: { texto: 'Projetado para você.', fonte: 'archivo', tamanho: 84, altura: 0.96 },
    corpo: 'space-mono', rotulo: 'space-mono-bold', linha: 'Planta aprovada, medidas conferidas. Só falta a peça principal: você.',
    rodape: 'ESC. 1:1 · FOLHA 01/01', ornamentos: [{ t: 'grade', cor: 'rgba(255,255,255,.16)', passo: 30 }, { t: 'cotas', cor: 'rgba(255,255,255,.8)' }],
    variacoes: [{ titulo: 'Projetado para você.' }, { titulo: 'Planta aprovada: você.' }],
  },
  'grade-tecnica': {
    nome: 'Edição Técnica', fundo: '#f3eee3', tinta: PRETO, suave: '#57524a', destaque: PRETO, sobreDestaque: '#f3eee3',
    titulo: { texto: 'Na medida exata.', fonte: 'archivo-black', tamanho: 92, altura: 0.96 },
    corpo: 'space-mono', rotulo: 'space-mono-bold', linha: 'Grid alinhado, margens certas, espaço calculado para uma pessoa: você.',
    rodape: 'REF. NX-01 · APROVADO', ornamentos: [{ t: 'grade', cor: 'rgba(0,0,0,.09)', passo: 36 }, { t: 'cantos', cor: PRETO }],
    variacoes: [{ titulo: 'Na medida exata.' }, { titulo: 'Encaixe perfeito.' }, { titulo: 'Alinhado com você.' }, { titulo: 'Tudo no lugar.' }],
  },
  'papel-envelhecido': {
    nome: 'Edição Arquivo', fundo: '#e8d9b8', textura: 'papel', texturaOpacidade: 1, tinta: '#1c1813', suave: '#4c4234', destaque: '#b3261e', sobreDestaque: '#fff',
    titulo: { texto: 'Guardado há tempos para você.', fonte: 'special-elite', tamanho: 70, altura: 1.02 },
    corpo: 'special-elite', rotulo: 'special-elite', linha: 'Encontrado no arquivo: um convite datilografado, com o seu nome escrito nas entrelinhas.',
    rodape: 'ARQUIVO Nº 01 · NÃO DOBRAR', ornamentos: [{ t: 'carimbo', texto: 'RESERVADO', cor: '#b3261e' }],
    variacoes: [{ titulo: 'Guardado há tempos para você.' }, { titulo: 'Achado raro no arquivo.' }],
  },
  cromado: {
    nome: 'Edição Cromo', fundo: '#0c0d10', gradiente: 'radial-gradient(circle at 75% 45%, #3a3d46 0%, #15161b 45%, #07080a 100%)',
    tinta: '#f2f4f8', suave: '#a8adb8', destaque: '#dfe4ee', sobreDestaque: '#0c0d10',
    titulo: { texto: 'Forjado em metal líquido.', fonte: 'archivo-black', tamanho: 80, altura: 0.96, efeito: 'cromo' },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Reflete tudo à volta e continua inteiro. Como quem recebe este convite.',
    rodape: TAGS,
  },
  classico: {
    nome: 'Edição Clássica', fundo: '#e9e6df', textura: 'rachado', texturaOpacidade: 0.35, tinta: '#0e0e0e', suave: '#4b4a47', destaque: '#0e0e0e', sobreDestaque: '#fff',
    titulo: { texto: 'Uma obra-prima como você.', fonte: 'dm-serif', tamanho: 88, altura: 0.98 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Esculpido com calma, exposto a poucos. Sua vaga na galeria está reservada.',
    rodape: 'ACERVO PERMANENTE · NEXO SOCIAL', ornamentos: [{ t: 'tarja', cor: '#0e0e0e', tinta: '#fff' }],
    variacoes: [{ titulo: 'Uma obra-prima como você.' }, { titulo: 'Esculpido para durar.' }],
  },
  japao: {
    nome: 'Edição Japão', fundo: '#f3ecdf', tinta: '#111', suave: '#4f4a42', destaque: '#ef3326', sobreDestaque: '#fff',
    titulo: { texto: 'Um encontro raro.', fonte: 'dela-gothic', tamanho: 74, altura: 1.05 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Ichigo ichie: cada encontro acontece uma única vez. Este é o seu.',
    rodape: 'ネクソ · NEXO SOCIAL', ornamentos: [{ t: 'sol', cor: '#ef3326', tinta: '#111' }, { t: 'katakana', cor: '#111' }, { t: 'barra', cor: '#111', espessura: 2 }],
  },
  'splash-vermelho': {
    nome: 'Edição Explosão', fundo: '#fbf6f1', tinta: '#0c0c0c', suave: '#4a4541', destaque: '#ec2c1e', sobreDestaque: '#fff',
    titulo: { texto: 'Chegou com tudo.', fonte: 'permanent-marker', tamanho: 96, altura: 1, inclinado: true },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Tinta fresca, respingo para todo lado. Um convite que não passa despercebido.',
    rodape: TAGS, ornamentos: [{ t: 'rabisco' }],
    variacoes: [{ titulo: 'Chegou com tudo.' }, { titulo: 'Respingou em você.' }],
  },
  'pop-haring': {
    nome: 'Edição Dança', fundo: '#ffd60a', tinta: '#0b0b0b', suave: '#3a3000', destaque: '#1d4ff5', sobreDestaque: '#fff',
    titulo: { texto: 'Energia pura. Vem dançar.', fonte: 'permanent-marker', tamanho: 84, altura: 1.02 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Traço grosso, cor chapada, movimento em tudo. Tem uma pista inteira esperando você.',
    rodape: TAGS, ornamentos: [{ t: 'doodles', cor: '#0b0b0b' }],
  },
  'serif-editorial': {
    nome: 'Edição Editorial', fundo: '#f5f0e7', tinta: '#111', suave: '#4f4a42', destaque: '#ef3326', sobreDestaque: '#fff',
    titulo: { texto: 'Uma nova edição de você.', fonte: 'dm-serif', tamanho: 92, altura: 0.98 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Capa, manchete e página dupla. O próximo capítulo do Nexo Social tem o seu nome.',
    rodape: 'Nº 01 · EDIÇÃO DE COLECIONADOR', ornamentos: [{ t: 'barra', cor: '#ef3326', espessura: 5 }],
  },
  'serif-azul': {
    nome: 'Edição Borboleta', fundo: '#f5f0e7', tinta: '#1a3fd6', suave: '#34488f', destaque: '#1a3fd6', sobreDestaque: '#fff',
    titulo: { texto: 'Leve, livre e convidado.', fonte: 'dm-serif-italic', tamanho: 90, altura: 0.98 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Uma asa de cada vez. O Nexo Social é o lugar para você pousar — e voar mais longe.',
    rodape: TAGS, ornamentos: [{ t: 'filete', cor: '#1a3fd6' }],
  },
  anime: {
    nome: 'Edição Mangá', fundo: '#ffffff', tinta: '#0b0b0b', suave: '#3a3a3a', destaque: '#ff2a1a', sobreDestaque: '#fff',
    titulo: { texto: 'Seu arco começa agora.', fonte: 'archivo-black', tamanho: 80, altura: 0.96 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Episódio 1: você recebe um convite misterioso. Continua no próximo capítulo...',
    rodape: 'CAPÍTULO 01 · TEMPORADA NEXO', ornamentos: [{ t: 'velocidade', cor: '#0b0b0b' }, { t: 'tag', texto: 'CONVIDADO', cor: '#ff2a1a', tinta: '#fff' }],
  },
  nuvem: {
    nome: 'Edição Céu', fundo: '#2256d8', textura: 'nuvem', texturaOpacidade: 1, tinta: '#ffffff', suave: 'rgba(255,255,255,.9)', destaque: '#ffffff', sobreDestaque: '#2256d8',
    titulo: { texto: 'Acima das nuvens', fonte: 'dm-serif', tamanho: 78, caixaAlta: true, espacamento: 10, altura: 1.02 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Céu aberto, horizonte longe. Um convite para ver tudo de mais alto.',
    rodape: TAGS,
  },
  'halftone-pop': {
    nome: 'Edição Retícula', fundo: '#2a8cff', tinta: '#050505', suave: '#08214a', destaque: '#050505', sobreDestaque: '#fff',
    titulo: { texto: 'Todos os olhos em você.', fonte: 'archivo-black', tamanho: 82, altura: 0.96 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Impresso em retícula, ponto a ponto. De perto é detalhe; de longe, é você.',
    rodape: TAGS, ornamentos: [{ t: 'halftone', cor: 'rgba(0,0,0,.5)' }],
    variacoes: [{ titulo: 'Todos os olhos em você.' }, { titulo: 'Ponto a ponto, você.' }],
  },
  assinatura: {
    nome: 'Edição Assinatura', fundo: '#f6f0e5', tinta: '#1d3fbf', suave: '#3d4f8f', destaque: '#1d3fbf', sobreDestaque: '#fff',
    titulo: { texto: 'Assinado: para você.', fonte: 'yellowtail', tamanho: 108, altura: 1 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Tinta azul, traço solto, firma reconhecida. Este convite é pessoal e intransferível.',
    rodape: TAGS, ornamentos: [{ t: 'lacos', cor: '#1d3fbf' }],
  },
  'amarelo-bold': {
    nome: 'Edição Ponto Final', fundo: '#0d0d0d', tinta: '#ffffff', suave: '#bdbdbd', destaque: '#ffd400', sobreDestaque: '#0d0d0d',
    titulo: { texto: 'Pronto.', fonte: 'anton', tamanho: 176, caixaAlta: true, altura: 0.9, cor: '#ffd400' },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Você está dentro. Sem vírgula, sem talvez. Ponto.',
    rodape: TAGS,
  },
  recorte: {
    nome: 'Edição Recorte', fundo: '#f1efe9', tinta: '#0b0b0b', suave: '#48453f', destaque: '#0b0b0b', sobreDestaque: '#fff',
    titulo: { texto: 'Você foi convidado', fonte: 'archivo-black', tamanho: 66, efeito: 'recorte' },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Letra por letra, recortada de revista. Uma mensagem montada só para você.',
    rodape: TAGS,
  },
  grafite: {
    nome: 'Edição Grafite', fundo: '#6d6d6d', textura: 'concreto', texturaOpacidade: 1, tinta: '#ffffff', suave: '#f0f0f0', destaque: '#3b9bff', sobreDestaque: '#0b0b0b',
    titulo: { texto: 'Sua marca no muro.', fonte: 'rubik-wet-paint', tamanho: 94, altura: 1, cor: '#4aa6ff', efeito: 'contorno' },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Spray, escorrido e assinatura. A parede do Nexo Social tem espaço para o seu tag.',
    rodape: TAGS, ornamentos: [{ t: 'gotas', cor: '#4aa6ff' }],
  },
  'outline-3d': {
    nome: 'Edição 3D', fundo: '#f5f7ff', tinta: '#1d4ff5', suave: '#3453b8', destaque: '#1d4ff5', sobreDestaque: '#fff',
    titulo: { texto: 'Em todas as dimensões', fonte: 'bungee-shade', tamanho: 66, caixaAlta: true, altura: 1.08 },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Profundidade, volume e perspectiva: tem mais de você para mostrar por aqui.',
    rodape: TAGS, ornamentos: [{ t: 'grade', cor: 'rgba(29,79,245,.08)', passo: 40 }],
  },
  'trio-cores': {
    nome: 'Edição Trio', fundo: '#f3ede1', tinta: '#0c0c0c', suave: '#55504a', destaque: VERMELHO, sobreDestaque: '#fff',
    titulo: { texto: 'Cada cor, uma conexão.', fonte: 'archivo-black', tamanho: 80, altura: 0.96 },
    corpo: 'archivo-regular', rotulo: 'archivo', linha: 'Preto, vermelho e azul — e agora um espaço novo na fila, guardado para você.',
    rodape: TAGS, ornamentos: [{ t: 'circulos', cores: ['#0c0c0c', VERMELHO, AZUL] }],
  },
  'oval-classico': {
    nome: 'Edição Órbita', fundo: '#ffffff', tinta: '#0b0b0b', suave: '#4a4a4a', destaque: '#0b0b0b', sobreDestaque: '#fff',
    titulo: { texto: 'Você entrou em órbita.', fonte: 'archivo-black', tamanho: 82, altura: 0.96, inclinado: true },
    corpo: 'archivo-semibold', rotulo: 'archivo', linha: 'Gravidade própria, trajetória única. O Nexo Social gira melhor com você.',
    rodape: TAGS, ornamentos: [{ t: 'oval', cor: '#0b0b0b' }, { t: 'estrelas', cor: '#0b0b0b' }],
  },
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES_RAW;
export const THEMES: Record<ThemeId, Theme> = THEMES_RAW;

export function themeOf(id: ThemeId): Theme {
  return THEMES[id];
}

// Fontes que o tema usa (o título, o corpo e o rótulo), sem repetição.
export function themeFonts(theme: Theme): FontKey[] {
  const keys = new Set<FontKey>([theme.titulo.fonte, theme.corpo, theme.rotulo, 'archivo']);
  if (theme.titulo.efeito === 'recorte') ['anton', 'dm-serif', 'bangers', 'special-elite'].forEach((k) => keys.add(k as FontKey));
  if (theme.ornamentos?.some((o) => o.t === 'katakana')) keys.add('dela-gothic');
  if (theme.ornamentos?.some((o) => o.t === 'carimbo' || o.t === 'tag')) keys.add('archivo-black');
  if (theme.ornamentos?.some((o) => o.t === 'codigo-barras')) keys.add('space-mono');
  if (theme.ornamentos?.some((o) => o.t === 'carregando')) keys.add('silkscreen');
  return Array.from(keys);
}

// Tinta clara sobre fundo escuro? Usado pela página para ajustar contrastes.
export function isDark(theme: Theme): boolean {
  const hex = theme.tinta.startsWith('#') ? theme.tinta : '#ffffff';
  const v = Number.parseInt(hex.slice(1, 7).padEnd(6, 'f'), 16);
  const l = 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
  return l > 150;
}

// Título e linha do convite para um adesivo específico do tema.
export function themeCopy(theme: Theme, variant: number) {
  const v = theme.variacoes?.length ? theme.variacoes[variant % theme.variacoes.length] : undefined;
  return { titulo: v?.titulo ?? theme.titulo.texto, linha: v?.linha ?? theme.linha };
}
