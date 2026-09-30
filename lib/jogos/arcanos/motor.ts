// Arcanos — o motor da partida. Funções puras: recebem o estado e uma ação e
// devolvem o próximo estado (ou o motivo de a jogada não valer). Os dois
// aparelhos rodam este mesmo código com as mesmas ações, na mesma ordem, e
// chegam ao mesmo estado. A diferença é só o que cada um sabe: a própria mão
// e a ordem do próprio baralho; do adversário, só as quantidades.

import { carta, efeitoComAlvo, type Carta, type Efeito, type Escola, type Palavra, type TipoDeAlvo } from './cartas';

export type Lado = 0 | 1;
export const outro = (l: Lado): Lado => (l === 0 ? 1 : 0);

export const VIDA_INICIAL = 20;
export const MAO_INICIAL = 5;
export const MAO_MAXIMA = 10;
export const CAMPO_MAXIMO = 7;
export const ETER_MAXIMO = 10;
const VIDA_MAXIMA = 30;

export interface Criatura {
  id: string;
  carta: string;
  dono: Lado;
  /** Ataque e vida com os bônus permanentes. */
  ataque: number;
  vida: number;
  /** Bônus que acabam no fim do turno. */
  bonusA: number;
  bonusV: number;
  dano: number;
  palavras: Palavra[];
  palavrasFim: Palavra[];
  exausta: boolean;
  congelada: boolean;
  entrouNoTurno: number;
  morta?: boolean;
}

export interface Jogador {
  userId: string;
  nome: string;
  escolas: [Escola, Escola];
  vida: number;
  eter: number;
  eterMax: number;
  /** Ids das cartas na mão — só de quem joga neste aparelho (null para o adversário). */
  mao: string[] | null;
  maoQtd: number;
  /** Ordem do baralho — só de quem joga neste aparelho. */
  baralho: string[] | null;
  baralhoQtd: number;
  /** Instância → carta, das cartas próprias ainda escondidas. */
  segredos: Record<string, string>;
  campo: Criatura[];
  /** Cartas que já foram reveladas e saíram de jogo. */
  cemiterio: string[];
  fadiga: number;
}

export type Alvo = { tipo: 'heroi'; lado: Lado } | { tipo: 'criatura'; id: string };

export type Acao =
  | { t: 'jogar'; lado: Lado; inst: string; carta: string; alvo?: Alvo | null }
  | { t: 'atacar'; lado: Lado; atacantes: string[] }
  | { t: 'bloquear'; lado: Lado; bloqueios: Record<string, string>; porTempo?: boolean }
  | { t: 'passar'; lado: Lado; porTempo?: boolean }
  | { t: 'desistir'; lado: Lado };

/** O último acontecimento, para a mesa animar (carta jogada, combate…). */
export type Lance =
  | { tipo: 'jogar'; lado: Lado; carta: string; alvo: Alvo | null }
  | { tipo: 'combate'; lado: Lado; atacantes: string[]; bloqueios: Record<string, string>; danoNoHeroi: number }
  | { tipo: 'turno'; lado: Lado }
  | { tipo: 'fim' };

export interface Estado {
  turno: number;
  ativo: Lado;
  fase: 'principal' | 'bloqueio';
  atacou: boolean;
  atacantes: string[];
  jogadores: [Jogador, Jogador];
  /** Quem joga neste aparelho (null para quem só assiste). */
  eu: Lado | null;
  vencedor: Lado | 'empate' | null;
  motivo: string | null;
  seq: number;
  contador: number;
  log: string[];
  lance: Lance | null;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export const tem = (c: Criatura, p: Palavra) => c.palavras.includes(p) || c.palavrasFim.includes(p);
export const ataqueDe = (c: Criatura) => Math.max(0, c.ataque + c.bonusA);
export const vidaTotal = (c: Criatura) => c.vida + c.bonusV;
export const vidaRestante = (c: Criatura) => vidaTotal(c) - c.dano;
const morreu = (c: Criatura) => Boolean(c.morta) || vidaRestante(c) <= 0;

export function acharCriatura(e: Estado, id: string): Criatura | null {
  for (const j of e.jogadores) for (const c of j.campo) if (c.id === id) return c;
  return null;
}

export const podeAtacar = (e: Estado, c: Criatura) =>
  c.dono === e.ativo && e.fase === 'principal' && !e.atacou && !c.exausta && ataqueDe(c) > 0 && (c.entrouNoTurno < e.turno || tem(c, 'impeto'));

export const podeBloquear = (atacante: Criatura, bloqueador: Criatura) =>
  !bloqueador.exausta && (!tem(atacante, 'voar') || tem(bloqueador, 'voar') || tem(bloqueador, 'alcance'));

function alvoServe(e: Estado, lado: Lado, ef: Efeito & { alvo: TipoDeAlvo | 'criatura' | 'criatura-inimiga' | 'sua-criatura' }, alvo: Alvo): boolean {
  if (alvo.tipo === 'heroi') {
    if (ef.alvo === 'qualquer') return true;
    if (ef.alvo === 'heroi-inimigo') return alvo.lado === outro(lado);
    return false;
  }
  const c = acharCriatura(e, alvo.id);
  if (!c || morreu(c)) return false;
  if (ef.alvo === 'heroi-inimigo') return false;
  if (ef.alvo === 'criatura-inimiga' && c.dono === lado) return false;
  if (ef.alvo === 'sua-criatura' && c.dono !== lado) return false;
  if (ef.e === 'destruir') {
    if (ef.poderMax !== undefined && ataqueDe(c) > ef.poderMax) return false;
    if (ef.poderMin !== undefined && ataqueDe(c) < ef.poderMin) return false;
    if (ef.exausta && !c.exausta) return false;
  }
  return true;
}

/** Todos os alvos que uma carta aceita agora (vazio: não precisa de alvo). */
export function alvosDaCarta(e: Estado, lado: Lado, cartaId: string): Alvo[] {
  const ef = efeitoComAlvo(carta(cartaId));
  if (!ef) return [];
  const todos: Alvo[] = [
    { tipo: 'heroi', lado: 0 },
    { tipo: 'heroi', lado: 1 },
    ...e.jogadores.flatMap((j) => j.campo.map((c) => ({ tipo: 'criatura' as const, id: c.id }))),
  ];
  return todos.filter((a) => alvoServe(e, lado, ef, a));
}

/** Pode jogar esta carta agora? (Custo, fase, espaço no campo e alvo.) */
export function podeJogar(e: Estado, lado: Lado, cartaId: string): string | null {
  if (e.vencedor !== null) return 'A partida acabou.';
  if (e.ativo !== lado) return 'Não é a sua vez.';
  if (e.fase !== 'principal') return 'Espere o combate terminar.';
  const c = carta(cartaId);
  if (c.ficha) return 'Carta inválida.';
  if (c.custo > e.jogadores[lado].eter) return 'Éter insuficiente.';
  if (c.tipo === 'criatura' && e.jogadores[lado].campo.length >= CAMPO_MAXIMO) return 'Seu campo está cheio.';
  // Feitiço com alvo precisa de um alvo que exista; criatura entra mesmo sem.
  if (c.tipo === 'feitico' && efeitoComAlvo(c) && alvosDaCarta(e, lado, cartaId).length === 0) return 'Não há alvo para este feitiço.';
  return null;
}

// ---------------------------------------------------------------------------
// Começo da partida
// ---------------------------------------------------------------------------

export interface Participante {
  userId: string;
  nome: string;
  escolas: [Escola, Escola];
}

/**
 * Monta a partida. `meu` traz, para quem joga neste aparelho, o baralho já
 * embaralhado (ids de instância, na ordem) e o que cada instância é.
 * O lado 0 começa.
 */
export function novaPartida(participantes: [Participante, Participante], eu: Lado | null, meu?: { baralho: string[]; segredos: Record<string, string> }): Estado {
  const jogador = (p: Participante, lado: Lado): Jogador => ({
    userId: p.userId,
    nome: p.nome,
    escolas: p.escolas,
    vida: VIDA_INICIAL,
    eter: 0,
    eterMax: 0,
    mao: lado === eu ? [] : null,
    maoQtd: 0,
    baralho: lado === eu && meu ? [...meu.baralho] : null,
    baralhoQtd: lado === eu && meu ? meu.baralho.length : 30,
    segredos: lado === eu && meu ? { ...meu.segredos } : {},
    campo: [],
    cemiterio: [],
    fadiga: 0,
  });
  const e: Estado = {
    turno: 1,
    ativo: 0,
    fase: 'principal',
    atacou: false,
    atacantes: [],
    jogadores: [jogador(participantes[0], 0), jogador(participantes[1], 1)],
    eu,
    vencedor: null,
    motivo: null,
    seq: 0,
    contador: 0,
    log: [],
    lance: { tipo: 'turno', lado: 0 },
  };
  comprar(e, 0, MAO_INICIAL);
  comprar(e, 1, MAO_INICIAL);
  // Quem começa não compra no primeiro turno.
  const j = e.jogadores[0];
  j.eterMax = 1;
  j.eter = 1;
  registrar(e, `Começa a partida. ${j.nome} joga primeiro.`);
  return e;
}

/** Embaralha (Fisher–Yates com crypto quando houver) e dá ids secretos às cartas. */
export function embaralharBaralho(cartas: string[], lado: Lado): { baralho: string[]; segredos: Record<string, string> } {
  const aleatorio = (n: number) => {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c?.getRandomValues) {
      const v = new Uint32Array(1);
      c.getRandomValues(v);
      return v[0] % n;
    }
    return Math.floor(Math.random() * n);
  };
  const ids = cartas.map(() => `${lado}${Array.from({ length: 7 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[aleatorio(36)]).join('')}`);
  const segredos: Record<string, string> = {};
  ids.forEach((id, i) => (segredos[id] = cartas[i]));
  for (let i = ids.length - 1; i > 0; i--) {
    const k = aleatorio(i + 1);
    [ids[i], ids[k]] = [ids[k], ids[i]];
  }
  return { baralho: ids, segredos };
}

// ---------------------------------------------------------------------------
// Aplicar uma ação
// ---------------------------------------------------------------------------

export type Resultado = { ok: true; estado: Estado } | { ok: false; erro: string };

export function aplicar(atual: Estado, acao: Acao): Resultado {
  const e: Estado = structuredClone(atual);
  if (e.vencedor !== null) return { ok: false, erro: 'A partida acabou.' };
  const nome = (l: Lado) => e.jogadores[l].nome;

  switch (acao.t) {
    case 'desistir': {
      e.vencedor = outro(acao.lado);
      e.motivo = `${nome(acao.lado)} desistiu.`;
      registrar(e, e.motivo);
      break;
    }

    case 'jogar': {
      const erro = podeJogar(e, acao.lado, acao.carta);
      if (erro) return { ok: false, erro };
      const j = e.jogadores[acao.lado];
      if (j.mao) {
        const i = j.mao.indexOf(acao.inst);
        if (i < 0 || j.segredos[acao.inst] !== acao.carta) return { ok: false, erro: 'Essa carta não está na mão.' };
        j.mao.splice(i, 1);
        delete j.segredos[acao.inst];
      } else if (j.maoQtd <= 0) return { ok: false, erro: 'Mão vazia.' };
      if (acharCriatura(e, acao.inst)) return { ok: false, erro: 'Carta repetida.' };

      const c = carta(acao.carta);
      const ef = efeitoComAlvo(c);
      const alvos = ef ? alvosDaCarta(e, acao.lado, acao.carta) : [];
      let alvo: Alvo | null = null;
      if (ef && alvos.length) {
        if (!acao.alvo || !alvos.some((a) => mesmoAlvo(a, acao.alvo!))) return { ok: false, erro: 'Escolha um alvo válido.' };
        alvo = acao.alvo;
      }

      j.maoQtd -= 1;
      j.eter -= c.custo;
      if (c.tipo === 'criatura') {
        j.campo.push(criar(acao.inst, c, acao.lado, e.turno));
        registrar(e, `${nome(acao.lado)} invocou ${c.nome}.`);
      } else {
        j.cemiterio.push(c.id);
        registrar(e, `${nome(acao.lado)} lançou ${c.nome}${alvo ? ` em ${nomeDoAlvo(e, alvo)}` : ''}.`);
      }
      for (const fx of c.efeitos ?? []) aplicarEfeito(e, acao.lado, fx, 'alvo' in fx && fx.alvo !== 'heroi-inimigo' ? alvo : null);
      limparMortos(e);
      e.lance = { tipo: 'jogar', lado: acao.lado, carta: c.id, alvo };
      break;
    }

    case 'atacar': {
      if (e.ativo !== acao.lado || e.fase !== 'principal') return { ok: false, erro: 'Não é hora de atacar.' };
      if (e.atacou) return { ok: false, erro: 'Você já atacou neste turno.' };
      const lista = Array.from(new Set(acao.atacantes));
      if (!lista.length) return { ok: false, erro: 'Escolha quem ataca.' };
      const atacantes: Criatura[] = [];
      for (const id of lista) {
        const c = acharCriatura(e, id);
        if (!c || !podeAtacar(e, c)) return { ok: false, erro: 'Essa criatura não pode atacar agora.' };
        atacantes.push(c);
      }
      for (const c of atacantes) if (!tem(c, 'vigilia')) c.exausta = true;
      e.atacou = true;
      e.atacantes = lista;
      registrar(e, `${nome(acao.lado)} atacou com ${atacantes.map((c) => carta(c.carta).nome).join(', ')}.`);
      // Sem ninguém que possa bloquear, o combate já se resolve.
      const defensores = e.jogadores[outro(acao.lado)].campo;
      if (!atacantes.some((a) => defensores.some((d) => podeBloquear(a, d)))) resolverCombate(e, {});
      else e.fase = 'bloqueio';
      break;
    }

    case 'bloquear': {
      if (e.fase !== 'bloqueio') return { ok: false, erro: 'Não há ataque para bloquear.' };
      if (acao.lado !== outro(e.ativo) && !acao.porTempo) return { ok: false, erro: 'Quem bloqueia é o defensor.' };
      const usados = new Set<string>();
      for (const [a, b] of Object.entries(acao.bloqueios ?? {})) {
        const atacante = acharCriatura(e, a);
        const bloqueador = acharCriatura(e, b);
        if (!atacante || !e.atacantes.includes(a)) return { ok: false, erro: 'Atacante inválido.' };
        if (!bloqueador || bloqueador.dono !== outro(e.ativo) || usados.has(b)) return { ok: false, erro: 'Bloqueador inválido.' };
        if (!podeBloquear(atacante, bloqueador)) return { ok: false, erro: `${carta(bloqueador.carta).nome} não pode bloquear ${carta(atacante.carta).nome}.` };
        usados.add(b);
      }
      resolverCombate(e, acao.porTempo && acao.lado === e.ativo ? {} : acao.bloqueios ?? {});
      break;
    }

    case 'passar': {
      if (e.ativo !== acao.lado) return { ok: false, erro: 'Não é a sua vez.' };
      if (e.fase !== 'principal') return { ok: false, erro: 'Espere o combate terminar.' };
      if (acao.porTempo) registrar(e, `O tempo de ${nome(acao.lado)} acabou.`);
      fimDoTurno(e);
      e.ativo = outro(e.ativo);
      e.turno += 1;
      inicioDoTurno(e);
      break;
    }
  }

  checarFim(e);
  e.seq += 1;
  if (e.log.length > 40) e.log = e.log.slice(-40);
  return { ok: true, estado: e };
}

// ---------------------------------------------------------------------------
// Por dentro
// ---------------------------------------------------------------------------

function registrar(e: Estado, linha: string) {
  e.log.push(linha);
}

const mesmoAlvo = (a: Alvo, b: Alvo) => (a.tipo === 'heroi' ? b.tipo === 'heroi' && a.lado === b.lado : b.tipo === 'criatura' && a.id === b.id);

function nomeDoAlvo(e: Estado, a: Alvo) {
  if (a.tipo === 'heroi') return e.jogadores[a.lado].nome;
  const c = acharCriatura(e, a.id);
  return c ? carta(c.carta).nome : 'uma criatura';
}

function criar(id: string, c: Carta, dono: Lado, turno: number): Criatura {
  return {
    id,
    carta: c.id,
    dono,
    ataque: c.ataque ?? 0,
    vida: c.vida ?? 1,
    bonusA: 0,
    bonusV: 0,
    dano: 0,
    palavras: [...(c.palavras ?? [])],
    palavrasFim: [],
    exausta: false,
    congelada: false,
    entrouNoTurno: turno,
  };
}

function comprar(e: Estado, lado: Lado, n: number) {
  const j = e.jogadores[lado];
  for (let i = 0; i < n; i++) {
    if (j.baralhoQtd <= 0) {
      j.fadiga += 1;
      j.vida -= j.fadiga;
      registrar(e, `${j.nome} não tem mais cartas e sofre ${j.fadiga} de fadiga.`);
      continue;
    }
    j.baralhoQtd -= 1;
    const id = j.baralho ? j.baralho.shift() ?? null : null;
    if (j.maoQtd >= MAO_MAXIMA) {
      // Mão cheia: a carta comprada queima.
      if (id) {
        j.cemiterio.push(j.segredos[id]);
        delete j.segredos[id];
      }
      registrar(e, `A mão de ${j.nome} está cheia: uma carta queimou.`);
      continue;
    }
    j.maoQtd += 1;
    if (id && j.mao) j.mao.push(id);
  }
}

function curar(e: Estado, lado: Lado, n: number) {
  if (n <= 0) return;
  const j = e.jogadores[lado];
  j.vida = Math.min(VIDA_MAXIMA, j.vida + n);
}

/** Dano numa criatura. Devolve quanto realmente causou (Escudo anula). */
function ferir(c: Criatura, n: number, fonte: Criatura | null): number {
  if (n <= 0) return 0;
  if (tem(c, 'escudo')) {
    c.palavras = c.palavras.filter((p) => p !== 'escudo');
    c.palavrasFim = c.palavrasFim.filter((p) => p !== 'escudo');
    return 0;
  }
  c.dano += n;
  if (fonte && tem(fonte, 'letal')) c.morta = true;
  return n;
}

function aplicarEfeito(e: Estado, lado: Lado, fx: Efeito, alvo: Alvo | null) {
  const eu = e.jogadores[lado];
  const ele = e.jogadores[outro(lado)];
  const naCriatura = (f: (c: Criatura) => void) => {
    if (alvo?.tipo !== 'criatura') return;
    const c = acharCriatura(e, alvo.id);
    if (c && !morreu(c)) f(c);
  };
  switch (fx.e) {
    case 'dano':
      if (fx.alvo === 'heroi-inimigo') ele.vida -= fx.n;
      else if (alvo?.tipo === 'heroi') e.jogadores[alvo.lado].vida -= fx.n;
      else naCriatura((c) => ferir(c, fx.n, null));
      break;
    case 'dano-todos':
      for (const j of e.jogadores) {
        if (fx.lado === 'inimigo' && j === eu) continue;
        for (const c of j.campo) ferir(c, fx.n, null);
      }
      break;
    case 'destruir':
      naCriatura((c) => (c.morta = true));
      break;
    case 'curar':
      curar(e, lado, fx.n);
      break;
    case 'comprar':
      comprar(e, lado, fx.n);
      break;
    case 'bonus':
      naCriatura((c) => {
        if (fx.ateFim) {
          c.bonusA += fx.a;
          c.bonusV += fx.v;
          if (fx.ganha && !c.palavrasFim.includes(fx.ganha)) c.palavrasFim.push(fx.ganha);
        } else {
          c.ataque += fx.a;
          c.vida += fx.v;
          if (fx.ganha && !c.palavras.includes(fx.ganha)) c.palavras.push(fx.ganha);
        }
      });
      break;
    case 'bonus-todos':
      for (const c of eu.campo) {
        if (fx.ateFim) {
          c.bonusA += fx.a;
          c.bonusV += fx.v;
        } else {
          c.ataque += fx.a;
          c.vida += fx.v;
        }
      }
      break;
    case 'devolver':
      naCriatura((c) => {
        const dono = e.jogadores[c.dono];
        dono.campo = dono.campo.filter((x) => x.id !== c.id);
        const def = carta(c.carta);
        if (def.ficha) return; // fichas somem
        if (dono.maoQtd >= MAO_MAXIMA) {
          dono.cemiterio.push(def.id);
          return;
        }
        dono.maoQtd += 1;
        if (dono.mao) {
          dono.mao.push(c.id);
          dono.segredos[c.id] = def.id;
        }
      });
      break;
    case 'congelar':
      naCriatura((c) => {
        c.exausta = true;
        c.congelada = true;
      });
      break;
    case 'invocar': {
      const f = carta(fx.ficha);
      for (let i = 0; i < fx.qtd; i++) {
        if (eu.campo.length >= CAMPO_MAXIMO) break;
        e.contador += 1;
        eu.campo.push(criar(`t${e.contador}`, f, lado, e.turno));
      }
      break;
    }
    case 'eter':
      eu.eterMax = Math.min(ETER_MAXIMO, eu.eterMax + fx.n);
      break;
    case 'drenar':
      ele.vida -= fx.n;
      curar(e, lado, fx.n);
      break;
    case 'perder-vida':
      eu.vida -= fx.n;
      break;
  }
}

/** Tira do campo o que morreu (e dispara o "ao morrer"), até não sobrar ninguém morto. */
function limparMortos(e: Estado) {
  for (let volta = 0; volta < 10; volta++) {
    const mortos: Criatura[] = [];
    for (const j of e.jogadores) {
      for (const c of j.campo) if (morreu(c)) mortos.push(c);
      j.campo = j.campo.filter((c) => !morreu(c));
    }
    if (!mortos.length) return;
    for (const c of mortos) {
      const def = carta(c.carta);
      if (!def.ficha) e.jogadores[c.dono].cemiterio.push(def.id);
      registrar(e, `${def.nome} morreu.`);
      for (const fx of def.aoMorrer ?? []) aplicarEfeito(e, c.dono, fx, null);
    }
  }
}

function resolverCombate(e: Estado, bloqueios: Record<string, string>) {
  const atacante = e.ativo;
  const defensor = e.jogadores[outro(atacante)];
  let danoNoHeroi = 0;

  for (const id of e.atacantes) {
    const a = acharCriatura(e, id);
    if (!a || morreu(a)) continue;
    const b = bloqueios[id] ? acharCriatura(e, bloqueios[id]) : null;

    if (!b || morreu(b)) {
      const n = ataqueDe(a);
      defensor.vida -= n;
      danoNoHeroi += n;
      if (tem(a, 'vinculo')) curar(e, a.dono, n);
      continue;
    }

    const golpeDe = (x: Criatura, y: Criatura) => {
      const n = ataqueDe(x);
      if (n <= 0) return;
      let noBloqueador = n;
      let sobra = 0;
      if (x === a && tem(a, 'atropelar')) {
        const precisa = tem(y, 'escudo') ? n : tem(a, 'letal') ? 1 : Math.max(0, vidaRestante(y));
        noBloqueador = Math.min(n, precisa);
        sobra = n - noBloqueador;
      }
      const causado = ferir(y, noBloqueador, x);
      if (sobra > 0) {
        defensor.vida -= sobra;
        danoNoHeroi += sobra;
      }
      if (tem(x, 'vinculo')) curar(e, x.dono, causado + sobra);
    };

    const pgA = tem(a, 'primeiro-golpe');
    const pgB = tem(b, 'primeiro-golpe');
    if (pgA && !pgB) {
      golpeDe(a, b);
      if (!morreu(b)) golpeDe(b, a);
    } else if (pgB && !pgA) {
      golpeDe(b, a);
      if (!morreu(a)) golpeDe(a, b);
    } else {
      golpeDe(a, b);
      golpeDe(b, a);
    }
  }

  const n = Object.keys(bloqueios).length;
  registrar(e, `${n ? `${n} ${n === 1 ? 'bloqueio' : 'bloqueios'}. ` : 'Sem bloqueios. '}${danoNoHeroi ? `${defensor.nome} sofreu ${danoNoHeroi} de dano.` : ''}`.trim());
  e.lance = { tipo: 'combate', lado: atacante, atacantes: [...e.atacantes], bloqueios: { ...bloqueios }, danoNoHeroi };
  limparMortos(e);
  e.fase = 'principal';
  e.atacantes = [];
}

function fimDoTurno(e: Estado) {
  // O dano e os bônus "até o fim do turno" somem (como no Magic).
  for (const j of e.jogadores) {
    for (const c of j.campo) {
      c.dano = 0;
      c.bonusA = 0;
      c.bonusV = 0;
      c.palavrasFim = [];
    }
  }
  limparMortos(e);
}

function inicioDoTurno(e: Estado) {
  const j = e.jogadores[e.ativo];
  j.eterMax = Math.min(ETER_MAXIMO, j.eterMax + 1);
  j.eter = j.eterMax;
  for (const c of j.campo) {
    // Congelada: fica exausta mais este turno.
    if (c.congelada) c.congelada = false;
    else c.exausta = false;
  }
  e.fase = 'principal';
  e.atacou = false;
  e.atacantes = [];
  comprar(e, e.ativo, 1);
  e.lance = { tipo: 'turno', lado: e.ativo };
}

function checarFim(e: Estado) {
  if (e.vencedor !== null) {
    e.lance = { tipo: 'fim' };
    return;
  }
  const [a, b] = e.jogadores;
  const caiuA = a.vida <= 0;
  const caiuB = b.vida <= 0;
  if (!caiuA && !caiuB) return;
  e.vencedor = caiuA && caiuB ? 'empate' : caiuA ? 1 : 0;
  e.motivo = e.vencedor === 'empate' ? 'Os dois heróis caíram juntos.' : `${e.jogadores[e.vencedor === 0 ? 1 : 0].nome} caiu.`;
  registrar(e, e.motivo);
  e.lance = { tipo: 'fim' };
}

/** O que dá para mostrar a quem só assiste: sem mãos nem baralhos. */
export function publico(e: Estado): Estado {
  const c: Estado = structuredClone(e);
  c.eu = null;
  for (const j of c.jogadores) {
    j.mao = null;
    j.baralho = null;
    j.segredos = {};
  }
  return c;
}
