// Arcanos — o adversário do computador. Ele joga com a própria mão, como uma
// pessoa jogaria: primeiro a mana, depois o melhor feitiço ou personagem que
// couber na fonte (cada alvo é pontuado por quanto vale o efeito), depois os
// ataques, e por fim passa. Nada aqui rola dado: quem rola é o motor.

import { carta, dadosMedia, type Carta, type Efeito, valorDoEfeito } from './cartas';
import {
  acharChar,
  alvosDaCarta,
  alvosDoAtaque,
  ataqueDoChar,
  manaDisponivel,
  outro,
  podeAtacar,
  podeJogar,
  podeJogarMana,
  vidaDoChar,
  type Acao,
  type Estado,
  type Lado,
  type Personagem,
  type Ref,
} from './motor';

/** Quanto vale ter o personagem em campo (para decidir o que vale matar ou proteger). */
export function valorDoChar(p: Personagem): number {
  const k = carta(p.carta);
  const ataque = dadosMedia(ataqueDoChar(p));
  const extra = (k.palavras?.length ?? 0) * 0.8 + (k.entrada || k.inicio || k.morte ? 1 : 0);
  return vidaDoChar(p) * 0.45 + ataque * 1.4 + extra;
}

function pontuarEfeito(e: Estado, lado: Lado, ef: Efeito, alvo: Ref | null): number {
  const eu = e.jogadores[lado];
  const ele = e.jogadores[outro(lado)];
  const alvos = (mira: string): Ref[] => {
    switch (mira) {
      case 'escolhido':
        return alvo ? [alvo] : [];
      case 'heroi-proprio':
        return [{ tipo: 'heroi', lado }];
      case 'heroi-inimigo':
        return [{ tipo: 'heroi', lado: outro(lado) }];
      case 'chars-inimigos':
        return ele.campo.map((p): Ref => ({ tipo: 'char', id: p.id }));
      case 'chars-aliados':
        return eu.campo.map((p): Ref => ({ tipo: 'char', id: p.id }));
      case 'todos-chars':
        return [...eu.campo, ...ele.campo].map((p): Ref => ({ tipo: 'char', id: p.id }));
      default:
        return [];
    }
  };
  const meu = (r: Ref) => (r.tipo === 'heroi' ? r.lado === lado : acharChar(e, r.id)?.dono === lado);
  const vidaDe = (r: Ref) => (r.tipo === 'heroi' ? e.jogadores[r.lado].vida + e.jogadores[r.lado].escudo : (acharChar(e, r.id) ? vidaDoChar(acharChar(e, r.id)!) + acharChar(e, r.id)!.escudo : 0));

  switch (ef.e) {
    case 'dano':
    case 'drenar': {
      const media = dadosMedia(ef.d);
      let s = 0;
      for (const r of alvos(ef.alvo)) {
        const sinal = meu(r) ? -1 : 1;
        const v = vidaDe(r);
        if (r.tipo === 'heroi') {
          s += sinal * Math.min(media, v) * 1.1 + (sinal > 0 && media >= v ? 100 : 0);
        } else {
          const p = acharChar(e, r.id)!;
          s += sinal * (media >= v ? v * 0.5 + valorDoChar(p) * 1.4 : media * 0.7);
        }
      }
      if (ef.e === 'drenar') s += Math.min(media, 20 - eu.vida) * 0.6;
      return s;
    }
    case 'cura': {
      const media = dadosMedia(ef.d);
      let s = 0;
      for (const r of alvos(ef.alvo)) {
        if (!meu(r)) continue;
        if (r.tipo === 'heroi') {
          const falta = 20 - e.jogadores[r.lado].vida;
          s += Math.min(media, falta) * (falta >= 6 ? 1.1 : 0.7);
        } else {
          const p = acharChar(e, r.id)!;
          s += Math.min(media, p.dano) * 0.8;
        }
      }
      return s;
    }
    case 'escudo': {
      const media = dadosMedia(ef.d);
      const ameaca = ele.campo.reduce((a, p) => a + dadosMedia(ataqueDoChar(p)), 0);
      return alvos(ef.alvo).filter(meu).reduce((a, r) => a + Math.min(media, ameaca + 2) * 0.55 + (r.tipo === 'heroi' && eu.vida <= 10 ? 1.5 : 0), 0);
    }
    case 'amplificar': {
      const media = dadosMedia(ef.d);
      return alvos(ef.alvo)
        .filter(meu)
        .reduce((a, r) => {
          if (r.tipo === 'heroi') return a + media * 0.6;
          const p = acharChar(e, r.id);
          return a + (p && (!p.exausta || p.entrouNoTurno === e.turno) ? media * ef.turnos * 0.9 : media * 0.4);
        }, 0);
    }
    case 'dot':
      return alvos(ef.alvo).reduce((a, r) => a + (meu(r) ? -5 : dadosMedia(ef.d) * ef.turnos * (r.tipo === 'heroi' ? 0.9 : 0.5)), 0);
    case 'regenerar':
      return alvos(ef.alvo).filter(meu).reduce((a, r) => a + dadosMedia(ef.d) * ef.turnos * 0.5, 0);
    case 'enfraquecer':
      return alvos(ef.alvo).reduce((a, r) => {
        if (meu(r)) return a;
        const p = r.tipo === 'char' ? acharChar(e, r.id) : null;
        return a + (p ? dadosMedia(ataqueDoChar(p)) * 0.5 + 1 : 1) * ef.turnos * 0.7;
      }, 0);
    case 'silenciar':
      return alvos(ef.alvo).reduce((a, r) => {
        if (meu(r)) return a;
        if (r.tipo === 'heroi') return a + ((ele.mao?.length ?? ele.maoQtd) >= 2 ? ef.turnos * 2.5 : 1);
        const p = acharChar(e, r.id);
        const k = p ? carta(p.carta) : null;
        return a + (k && (k.palavras?.length || k.inicio || k.morte) ? 2.5 : 0.8) * ef.turnos;
      }, 0);
    case 'atordoar':
      return alvos(ef.alvo).reduce((a, r) => {
        if (meu(r)) return a;
        const p = r.tipo === 'char' ? acharChar(e, r.id) : null;
        return a + (p ? dadosMedia(ataqueDoChar(p)) * 0.9 + 1 : 3) * ef.turnos;
      }, 0);
    case 'esquiva':
      return alvos(ef.alvo)
        .filter(meu)
        .reduce((a, r) => a + (r.tipo === 'heroi' ? (eu.vida <= 12 ? 2.5 : 1.2) : 1.5), 0);
    case 'purificar': {
      return alvos(ef.alvo)
        .filter(meu)
        .reduce((a, r) => {
          const st = r.tipo === 'heroi' ? e.jogadores[r.lado].status : acharChar(e, r.id)?.status;
          return a + (st ? st.dots.length * 3 + st.fracos.length * 2 + (st.silencio ? 2.5 : 0) + (st.atordoado ? 3 : 0) : 0);
        }, 0);
    }
    case 'dissipar':
      return alvos(ef.alvo)
        .filter((r) => !meu(r))
        .reduce((a, r) => {
          const st = r.tipo === 'heroi' ? e.jogadores[r.lado].status : acharChar(e, r.id)?.status;
          const esc = r.tipo === 'heroi' ? e.jogadores[r.lado].escudo : acharChar(e, r.id)?.escudo ?? 0;
          return a + esc * 0.8 + (st ? (st.esquiva ? 2 : 0) + st.ampls.length * 2 : 0);
        }, 0);
    case 'comprar':
      return (eu.mao?.length ?? eu.maoQtd) <= 4 ? ef.n * 2.2 : ef.n * 0.8;
    case 'mana':
      return ef.n * (eu.mao?.some((id) => carta(id).custo > manaDisponivel(eu)) ? 1.5 : 0.3);
    case 'drenarMana':
      return ef.n * 1.5;
    case 'ressuscitar': {
      const id = eu.cemiterio[eu.cemiterio.length - 1];
      if (!id || eu.campo.length >= 4) return 0;
      const k = carta(id);
      return (k.vida ?? 0) * 0.45 + (k.ataque ? dadosMedia(k.ataque) * 1.4 : 0) + 1.5;
    }
  }
  return valorDoEfeito(ef);
}

function pontuarCarta(e: Estado, lado: Lado, k: Carta, alvo: Ref | null): number {
  if (k.tipo === 'personagem') {
    const falsa: Personagem = { id: '_', carta: k.id, dono: lado, vida: k.vida ?? 1, dano: 0, escudo: 0, status: { silencio: 0, atordoado: 0, esquiva: false, dots: [], regens: [], ampls: [], fracos: [] }, exausta: false, entrouNoTurno: e.turno };
    const entrada = (k.entrada ?? []).reduce((a, ef) => a + pontuarEfeito(e, lado, ef, null), 0);
    const defesa = e.jogadores[lado].vida <= 10 && k.palavras?.includes('guardiao') ? 2 : 0;
    return valorDoChar(falsa) * 1.35 + entrada + defesa + 1;
  }
  return k.efeitos.reduce((a, ef) => a + pontuarEfeito(e, lado, ef, alvo), 0);
}

/** A próxima ação do robô (ou null se não for a vez dele). */
export function decidirJogada(e: Estado, lado: Lado): Acao | null {
  if (e.vencedor !== null || e.ativo !== lado) return null;
  const j = e.jogadores[lado];

  // 1. Mana.
  if (!j.jogouMana && j.maoMana?.length) {
    const ordem = [...j.maoMana].sort((a, b) => (a.startsWith('m2') ? (j.fonte <= 8 ? -1 : 1) : 0) - (b.startsWith('m2') ? (j.fonte <= 8 ? -1 : 1) : 0));
    const id = ordem.find((m) => podeJogarMana(e, lado, m) === null);
    if (id) return { t: 'mana', lado, carta: id };
  }

  // 2. Feitiços e personagens.
  let melhor: { score: number; acao: Acao } | null = null;
  for (const id of Array.from(new Set(j.mao ?? []))) {
    if (podeJogar(e, lado, id) !== null) continue;
    const k = carta(id);
    const opcoes: (Ref | null)[] = k.tipo === 'magia' && k.alvo ? alvosDaCarta(e, lado, id) : [null];
    for (const alvo of opcoes) {
      const score = pontuarCarta(e, lado, k, alvo) - k.custo * 0.15;
      if (score >= 1.6 && (!melhor || score > melhor.score)) melhor = { score, acao: { t: 'jogar', lado, carta: id, alvo } };
    }
  }
  if (melhor) return melhor.acao;

  // 3. Ataques.
  let ataque: { score: number; acao: Acao } | null = null;
  for (const p of j.campo) {
    if (!podeAtacar(e, p)) continue;
    const media = dadosMedia(ataqueDoChar(p)) + p.status.ampls.reduce((a, x) => a + dadosMedia(x.d), 0) - p.status.fracos.reduce((a, x) => a + x.v, 0);
    for (const r of alvosDoAtaque(e, p)) {
      let score: number;
      if (r.tipo === 'heroi') {
        const h = e.jogadores[r.lado];
        score = Math.min(media, h.vida + h.escudo) * 1.1 + (media >= h.vida + h.escudo ? 100 : 0) + 0.5;
      } else {
        const alvo = acharChar(e, r.id)!;
        const v = vidaDoChar(alvo) + alvo.escudo;
        score = media >= v ? v * 0.5 + valorDoChar(alvo) * 1.2 : media * 0.55;
        // Trocar um golpe por um personagem bom, sem perder nada: vale.
      }
      if (score > 0.5 && (!ataque || score > ataque.score)) ataque = { score, acao: { t: 'atacar', lado, atacante: p.id, alvo: r } };
    }
  }
  if (ataque) return ataque.acao;

  // 4. Passa a vez.
  return { t: 'passar', lado };
}
