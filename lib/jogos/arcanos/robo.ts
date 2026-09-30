// Arcanos — o adversário do computador. Olha só o que um jogador de verdade
// veria (a própria mão e o campo) e escolhe uma jogada por vez: primeiro as
// cartas (da mais cara para a mais barata), depois o ataque, depois passa a vez.
// Na defesa, bloqueia quando a troca vale a pena ou quando o dano mataria.

import { carta, efeitoComAlvo } from './cartas';
import {
  acharCriatura,
  alvosDaCarta,
  ataqueDe,
  outro,
  podeAtacar,
  podeBloquear,
  podeJogar,
  tem,
  vidaRestante,
  type Acao,
  type Alvo,
  type Criatura,
  type Estado,
  type Lado,
} from './motor';

/** Quanto uma criatura vale no campo (para escolher trocas e alvos). */
export function valor(c: Criatura): number {
  let v = ataqueDe(c) * 1.5 + vidaRestante(c);
  if (tem(c, 'voar')) v += 1.5;
  if (tem(c, 'letal')) v += 2;
  if (tem(c, 'escudo')) v += 1.5;
  if (tem(c, 'vinculo') || tem(c, 'atropelar') || tem(c, 'primeiro-golpe')) v += 1;
  return v;
}

/** `x` mata `y` num golpe? */
function mata(x: Criatura, y: Criatura): boolean {
  if (ataqueDe(x) <= 0 || tem(y, 'escudo')) return false;
  return tem(x, 'letal') || ataqueDe(x) >= vidaRestante(y);
}

/** `a` sai vivo de um combate contra `b`? */
function sobrevive(a: Criatura, b: Criatura): boolean {
  if (!mata(b, a)) return true;
  // Primeiro golpe: se `a` mata antes, `b` não chega a bater.
  return tem(a, 'primeiro-golpe') && !tem(b, 'primeiro-golpe') && mata(a, b);
}

const criaturaDoAlvo = (e: Estado, a: Alvo) => (a.tipo === 'criatura' ? acharCriatura(e, a.id) : null);

/**
 * O melhor alvo para a carta (ou null quando é um feitiço que não vale jogar
 * agora). Criatura com efeito de entrada precisa de alvo se houver algum.
 */
function escolherAlvo(e: Estado, lado: Lado, cartaId: string): Alvo | null | 'pular' {
  const c = carta(cartaId);
  const ef = efeitoComAlvo(c);
  if (!ef) return null;
  const alvos = alvosDaCarta(e, lado, cartaId);
  if (!alvos.length) return c.tipo === 'feitico' ? 'pular' : null;
  const inimigo = outro(lado);
  const deles = alvos.filter((a) => criaturaDoAlvo(e, a)?.dono === inimigo);
  const meus = alvos.filter((a) => criaturaDoAlvo(e, a)?.dono === lado);
  const heroiInimigo = alvos.find((a) => a.tipo === 'heroi' && a.lado === inimigo) ?? null;
  const melhor = (lista: Alvo[], nota: (c: Criatura) => number) =>
    lista.reduce<{ a: Alvo; n: number } | null>((m, a) => {
      const cr = criaturaDoAlvo(e, a);
      const n = cr ? nota(cr) : -Infinity;
      return !m || n > m.n ? { a, n } : m;
    }, null)?.a ?? null;
  // Sem alvo bom: o feitiço fica na mão; a criatura entra mirando o que menos atrapalha.
  const semBom = (): Alvo | 'pular' => {
    if (c.tipo === 'feitico') return 'pular';
    return heroiInimigo ?? melhor(deles, (x) => -valor(x)) ?? melhor(meus, (x) => vidaRestante(x) - valor(x)) ?? alvos[0];
  };

  switch (ef.e) {
    case 'dano': {
      const mortos = deles.filter((a) => {
        const cr = criaturaDoAlvo(e, a)!;
        return !tem(cr, 'escudo') && vidaRestante(cr) <= ef.n;
      });
      if (mortos.length) return melhor(mortos, valor);
      if (heroiInimigo) return heroiInimigo;
      return semBom();
    }
    case 'destruir':
      return deles.length ? melhor(deles, valor) : semBom();
    case 'devolver':
      return deles.length ? melhor(deles, (x) => carta(x.carta).custo + valor(x) / 10) : semBom();
    case 'congelar':
      return deles.length ? melhor(deles, (x) => (x.exausta ? 0 : 10) + ataqueDe(x)) : semBom();
    case 'bonus':
      // Quem pode atacar agora aproveita mais o bônus.
      return meus.length ? melhor(meus, (x) => (podeAtacar(e, x) ? 10 : 0) + ataqueDe(x)) : semBom();
    default:
      return heroiInimigo ?? deles[0] ?? alvos[0];
  }
}

/** Um feitiço sem alvo vale a pena agora? */
function valeSemAlvo(e: Estado, lado: Lado, cartaId: string): boolean {
  const c = carta(cartaId);
  const eu = e.jogadores[lado];
  const ele = e.jogadores[outro(lado)];
  for (const fx of c.efeitos ?? []) {
    if (fx.e === 'dano-todos') {
      const conta = (cs: Criatura[]) => cs.filter((x) => !tem(x, 'escudo') && vidaRestante(x) <= fx.n).reduce((s, x) => s + valor(x), 0);
      const ganho = conta(ele.campo) - (fx.lado === 'todos' ? conta(eu.campo) : 0);
      if (ganho <= 3) return false;
    }
    if (fx.e === 'bonus-todos' && eu.campo.length < 2) return false;
    if (fx.e === 'perder-vida' && eu.vida <= fx.n + 4) return false;
    if (fx.e === 'curar' && c.tipo === 'feitico' && eu.vida >= 18 && (c.efeitos ?? []).length === 1) return false;
  }
  return true;
}

function escolherCarta(e: Estado, lado: Lado): Acao | null {
  const j = e.jogadores[lado];
  const mao = (j.mao ?? []).map((inst) => ({ inst, id: j.segredos[inst] })).filter((x) => x.id && podeJogar(e, lado, x.id) === null);
  // Mais caras primeiro (aproveita o éter); criaturas antes dos feitiços do mesmo custo.
  mao.sort((a, b) => carta(b.id).custo - carta(a.id).custo || (carta(a.id).tipo === 'criatura' ? -1 : 1));
  for (const { inst, id } of mao) {
    const c = carta(id);
    if (c.tipo === 'feitico' && !efeitoComAlvo(c) && !valeSemAlvo(e, lado, id)) continue;
    const alvo = escolherAlvo(e, lado, id);
    if (alvo === 'pular') continue;
    return { t: 'jogar', lado, inst, carta: id, alvo };
  }
  return null;
}

function escolherAtacantes(e: Estado, lado: Lado): string[] {
  const eu = e.jogadores[lado];
  const ele = e.jogadores[outro(lado)];
  const prontos = eu.campo.filter((c) => podeAtacar(e, c));
  if (!prontos.length) return [];
  const defensores = ele.campo.filter((b) => !b.exausta);

  // Dá para vencer agora? Cada defensor segura um atacante (os mais fortes).
  const bloqueaveis = [...prontos].sort((a, b) => ataqueDe(b) - ataqueDe(a));
  let livres = 0;
  let bloqueios = defensores.length;
  for (const a of bloqueaveis) {
    if (bloqueios > 0 && defensores.some((d) => podeBloquear(a, d))) bloqueios -= 1;
    else livres += ataqueDe(a);
  }
  if (livres >= ele.vida) return prontos.map((c) => c.id);

  // Se o contra-ataque puder me derrubar, quem não tem vigília fica em casa.
  const perigo = ele.campo.reduce((s, c) => s + ataqueDe(c), 0) >= eu.vida - 2;

  return prontos
    .filter((a) => {
      if (perigo && !tem(a, 'vigilia')) return false;
      // Ataca se nenhum bloqueador faz uma troca ruim para mim.
      return defensores.every((b) => !podeBloquear(a, b) || sobrevive(a, b) || (mata(a, b) && valor(b) >= valor(a)));
    })
    .map((c) => c.id);
}

function escolherBloqueios(e: Estado, lado: Lado): Record<string, string> {
  const eu = e.jogadores[lado];
  const atacantes = e.atacantes
    .map((id) => acharCriatura(e, id))
    .filter((c): c is Criatura => Boolean(c))
    .sort((a, b) => ataqueDe(b) - ataqueDe(a));
  let dano = atacantes.reduce((s, a) => s + ataqueDe(a), 0);
  const usados = new Set<string>();
  const bloqueios: Record<string, string> = {};
  for (const a of atacantes) {
    const livres = eu.campo.filter((b) => !usados.has(b.id) && podeBloquear(a, b));
    if (!livres.length) continue;
    const porValor = [...livres].sort((x, y) => valor(x) - valor(y));
    const b =
      // Mata e sobrevive.
      porValor.find((x) => mata(x, a) && sobrevive(x, a)) ??
      // Só segura (sobrevive sem matar).
      porValor.find((x) => sobrevive(x, a)) ??
      // Troca que vale a pena.
      porValor.find((x) => mata(x, a) && valor(a) >= valor(x)) ??
      // Vai morrer se não bloquear: qualquer um segura.
      (dano >= eu.vida ? porValor[0] : undefined);
    if (!b) continue;
    bloqueios[a.id] = b.id;
    usados.add(b.id);
    dano -= ataqueDe(a);
  }
  return bloqueios;
}

/** A próxima jogada do computador (null quando não é a vez dele). */
export function decidirJogada(e: Estado, lado: Lado): Acao | null {
  if (e.vencedor !== null || e.eu !== lado) return null;
  if (e.fase === 'bloqueio') return e.ativo !== lado ? { t: 'bloquear', lado, bloqueios: escolherBloqueios(e, lado) } : null;
  if (e.ativo !== lado) return null;
  const jogada = escolherCarta(e, lado);
  if (jogada) return jogada;
  if (!e.atacou) {
    const atacantes = escolherAtacantes(e, lado);
    if (atacantes.length) return { t: 'atacar', lado, atacantes };
  }
  return { t: 'passar', lado };
}
