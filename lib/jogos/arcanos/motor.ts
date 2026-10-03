// Arcanos — o motor da partida. Funções puras: recebem o estado e uma ação e
// devolvem o próximo estado (ou o motivo de a jogada não valer). Os dois
// aparelhos rodam este mesmo código com as mesmas ações, na mesma ordem, e
// chegam ao mesmo estado.
//
// Os dados: quem faz a jogada rola (aleatório de verdade) e o resultado viaja
// dentro da ação (`rolls`). Quem recebe repete a jogada com esses mesmos
// números e confere que cada um cabe no dado. Escondida fica só a ordem dos
// baralhos e a mão: do adversário cada aparelho sabe apenas as quantidades.

import {
  carta,
  cartaDeMana,
  dadosMax,
  montarGrimorio,
  montarReserva,
  type Carta,
  type Dados,
  type Efeito,
  type Elemento,
  type Faces,
  type Mira,
  type Palavra,
  type TipoDeAlvo,
  type CartaDeMana,
} from './cartas';

export type Lado = 0 | 1;
export const outro = (l: Lado): Lado => (l === 0 ? 1 : 0);

export const VIDA_INICIAL = 20;
export const MAO_INICIAL = 5;
export const MANA_INICIAL = 2;
export const MAO_MAXIMA = 8;
export const MAO_MANA_MAXIMA = 5;
export const CAMPO_MAXIMO = 4;
export const MANA_MAXIMA = 10;

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

export interface Status {
  silencio: number;
  atordoado: number;
  esquiva: boolean;
  dots: { d: Dados; t: number; el: Elemento }[];
  regens: { d: Dados; t: number }[];
  ampls: { d: Dados; t: number }[];
  fracos: { v: number; t: number }[];
}

export interface Personagem {
  id: string;
  carta: string;
  dono: Lado;
  /** Vida máxima; a vida que resta é `vida - dano`. */
  vida: number;
  dano: number;
  escudo: number;
  status: Status;
  exausta: boolean;
  entrouNoTurno: number;
}

export interface Jogador {
  userId: string;
  nome: string;
  elemento: Elemento;
  vida: number;
  escudo: number;
  status: Status;
  /** Soma das cartas de mana em jogo. */
  fonte: number;
  gasta: number;
  extra: number;
  /** Mana a menos neste turno (por causa do adversário). */
  bloq: number;
  bloqPend: number;
  jogouMana: boolean;
  /** Mão e baralhos: só de quem joga neste aparelho (null para o adversário). */
  mao: string[] | null;
  maoQtd: number;
  baralho: string[] | null;
  baralhoQtd: number;
  maoMana: string[] | null;
  maoManaQtd: number;
  reserva: string[] | null;
  reservaQtd: number;
  manaEmJogo: string[];
  campo: Personagem[];
  /** Ids das cartas dos personagens mortos (o último é o primeiro a voltar). */
  cemiterio: string[];
  fadiga: number;
}

export type Ref = { tipo: 'heroi'; lado: Lado } | { tipo: 'char'; id: string };

type Vis = { vida: number; escudo: number };

export type TipoDeEfeito =
  | 'dano'
  | 'cura'
  | 'escudo'
  | 'amplificar'
  | 'dot'
  | 'regenerar'
  | 'enfraquecer'
  | 'silenciar'
  | 'atordoar'
  | 'esquiva'
  | 'esquiva-usada'
  | 'purificar'
  | 'dissipar'
  | 'comprar'
  | 'mana'
  | 'drenarMana'
  | 'ressuscitar'
  | 'falhou';

/** O que aconteceu na última jogada, em ordem, para o tabuleiro animar. */
export type Evento =
  | { k: 'carta'; lado: Lado; carta: string; alvo: Ref | null }
  | { k: 'mana'; lado: Lado; carta: string; valor: number }
  | { k: 'invocar'; lado: Lado; p: Personagem; reviveu?: boolean }
  | { k: 'ataque'; lado: Lado; atacante: string; alvo: Ref }
  | { k: 'dados'; lado: Lado; faces: Faces; valores: number[]; bonus: number; total: number; porque: string; alvo: Ref | null; el: Elemento }
  | { k: 'efeito'; tipo: TipoDeEfeito; alvo: Ref; origem: Ref | null; el: Elemento; valor: number; absorvido?: number; antes?: Vis; depois?: Vis; dot?: boolean; turnos?: number }
  | { k: 'morte'; lado: Lado; id: string; carta: string }
  | { k: 'comprou'; lado: Lado; n: number }
  | { k: 'turno'; lado: Lado }
  | { k: 'desistiu'; lado: Lado }
  | { k: 'fim'; vencedor: Lado | 'empate' };

export interface Estado {
  turno: number;
  ativo: Lado;
  jogadores: [Jogador, Jogador];
  /** Quem joga neste aparelho (null para quem só assiste). */
  eu: Lado | null;
  vencedor: Lado | 'empate' | null;
  motivo: string | null;
  seq: number;
  contador: number;
  log: string[];
  eventos: Evento[];
}

export type Acao =
  | { t: 'mana'; lado: Lado; carta: string; rolls?: number[] }
  | { t: 'jogar'; lado: Lado; carta: string; alvo?: Ref | null; rolls?: number[] }
  | { t: 'atacar'; lado: Lado; atacante: string; alvo: Ref; rolls?: number[] }
  | { t: 'passar'; lado: Lado; porTempo?: boolean; rolls?: number[] }
  | { t: 'desistir'; lado: Lado; rolls?: number[] };

export type Resultado = { ok: true; estado: Estado; acao: Acao } | { ok: false; erro: string };

class Regra extends Error {}
const proibido = (msg: string): never => {
  throw new Regra(msg);
};

const statusVazio = (): Status => ({ silencio: 0, atordoado: 0, esquiva: false, dots: [], regens: [], ampls: [], fracos: [] });

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export const vidaDoChar = (p: Personagem) => p.vida - p.dano;
export const palavrasDe = (p: Personagem): Palavra[] => carta(p.carta).palavras ?? [];
export const temPalavra = (p: Personagem, w: Palavra) => palavrasDe(p).includes(w) && !(w !== 'guardiao' && w !== 'alado' && w !== 'rapido' && p.status.silencio > 0);
export const ataqueDoChar = (p: Personagem): Dados => carta(p.carta).ataque ?? { n: 1, f: 3 };
export const enfraquecidoEm = (s: Status) => s.fracos.reduce((a, f) => a + f.v, 0);

export function acharChar(e: Estado, id: string): Personagem | null {
  for (const j of e.jogadores) for (const c of j.campo) if (c.id === id) return c;
  return null;
}

export const ladoDoRef = (e: Estado, r: Ref): Lado | null => (r.tipo === 'heroi' ? r.lado : acharChar(e, r.id)?.dono ?? null);
export const mesmoRef = (a: Ref, b: Ref) => (a.tipo === 'heroi' ? b.tipo === 'heroi' && a.lado === b.lado : b.tipo === 'char' && a.id === b.id);

export const manaDisponivel = (j: Jogador) => Math.max(0, Math.min(MANA_MAXIMA, j.fonte) + j.extra - j.bloq - j.gasta);
export const manaTotal = (j: Jogador) => Math.max(0, Math.min(MANA_MAXIMA, j.fonte) + j.extra - j.bloq);

const focoDe = (e: Estado, lado: Lado) => e.jogadores[lado].campo.filter((p) => carta(p.carta).palavras?.includes('foco') && p.status.silencio === 0).length;

function alvoServe(e: Estado, lado: Lado, tipo: TipoDeAlvo, r: Ref): boolean {
  const l = ladoDoRef(e, r);
  if (l === null) return false;
  const ehHeroi = r.tipo === 'heroi';
  const aliado = l === lado;
  switch (tipo) {
    case 'inimigo':
      return !aliado;
    case 'aliado':
      return aliado;
    case 'qualquer':
      return true;
    case 'char-inimigo':
      return !ehHeroi && !aliado;
    case 'char-aliado':
      return !ehHeroi && aliado;
    case 'char-qualquer':
      return !ehHeroi;
  }
}

function todosOsAlvos(e: Estado): Ref[] {
  return [
    { tipo: 'heroi', lado: 0 },
    { tipo: 'heroi', lado: 1 },
    ...e.jogadores.flatMap((j) => j.campo.map((c): Ref => ({ tipo: 'char', id: c.id }))),
  ];
}

/** Todos os alvos que um feitiço aceita agora (vazio: não pede alvo ou não há onde). */
export function alvosDaCarta(e: Estado, lado: Lado, cartaId: string): Ref[] {
  const c = carta(cartaId);
  if (!c.alvo) return [];
  return todosOsAlvos(e).filter((r) => alvoServe(e, lado, c.alvo!, r));
}

export const pedeAlvo = (c: Carta) => c.tipo === 'magia' && Boolean(c.alvo);

export function podeJogarMana(e: Estado, lado: Lado, id: string): string | null {
  const j = e.jogadores[lado];
  if (e.vencedor !== null) return 'A partida terminou.';
  if (e.ativo !== lado) return 'Não é a sua vez.';
  if (j.jogouMana) return 'Você já colocou uma mana neste turno.';
  if (j.fonte >= MANA_MAXIMA) return `Sua fonte já está no máximo (${MANA_MAXIMA}).`;
  if (e.eu === lado && !j.maoMana?.includes(id)) return 'Essa mana não está na sua mão.';
  return null;
}

export function podeJogar(e: Estado, lado: Lado, cartaId: string): string | null {
  const j = e.jogadores[lado];
  const c = carta(cartaId);
  if (e.vencedor !== null) return 'A partida terminou.';
  if (e.ativo !== lado) return 'Não é a sua vez.';
  if (c.el !== j.elemento) return 'Essa carta é de outro elemento.';
  if (e.eu === lado && !j.mao?.includes(cartaId)) return 'Essa carta não está na sua mão.';
  if (c.custo > manaDisponivel(j)) return `Falta mana: ${c.nome} custa ${c.custo} e você tem ${manaDisponivel(j)}.`;
  if (c.tipo === 'magia' && j.status.silencio > 0) return 'Seu herói está silenciado: nada de feitiços neste turno.';
  if (c.tipo === 'personagem' && j.campo.length >= CAMPO_MAXIMO) return `Seu campo está cheio (${CAMPO_MAXIMO} personagens).`;
  if (c.tipo === 'magia' && c.alvo && alvosDaCarta(e, lado, cartaId).length === 0) return 'Não há alvo válido para este feitiço.';
  return null;
}

export const podeAtacar = (e: Estado, p: Personagem): boolean =>
  e.vencedor === null &&
  p.dono === e.ativo &&
  !p.exausta &&
  p.status.atordoado === 0 &&
  e.jogadores[p.dono].status.atordoado === 0 &&
  (p.entrouNoTurno < e.turno || carta(p.carta).palavras?.includes('rapido') === true);

/** Quem este personagem pode atacar (Guardiões e Alados mandam na lista). */
export function alvosDoAtaque(e: Estado, p: Personagem): Ref[] {
  const lado = p.dono;
  const alado = carta(p.carta).palavras?.includes('alado') === true;
  const inimigos = e.jogadores[outro(lado)].campo.filter((c) => alado || !carta(c.carta).palavras?.includes('alado'));
  const guardioes = inimigos.filter((c) => carta(c.carta).palavras?.includes('guardiao') && c.status.silencio === 0);
  if (guardioes.length) return guardioes.map((c): Ref => ({ tipo: 'char', id: c.id }));
  return [...inimigos.map((c): Ref => ({ tipo: 'char', id: c.id })), { tipo: 'heroi', lado: outro(lado) }];
}

// ---------------------------------------------------------------------------
// Começo da partida
// ---------------------------------------------------------------------------

export interface Participante {
  userId: string;
  nome: string;
  elemento: Elemento;
}

function sorteio(n: number): number {
  const g = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (g?.getRandomValues) {
    const a = new Uint32Array(1);
    // Sem viés: descarta a faixa que não divide igualmente.
    const limite = Math.floor(0x100000000 / n) * n;
    do g.getRandomValues(a);
    while (a[0] >= limite);
    return (a[0] % n) + 1;
  }
  return Math.floor(Math.random() * n) + 1;
}

function embaralhar<T>(lista: T[]): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const k = sorteio(i + 1) - 1;
    [r[i], r[k]] = [r[k], r[i]];
  }
  return r;
}

/** O grimório (30) e a reserva de mana (20) embaralhados neste aparelho. */
export function embaralharBaralho(elemento: Elemento): { baralho: string[]; reserva: string[] } {
  return { baralho: embaralhar(montarGrimorio(elemento)), reserva: embaralhar(montarReserva(elemento)) };
}

export function novaPartida(participantes: [Participante, Participante], eu: Lado | null, meu?: { baralho: string[]; reserva: string[] }): Estado {
  const jogador = (p: Participante, lado: Lado): Jogador => {
    // Quem joga em segundo compra uma carta e uma mana a mais.
    const nMao = MAO_INICIAL + lado;
    const nMana = MANA_INICIAL + lado;
    const dele = eu === lado && meu;
    const baralho = dele ? [...meu.baralho] : null;
    const reserva = dele ? [...meu.reserva] : null;
    const mao = baralho ? baralho.splice(0, nMao) : null;
    const maoMana = reserva ? reserva.splice(0, nMana) : null;
    return {
      userId: p.userId,
      nome: p.nome,
      elemento: p.elemento,
      vida: VIDA_INICIAL,
      escudo: 0,
      status: statusVazio(),
      fonte: 0,
      gasta: 0,
      extra: 0,
      bloq: 0,
      bloqPend: 0,
      jogouMana: false,
      mao,
      maoQtd: nMao,
      baralho,
      baralhoQtd: montarGrimorio(p.elemento).length - nMao,
      maoMana,
      maoManaQtd: nMana,
      reserva,
      reservaQtd: montarReserva(p.elemento).length - nMana,
      manaEmJogo: [],
      campo: [],
      cemiterio: [],
      fadiga: 0,
    };
  };
  return {
    turno: 1,
    ativo: 0,
    jogadores: [jogador(participantes[0], 0), jogador(participantes[1], 1)],
    eu,
    vencedor: null,
    motivo: null,
    seq: 0,
    contador: 0,
    log: [`${participantes[0].nome} começa.`],
    eventos: [{ k: 'turno', lado: 0 }],
  };
}

/** O que os espectadores veem: sem mãos nem baralhos. */
export function publico(e: Estado): Estado {
  const c = structuredClone(e);
  c.eu = null;
  for (const j of c.jogadores) {
    j.mao = null;
    j.baralho = null;
    j.maoMana = null;
    j.reserva = null;
  }
  return c;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

class Rolagem {
  usados: number[] = [];
  private i = 0;
  constructor(private readonly dadas?: number[]) {}

  rolar(dd: Dados): { valores: number[]; total: number } {
    if (!Number.isInteger(dd.n) || dd.n < 1 || dd.n > 8) proibido('Dados inválidos.');
    const valores: number[] = [];
    for (let k = 0; k < dd.n; k++) {
      let v: number;
      if (this.dadas) {
        if (this.i >= this.dadas.length) return proibido('Faltam dados nesta jogada.');
        v = this.dadas[this.i++];
        if (!Number.isInteger(v) || v < 1 || v > dd.f) proibido('Um dado veio com valor impossível.');
      } else {
        v = sorteio(dd.f);
      }
      this.usados.push(v);
      valores.push(v);
    }
    return { valores, total: valores.reduce((a, b) => a + b, 0) + (dd.b ?? 0) };
  }

  conferirFim() {
    if (this.dadas && this.i !== this.dadas.length) proibido('Sobraram dados nesta jogada.');
  }
}

interface Ctx {
  e: Estado;
  roll: Rolagem;
}

const push = (c: Ctx, ev: Evento) => c.e.eventos.push(ev);
const nota = (c: Ctx, texto: string) => {
  c.e.log.push(texto);
  if (c.e.log.length > 80) c.e.log.shift();
};

const visDe = (e: Estado, r: Ref): Vis => {
  if (r.tipo === 'heroi') {
    const j = e.jogadores[r.lado];
    return { vida: Math.max(0, j.vida), escudo: j.escudo };
  }
  const p = acharChar(e, r.id);
  return p ? { vida: Math.max(0, vidaDoChar(p)), escudo: p.escudo } : { vida: 0, escudo: 0 };
};

const statusDe = (e: Estado, r: Ref): Status | null => (r.tipo === 'heroi' ? e.jogadores[r.lado].status : acharChar(e, r.id)?.status ?? null);

const nomeDe = (e: Estado, r: Ref) => (r.tipo === 'heroi' ? e.jogadores[r.lado].nome.split(' ')[0] : carta(acharChar(e, r.id)?.carta ?? 'fo01').nome);

function rolarComEvento(c: Ctx, dd: Dados, lado: Lado, porque: string, alvo: Ref | null, el: Elemento, extraBonus = 0): number {
  const r = c.roll.rolar(dd);
  const total = r.total + extraBonus;
  push(c, { k: 'dados', lado, faces: dd.f, valores: r.valores, bonus: (dd.b ?? 0) + extraBonus, total, porque, alvo, el });
  return total;
}

function resolverMira(c: Ctx, lado: Lado, mira: Mira, escolhido: Ref | null, origem: Ref | null): Ref[] {
  const e = c.e;
  switch (mira) {
    case 'escolhido':
      return escolhido ? [escolhido] : [];
    case 'heroi-proprio':
      return [{ tipo: 'heroi', lado }];
    case 'heroi-inimigo':
      return [{ tipo: 'heroi', lado: outro(lado) }];
    case 'chars-inimigos':
      return e.jogadores[outro(lado)].campo.map((p): Ref => ({ tipo: 'char', id: p.id }));
    case 'chars-aliados':
      return e.jogadores[lado].campo.map((p): Ref => ({ tipo: 'char', id: p.id }));
    case 'todos-chars':
      return e.jogadores.flatMap((j) => j.campo.map((p): Ref => ({ tipo: 'char', id: p.id })));
    case 'si':
      return origem && origem.tipo === 'char' && acharChar(e, origem.id) ? [origem] : [];
  }
}

/** Dano de verdade: esquiva, couraça, escudo e vida. Devolve a vida perdida. */
function causarDano(c: Ctx, alvo: Ref, bruto: number, o: { el: Elemento; origem: Ref | null; dot?: boolean; fadiga?: boolean }): number {
  const e = c.e;
  const st = statusDe(e, alvo);
  if (!st) return 0;
  let v = Math.max(0, Math.floor(bruto));
  const antes = visDe(e, alvo);
  if (!o.dot && !o.fadiga && v > 0 && st.esquiva) {
    st.esquiva = false;
    push(c, { k: 'efeito', tipo: 'esquiva-usada', alvo, origem: o.origem, el: o.el, valor: 0, antes, depois: antes });
    nota(c, `${nomeDe(e, alvo)} desviou do golpe.`);
    return 0;
  }
  if (alvo.tipo === 'char') {
    const p = acharChar(e, alvo.id)!;
    if (!o.dot && !o.fadiga && v > 0 && temPalavra(p, 'couraca')) v = Math.max(0, v - 1);
  }
  let absorvido = 0;
  if (alvo.tipo === 'heroi') {
    const j = e.jogadores[alvo.lado];
    absorvido = Math.min(j.escudo, v);
    j.escudo -= absorvido;
    v -= absorvido;
    j.vida -= v;
  } else {
    const p = acharChar(e, alvo.id)!;
    absorvido = Math.min(p.escudo, v);
    p.escudo -= absorvido;
    v -= absorvido;
    p.dano += v;
  }
  push(c, { k: 'efeito', tipo: 'dano', alvo, origem: o.origem, el: o.el, valor: v, absorvido, antes, depois: visDe(e, alvo), dot: o.dot });
  nota(c, `${nomeDe(e, alvo)} sofre ${v} de dano${absorvido ? ` (escudo absorveu ${absorvido})` : ''}.`);
  return v;
}

function curar(c: Ctx, alvo: Ref, valor: number, el: Elemento, origem: Ref | null): number {
  const e = c.e;
  const antes = visDe(e, alvo);
  let feito = 0;
  if (alvo.tipo === 'heroi') {
    const j = e.jogadores[alvo.lado];
    feito = Math.max(0, Math.min(VIDA_INICIAL - j.vida, valor));
    j.vida += feito;
  } else {
    const p = acharChar(e, alvo.id);
    if (!p) return 0;
    feito = Math.max(0, Math.min(p.dano, valor));
    p.dano -= feito;
  }
  push(c, { k: 'efeito', tipo: 'cura', alvo, origem, el, valor: feito, antes, depois: visDe(e, alvo) });
  nota(c, `${nomeDe(e, alvo)} recupera ${feito} de vida.`);
  return feito;
}

function comprarCartas(c: Ctx, lado: Lado, n: number, el: Elemento) {
  const e = c.e;
  const j = e.jogadores[lado];
  let compradas = 0;
  for (let i = 0; i < n; i++) {
    if (j.baralhoQtd <= 0) {
      j.fadiga += 1;
      causarDano(c, { tipo: 'heroi', lado }, j.fadiga, { el, origem: null, fadiga: true });
      nota(c, `${j.nome.split(' ')[0]} não tem mais cartas: fadiga ${j.fadiga}.`);
      continue;
    }
    j.baralhoQtd -= 1;
    if (e.eu === lado && j.baralho && j.mao) {
      const id = j.baralho.shift()!;
      if (j.mao.length < MAO_MAXIMA) j.mao.push(id);
      j.maoQtd = j.mao.length;
    } else if (j.maoQtd < MAO_MAXIMA) {
      j.maoQtd += 1;
    }
    compradas += 1;
  }
  if (compradas) push(c, { k: 'comprou', lado, n: compradas });
}

function comprarMana(c: Ctx, lado: Lado) {
  const e = c.e;
  const j = e.jogadores[lado];
  if (j.reservaQtd <= 0) return;
  j.reservaQtd -= 1;
  if (e.eu === lado && j.reserva && j.maoMana) {
    const id = j.reserva.shift()!;
    if (j.maoMana.length < MAO_MANA_MAXIMA) j.maoMana.push(id);
    j.maoManaQtd = j.maoMana.length;
  } else if (j.maoManaQtd < MAO_MANA_MAXIMA) {
    j.maoManaQtd += 1;
  }
}

function criarPersonagem(c: Ctx, lado: Lado, cartaId: string): Personagem {
  const k = carta(cartaId);
  const p: Personagem = {
    id: `${lado}p${c.e.contador++}`,
    carta: cartaId,
    dono: lado,
    vida: k.vida ?? 1,
    dano: 0,
    escudo: 0,
    status: statusVazio(),
    exausta: false,
    entrouNoTurno: c.e.turno,
  };
  c.e.jogadores[lado].campo.push(p);
  return p;
}

interface Origem {
  lado: Lado;
  el: Elemento;
  ref: Ref | null;
  /** Feitiço: vale o Foco e o bônus de amplificação do herói. */
  feitico: boolean;
}

function executarEfeitos(c: Ctx, efeitos: Efeito[], o: Origem, escolhido: Ref | null) {
  let amplDoHeroiUsado = false;
  for (const ef of efeitos) {
    const dano = ef.e === 'dano' || ef.e === 'drenar';
    executarEfeito(c, ef, o, escolhido, dano && !amplDoHeroiUsado);
    if (dano && o.feitico) amplDoHeroiUsado = true;
    verificarMortes(c);
  }
}

function executarEfeito(c: Ctx, ef: Efeito, o: Origem, escolhido: Ref | null, aplicaAmpl: boolean) {
  const e = c.e;
  const heroi: Ref = { tipo: 'heroi', lado: o.lado };
  const mira = (m: Mira) => resolverMira(c, o.lado, m, escolhido, o.ref);
  switch (ef.e) {
    case 'dano':
    case 'drenar': {
      const alvos = mira(ef.alvo);
      if (!alvos.length) return;
      const foco = o.feitico ? focoDe(e, o.lado) : 0;
      let total = rolarComEvento(c, ef.d, o.lado, ef.e === 'drenar' ? 'dreno' : 'dano', alvos[0], o.el, foco);
      const st = e.jogadores[o.lado].status;
      if (o.feitico && aplicaAmpl && st.ampls.length) {
        for (const a of st.ampls) total += rolarComEvento(c, a.d, o.lado, 'amplificação', alvos[0], o.el);
        push(c, { k: 'efeito', tipo: 'amplificar', alvo: heroi, origem: heroi, el: o.el, valor: 0 });
        st.ampls = [];
      }
      if (o.feitico) total -= enfraquecidoEm(st);
      let sugado = 0;
      for (const a of alvos) sugado += causarDano(c, a, total, { el: o.el, origem: o.ref });
      if (ef.e === 'drenar' && sugado > 0) curar(c, heroi, sugado, o.el, alvos[0]);
      return;
    }
    case 'cura': {
      const alvos = mira(ef.alvo);
      if (!alvos.length) return;
      const foco = o.feitico ? focoDe(e, o.lado) : 0;
      const total = rolarComEvento(c, ef.d, o.lado, 'cura', alvos[0], o.el, foco);
      for (const a of alvos) curar(c, a, total, o.el, o.ref);
      return;
    }
    case 'escudo': {
      const alvos = mira(ef.alvo);
      if (!alvos.length) return;
      const total = rolarComEvento(c, ef.d, o.lado, 'escudo', alvos[0], o.el);
      for (const a of alvos) {
        const antes = visDe(e, a);
        if (a.tipo === 'heroi') e.jogadores[a.lado].escudo += total;
        else acharChar(e, a.id)!.escudo += total;
        push(c, { k: 'efeito', tipo: 'escudo', alvo: a, origem: o.ref, el: o.el, valor: total, antes, depois: visDe(e, a) });
        nota(c, `${nomeDe(e, a)} ganha ${total} de escudo.`);
      }
      return;
    }
    case 'amplificar':
    case 'dot':
    case 'regenerar': {
      const alvos = mira(ef.alvo);
      if (!alvos.length) return;
      const rotulo = ef.e === 'amplificar' ? 'amplificação' : ef.e === 'dot' ? 'dano contínuo' : 'regeneração';
      // Os dados desses efeitos só rolam quando o bônus é usado (a cada turno ou no próximo feitiço).
      for (const a of alvos) {
        const st = statusDe(e, a);
        if (!st) continue;
        if (ef.e === 'amplificar') st.ampls.push({ d: ef.d, t: ef.turnos });
        else if (ef.e === 'dot') st.dots.push({ d: ef.d, t: ef.turnos, el: o.el });
        else st.regens.push({ d: ef.d, t: ef.turnos });
        push(c, { k: 'efeito', tipo: ef.e, alvo: a, origem: o.ref, el: o.el, valor: 0, turnos: ef.turnos });
        nota(c, `${nomeDe(e, a)} recebe ${rotulo}.`);
      }
      return;
    }
    case 'enfraquecer': {
      const alvos = mira(ef.alvo);
      if (!alvos.length) return;
      const total = rolarComEvento(c, ef.d, o.lado, 'enfraquecimento', alvos[0], o.el);
      for (const a of alvos) {
        const st = statusDe(e, a);
        if (!st) continue;
        st.fracos.push({ v: total, t: ef.turnos });
        push(c, { k: 'efeito', tipo: 'enfraquecer', alvo: a, origem: o.ref, el: o.el, valor: total, turnos: ef.turnos });
        nota(c, `${nomeDe(e, a)} causa ${total} a menos.`);
      }
      return;
    }
    case 'silenciar':
    case 'atordoar': {
      for (const a of mira(ef.alvo)) {
        const st = statusDe(e, a);
        if (!st) continue;
        if (ef.e === 'silenciar') st.silencio = Math.max(st.silencio, ef.turnos);
        else st.atordoado = Math.max(st.atordoado, ef.turnos);
        push(c, { k: 'efeito', tipo: ef.e, alvo: a, origem: o.ref, el: o.el, valor: 0, turnos: ef.turnos });
        nota(c, `${nomeDe(e, a)} ${ef.e === 'silenciar' ? 'foi silenciado' : 'foi atordoado'}.`);
      }
      return;
    }
    case 'esquiva': {
      for (const a of mira(ef.alvo)) {
        const st = statusDe(e, a);
        if (!st) continue;
        st.esquiva = true;
        push(c, { k: 'efeito', tipo: 'esquiva', alvo: a, origem: o.ref, el: o.el, valor: 0 });
      }
      return;
    }
    case 'purificar':
    case 'dissipar': {
      for (const a of mira(ef.alvo)) {
        const st = statusDe(e, a);
        if (!st) continue;
        if (ef.e === 'purificar') {
          st.silencio = 0;
          st.atordoado = 0;
          st.dots = [];
          st.fracos = [];
        } else {
          st.esquiva = false;
          st.ampls = [];
          if (a.tipo === 'heroi') e.jogadores[a.lado].escudo = 0;
          else acharChar(e, a.id)!.escudo = 0;
        }
        push(c, { k: 'efeito', tipo: ef.e, alvo: a, origem: o.ref, el: o.el, valor: 0, antes: visDe(e, a), depois: visDe(e, a) });
      }
      return;
    }
    case 'comprar': {
      comprarCartas(c, o.lado, ef.n, o.el);
      push(c, { k: 'efeito', tipo: 'comprar', alvo: heroi, origem: o.ref, el: o.el, valor: ef.n });
      return;
    }
    case 'mana': {
      e.jogadores[o.lado].extra += ef.n;
      push(c, { k: 'efeito', tipo: 'mana', alvo: heroi, origem: o.ref, el: o.el, valor: ef.n });
      return;
    }
    case 'drenarMana': {
      const alvo: Ref = { tipo: 'heroi', lado: outro(o.lado) };
      e.jogadores[outro(o.lado)].bloqPend += ef.n;
      push(c, { k: 'efeito', tipo: 'drenarMana', alvo, origem: o.ref, el: o.el, valor: ef.n });
      return;
    }
    case 'ressuscitar': {
      const j = e.jogadores[o.lado];
      const id = j.cemiterio[j.cemiterio.length - 1];
      if (!id || j.campo.length >= CAMPO_MAXIMO) {
        push(c, { k: 'efeito', tipo: 'falhou', alvo: heroi, origem: o.ref, el: o.el, valor: 0 });
        return;
      }
      j.cemiterio.pop();
      const p = criarPersonagem(c, o.lado, id);
      push(c, { k: 'invocar', lado: o.lado, p: structuredClone(p), reviveu: true });
      push(c, { k: 'efeito', tipo: 'ressuscitar', alvo: { tipo: 'char', id: p.id }, origem: o.ref, el: o.el, valor: 0 });
      nota(c, `${carta(id).nome} volta ao campo.`);
      return;
    }
  }
}

/** Remove quem chegou a zero de vida e dispara o "ao morrer". */
function verificarMortes(c: Ctx) {
  const e = c.e;
  for (let rodada = 0; rodada < 8; rodada++) {
    const mortos: Personagem[] = [];
    for (const j of e.jogadores) for (const p of j.campo) if (vidaDoChar(p) <= 0) mortos.push(p);
    if (!mortos.length) return;
    for (const p of mortos) {
      const j = e.jogadores[p.dono];
      j.campo = j.campo.filter((x) => x.id !== p.id);
      j.cemiterio.push(p.carta);
      push(c, { k: 'morte', lado: p.dono, id: p.id, carta: p.carta });
      nota(c, `${carta(p.carta).nome} cai.`);
    }
    for (const p of mortos) {
      const k = carta(p.carta);
      if (k.morte && p.status.silencio === 0) executarEfeitos(c, k.morte, { lado: p.dono, el: k.el, ref: { tipo: 'char', id: p.id }, feitico: false }, null);
    }
  }
}

function checarFim(c: Ctx) {
  const e = c.e;
  if (e.vencedor !== null) return;
  const m0 = e.jogadores[0].vida <= 0;
  const m1 = e.jogadores[1].vida <= 0;
  if (!m0 && !m1) return;
  e.vencedor = m0 && m1 ? 'empate' : m0 ? 1 : 0;
  e.motivo = e.vencedor === 'empate' ? 'Os dois heróis caíram juntos.' : `A vida de ${e.jogadores[e.vencedor === 0 ? 1 : 0].nome.split(' ')[0]} chegou a zero.`;
  push(c, { k: 'fim', vencedor: e.vencedor });
  nota(c, e.motivo);
}

function decrementar(st: Status) {
  st.silencio = Math.max(0, st.silencio - 1);
  st.atordoado = Math.max(0, st.atordoado - 1);
  st.ampls = st.ampls.map((a) => ({ ...a, t: a.t - 1 })).filter((a) => a.t > 0);
  st.fracos = st.fracos.map((f) => ({ ...f, t: f.t - 1 })).filter((f) => f.t > 0);
}

function inicioDoTurno(c: Ctx, lado: Lado) {
  const e = c.e;
  const j = e.jogadores[lado];
  push(c, { k: 'turno', lado });
  // Os escudos duram até o início do turno de quem os tem.
  j.escudo = 0;
  for (const p of j.campo) p.escudo = 0;
  // Mana renovada.
  j.gasta = 0;
  j.extra = 0;
  j.bloq = Math.min(j.bloqPend, Math.max(0, j.fonte - 1));
  j.bloqPend = 0;
  j.jogouMana = false;

  // Danos contínuos e regenerações (o herói primeiro, depois cada personagem).
  const alvos: Ref[] = [{ tipo: 'heroi', lado }, ...j.campo.map((p): Ref => ({ tipo: 'char', id: p.id }))];
  for (const a of alvos) {
    const st = statusDe(e, a);
    if (!st) continue;
    for (const dt of st.dots) {
      const total = rolarComEvento(c, dt.d, lado, 'dano contínuo', a, dt.el);
      causarDano(c, a, total, { el: dt.el, origem: null, dot: true });
      dt.t -= 1;
    }
    st.dots = st.dots.filter((x) => x.t > 0);
    for (const rg of st.regens) {
      const total = rolarComEvento(c, rg.d, lado, 'regeneração', a, j.elemento);
      curar(c, a, total, j.elemento, null);
      rg.t -= 1;
    }
    st.regens = st.regens.filter((x) => x.t > 0);
  }
  verificarMortes(c);
  // "No início do seu turno" dos personagens.
  for (const p of [...j.campo]) {
    const k = carta(p.carta);
    if (k.inicio && p.status.silencio === 0 && acharChar(e, p.id)) executarEfeitos(c, k.inicio, { lado, el: k.el, ref: { tipo: 'char', id: p.id }, feitico: false }, null);
  }
  checarFim(c);
  if (e.vencedor !== null) return;
  for (const p of j.campo) p.exausta = false;
  // Compra do turno (quem começa não compra no primeiro turno).
  if (e.turno > 1) {
    comprarCartas(c, lado, 1, j.elemento);
    comprarMana(c, lado);
  }
  checarFim(c);
}

function removerDaMao(j: Jogador, eu: boolean, id: string, mana: boolean) {
  if (eu) {
    const lista = (mana ? j.maoMana : j.mao) ?? [];
    const i = lista.indexOf(id);
    if (i < 0) proibido('Essa carta não está na sua mão.');
    lista.splice(i, 1);
    if (mana) j.maoManaQtd = lista.length;
    else j.maoQtd = lista.length;
  } else if (mana) j.maoManaQtd = Math.max(0, j.maoManaQtd - 1);
  else j.maoQtd = Math.max(0, j.maoQtd - 1);
}

export function aplicar(atual: Estado, acao: Acao): Resultado {
  if (atual.vencedor !== null) return { ok: false, erro: 'A partida já terminou.' };
  const e: Estado = structuredClone(atual);
  const roll = new Rolagem(acao.rolls);
  const c: Ctx = { e, roll };
  e.eventos = [];
  try {
    if (acao.t !== 'desistir' && acao.lado !== e.ativo) proibido('Não é a sua vez.');
    const lado = acao.lado;
    const j = e.jogadores[lado];
    const euMesmo = e.eu === lado;
    switch (acao.t) {
      case 'mana': {
        const erro = podeJogarMana(e, lado, acao.carta);
        if (erro) proibido(erro);
        const m: CartaDeMana = cartaDeMana(acao.carta);
        if (m.el !== j.elemento) proibido('Essa mana é de outro elemento.');
        removerDaMao(j, euMesmo, acao.carta, true);
        j.fonte = Math.min(MANA_MAXIMA, j.fonte + m.valor);
        j.manaEmJogo.push(acao.carta);
        j.jogouMana = true;
        push(c, { k: 'mana', lado, carta: acao.carta, valor: m.valor });
        nota(c, `${j.nome.split(' ')[0]} põe ${m.nome} na fonte (+${m.valor}).`);
        break;
      }
      case 'jogar': {
        const erro = podeJogar(e, lado, acao.carta);
        if (erro) proibido(erro);
        const k = carta(acao.carta);
        let alvo: Ref | null = null;
        if (k.tipo === 'magia' && k.alvo) {
          alvo = acao.alvo ?? null;
          if (!alvo || !alvoServe(e, lado, k.alvo, alvo)) proibido('Esse não é um alvo válido.');
        }
        removerDaMao(j, euMesmo, acao.carta, false);
        j.gasta += k.custo;
        push(c, { k: 'carta', lado, carta: acao.carta, alvo });
        nota(c, `${j.nome.split(' ')[0]} ${k.tipo === 'magia' ? 'lança' : 'invoca'} ${k.nome}.`);
        if (k.tipo === 'magia') {
          executarEfeitos(c, k.efeitos, { lado, el: k.el, ref: { tipo: 'heroi', lado }, feitico: true }, alvo);
        } else {
          const p = criarPersonagem(c, lado, acao.carta);
          push(c, { k: 'invocar', lado, p: structuredClone(p) });
          if (k.entrada) executarEfeitos(c, k.entrada, { lado, el: k.el, ref: { tipo: 'char', id: p.id }, feitico: false }, null);
        }
        break;
      }
      case 'atacar': {
        const p = acharChar(e, acao.atacante);
        if (!p || p.dono !== lado) proibido('Esse personagem não é seu.');
        if (!podeAtacar(e, p!)) proibido('Esse personagem não pode atacar agora.');
        if (!alvosDoAtaque(e, p!).some((r) => mesmoRef(r, acao.alvo))) proibido('Esse não é um alvo válido para o ataque.');
        const k = carta(p!.carta);
        p!.exausta = true;
        const origem: Ref = { tipo: 'char', id: p!.id };
        push(c, { k: 'ataque', lado, atacante: p!.id, alvo: acao.alvo });
        nota(c, `${k.nome} ataca ${nomeDe(e, acao.alvo)}.`);
        let total = rolarComEvento(c, ataqueDoChar(p!), lado, 'ataque', acao.alvo, k.el);
        for (const a of p!.status.ampls) total += rolarComEvento(c, a.d, lado, 'amplificação', acao.alvo, k.el);
        total -= enfraquecidoEm(p!.status);
        const tirou = causarDano(c, acao.alvo, total, { el: k.el, origem });
        if (tirou > 0 && temPalavra(p!, 'vampiro')) curar(c, { tipo: 'heroi', lado }, tirou, k.el, origem);
        verificarMortes(c);
        break;
      }
      case 'passar': {
        // Fim do turno de quem passa…
        decrementar(j.status);
        for (const p of j.campo) decrementar(p.status);
        e.ativo = outro(lado);
        e.turno += 1;
        // …e começo do turno do outro (os dados dele rolam aqui).
        inicioDoTurno(c, e.ativo);
        break;
      }
      case 'desistir': {
        e.vencedor = outro(lado);
        e.motivo = `${j.nome.split(' ')[0]} desistiu.`;
        push(c, { k: 'desistiu', lado });
        push(c, { k: 'fim', vencedor: e.vencedor });
        nota(c, e.motivo);
        break;
      }
    }
    roll.conferirFim();
    checarFim(c);
    e.seq += 1;
    return { ok: true, estado: e, acao: { ...acao, rolls: roll.usados } as Acao };
  } catch (x) {
    if (x instanceof Regra) return { ok: false, erro: x.message };
    throw x;
  }
}

// ---------------------------------------------------------------------------
// Apoio para a mesa
// ---------------------------------------------------------------------------

/** Quantos dados (e de quantas faces) o maior efeito de uma carta pode rolar. */
export function maiorRolagem(k: Carta): number {
  return Math.max(0, ...k.efeitos.map((ef) => ('d' in ef ? dadosMax(ef.d) : 0)));
}
