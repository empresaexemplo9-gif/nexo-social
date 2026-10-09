import catalogo from './grimorios.json';
import type { Elemento } from './cartas';

export type Funcao = 'tank' | 'mago' | 'suporte' | 'guerreiro' | 'arqueiro';
export type MiraNova = 'alvo' | 'si' | 'aliados' | 'inimigos';
export type EfeitoNovo = { tipo: 'reviver' | 'dano' | 'cura' | 'escudo' | 'atordoamento' | 'congelamento' | 'enraizamento' | 'desorientacao' | 'vulnerabilidade' | 'regeneracao' | 'queimadura' | 'purificar' | 'bonus' | 'evasao' | 'determinacao' | 'removerEscudo'; valor: number; mira: MiraNova; maxAlvos?: number };
export type Gatilho = 'declararFeitico' | 'declararAtaque' | 'conjurarMagia' | 'conjurarFeitico' | 'receberEscudo' | 'receberDano' | 'causarDano' | 'curar' | 'purificar' | 'inicio';
export type Condicao = 'purifica' | 'sempre' | 'alvoEscudo' | 'alvoSemEscudo' | 'alvoFerido' | 'alvoVidaCheia' | 'alvoMeiaVida' | 'alvoControlado' | 'alvoTank' | 'siEscudo' | 'siSemEscudo' | 'siFerido' | 'siMeiaVida' | 'siVidaCheia' | 'custo4' | 'absorcao' | 'letal' | 'reacao' | 'enraiza' | 'cura' | 'turnoInimigo';
export interface Especial { nome: string; texto: string; gatilho: Gatilho; condicao: Condicao; limite: 'turno' | 'partida'; operacao: 'reviver' | 'dano' | 'cura' | 'escudo' | 'bonus' | 'removerEscudo'; valor: number; destino: 'si' | 'alvo' | 'aliadoFerido' | 'aliadoMorto' }
export interface ArteNova { src: string; colunas?: number; linhas?: number; posicao?: number; proporcao?: number }
export interface CartaNova {
  id: string; nome: string; elemento: Elemento; tipo: 'personagem' | 'magia' | 'feitico' | 'mana';
  custo: number; copias: number; texto: string; arte: ArteNova;
  funcao?: Funcao; vida?: number; ataque?: number; especial?: Especial; habilidades?: Especial[];
  conjurador?: string; alvo?: 'aliado' | 'aliadoMorto' | 'inimigo' | 'si' | 'grupo'; reacao?: boolean;
  efeitos: EfeitoNovo[]; cargas?: 1 | 2;
}
export interface Grimorio { elemento: Elemento; nome: string; estrategia: string; cartas: CartaNova[] }
export const GRIMORIOS = catalogo as unknown as Grimorio[];
export const CARTAS_NOVAS = GRIMORIOS.flatMap((g) => g.cartas);
const INDICE = new Map(CARTAS_NOVAS.map((c) => [c.id, c]));
export function cartaNova(id: string): CartaNova {
  const c = INDICE.get(id);
  if (!c) throw new Error(`Carta desconhecida: ${id}`);
  return c;
}
export const grimorioNovo = (el: Elemento) => GRIMORIOS.find((g) => g.elemento === el)!;
export const personagensDoGrimorio = (el: Elemento) => grimorioNovo(el).cartas.filter((c) => c.tipo === 'personagem');
export function pilhaNova(el: Elemento, mana = false): string[] {
  return grimorioNovo(el).cartas.filter((c) => mana ? c.tipo === 'mana' : c.tipo === 'magia' || c.tipo === 'feitico').flatMap((c) => Array(c.copias).fill(c.id) as string[]);
}
export const REGRAS_NOVAS = {
  maoInicial: 5, manaInicial: 2, ataquesPorTurno: 2, manaMaxima: 12,
  magiasFeiticos: 52, cartasDeMana: 24, essencias: 16, nucleos: 8,
};
export const GLOSSARIO_NOVO: Record<string, string> = {
  reviver: 'Devolve um personagem eliminado ao campo, uma única vez por personagem. Preserva usos de habilidades e remove estados anteriores. Pode alcançar aliados de outro grimório enquanto a partida continua; não alcança quem desistiu.',
  exaustao: 'Após reviver, impede ataques, conjurações e habilidades até o início do próximo turno do dono.',
  atordoamento: 'Impede ataques e conjurações até o fim do próximo turno do dono.',
  congelamento: 'Impede ataques e conjurações até o fim do próximo turno do dono. Dano posterior, mesmo absorvido pelo escudo, quebra o gelo.',
  enraizamento: 'Impede ataques básicos até o fim do próximo turno do dono; permite conjurações.',
  desorientacao: 'Reduz em 2 o próximo feitiço de dano. Expira no fim do próximo turno do dono.',
  vulnerabilidade: 'O próximo golpe recebido causa +1 de dano antes da defesa. Expira no fim do próximo turno do dono.',
  regeneracao: 'Cura 1 no início dos próximos dois turnos do dono, sem superar a vida máxima.',
  queimadura: 'Causa 1 de dano no início dos próximos dois turnos do dono, passando primeiro pelo escudo.',
  purificar: 'Remove efeitos negativos de um personagem vivo. Não ressuscita nem remove benefícios.',
  bonus: 'Bônus exclusivo para o próximo feitiço do conjurador. Consome no uso e expira no fim do turno.',
  evasao: 'Reduz em 2 o próximo golpe antes do escudo; expira no início do próximo turno do dono.',
  determinacao: 'Bloqueia um atordoamento, congelamento ou enraizamento; expira no início do próximo turno do dono.',
  tenacidade: 'Após sair de atordoamento ou congelamento, impede novas aplicações dos dois até o fim do próximo turno do dono.',
};
