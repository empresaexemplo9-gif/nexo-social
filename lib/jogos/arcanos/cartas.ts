// Arcanos — Duelo de Escolas: as cartas.
//
// Cinco escolas de magia, doze cartas cada. O baralho de uma partida junta
// duas escolas (12 + 12) e mais três cópias das cartas básicas de cada uma:
// 30 cartas. Nenhum efeito é aleatório — só a ordem do baralho, que cada
// jogador embaralha no próprio aparelho. Assim os dois lados calculam a
// mesma partida sem que ninguém veja a mão do outro.

export type Escola = 'chama' | 'mare' | 'bosque' | 'luz' | 'sombra';

export type Palavra = 'voar' | 'alcance' | 'impeto' | 'vigilia' | 'letal' | 'atropelar' | 'vinculo' | 'escudo' | 'primeiro-golpe';

/** Quem um efeito pode mirar. */
export type TipoDeAlvo = 'qualquer' | 'criatura' | 'criatura-inimiga' | 'sua-criatura' | 'heroi-inimigo';

export type Efeito =
  | { e: 'dano'; alvo: TipoDeAlvo; n: number }
  | { e: 'dano-todos'; lado: 'inimigo' | 'todos'; n: number }
  | { e: 'destruir'; alvo: 'criatura' | 'criatura-inimiga'; poderMax?: number; poderMin?: number; exausta?: boolean }
  | { e: 'curar'; n: number }
  | { e: 'comprar'; n: number }
  | { e: 'bonus'; alvo: 'sua-criatura'; a: number; v: number; ateFim?: boolean; ganha?: Palavra }
  | { e: 'bonus-todos'; a: number; v: number; ateFim?: boolean }
  | { e: 'devolver'; alvo: 'criatura' | 'criatura-inimiga' }
  | { e: 'congelar'; alvo: 'criatura-inimiga' }
  | { e: 'invocar'; ficha: string; qtd: number }
  | { e: 'eter'; n: number }
  | { e: 'drenar'; n: number }
  | { e: 'perder-vida'; n: number };

export interface Carta {
  id: string;
  nome: string;
  escola: Escola;
  tipo: 'criatura' | 'feitico';
  custo: number;
  ataque?: number;
  vida?: number;
  palavras?: Palavra[];
  /** Criatura: ao entrar no campo. Feitiço: o que ele faz. */
  efeitos?: Efeito[];
  aoMorrer?: Efeito[];
  /** Linha de tipo ("Criatura — Dragão"). */
  linha: string;
  /** Texto de ambientação, em itálico. */
  sabor: string;
  raridade: 'comum' | 'rara' | 'lendaria';
  /** Chave em lib/jogos/arte.ts. */
  arte: string;
  /** Ficha: só aparece por efeito, nunca no baralho. */
  ficha?: boolean;
}

export const ESCOLAS: Record<Escola, { nome: string; lema: string; estilo: string; cor: string; clara: string; escura: string; brilho: string; arte: string }> = {
  chama: {
    nome: 'Chama', lema: 'Queime rápido, vença primeiro.',
    estilo: 'Agressiva: dano direto, criaturas com ímpeto e muito fogo no rosto do adversário.',
    cor: '#c2410c', clara: '#fde2c8', escura: '#3b1206', brilho: '#fb923c', arte: 'flame',
  },
  mare: {
    nome: 'Maré', lema: 'Quem controla o fluxo controla a guerra.',
    estilo: 'Controle: compra cartas, congela e devolve criaturas, domina os céus.',
    cor: '#1d4ed8', clara: '#dbe7ff', escura: '#0b1a45', brilho: '#60a5fa', arte: 'big-wave',
  },
  bosque: {
    nome: 'Bosque', lema: 'Paciência. Raiz. Colosso.',
    estilo: 'Força bruta: mais éter cedo, criaturas enormes e atropelar.',
    cor: '#15803d', clara: '#d9f5e2', escura: '#062a14', brilho: '#4ade80', arte: 'oak-leaf',
  },
  luz: {
    nome: 'Luz', lema: 'Juntos, somos muralha.',
    estilo: 'Defesa: cura, vigília, vínculo e exércitos de pequenos guardas.',
    cor: '#a16207', clara: '#fdf3d0', escura: '#3a2605', brilho: '#facc15', arte: 'sunrise',
  },
  sombra: {
    nome: 'Sombra', lema: 'Todo poder tem um preço.',
    estilo: 'Remoção: destrói criaturas, drena vida e volta dos mortos.',
    cor: '#6d28d9', clara: '#ebe4ff', escura: '#1a0d3a', brilho: '#a78bfa', arte: 'crowned-skull',
  },
};

export const PALAVRAS: Record<Palavra, { nome: string; texto: string }> = {
  voar: { nome: 'Voar', texto: 'Só pode ser bloqueada por criaturas com Voar ou Alcance.' },
  alcance: { nome: 'Alcance', texto: 'Pode bloquear criaturas com Voar.' },
  impeto: { nome: 'Ímpeto', texto: 'Pode atacar no mesmo turno em que entra.' },
  vigilia: { nome: 'Vigília', texto: 'Atacar não a deixa exausta: continua pronta para bloquear.' },
  letal: { nome: 'Letal', texto: 'Qualquer dano que ela causa a uma criatura a destrói.' },
  atropelar: { nome: 'Atropelar', texto: 'O dano que sobra ao matar o bloqueador vai para o herói.' },
  vinculo: { nome: 'Vínculo', texto: 'O dano que ela causa cura o seu herói.' },
  escudo: { nome: 'Escudo', texto: 'Anula o primeiro dano que receberia.' },
  'primeiro-golpe': { nome: 'Primeiro golpe', texto: 'Em combate, causa dano antes da outra criatura.' },
};

const C = (c: Omit<Carta, 'tipo' | 'linha'> & { linha?: string; tipo?: Carta['tipo'] }): Carta => ({
  tipo: c.ataque !== undefined ? 'criatura' : 'feitico',
  linha: c.ataque !== undefined ? 'Criatura' : 'Feitiço',
  ...c,
});

export const CARTAS: Carta[] = [
  // --- Chama ---------------------------------------------------------------
  C({ id: 'c01', nome: 'Diabrete de Brasa', escola: 'chama', custo: 1, ataque: 1, vida: 1, palavras: ['impeto'], linha: 'Criatura — Diabrete', sabor: 'Pequeno, barulhento e sempre com pressa.', raridade: 'comum', arte: 'imp' }),
  C({ id: 'c02', nome: 'Salamandra Ardente', escola: 'chama', custo: 2, ataque: 2, vida: 1, efeitos: [{ e: 'dano', alvo: 'qualquer', n: 1 }], linha: 'Criatura — Salamandra', sabor: 'Onde ela passa, a grama não volta.', raridade: 'comum', arte: 'salamander' }),
  C({ id: 'c03', nome: 'Faísca', escola: 'chama', custo: 1, efeitos: [{ e: 'dano', alvo: 'qualquer', n: 2 }], linha: 'Feitiço — Fogo', sabor: 'O primeiro truque de todo piromante.', raridade: 'comum', arte: 'spark-spirit' }),
  C({ id: 'c04', nome: 'Berserker das Cinzas', escola: 'chama', custo: 3, ataque: 3, vida: 2, palavras: ['impeto'], linha: 'Criatura — Guerreiro', sabor: 'Nunca aprendeu a palavra “recuar”.', raridade: 'comum', arte: 'barbarian' }),
  C({ id: 'c05', nome: 'Cão de Magma', escola: 'chama', custo: 3, ataque: 3, vida: 3, palavras: ['atropelar'], linha: 'Criatura — Fera', sabor: 'Late fumaça e morde brasa.', raridade: 'comum', arte: 'wolf-head' }),
  C({ id: 'c06', nome: 'Bola de Fogo', escola: 'chama', custo: 4, efeitos: [{ e: 'dano', alvo: 'qualquer', n: 4 }], linha: 'Feitiço — Fogo', sabor: 'A resposta mais antiga para qualquer pergunta.', raridade: 'rara', arte: 'fireball' }),
  C({ id: 'c07', nome: 'Chuva de Meteoros', escola: 'chama', custo: 5, efeitos: [{ e: 'dano-todos', lado: 'inimigo', n: 2 }], linha: 'Feitiço — Fogo', sabor: 'O céu também escolhe lados.', raridade: 'rara', arte: 'meteor-impact' }),
  C({ id: 'c08', nome: 'Fênix Rubra', escola: 'chama', custo: 4, ataque: 3, vida: 2, palavras: ['voar', 'impeto'], linha: 'Criatura — Fênix', sabor: 'Morre em chamas e nasce em chamas.', raridade: 'rara', arte: 'flame' }),
  C({ id: 'c09', nome: 'Golem Vulcânico', escola: 'chama', custo: 6, ataque: 6, vida: 5, palavras: ['atropelar'], linha: 'Criatura — Golem', sabor: 'Cada passo, um pequeno terremoto.', raridade: 'rara', arte: 'rock-golem' }),
  C({ id: 'c10', nome: 'Dragão Escarlate', escola: 'chama', custo: 7, ataque: 6, vida: 6, palavras: ['voar'], efeitos: [{ e: 'dano', alvo: 'qualquer', n: 3 }], linha: 'Criatura — Dragão', sabor: 'Quando ele pousa, o céu escurece duas vezes.', raridade: 'lendaria', arte: 'dragon-head' }),
  C({ id: 'c11', nome: 'Fúria', escola: 'chama', custo: 2, efeitos: [{ e: 'bonus', alvo: 'sua-criatura', a: 3, v: 0, ateFim: true, ganha: 'atropelar' }], linha: 'Feitiço — Encantamento', sabor: 'Raiva também é combustível.', raridade: 'comum', arte: 'enrage' }),
  C({ id: 'c12', nome: 'Sacerdotisa da Pira', escola: 'chama', custo: 2, ataque: 1, vida: 3, efeitos: [{ e: 'dano', alvo: 'heroi-inimigo', n: 2 }], linha: 'Criatura — Clériga', sabor: 'Reza em voz alta. O fogo responde.', raridade: 'comum', arte: 'fire-bowl' }),

  // --- Maré ----------------------------------------------------------------
  C({ id: 'm01', nome: 'Espírito da Névoa', escola: 'mare', custo: 1, ataque: 1, vida: 2, palavras: ['voar'], linha: 'Criatura — Espírito', sabor: 'Você só percebe que ele passou pelo frio.', raridade: 'comum', arte: 'spectre' }),
  C({ id: 'm02', nome: 'Aprendiz Arcano', escola: 'mare', custo: 2, ataque: 1, vida: 3, efeitos: [{ e: 'comprar', n: 1 }], linha: 'Criatura — Mago', sabor: 'Leu todos os livros. Quase entendeu metade.', raridade: 'comum', arte: 'wizard-face' }),
  C({ id: 'm03', nome: 'Contracorrente', escola: 'mare', custo: 2, efeitos: [{ e: 'devolver', alvo: 'criatura' }], linha: 'Feitiço — Água', sabor: 'O mar devolve tudo. Na hora dele.', raridade: 'comum', arte: 'big-wave' }),
  C({ id: 'm04', nome: 'Sereia Cantora', escola: 'mare', custo: 3, ataque: 2, vida: 3, efeitos: [{ e: 'congelar', alvo: 'criatura-inimiga' }], linha: 'Criatura — Sereia', sabor: 'Quem ouve a canção esquece de lutar.', raridade: 'comum', arte: 'mermaid' }),
  C({ id: 'm05', nome: 'Visão do Oráculo', escola: 'mare', custo: 3, efeitos: [{ e: 'comprar', n: 2 }], linha: 'Feitiço — Adivinhação', sabor: 'O futuro cabe numa esfera de vidro.', raridade: 'comum', arte: 'crystal-ball' }),
  C({ id: 'm06', nome: 'Grifo da Tempestade', escola: 'mare', custo: 4, ataque: 3, vida: 3, palavras: ['voar'], linha: 'Criatura — Grifo', sabor: 'Nasce do trovão e caça entre as nuvens.', raridade: 'comum', arte: 'griffin-symbol' }),
  C({ id: 'm07', nome: 'Prisão de Gelo', escola: 'mare', custo: 2, efeitos: [{ e: 'congelar', alvo: 'criatura-inimiga' }, { e: 'comprar', n: 1 }], linha: 'Feitiço — Gelo', sabor: 'Nada ataca de dentro de um iceberg.', raridade: 'comum', arte: 'frozen-block' }),
  C({ id: 'm08', nome: 'Elemental da Maré', escola: 'mare', custo: 5, ataque: 4, vida: 4, efeitos: [{ e: 'devolver', alvo: 'criatura-inimiga' }], linha: 'Criatura — Elemental', sabor: 'Uma onda com opinião própria.', raridade: 'rara', arte: 'water-splash' }),
  C({ id: 'm09', nome: 'Leviatã', escola: 'mare', custo: 7, ataque: 7, vida: 7, palavras: ['escudo'], linha: 'Criatura — Serpente marinha', sabor: 'Os mapas antigos só diziam: “aqui, não”.', raridade: 'lendaria', arte: 'sea-serpent' }),
  C({ id: 'm10', nome: 'Mago das Marés', escola: 'mare', custo: 4, ataque: 2, vida: 4, palavras: ['vigilia'], efeitos: [{ e: 'comprar', n: 1 }], linha: 'Criatura — Mago', sabor: 'Conhece a lua pelo nome.', raridade: 'rara', arte: 'wizard-staff' }),
  C({ id: 'm11', nome: 'Kraken das Profundezas', escola: 'mare', custo: 6, ataque: 5, vida: 6, palavras: ['alcance'], efeitos: [{ e: 'congelar', alvo: 'criatura-inimiga' }], linha: 'Criatura — Kraken', sabor: 'Oito braços, nenhuma pressa.', raridade: 'rara', arte: 'giant-squid' }),
  C({ id: 'm12', nome: 'Espelho Arcano', escola: 'mare', custo: 1, efeitos: [{ e: 'bonus', alvo: 'sua-criatura', a: 0, v: 0, ganha: 'escudo' }], linha: 'Feitiço — Proteção', sabor: 'O golpe acerta o reflexo.', raridade: 'comum', arte: 'mirror-mirror' }),

  // --- Bosque --------------------------------------------------------------
  C({ id: 'b01', nome: 'Druida do Broto', escola: 'bosque', custo: 1, ataque: 1, vida: 1, efeitos: [{ e: 'eter', n: 1 }], linha: 'Criatura — Druida', sabor: 'Planta hoje a vitória de amanhã.', raridade: 'comum', arte: 'sprout' }),
  C({ id: 'b02', nome: 'Lobo da Mata', escola: 'bosque', custo: 2, ataque: 3, vida: 2, linha: 'Criatura — Lobo', sabor: 'Nunca caça sozinho por muito tempo.', raridade: 'comum', arte: 'wolf-howl' }),
  C({ id: 'b03', nome: 'Crescimento Selvagem', escola: 'bosque', custo: 2, efeitos: [{ e: 'eter', n: 1 }, { e: 'comprar', n: 1 }], linha: 'Feitiço — Natureza', sabor: 'A floresta não pede licença.', raridade: 'comum', arte: 'tree-growth' }),
  C({ id: 'b04', nome: 'Urso Pardo', escola: 'bosque', custo: 3, ataque: 3, vida: 4, linha: 'Criatura — Urso', sabor: 'Dorme o inverno inteiro. Acorda com fome.', raridade: 'comum', arte: 'bear-head' }),
  C({ id: 'b05', nome: 'Aranha da Copa', escola: 'bosque', custo: 3, ataque: 1, vida: 4, palavras: ['alcance', 'letal'], linha: 'Criatura — Aranha', sabor: 'Tece a teia onde os grifos pousam.', raridade: 'comum', arte: 'spider-alt' }),
  C({ id: 'b06', nome: 'Força da Natureza', escola: 'bosque', custo: 2, efeitos: [{ e: 'bonus', alvo: 'sua-criatura', a: 2, v: 2 }], linha: 'Feitiço — Natureza', sabor: 'Raiz forte, tronco firme.', raridade: 'comum', arte: 'muscle-up' }),
  C({ id: 'b07', nome: 'Ent Ancião', escola: 'bosque', custo: 5, ataque: 4, vida: 7, palavras: ['alcance'], linha: 'Criatura — Árvore', sabor: 'Viu reinos nascerem e virarem pó.', raridade: 'rara', arte: 'tree-face' }),
  C({ id: 'b08', nome: 'Javali Furioso', escola: 'bosque', custo: 4, ataque: 5, vida: 3, palavras: ['atropelar'], linha: 'Criatura — Javali', sabor: 'Não desvia. Nunca.', raridade: 'comum', arte: 'boar' }),
  C({ id: 'b09', nome: 'Hidra do Pântano', escola: 'bosque', custo: 6, ataque: 5, vida: 5, palavras: ['atropelar'], efeitos: [{ e: 'bonus-todos', a: 1, v: 1 }], linha: 'Criatura — Hidra', sabor: 'Corte uma cabeça e ela manda lembranças.', raridade: 'rara', arte: 'hydra' }),
  C({ id: 'b10', nome: 'Chamado da Matilha', escola: 'bosque', custo: 4, efeitos: [{ e: 'invocar', ficha: 'f-lobo', qtd: 2 }], linha: 'Feitiço — Natureza', sabor: 'Um uivo, e a mata responde.', raridade: 'comum', arte: 'paw-print' }),
  C({ id: 'b11', nome: 'Mamute de Guerra', escola: 'bosque', custo: 7, ataque: 8, vida: 8, palavras: ['atropelar'], linha: 'Criatura — Mamute', sabor: 'Muralhas são só uma sugestão.', raridade: 'lendaria', arte: 'mammoth' }),
  C({ id: 'b12', nome: 'Pele de Carvalho', escola: 'bosque', custo: 1, efeitos: [{ e: 'bonus', alvo: 'sua-criatura', a: 1, v: 3 }], linha: 'Feitiço — Proteção', sabor: 'Casca grossa, coração verde.', raridade: 'comum', arte: 'oak-leaf' }),

  // --- Luz -----------------------------------------------------------------
  C({ id: 'l01', nome: 'Escudeira', escola: 'luz', custo: 1, ataque: 1, vida: 2, palavras: ['vigilia'], linha: 'Criatura — Soldado', sabor: 'Primeira a chegar, última a sair.', raridade: 'comum', arte: 'swordman' }),
  C({ id: 'l02', nome: 'Clériga', escola: 'luz', custo: 2, ataque: 2, vida: 2, efeitos: [{ e: 'curar', n: 3 }], linha: 'Criatura — Clériga', sabor: 'Remenda armaduras e ânimos.', raridade: 'comum', arte: 'monk-face' }),
  C({ id: 'l03', nome: 'Bênção', escola: 'luz', custo: 1, efeitos: [{ e: 'bonus', alvo: 'sua-criatura', a: 1, v: 1, ganha: 'vigilia' }], linha: 'Feitiço — Graça', sabor: 'Uma mão no ombro vale uma armadura.', raridade: 'comum', arte: 'aura' }),
  C({ id: 'l04', nome: 'Paladino Juramentado', escola: 'luz', custo: 3, ataque: 3, vida: 2, palavras: ['primeiro-golpe'], linha: 'Criatura — Paladino', sabor: 'Golpeia antes de ser golpeado.', raridade: 'comum', arte: 'templar-shield' }),
  C({ id: 'l05', nome: 'Pégaso Alvo', escola: 'luz', custo: 3, ataque: 2, vida: 2, palavras: ['voar', 'vigilia'], linha: 'Criatura — Pégaso', sabor: 'Asas brancas sobre o campo de batalha.', raridade: 'comum', arte: 'pegasus' }),
  C({ id: 'l06', nome: 'Convocar a Guarda', escola: 'luz', custo: 3, efeitos: [{ e: 'invocar', ficha: 'f-guarda', qtd: 2 }], linha: 'Feitiço — Chamado', sabor: 'O sino toca uma vez. Eles vêm.', raridade: 'comum', arte: 'shield-echoes' }),
  C({ id: 'l07', nome: 'Anjo Guardião', escola: 'luz', custo: 5, ataque: 4, vida: 4, palavras: ['voar', 'vigilia', 'vinculo'], linha: 'Criatura — Anjo', sabor: 'Nunca dorme. Nunca esquece.', raridade: 'rara', arte: 'angel-outfit' }),
  C({ id: 'l08', nome: 'Julgamento', escola: 'luz', custo: 4, efeitos: [{ e: 'destruir', alvo: 'criatura-inimiga', poderMin: 4 }], linha: 'Feitiço — Justiça', sabor: 'Quanto maior, mais pesa na balança.', raridade: 'rara', arte: 'scales' }),
  C({ id: 'l09', nome: 'Cavaleiro Radiante', escola: 'luz', custo: 4, ataque: 3, vida: 4, palavras: ['vinculo', 'escudo'], linha: 'Criatura — Cavaleiro', sabor: 'A armadura brilha mais que o sol de meio-dia.', raridade: 'rara', arte: 'mounted-knight' }),
  C({ id: 'l10', nome: 'Hino da Aurora', escola: 'luz', custo: 4, efeitos: [{ e: 'bonus-todos', a: 1, v: 1 }], linha: 'Feitiço — Canção', sabor: 'Quando o dia nasce, todos ficam de pé.', raridade: 'rara', arte: 'sunrise' }),
  C({ id: 'l11', nome: 'Arcanjo', escola: 'luz', custo: 7, ataque: 6, vida: 6, palavras: ['voar', 'vigilia', 'vinculo'], linha: 'Criatura — Anjo', sabor: 'Seis asas, uma única promessa.', raridade: 'lendaria', arte: 'angel-wings' }),
  C({ id: 'l12', nome: 'Luz Curativa', escola: 'luz', custo: 2, efeitos: [{ e: 'curar', n: 4 }, { e: 'comprar', n: 1 }], linha: 'Feitiço — Cura', sabor: 'Fecha feridas e abre caminhos.', raridade: 'comum', arte: 'healing' }),

  // --- Sombra --------------------------------------------------------------
  C({ id: 's01', nome: 'Morcego Vampiro', escola: 'sombra', custo: 1, ataque: 1, vida: 1, palavras: ['voar', 'vinculo'], linha: 'Criatura — Morcego', sabor: 'Uma mordida de cada vez.', raridade: 'comum', arte: 'bat' }),
  C({ id: 's02', nome: 'Esqueleto Erguido', escola: 'sombra', custo: 2, ataque: 2, vida: 2, aoMorrer: [{ e: 'invocar', ficha: 'f-esqueleto', qtd: 1 }], linha: 'Criatura — Esqueleto', sabor: 'Cai. Levanta. Cai. Levanta.', raridade: 'comum', arte: 'skeleton' }),
  C({ id: 's03', nome: 'Toque Sombrio', escola: 'sombra', custo: 2, efeitos: [{ e: 'destruir', alvo: 'criatura-inimiga', poderMax: 2 }], linha: 'Feitiço — Maldição', sabor: 'Frio como a última página.', raridade: 'comum', arte: 'death-skull' }),
  C({ id: 's04', nome: 'Carniçal', escola: 'sombra', custo: 3, ataque: 2, vida: 2, palavras: ['letal'], linha: 'Criatura — Morto-vivo', sabor: 'Um arranhão basta.', raridade: 'comum', arte: 'shambling-zombie' }),
  C({ id: 's05', nome: 'Drenar Vida', escola: 'sombra', custo: 3, efeitos: [{ e: 'drenar', n: 3 }], linha: 'Feitiço — Maldição', sabor: 'O que é seu agora é meu.', raridade: 'comum', arte: 'bleeding-heart' }),
  C({ id: 's06', nome: 'Assassino das Sombras', escola: 'sombra', custo: 4, ataque: 4, vida: 2, efeitos: [{ e: 'destruir', alvo: 'criatura-inimiga', exausta: true }], linha: 'Criatura — Assassino', sabor: 'Espera você baixar a guarda.', raridade: 'rara', arte: 'hooded-assassin' }),
  C({ id: 's07', nome: 'Necromante', escola: 'sombra', custo: 4, ataque: 2, vida: 4, efeitos: [{ e: 'invocar', ficha: 'f-esqueleto', qtd: 2 }], linha: 'Criatura — Bruxo', sabor: 'Para ele, cemitério é quartel.', raridade: 'rara', arte: 'cowled' }),
  C({ id: 's08', nome: 'Aniquilar', escola: 'sombra', custo: 5, efeitos: [{ e: 'destruir', alvo: 'criatura' }], linha: 'Feitiço — Maldição', sabor: 'Nem as lendas voltam desta.', raridade: 'rara', arte: 'skull-crack' }),
  C({ id: 's09', nome: 'Praga', escola: 'sombra', custo: 4, efeitos: [{ e: 'dano-todos', lado: 'todos', n: 2 }], linha: 'Feitiço — Pestilência', sabor: 'Não escolhe lados. Nunca escolheu.', raridade: 'rara', arte: 'poison-gas' }),
  C({ id: 's10', nome: 'Vampiro Ancião', escola: 'sombra', custo: 5, ataque: 4, vida: 4, palavras: ['voar', 'vinculo'], linha: 'Criatura — Vampiro', sabor: 'Mil anos de sede, nenhuma pressa.', raridade: 'rara', arte: 'vampire-dracula' }),
  C({ id: 's11', nome: 'Lich Coroado', escola: 'sombra', custo: 6, ataque: 5, vida: 5, efeitos: [{ e: 'drenar', n: 3 }], linha: 'Criatura — Lich', sabor: 'Trocou a vida por uma coroa. Não se arrepende.', raridade: 'rara', arte: 'crowned-skull' }),
  C({ id: 's12', nome: 'Demônio do Abismo', escola: 'sombra', custo: 6, ataque: 7, vida: 7, palavras: ['voar'], efeitos: [{ e: 'perder-vida', n: 3 }], linha: 'Criatura — Demônio', sabor: 'Chamá-lo custa caro. Mandá-lo embora, mais.', raridade: 'lendaria', arte: 'daemon-skull' }),

  // --- Fichas --------------------------------------------------------------
  C({ id: 'f-lobo', nome: 'Lobo', escola: 'bosque', custo: 0, ataque: 2, vida: 2, linha: 'Ficha — Lobo', sabor: 'Parte da matilha.', raridade: 'comum', arte: 'wolf-howl', ficha: true }),
  C({ id: 'f-guarda', nome: 'Guarda', escola: 'luz', custo: 0, ataque: 1, vida: 2, palavras: ['vigilia'], linha: 'Ficha — Soldado', sabor: 'Escudo erguido, sempre.', raridade: 'comum', arte: 'visored-helm', ficha: true }),
  C({ id: 'f-esqueleto', nome: 'Esqueleto', escola: 'sombra', custo: 0, ataque: 1, vida: 1, linha: 'Ficha — Esqueleto', sabor: 'Ossos teimosos.', raridade: 'comum', arte: 'skull-crossed-bones', ficha: true }),
];

const PORID = new Map(CARTAS.map((c) => [c.id, c]));
export const carta = (id: string): Carta => {
  const c = PORID.get(id);
  if (!c) throw new Error(`Carta desconhecida: ${id}`);
  return c;
};
export const cartaExiste = (id: string) => PORID.has(id);

/** As três cópias extras de cada escola (as cartas básicas). */
const COPIAS: Record<Escola, string[]> = {
  chama: ['c01', 'c03', 'c04'],
  mare: ['m01', 'm02', 'm03'],
  bosque: ['b01', 'b02', 'b04'],
  luz: ['l01', 'l02', 'l03'],
  sombra: ['s01', 's03', 's04'],
};

/** Lista (sem embaralhar) das 30 cartas do baralho de duas escolas. */
export function montarBaralho(escolas: [Escola, Escola]): string[] {
  const lista: string[] = [];
  for (const e of escolas) {
    for (const c of CARTAS) if (c.escola === e && !c.ficha) lista.push(c.id);
    lista.push(...COPIAS[e]);
  }
  return lista;
}

/** Texto de regras da carta (palavras-chave + efeitos), gerado dos dados. */
export function textoDaCarta(c: Carta): string[] {
  const linhas: string[] = [];
  if (c.palavras?.length) linhas.push(c.palavras.map((p) => PALAVRAS[p].nome).join(', ') + '.');
  const quem = (a: TipoDeAlvo) =>
    ({ qualquer: 'qualquer alvo', criatura: 'uma criatura', 'criatura-inimiga': 'uma criatura inimiga', 'sua-criatura': 'uma criatura sua', 'heroi-inimigo': 'o herói inimigo' })[a];
  const fx = (e: Efeito): string => {
    switch (e.e) {
      case 'dano': return `Cause ${e.n} de dano a ${quem(e.alvo)}.`;
      case 'dano-todos': return `Cause ${e.n} de dano a ${e.lado === 'inimigo' ? 'cada criatura inimiga' : 'cada criatura'}.`;
      case 'destruir': {
        const cond = e.poderMax !== undefined ? ` com ataque ${e.poderMax} ou menos` : e.poderMin !== undefined ? ` com ataque ${e.poderMin} ou mais` : e.exausta ? ' exausta' : '';
        return `Destrua ${e.alvo === 'criatura' ? 'uma criatura' : 'uma criatura inimiga'}${cond}.`;
      }
      case 'curar': return `Seu herói recupera ${e.n} de vida.`;
      case 'comprar': return e.n === 1 ? 'Compre uma carta.' : `Compre ${e.n} cartas.`;
      case 'bonus': {
        const partes = [];
        if (e.a || e.v) partes.push(`+${e.a}/+${e.v}`);
        if (e.ganha) partes.push(PALAVRAS[e.ganha].nome);
        return `Uma criatura sua ganha ${partes.join(' e ')}${e.ateFim ? ' até o fim do turno' : ''}.`;
      }
      case 'bonus-todos': return `Suas criaturas ganham +${e.a}/+${e.v}${e.ateFim ? ' até o fim do turno' : ''}.`;
      case 'devolver': return `Devolva ${e.alvo === 'criatura' ? 'uma criatura' : 'uma criatura inimiga'} à mão do dono.`;
      case 'congelar': return 'Congele uma criatura inimiga: ela fica exausta e não desvira no próximo turno.';
      case 'invocar': {
        const f = carta(e.ficha);
        return `Invoque ${e.qtd === 1 ? 'um' : e.qtd} ${f.nome}${e.qtd === 1 ? '' : 's'} ${f.ataque}/${f.vida}${f.palavras?.length ? ` com ${f.palavras.map((p) => PALAVRAS[p].nome).join(', ')}` : ''}.`;
      }
      case 'eter': return `Ganhe ${e.n} cristal de éter.`;
      case 'drenar': return `Cause ${e.n} de dano ao herói inimigo e recupere ${e.n} de vida.`;
      case 'perder-vida': return `Você perde ${e.n} de vida.`;
    }
  };
  if (c.efeitos?.length) linhas.push((c.tipo === 'criatura' ? 'Ao entrar: ' : '') + c.efeitos.map(fx).join(' '));
  if (c.aoMorrer?.length) linhas.push('Ao morrer: ' + c.aoMorrer.map(fx).join(' '));
  return linhas;
}

export type EfeitoComAlvo = Extract<Efeito, { alvo: unknown }>;

/** O efeito que pede um alvo escolhido pelo jogador (no máximo um por carta). */
export function efeitoComAlvo(c: Carta): EfeitoComAlvo | null {
  for (const e of c.efeitos ?? []) if ('alvo' in e && e.alvo !== 'heroi-inimigo') return e as EfeitoComAlvo;
  return null;
}
