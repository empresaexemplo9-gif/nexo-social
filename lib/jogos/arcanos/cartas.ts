// Arcanos — Duelo dos Elementos: as cartas.
//
// Seis elementos (Água, Fogo, Terra, Ar, Luz, Escuridão). Cada um tem o seu
// grimório de 30 cartas (21 feitiços + 9 personagens) e a sua reserva de mana
// de 20 cartas — todas iguais em quantidade entre os elementos. Todo número de
// uma carta (dano, cura, escudo, bônus…) é um dado: de 3 lados, os menores, até
// 20 lados, os maiores. Os dados são rolados por quem joga e viajam junto da
// jogada; a única coisa que fica escondida é a ordem dos baralhos.

export type Elemento = 'agua' | 'fogo' | 'terra' | 'ar' | 'luz' | 'escuridao';
export const ELEMENTOS_ORDEM: Elemento[] = ['fogo', 'agua', 'terra', 'ar', 'luz', 'escuridao'];

export type Faces = 3 | 4 | 6 | 8 | 10 | 12 | 20;
export const FACES: Faces[] = [3, 4, 6, 8, 10, 12, 20];

/** n dados de f faces, mais um bônus fixo b (raro). */
export interface Dados {
  n: number;
  f: Faces;
  b?: number;
}

export type Palavra = 'guardiao' | 'rapido' | 'alado' | 'vampiro' | 'foco' | 'couraca';

/** Quem a pessoa escolhe ao lançar a carta. */
export type TipoDeAlvo = 'inimigo' | 'aliado' | 'qualquer' | 'char-inimigo' | 'char-aliado' | 'char-qualquer';
/** Quem o efeito atinge: o alvo escolhido ou um grupo automático. */
export type Mira = 'escolhido' | 'heroi-proprio' | 'heroi-inimigo' | 'chars-inimigos' | 'chars-aliados' | 'todos-chars' | 'si';

export type Efeito =
  | { e: 'dano'; d: Dados; alvo: Mira }
  | { e: 'drenar'; d: Dados; alvo: Mira }
  | { e: 'cura'; d: Dados; alvo: Mira }
  | { e: 'escudo'; d: Dados; alvo: Mira }
  | { e: 'amplificar'; d: Dados; alvo: Mira; turnos: number }
  | { e: 'dot'; d: Dados; alvo: Mira; turnos: number }
  | { e: 'regenerar'; d: Dados; alvo: Mira; turnos: number }
  | { e: 'enfraquecer'; d: Dados; alvo: Mira; turnos: number }
  | { e: 'silenciar'; alvo: Mira; turnos: number }
  | { e: 'atordoar'; alvo: Mira; turnos: number }
  | { e: 'esquiva'; alvo: Mira }
  | { e: 'purificar'; alvo: Mira }
  | { e: 'dissipar'; alvo: Mira }
  | { e: 'comprar'; n: number }
  | { e: 'mana'; n: number }
  | { e: 'drenarMana'; n: number }
  | { e: 'ressuscitar' };

export type Arquetipo = 'guerreiro' | 'mago' | 'fera' | 'espirito' | 'colosso';
export type Raridade = 'comum' | 'rara' | 'epica' | 'lendaria';

export interface Carta {
  id: string;
  nome: string;
  el: Elemento;
  tipo: 'magia' | 'personagem';
  custo: number;
  /** Quantas cópias entram no grimório de 30. */
  copias: number;
  raridade: Raridade;
  alvo?: TipoDeAlvo;
  efeitos: Efeito[];
  sabor?: string;
  // Personagens
  arquetipo?: Arquetipo;
  vida?: number;
  ataque?: Dados;
  palavras?: Palavra[];
  entrada?: Efeito[];
  inicio?: Efeito[];
  morte?: Efeito[];
}

export interface CartaDeMana {
  id: string;
  nome: string;
  el: Elemento;
  valor: 1 | 2;
  sabor: string;
}

export const ELEMENTOS: Record<Elemento, { nome: string; lema: string; estilo: string; cor: string; clara: string; escura: string; brilho: string; glifo: string; dot: string }> = {
  fogo: { nome: 'Fogo', lema: 'Tudo o que toco vira cinza e luz.', estilo: 'Dano alto, queimaduras e fúria. Vence rápido ou se apaga.', cor: '#e2491f', clara: '#ffc25c', escura: '#3d0b04', brilho: '#ff7a2e', glifo: 'chama', dot: 'Queimadura' },
  agua: { nome: 'Água', lema: 'Cedo, contorno e depois arrasto.', estilo: 'Cura, regeneração, gelo e compra de cartas. Controle paciente.', cor: '#1f86d6', clara: '#9be9ff', escura: '#04213b', brilho: '#38c8ff', glifo: 'gota', dot: 'Afogamento' },
  terra: { nome: 'Terra', lema: 'Uma montanha não pede licença.', estilo: 'Escudos enormes, personagens robustos e raízes que prendem.', cor: '#8a6a3b', clara: '#dcc58f', escura: '#271a0a', brilho: '#b8d65f', glifo: 'montanha', dot: 'Espinhos' },
  ar: { nome: 'Ar', lema: 'Quem ouve o vento chega antes.', estilo: 'Silêncio, esquiva, relâmpagos e voo. Velocidade e truques.', cor: '#4fd1b0', clara: '#e8fff6', escura: '#08332f', brilho: '#9dffe0', glifo: 'vento', dot: 'Estática' },
  luz: { nome: 'Luz', lema: 'Onde eu chego, a dúvida recua.', estilo: 'Curas, escudos sagrados, purificação e renascimento.', cor: '#f5c542', clara: '#fff6c9', escura: '#5b3d04', brilho: '#ffe27a', glifo: 'sol', dot: 'Brasa Sagrada' },
  escuridao: { nome: 'Escuridão', lema: 'O silêncio também tem dentes.', estilo: 'Drenar vida, venenos, maldições e silêncio. Vence pelo desgaste.', cor: '#7c3aed', clara: '#d6b8ff', escura: '#0d0520', brilho: '#a855f7', glifo: 'lua', dot: 'Veneno' },
};

export const PALAVRAS: Record<Palavra, { nome: string; texto: string }> = {
  guardiao: { nome: 'Guardião', texto: 'Os ataques de personagens inimigos precisam mirar os Guardiões antes do herói ou dos outros personagens.' },
  rapido: { nome: 'Ímpeto', texto: 'Pode atacar no turno em que entra em campo.' },
  alado: { nome: 'Alado', texto: 'Só pode ser atacado por personagens alados (feitiços acertam normalmente).' },
  vampiro: { nome: 'Vampírico', texto: 'Cura o seu herói na mesma quantidade da vida que o ataque tira.' },
  foco: { nome: 'Foco Arcano', texto: 'Seus feitiços de dano e cura rolam +1 de bônus por personagem com Foco.' },
  couraca: { nome: 'Couraça', texto: 'Reduz em 1 cada golpe que recebe (não vale contra danos contínuos).' },
};

// ---------------------------------------------------------------------------
// Construtores curtos
// ---------------------------------------------------------------------------

const d = (n: number, f: Faces, b = 0): Dados => (b ? { n, f, b } : { n, f });
const dano = (n: number, f: Faces, alvo: Mira = 'escolhido'): Efeito => ({ e: 'dano', d: d(n, f), alvo });
const drenar = (n: number, f: Faces, alvo: Mira = 'escolhido'): Efeito => ({ e: 'drenar', d: d(n, f), alvo });
const cura = (n: number, f: Faces, alvo: Mira = 'escolhido'): Efeito => ({ e: 'cura', d: d(n, f), alvo });
const escudo = (n: number, f: Faces, alvo: Mira = 'escolhido'): Efeito => ({ e: 'escudo', d: d(n, f), alvo });
const ampl = (n: number, f: Faces, turnos: number, alvo: Mira = 'escolhido'): Efeito => ({ e: 'amplificar', d: d(n, f), alvo, turnos });
const dot = (n: number, f: Faces, turnos: number, alvo: Mira = 'escolhido'): Efeito => ({ e: 'dot', d: d(n, f), alvo, turnos });
const regen = (n: number, f: Faces, turnos: number, alvo: Mira = 'escolhido'): Efeito => ({ e: 'regenerar', d: d(n, f), alvo, turnos });
const fraco = (n: number, f: Faces, turnos: number, alvo: Mira = 'escolhido'): Efeito => ({ e: 'enfraquecer', d: d(n, f), alvo, turnos });
const silencio = (turnos: number, alvo: Mira = 'escolhido'): Efeito => ({ e: 'silenciar', alvo, turnos });
const atordoar = (turnos: number, alvo: Mira = 'escolhido'): Efeito => ({ e: 'atordoar', alvo, turnos });
const esquiva = (alvo: Mira = 'escolhido'): Efeito => ({ e: 'esquiva', alvo });
const purificar = (alvo: Mira = 'escolhido'): Efeito => ({ e: 'purificar', alvo });
const dissipar = (alvo: Mira = 'escolhido'): Efeito => ({ e: 'dissipar', alvo });
const comprar = (n: number): Efeito => ({ e: 'comprar', n });
const mana = (n: number): Efeito => ({ e: 'mana', n });
const drenarMana = (n: number): Efeito => ({ e: 'drenarMana', n });
const ressuscitar = (): Efeito => ({ e: 'ressuscitar' });

const raridadeDe = (custo: number, lendaria: boolean): Raridade => (lendaria ? 'lendaria' : custo <= 2 ? 'comum' : custo <= 4 ? 'rara' : 'epica');

function M(el: Elemento, id: string, nome: string, custo: number, copias: number, alvo: TipoDeAlvo | null, efeitos: Efeito[], sabor?: string): Carta {
  return { id, nome, el, tipo: 'magia', custo, copias, raridade: raridadeDe(custo, false), ...(alvo ? { alvo } : {}), efeitos, ...(sabor ? { sabor } : {}) };
}

function P(
  el: Elemento,
  id: string,
  nome: string,
  custo: number,
  copias: number,
  arquetipo: Arquetipo,
  vida: number,
  ataque: Dados,
  palavras: Palavra[],
  sabor: string,
  extra: { entrada?: Efeito[]; inicio?: Efeito[]; morte?: Efeito[]; lendaria?: boolean } = {},
): Carta {
  const { lendaria, ...gatilhos } = extra;
  return { id, nome, el, tipo: 'personagem', custo, copias, raridade: raridadeDe(custo, Boolean(lendaria)), efeitos: [], arquetipo, vida, ataque, palavras, sabor, ...gatilhos };
}

// ---------------------------------------------------------------------------
// As 102 cartas (17 por elemento: 12 feitiços e 5 personagens)
// ---------------------------------------------------------------------------

const FOGO: Carta[] = [
  M('fogo', 'fo01', 'Centelha', 1, 2, 'inimigo', [dano(1, 4)], 'Pequena demais para ver. Grande o bastante para sentir.'),
  M('fogo', 'fo02', 'Pavio Curto', 1, 2, 'inimigo', [dano(1, 3), mana(1)], 'Acendeu antes de ser avisado.'),
  M('fogo', 'fo03', 'Lança de Brasa', 2, 2, 'inimigo', [dano(1, 8)], 'Forjada no último suspiro de uma fogueira.'),
  M('fogo', 'fo04', 'Manto de Brasas', 2, 2, 'aliado', [escudo(1, 6)], 'Quem toca no manto, aprende o preço.'),
  M('fogo', 'fo05', 'Incendiar', 2, 2, 'inimigo', [dot(1, 4, 3)], 'O fogo não precisa de pressa.'),
  M('fogo', 'fo06', 'Fúria Ardente', 2, 2, 'char-aliado', [ampl(1, 6, 2)], 'Os olhos viram duas brasas.'),
  M('fogo', 'fo07', 'Labareda Rugidora', 3, 2, 'char-inimigo', [dano(1, 6), fraco(1, 4, 2)], 'O rugido queima antes do golpe.'),
  M('fogo', 'fo08', 'Bola de Fogo', 3, 2, 'inimigo', [dano(2, 4)], 'Clássica por um bom motivo.'),
  M('fogo', 'fo09', 'Chuva de Meteoros', 4, 2, null, [dano(1, 8, 'chars-inimigos'), dano(1, 4, 'heroi-inimigo')], 'O céu também sabe se vingar.'),
  M('fogo', 'fo10', 'Renascer das Cinzas', 4, 1, null, [ressuscitar(), cura(1, 6, 'heroi-proprio')], 'A fênix nunca morreu. Só estava esperando.'),
  M('fogo', 'fo11', 'Tempestade de Fogo', 5, 1, null, [dano(2, 8, 'chars-inimigos'), dano(1, 6, 'heroi-inimigo')], 'Nada em pé. Nada úmido.'),
  M('fogo', 'fo12', 'Erupção Vulcânica', 6, 1, 'inimigo', [dano(1, 20)], 'Ou nada, ou o fim do mundo. Os dados decidem.'),
  P('fogo', 'fo13', 'Salamandra Cinzenta', 2, 2, 'fera', 4, d(1, 4), ['rapido'], 'Dorme nas brasas, caça nas faíscas.'),
  P('fogo', 'fo14', 'Guerreiro Rubro', 3, 2, 'guerreiro', 6, d(1, 6), ['couraca'], 'A armadura ainda está quente da forja.'),
  P('fogo', 'fo15', 'Feiticeira de Brasas', 4, 2, 'mago', 5, d(1, 4), ['foco'], 'Seus cabelos estalam quando ela sorri.', { entrada: [dano(1, 4, 'heroi-inimigo')] }),
  P('fogo', 'fo16', 'Elemental de Magma', 5, 2, 'colosso', 10, d(2, 4), ['guardiao'], 'Lava com opinião própria.', { morte: [dano(1, 6, 'chars-inimigos')] }),
  P('fogo', 'fo17', 'Dragão Ígneo Ancestral', 8, 1, 'colosso', 14, d(3, 6), ['alado'], 'Quando ele respira fundo, o horizonte aquece.', { lendaria: true, entrada: [dano(1, 6, 'chars-inimigos')] }),
];

const AGUA: Carta[] = [
  M('agua', 'ag01', 'Gota Curativa', 1, 2, 'aliado', [cura(1, 4)], 'Uma gota. O bastante.'),
  M('agua', 'ag02', "Jato d'Água", 2, 2, 'inimigo', [dano(1, 6)], 'Pressão de oceano em um fio.'),
  M('agua', 'ag03', 'Onda Protetora', 2, 2, 'aliado', [escudo(1, 6)], 'A maré se ergue entre você e o golpe.'),
  M('agua', 'ag04', 'Maré de Silêncio', 2, 2, 'inimigo', [silencio(1)], 'Debaixo d’água ninguém ouve feitiço.'),
  M('agua', 'ag05', 'Geada', 2, 2, 'char-inimigo', [atordoar(1), dano(1, 3)], 'O gelo chega antes do frio.'),
  M('agua', 'ag06', 'Chuva Restauradora', 3, 2, 'aliado', [regen(1, 4, 3)], 'Cada pingo, um fôlego novo.'),
  M('agua', 'ag07', 'Lança de Gelo', 3, 2, 'inimigo', [dano(2, 4)], 'Cristal que lembra do inverno.'),
  M('agua', 'ag08', 'Corrente Profunda', 3, 2, null, [comprar(2)], 'O que o mar esconde, a corrente entrega.'),
  M('agua', 'ag09', 'Redemoinho', 4, 2, 'inimigo', [dano(1, 8), escudo(1, 4, 'heroi-proprio')], 'Quem gira por dentro, protege por fora.'),
  M('agua', 'ag10', 'Bênção das Marés', 4, 1, 'aliado', [cura(2, 6), purificar()], 'A lua puxa o mal para o fundo.'),
  M('agua', 'ag11', 'Prisão de Gelo', 5, 1, 'char-inimigo', [atordoar(2), fraco(1, 4, 2)], 'Um monumento a quem desafiou o inverno.'),
  M('agua', 'ag12', 'Tsunami', 6, 1, null, [dano(2, 8, 'chars-inimigos'), dano(1, 6, 'heroi-inimigo')], 'Chega devagar. Passa, não.'),
  P('agua', 'ag13', 'Sereia Cantora', 2, 2, 'mago', 3, d(1, 3), [], 'Sua canção encerra guerras e começa lendas.', { entrada: [cura(1, 4, 'heroi-proprio')] }),
  P('agua', 'ag14', 'Lobo Marinho', 3, 2, 'fera', 5, d(1, 6), ['rapido'], 'Nasceu na espuma, cresceu na tempestade.'),
  P('agua', 'ag15', 'Cavaleiro das Ondas', 4, 2, 'guerreiro', 8, d(1, 6), ['couraca'], 'Sua armadura é feita de conchas e promessas.'),
  P('agua', 'ag16', 'Kraken Abissal', 6, 2, 'colosso', 12, d(2, 6), [], 'Tentáculos que lembram naufrágios.', { entrada: [atordoar(1, 'chars-inimigos')] }),
  P('agua', 'ag17', 'Leviatã das Profundezas', 8, 1, 'colosso', 16, d(2, 10), ['guardiao'], 'O mar inteiro, com dentes.', { lendaria: true, entrada: [dano(1, 6, 'chars-inimigos'), cura(1, 6, 'heroi-proprio')] }),
];

const TERRA: Carta[] = [
  M('terra', 'te01', 'Pedregulho', 1, 2, 'inimigo', [dano(1, 4)], 'Simples. Pesado. Eficaz.'),
  M('terra', 'te02', 'Semente da Vida', 1, 2, 'aliado', [cura(1, 4)], 'O que se planta, se colhe.'),
  M('terra', 'te03', 'Escudo de Pedra', 2, 2, 'aliado', [escudo(1, 8)], 'A montanha, emprestada por um instante.'),
  M('terra', 'te04', 'Raízes Prisioneiras', 2, 2, 'char-inimigo', [atordoar(1)], 'O chão resolveu segurar seus passos.'),
  M('terra', 'te05', 'Casca de Carvalho', 2, 2, 'aliado', [regen(1, 4, 3)], 'A seiva sobe, a dor desce.'),
  M('terra', 'te06', 'Estalagmite', 3, 2, 'char-inimigo', [dano(2, 4)], 'Mil anos para crescer. Um segundo para furar.'),
  M('terra', 'te07', 'Muralha Viva', 3, 2, 'aliado', [escudo(2, 4)], 'Pedra e raiz, de mãos dadas.'),
  M('terra', 'te08', 'Força do Titã', 3, 2, 'char-aliado', [ampl(1, 6, 2)], 'Seus ombros agora sustentam o céu.'),
  M('terra', 'te09', 'Terremoto', 4, 2, null, [dano(1, 6, 'chars-inimigos'), dano(1, 4, 'heroi-inimigo')], 'O mundo se lembra de quem pisa forte.'),
  M('terra', 'te10', 'Despertar da Terra', 4, 1, null, [ressuscitar()], 'O que repousa sob a rocha atende ao chamado.'),
  M('terra', 'te11', 'Fortaleza Inabalável', 5, 1, 'aliado', [escudo(3, 6), purificar()], 'Nenhuma maré passa daqui.'),
  M('terra', 'te12', 'Avalanche', 6, 1, 'inimigo', [dano(2, 10)], 'A encosta inteira decidiu descer.'),
  P('terra', 'te13', 'Gnomo Escavador', 1, 2, 'guerreiro', 3, d(1, 3), ['couraca'], 'Diz que é pequeno. Nunca o viram cavando.'),
  P('terra', 'te14', 'Xamã das Raízes', 3, 2, 'mago', 4, d(1, 3), [], 'Fala com o que cresce embaixo dos pés.', { inicio: [cura(1, 3, 'heroi-proprio')] }),
  P('terra', 'te15', 'Guerreiro de Granito', 4, 2, 'guerreiro', 8, d(1, 6), ['couraca', 'guardiao'], 'Não recua. Não sabe como.'),
  P('terra', 'te16', 'Ent Ancestral', 5, 2, 'colosso', 11, d(1, 8), ['guardiao'], 'Já era velho quando o primeiro rei nasceu.'),
  P('terra', 'te17', 'Golem Primordial', 8, 1, 'colosso', 20, d(2, 8), ['guardiao', 'couraca'], 'Foi a primeira montanha. Decidiu andar.', { lendaria: true }),
];

const AR: Carta[] = [
  M('ar', 'ar01', 'Brisa Veloz', 1, 2, 'aliado', [esquiva()], 'Quando você olha, já passou.'),
  M('ar', 'ar02', 'Rajada', 1, 2, 'inimigo', [dano(1, 3)], 'Um empurrão que sabe onde dói.'),
  M('ar', 'ar03', 'Sopro de Ideias', 1, 2, null, [comprar(1)], 'O vento traz respostas a quem escuta.'),
  M('ar', 'ar04', 'Corte do Vento', 2, 2, 'inimigo', [dano(1, 6)], 'Invisível. Afiado. Inevitável.'),
  M('ar', 'ar05', 'Calmaria', 2, 2, 'inimigo', [silencio(1)], 'Nem o vento sopra. Nem a magia.'),
  M('ar', 'ar06', 'Asas do Falcão', 2, 2, 'char-aliado', [ampl(1, 4, 2)], 'Mais rápido que o próprio pensamento.'),
  M('ar', 'ar07', 'Relâmpago', 3, 2, 'inimigo', [dano(1, 12)], 'Ninguém escolhe onde cai. Você escolheu.'),
  M('ar', 'ar08', 'Barreira de Vento', 3, 2, 'aliado', [escudo(1, 8)], 'Uma parede que ninguém vê chegar.'),
  M('ar', 'ar09', 'Ciclone', 4, 2, null, [dano(1, 8, 'chars-inimigos')], 'Tudo gira. Nada fica.'),
  M('ar', 'ar10', 'Vento Cortante', 3, 1, 'inimigo', [dissipar(), dano(1, 4)], 'Arranca as defesas e o que estiver por trás.'),
  M('ar', 'ar11', 'Nuvem Tecelã', 4, 1, null, [comprar(3)], 'Cada fio de nuvem, uma possibilidade.'),
  M('ar', 'ar12', 'Tempestade Elétrica', 6, 1, 'inimigo', [dano(3, 6), silencio(1)], 'O trovão cala o que o raio não matou.'),
  P('ar', 'ar13', 'Falcão Tempestuoso', 2, 2, 'fera', 3, d(1, 4), ['alado', 'rapido'], 'Mergulha antes do primeiro trovão.'),
  P('ar', 'ar14', 'Bardo dos Ventos', 3, 2, 'mago', 4, d(1, 3), ['foco'], 'Cada nota carrega uma ideia nova.', { entrada: [comprar(1)] }),
  P('ar', 'ar15', 'Guerreira Celeste', 4, 2, 'guerreiro', 6, d(1, 8), ['alado'], 'Luta onde só as nuvens alcançam.'),
  P('ar', 'ar16', 'Espírito do Redemoinho', 5, 2, 'espirito', 7, d(2, 4), ['alado', 'rapido'], 'Não tem rosto. Tem direção.'),
  P('ar', 'ar17', 'Senhor das Tempestades', 8, 1, 'colosso', 12, d(3, 6), ['alado'], 'Quando ele abre os braços, o céu obedece.', { lendaria: true, entrada: [dano(1, 8, 'chars-inimigos'), silencio(1, 'heroi-inimigo')] }),
];

const LUZ: Carta[] = [
  M('luz', 'lu01', 'Raio de Luz', 1, 2, 'inimigo', [dano(1, 4)], 'Um fio de sol, afiado.'),
  M('luz', 'lu02', 'Toque de Luz', 1, 2, 'aliado', [cura(1, 4)], 'Mãos quentes. Dor que some.'),
  M('luz', 'lu03', 'Escudo Sagrado', 2, 2, 'aliado', [escudo(1, 6)], 'A fé também é armadura.'),
  M('luz', 'lu04', 'Purificação', 1, 2, 'aliado', [purificar(), cura(1, 3)], 'O que era sombra, agora é lembrança.'),
  M('luz', 'lu05', 'Bênção do Amanhecer', 2, 2, 'char-aliado', [ampl(1, 4, 2)], 'Quem acorda com o sol, luta com ele.'),
  M('luz', 'lu06', 'Lampejo Ofuscante', 2, 2, 'char-inimigo', [atordoar(1), dano(1, 3)], 'Quem olhou, esqueceu como atacar.'),
  M('luz', 'lu07', 'Lança Radiante', 3, 2, 'inimigo', [dano(2, 4)], 'Arremessada do primeiro alvorecer.'),
  M('luz', 'lu08', 'Cúpula de Luz', 3, 2, 'aliado', [escudo(2, 4)], 'Dentro dela, nenhuma sombra entra.'),
  M('luz', 'lu09', 'Prece Restauradora', 3, 2, 'aliado', [cura(1, 10)], 'A resposta chegou antes do fim da oração.'),
  M('luz', 'lu10', 'Ressurreição Divina', 5, 1, null, [ressuscitar(), cura(1, 6, 'heroi-proprio')], 'A luz não deixa ninguém para trás.'),
  M('luz', 'lu11', 'Julgamento Solar', 6, 1, 'inimigo', [dano(2, 8), cura(1, 6, 'heroi-proprio')], 'O sol decide. Sem apelação.'),
  M('luz', 'lu12', 'Milagre', 7, 1, 'aliado', [cura(3, 8), escudo(1, 8)], 'Ninguém explica. Todos agradecem.'),
  P('luz', 'lu13', 'Acólito da Aurora', 2, 2, 'mago', 3, d(1, 3), [], 'Reza baixo. Cura alto.', { entrada: [cura(1, 3, 'heroi-proprio')] }),
  P('luz', 'lu14', 'Unicórnio Luminoso', 3, 2, 'fera', 5, d(1, 4), ['rapido'], 'Seu galope acorda as estrelas.'),
  P('luz', 'lu15', 'Paladino Radiante', 4, 2, 'guerreiro', 8, d(1, 6), ['guardiao'], 'Jurou proteger. Cumpre.'),
  P('luz', 'lu16', 'Anjo Guardião', 5, 2, 'espirito', 7, d(2, 4), ['alado'], 'Suas asas são escudo e sentença.', { inicio: [escudo(1, 4, 'heroi-proprio')] }),
  P('luz', 'lu17', 'Serafim do Sol', 8, 1, 'espirito', 12, d(3, 6), ['alado', 'vampiro'], 'A própria luz tem um rosto, e é este.', { lendaria: true, entrada: [cura(2, 6, 'heroi-proprio')] }),
];

const ESCURIDAO: Carta[] = [
  M('escuridao', 'es01', 'Toque Sombrio', 1, 2, 'inimigo', [drenar(1, 3)], 'Frio. Faminto. Gentil demais para ser bom sinal.'),
  M('escuridao', 'es02', 'Lâmina de Sombra', 2, 2, 'inimigo', [dano(1, 6)], 'Corta antes de existir.'),
  M('escuridao', 'es03', 'Veneno de Aranha', 2, 2, 'inimigo', [dot(1, 4, 3)], 'A pior parte é a espera.'),
  M('escuridao', 'es04', 'Silêncio Sepulcral', 3, 2, 'inimigo', [silencio(2)], 'Nenhuma palavra sobrevive aqui.'),
  M('escuridao', 'es05', 'Maldição Fraca', 2, 2, 'char-inimigo', [fraco(1, 4, 2)], 'Seus braços lembram que são mortais.'),
  M('escuridao', 'es06', 'Véu da Noite', 2, 2, 'aliado', [esquiva(), escudo(1, 4)], 'Ninguém acerta o que não vê.'),
  M('escuridao', 'es07', 'Dreno Vital', 3, 2, 'inimigo', [drenar(2, 4)], 'O que era seu, agora é meu.'),
  M('escuridao', 'es08', 'Eclipse', 3, 2, 'inimigo', [dissipar(), dano(1, 6)], 'A luz e as defesas se apagam juntas.'),
  M('escuridao', 'es09', 'Pesadelo', 3, 2, 'char-inimigo', [atordoar(1), dot(1, 3, 2)], 'Dorme de olhos abertos. Sofre de olhos abertos.'),
  M('escuridao', 'es10', 'Reanimar Morto', 4, 1, null, [ressuscitar(), dano(1, 4, 'heroi-inimigo')], 'Os mortos têm assuntos pendentes.'),
  M('escuridao', 'es11', 'Fome do Vazio', 4, 1, null, [drenarMana(2), dano(1, 6, 'heroi-inimigo')], 'Ele não come carne. Come possibilidades.'),
  M('escuridao', 'es12', 'Abraço do Vazio', 6, 1, 'inimigo', [drenar(2, 8)], 'Todo fim tem um abraço. Este é o mais longo.'),
  P('escuridao', 'es13', 'Rato das Sombras', 1, 2, 'fera', 2, d(1, 3), ['rapido'], 'Sempre sabe onde a luz não chega.'),
  P('escuridao', 'es14', 'Cultista do Vazio', 3, 2, 'mago', 4, d(1, 3), ['foco'], 'Murmura um nome que ninguém devia lembrar.', { entrada: [fraco(1, 3, 1, 'chars-inimigos')] }),
  P('escuridao', 'es15', 'Cavaleiro Negro', 4, 2, 'guerreiro', 7, d(1, 6), ['vampiro'], 'Sua espada bebe antes de seu dono.'),
  P('escuridao', 'es16', 'Espectro Uivante', 4, 2, 'espirito', 5, d(1, 6), ['alado'], 'O uivo chega antes dele. O frio, depois.'),
  P('escuridao', 'es17', 'Senhor da Escuridão', 8, 1, 'colosso', 14, d(2, 10), ['vampiro'], 'Onde ele pisa, a noite chega mais cedo.', { lendaria: true, entrada: [silencio(2, 'chars-inimigos'), drenar(1, 8, 'heroi-inimigo')] }),
];

export const CARTAS: Carta[] = [...FOGO, ...AGUA, ...TERRA, ...AR, ...LUZ, ...ESCURIDAO];

// ---------------------------------------------------------------------------
// Cartas de mana: a mesma reserva (20 cartas) para cada elemento
// ---------------------------------------------------------------------------

export const MANA_POR_ELEMENTO = { essencias: 16, nucleos: 4 };

const NOMES_DE_MANA: Record<Elemento, [string, string, string, string]> = {
  fogo: ['Brasa', 'Coração de Magma', 'Uma brasa que não quer apagar.', 'Magma condensado, quente como um juramento.'],
  agua: ['Gota Pura', 'Pérola das Marés', 'A primeira gota de todas as chuvas.', 'Nasceu no fundo do mar, ao som da lua.'],
  terra: ['Seixo Vivo', 'Geodo Ancestral', 'Cada pedra guarda um sussurro.', 'Por dentro, um jardim de cristais.'],
  ar: ['Sopro', 'Olho do Vendaval', 'Um suspiro que não se perde.', 'O centro quieto de toda tempestade.'],
  luz: ['Fagulha de Luz', 'Prisma Solar', 'Um grão de amanhecer.', 'O sol, dobrado em mil cores.'],
  escuridao: ['Fragmento de Noite', 'Orbe do Vazio', 'Um pedaço de escuro que ainda respira.', 'Dentro dele, uma estrela morta sonha.'],
};

export const MANAS: CartaDeMana[] = ELEMENTOS_ORDEM.flatMap((el) => [
  { id: `m1-${el}`, nome: NOMES_DE_MANA[el][0], el, valor: 1 as const, sabor: NOMES_DE_MANA[el][2] },
  { id: `m2-${el}`, nome: NOMES_DE_MANA[el][1], el, valor: 2 as const, sabor: NOMES_DE_MANA[el][3] },
]);

const PORID = new Map<string, Carta>(CARTAS.map((c) => [c.id, c]));
const MANA_PORID = new Map<string, CartaDeMana>(MANAS.map((m) => [m.id, m]));

export const carta = (id: string): Carta => {
  const c = PORID.get(id);
  if (!c) throw new Error(`Carta desconhecida: ${id}`);
  return c;
};
export const cartaExiste = (id: string) => PORID.has(id);
export const cartaDeMana = (id: string): CartaDeMana => {
  const m = MANA_PORID.get(id);
  if (!m) throw new Error(`Mana desconhecida: ${id}`);
  return m;
};
export const manaExiste = (id: string) => MANA_PORID.has(id);
export const ehElemento = (x: unknown): x is Elemento => typeof x === 'string' && x in ELEMENTOS;

/** Os 30 ids do grimório de um elemento (uma entrada por cópia). */
export function montarGrimorio(el: Elemento): string[] {
  return CARTAS.filter((c) => c.el === el).flatMap((c) => Array<string>(c.copias).fill(c.id));
}

/** Os 20 ids da reserva de mana de um elemento. */
export function montarReserva(el: Elemento): string[] {
  return [...Array<string>(MANA_POR_ELEMENTO.essencias).fill(`m1-${el}`), ...Array<string>(MANA_POR_ELEMENTO.nucleos).fill(`m2-${el}`)];
}

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

export const dadosTexto = (x: Dados) => `${x.n}d${x.f}${x.b ? (x.b > 0 ? `+${x.b}` : x.b) : ''}`;
export const dadosMedia = (x: Dados) => (x.n * (x.f + 1)) / 2 + (x.b ?? 0);
export const dadosMax = (x: Dados) => x.n * x.f + (x.b ?? 0);

// ---------------------------------------------------------------------------
// Texto das cartas
// ---------------------------------------------------------------------------

const turnosTxt = (n: number) => (n === 1 ? '1 turno' : `${n} turnos`);

const ONDE: Record<Mira, { ao: string; do: string; em: string }> = {
  escolhido: { ao: 'ao alvo', do: 'do alvo', em: 'no alvo' },
  'heroi-proprio': { ao: 'ao seu herói', do: 'do seu herói', em: 'no seu herói' },
  'heroi-inimigo': { ao: 'ao herói inimigo', do: 'do herói inimigo', em: 'no herói inimigo' },
  'chars-inimigos': { ao: 'a todos os personagens inimigos', do: 'dos personagens inimigos', em: 'em todos os personagens inimigos' },
  'chars-aliados': { ao: 'a todos os seus personagens', do: 'dos seus personagens', em: 'em todos os seus personagens' },
  'todos-chars': { ao: 'a todos os personagens', do: 'dos personagens', em: 'em todos os personagens' },
  si: { ao: 'a si mesmo', do: 'de si mesmo', em: 'em si mesmo' },
};

export function textoDoEfeito(ef: Efeito, el?: Elemento): string {
  switch (ef.e) {
    case 'dano':
      return `Causa ${dadosTexto(ef.d)} de dano ${ONDE[ef.alvo].ao}.`;
    case 'drenar':
      return `Causa ${dadosTexto(ef.d)} de dano ${ONDE[ef.alvo].ao} e cura o seu herói do mesmo tanto.`;
    case 'cura':
      return `Cura ${dadosTexto(ef.d)} ${ONDE[ef.alvo].ao}.`;
    case 'escudo':
      return `Dá ${dadosTexto(ef.d)} de escudo ${ONDE[ef.alvo].ao}.`;
    case 'amplificar':
      return ef.alvo === 'heroi-proprio'
        ? `Seu próximo feitiço de dano rola +${dadosTexto(ef.d)} (até ${turnosTxt(ef.turnos)}).`
        : `Os ataques ${ONDE[ef.alvo].do} rolam +${dadosTexto(ef.d)} por ${turnosTxt(ef.turnos)}.`;
    case 'dot':
      return `${el ? ELEMENTOS[el].dot : 'Dano contínuo'}: ${dadosTexto(ef.d)} no início de cada turno ${ONDE[ef.alvo].do}, por ${turnosTxt(ef.turnos)}.`;
    case 'regenerar':
      return `Regeneração: cura ${dadosTexto(ef.d)} no início de cada turno ${ONDE[ef.alvo].do}, por ${turnosTxt(ef.turnos)}.`;
    case 'enfraquecer':
      return `Enfraquece ${ONDE[ef.alvo].ao.replace(/^a /, '')}: causa ${dadosTexto(ef.d)} a menos por ${turnosTxt(ef.turnos)}.`;
    case 'silenciar':
      return `Silêncio: ${ONDE[ef.alvo].ao.replace(/^a /, '')} não usa feitiços nem habilidades por ${turnosTxt(ef.turnos)}.`;
    case 'atordoar':
      return `Atordoa ${ONDE[ef.alvo].ao.replace(/^a /, '')} por ${turnosTxt(ef.turnos)} (não ataca).`;
    case 'esquiva':
      return `${ONDE[ef.alvo].ao.replace(/^a /, '')} evita o próximo dano que receber.`.replace(/^./, (c) => c.toUpperCase());
    case 'purificar':
      return `Remove silêncio, atordoamento, enfraquecimento e danos contínuos ${ONDE[ef.alvo].do}.`;
    case 'dissipar':
      return `Remove o escudo, a esquiva e os bônus ${ONDE[ef.alvo].do}.`;
    case 'comprar':
      return `Compre ${ef.n} ${ef.n === 1 ? 'carta' : 'cartas'} do grimório.`;
    case 'mana':
      return `Ganhe +${ef.n} de mana neste turno.`;
    case 'drenarMana':
      return `O oponente começa o próximo turno com ${ef.n} de mana a menos.`;
    case 'ressuscitar':
      return 'Devolve ao campo o último personagem que morreu, com a vida cheia.';
  }
}

/** Linhas de regra de uma carta (efeitos, entrada, início, morte e palavras). */
export function textoDaCarta(c: Carta): string[] {
  const linhas: string[] = [];
  c.palavras?.forEach((p) => linhas.push(`${PALAVRAS[p].nome}: ${PALAVRAS[p].texto}`));
  c.efeitos.forEach((ef) => linhas.push(textoDoEfeito(ef, c.el)));
  c.entrada?.forEach((ef) => linhas.push(`Ao entrar: ${textoDoEfeito(ef, c.el)}`));
  c.inicio?.forEach((ef) => linhas.push(`No início do seu turno: ${textoDoEfeito(ef, c.el)}`));
  c.morte?.forEach((ef) => linhas.push(`Ao morrer: ${textoDoEfeito(ef, c.el)}`));
  return linhas;
}

/** O desenho que representa a carta (emblema do feitiço ou arquétipo do personagem). */
export type Emblema = 'ataque' | 'area' | 'cura' | 'escudo' | 'amplificar' | 'dot' | 'silencio' | 'atordoar' | 'enfraquecer' | 'esquiva' | 'purificar' | 'dissipar' | 'comprar' | 'mana' | 'ressuscitar' | 'drenar';
export function emblemaDe(c: Carta): Emblema {
  const ef = c.efeitos[0];
  if (!ef) return 'ataque';
  if (ef.e === 'dano') return ef.alvo === 'chars-inimigos' || ef.alvo === 'todos-chars' ? 'area' : 'ataque';
  if (ef.e === 'drenar') return 'drenar';
  if (ef.e === 'regenerar') return 'cura';
  if (ef.e === 'silenciar') return 'silencio';
  if (ef.e === 'drenarMana') return 'mana';
  return ef.e as Emblema;
}

export type EfeitoComAlvo = Extract<Efeito, { alvo: Mira }>;
/** O efeito que usa o alvo que a pessoa escolhe. */
export const efeitoEscolhido = (c: Carta) => c.efeitos.find((e): e is EfeitoComAlvo => 'alvo' in e && e.alvo === 'escolhido') ?? null;

/** Valor aproximado de um efeito (usado pelo robô e para ordenar). */
export function valorDoEfeito(ef: Efeito): number {
  switch (ef.e) {
    case 'dano':
    case 'drenar':
    case 'cura':
    case 'escudo':
      return dadosMedia(ef.d);
    case 'dot':
    case 'regenerar':
      return dadosMedia(ef.d) * ef.turnos;
    case 'amplificar':
      return dadosMedia(ef.d) * Math.min(2, ef.turnos);
    case 'enfraquecer':
      return dadosMedia(ef.d) * ef.turnos * 0.7;
    case 'silenciar':
      return 2.5 * ef.turnos;
    case 'atordoar':
      return 3 * ef.turnos;
    case 'comprar':
      return ef.n * 2;
    case 'mana':
      return ef.n * 1.5;
    case 'drenarMana':
      return ef.n * 2;
    case 'esquiva':
      return 3;
    case 'purificar':
    case 'dissipar':
      return 2;
    case 'ressuscitar':
      return 6;
  }
}
