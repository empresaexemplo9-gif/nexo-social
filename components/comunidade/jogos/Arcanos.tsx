'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../icons';
import Avatar from '../../Avatar';
import { CartaDeManaGrande, CartaGrande, GemaDeMana, VersoDaCarta, tipoDaCarta } from './CartaArcana';
import { Dado3D } from './Dado3D';
import { Glifo } from './ArteArcanos';
import { MotorDeEfeitos, type Ponto } from './fxArcanos';
import { TabuleiroArcanos, chavesDeStatus, rotuloDeStatus } from './TabuleiroArcanos';
import { RegrasDoArcanos } from './Regras';
import { carta as definicao, cartaDeMana, dadosTexto, ehElemento, ELEMENTOS, textoDaCarta, type Elemento, type Faces } from '@/lib/jogos/arcanos/cartas';
import {
  acharChar,
  alvosDaCarta,
  alvosDoAtaque,
  aplicar,
  ataqueDoChar,
  embaralharBaralho,
  manaDisponivel,
  manaTotal,
  mesmoRef,
  novaPartida,
  outro,
  podeAtacar,
  podeJogar,
  podeJogarMana,
  publico,
  vidaDoChar,
  type Acao,
  type Estado,
  type Evento,
  type Lado,
  type Participante,
  type Ref,
} from '@/lib/jogos/arcanos/motor';
import type { Mensagem } from '@/lib/jogos/canal';
import type { CanalDeJogos } from '@/lib/jogos/sala-local';

type Canal = CanalDeJogos;
type Eu = { userId: string; nome: string; avatar: string | null };

const TEMPO_DO_TURNO = 100_000;
const OURO = '#e0b84a';
const MESA_BG = 'radial-gradient(ellipse at 50% 38%, #2a2038 0%, #150f20 55%, #07040b 100%)';

interface Props {
  canal: Canal;
  /** Sem grupo (contra o computador): o placar não é gravado. */
  groupId?: string | null;
  mesa: string;
  papel: 'host' | 'desafiante' | 'espectador';
  eu: Eu;
  elemento?: Elemento;
  hostNome?: string;
  /** Duelo contra o computador, só neste aparelho. */
  local?: boolean;
  aoSair: () => void;
  /** Contra o computador: outra partida com o mesmo elemento. */
  aoRevanche?: () => void;
  /** O palco chama isto no "Fechar jogo". */
  fecharRef?: React.MutableRefObject<(() => void) | null>;
}

type Sel = { t: 'nada' } | { t: 'carta'; id: string; mana: boolean } | { t: 'alvo'; id: string } | { t: 'ataque'; atacante: string };

interface GrupoDeDados {
  key: number;
  faces: Faces;
  valores: number[];
  el: Elemento;
  porque: string;
  total: number;
}
interface Flutuante {
  key: number;
  x: number;
  y: number;
  texto: string;
  cor: string;
  tam: number;
}
type Lote = { estado: Estado; eventos: Evento[] };

const ehHostil = (tipo: string) => ['dano', 'drenar', 'dot', 'silenciar', 'atordoar', 'enfraquecer', 'dissipar'].includes(tipo);
const PORQUE: Record<string, string> = { dano: 'Dano', dreno: 'Dreno', cura: 'Cura', escudo: 'Escudo', amplificação: 'Bônus', enfraquecimento: 'Enfraquece', 'dano contínuo': 'Dano contínuo', regeneração: 'Regeneração', ataque: 'Ataque' };
const COR_DO_NUMERO: Record<string, string> = { dano: '#ff6b6b', cura: '#6dff9b', escudo: '#7dd3fc', amplificar: '#fcd34d', enfraquecer: '#c4b5fd' };

function useTamanho(el: HTMLElement | null) {
  const [t, setT] = useState({ w: 900, h: 600 });
  useEffect(() => {
    if (!el) return;
    const f = () => setT({ w: el.clientWidth || 900, h: el.clientHeight || 600 });
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return t;
}

export default function Arcanos({ canal, groupId, mesa, papel, eu, elemento, hostNome, local = false, aoSair, aoRevanche, fecharRef }: Props) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [exibido, setExibido] = useState<Estado | null>(null);
  const [aviso, setAviso] = useState('');
  const [esperando, setEsperando] = useState(local ? 'Embaralhando os grimórios…' : papel === 'host' ? 'Esperando um desafiante aceitar o duelo…' : papel === 'desafiante' ? `Chamando ${hostNome ?? 'o anfitrião'} para o duelo…` : 'Entrando para assistir…');
  const [sel, setSel] = useState<Sel>({ t: 'nada' });
  const [zoomCarta, setZoomCarta] = useState<string | null>(null);
  const [zoomChar, setZoomChar] = useState<string | null>(null);
  const [regras, setRegras] = useState(false);
  const [log, setLog] = useState(false);
  const [rapido, setRapido] = useState(false);
  const [animando, setAnimando] = useState(false);
  const [agora, setAgora] = useState(Date.now());
  const [prazo, setPrazo] = useState(Date.now() + TEMPO_DO_TURNO);
  const [desync, setDesync] = useState(false);
  const [ausenteDesde, setAusenteDesde] = useState<number | null>(null);
  // cena
  const [cartaEmCena, setCartaEmCena] = useState<{ key: number; id: string; mana: boolean; lado: Lado } | null>(null);
  const [dadosCena, setDadosCena] = useState<GrupoDeDados[]>([]);
  const [flutuantes, setFlutuantes] = useState<Flutuante[]>([]);
  const [banner, setBanner] = useState<{ key: number; texto: string; el: Elemento } | null>(null);
  const [entrando, setEntrando] = useState<Set<string>>(new Set());
  const [elAtivo, setElAtivo] = useState<Elemento | null>(null);
  const [tremer, setTremer] = useState(0);

  const estadoRef = useRef<Estado | null>(null);
  const exibidoRef = useRef<Estado | null>(null);
  const pendentes = useRef(new Map<number, Acao>());
  const oponenteRef = useRef<Participante | null>(null);
  const porTempoEnviado = useRef('');
  const gravou = useRef(false);
  const fila = useRef<Lote[]>([]);
  const rodando = useRef(false);
  const vivo = useRef(true);
  const rapidoRef = useRef(false);
  const pularRef = useRef(false);
  const chave = useRef(0);
  const refs = useRef(new Map<string, HTMLElement>());
  const palco = useRef<HTMLDivElement | null>(null);
  const [palcoEl, setPalcoEl] = useState<HTMLDivElement | null>(null);
  const palcoRef = useCallback((el: HTMLDivElement | null) => {
    palco.current = el;
    setPalcoEl(el);
  }, []);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fx = useRef<MotorDeEfeitos | null>(null);
  const venceuFx = useRef(false);
  rapidoRef.current = rapido;

  const { enviar, ouvir, anunciar, presentes } = canal;
  const { w: largura, h: altura } = useTamanho(palcoEl);
  const pequeno = largura < 640;
  const souJogador = estado?.eu !== null && estado?.eu !== undefined;
  const lado = (estado?.eu ?? 0) as Lado;

  const registrar = useCallback((k: string) => (el: HTMLElement | null) => {
    if (el) refs.current.set(k, el);
    else refs.current.delete(k);
  }, []);

  // --- Efeitos visuais: canvas e posições ---------------------------------------
  useEffect(() => {
    vivo.current = true;
    const c = canvas.current;
    if (!c) return;
    const m = new MotorDeEfeitos(c);
    fx.current = m;
    return () => {
      vivo.current = false;
      m.parar();
      fx.current = null;
    };
  }, []);
  useEffect(() => {
    fx.current?.redimensionar(largura, altura);
  }, [largura, altura]);

  const centro = useCallback((el: Element | null | undefined): Ponto => {
    const p = palco.current?.getBoundingClientRect();
    if (!el || !p) return { x: (palco.current?.clientWidth ?? 400) / 2, y: (palco.current?.clientHeight ?? 300) / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left - p.left + r.width / 2, y: r.top - p.top + r.height / 2 };
  }, []);
  const posDe = useCallback(
    (r: Ref): Ponto => {
      const key = r.tipo === 'heroi' ? `h${r.lado}` : `c:${r.id}`;
      return centro(refs.current.get(key));
    },
    [centro],
  );

  const esperar = useCallback(
    (ms: number) =>
      new Promise<void>((res) => {
        const t = pularRef.current ? 0 : ms * (rapidoRef.current ? 0.5 : 1);
        if (t <= 0) return res();
        const id = setTimeout(res, t);
        // pular encurta a espera que já está correndo
        const iv = setInterval(() => {
          if (pularRef.current || !vivo.current) {
            clearTimeout(id);
            clearInterval(iv);
            res();
          }
        }, 60);
        setTimeout(() => clearInterval(iv), t + 80);
      }),
    [],
  );

  const flutuar = useCallback((p: Ponto, texto: string, cor: string, tam = 30) => {
    const k = ++chave.current;
    setFlutuantes((l) => [...l, { key: k, x: p.x, y: p.y - 24, texto, cor, tam }]);
    setTimeout(() => setFlutuantes((l) => l.filter((x) => x.key !== k)), 1800);
  }, []);

  const emExibido = useCallback((fn: (e: Estado) => void) => {
    const base = exibidoRef.current;
    if (!base) return;
    const n = structuredClone(base);
    fn(n);
    exibidoRef.current = n;
    setExibido(n);
  }, []);

  const sacudir = useCallback((r: Ref, forte = false) => {
    const el = refs.current.get(r.tipo === 'heroi' ? `h${r.lado}` : `c:${r.id}`);
    if (!el || pularRef.current) return;
    const a = forte ? 12 : 7;
    el.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-a}px) rotate(-2deg)` }, { transform: `translateX(${a}px) rotate(2deg)` }, { transform: `translateX(${-a / 2}px)` }, { transform: 'translateX(0)' }], { duration: forte ? 420 : 300 });
  }, []);

  // --- A fila de animações ---------------------------------------------------------
  const projetar = useCallback(
    (el: Elemento, de: Ponto, para: Ponto, ms: number) =>
      new Promise<void>((res) => {
        const m = fx.current;
        if (!m || pularRef.current) return res();
        m.projetil(el, de, para, ms * (rapidoRef.current ? 0.55 : 1), res);
      }),
    [],
  );

  const rodarEfeito = useCallback(
    async (ev: Extract<Evento, { k: 'efeito' }>, final: Estado, ataqueAtual: string | null) => {
      const m = fx.current;
      const el = ev.el;
      const alvoPos = posDe(ev.alvo);
      const origPos = ev.origem ? posDe(ev.origem) : null;
      const mesmoAlvo = ev.origem && mesmoRef(ev.origem, ev.alvo);
      const melee = ev.origem?.tipo === 'char' && ev.origem.id === ataqueAtual && ev.tipo === 'dano';
      const projetavel = ['dano', 'cura', 'escudo', 'amplificar', 'dot', 'regenerar', 'enfraquecer', 'silenciar', 'atordoar', 'esquiva', 'purificar', 'dissipar'].includes(ev.tipo);
      if (melee && ev.origem) {
        const o = refs.current.get(`c:${(ev.origem as { id: string }).id}`);
        if (o && !pularRef.current) {
          const dx = alvoPos.x - origPos!.x;
          const dy = alvoPos.y - origPos!.y;
          const anim = o.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.78}px, ${dy * 0.78}px) scale(1.12)`, offset: 0.55 }, { transform: 'translate(0,0) scale(1)' }], { duration: 560 * (rapidoRef.current ? 0.55 : 1), easing: 'ease-in-out' });
          await esperar(300);
          void anim;
        }
      } else if (projetavel && origPos && !mesmoAlvo && !ev.dot) {
        await projetar(el, origPos, alvoPos, ev.tipo === 'dano' ? 520 : 420);
      }
      setDadosCena([]);
      // o efeito chega: números, status e partículas
      const patch = (e: Estado) => {
        if (ev.depois) {
          if (ev.alvo.tipo === 'heroi') {
            e.jogadores[ev.alvo.lado].vida = ev.depois.vida;
            e.jogadores[ev.alvo.lado].escudo = ev.depois.escudo;
          } else {
            const p = acharChar(e, ev.alvo.id);
            if (p) {
              p.dano = Math.max(0, p.vida - ev.depois.vida);
              p.escudo = ev.depois.escudo;
            }
          }
        }
        // status: copia do estado final (silêncio, atordoamento, bônus…)
        if (ev.tipo !== 'dano' && ev.tipo !== 'cura') {
          if (ev.alvo.tipo === 'heroi') {
            e.jogadores[ev.alvo.lado].status = structuredClone(final.jogadores[ev.alvo.lado].status);
          } else {
            const p = acharChar(e, ev.alvo.id);
            const f = acharChar(final, ev.alvo.id);
            if (p && f) p.status = structuredClone(f.status);
          }
        }
      };
      emExibido(patch);
      const forca = Math.max(0.7, Math.min(2.1, 0.55 + ev.valor / 6));
      switch (ev.tipo) {
        case 'dano': {
          if (ev.dot) m?.impacto('dot', el, alvoPos, 1);
          else m?.impacto('dano', el, alvoPos, forca);
          if (ev.valor > 0) {
            flutuar(alvoPos, `−${ev.valor}`, COR_DO_NUMERO.dano, 26 + Math.min(26, ev.valor * 2.6));
            sacudir(ev.alvo, ev.valor >= 7);
            if (ev.valor >= 8) setTremer((t) => t + 1);
          }
          if ((ev.absorvido ?? 0) > 0) setTimeout(() => flutuar({ x: alvoPos.x + 30, y: alvoPos.y + 18 }, `🛡 −${ev.absorvido}`, COR_DO_NUMERO.escudo, 20), 140);
          if (ev.valor === 0 && !(ev.absorvido ?? 0)) flutuar(alvoPos, '0', '#cbd5e1', 22);
          break;
        }
        case 'cura':
          m?.impacto('cura', el, alvoPos, forca);
          flutuar(alvoPos, `+${ev.valor}`, COR_DO_NUMERO.cura, 28 + Math.min(18, ev.valor * 2));
          break;
        case 'escudo':
          m?.impacto('escudo', el, alvoPos, forca);
          flutuar(alvoPos, `🛡 +${ev.valor}`, COR_DO_NUMERO.escudo, 28);
          break;
        case 'amplificar':
          m?.impacto('amplificar', el, alvoPos, 1);
          flutuar(alvoPos, 'Bônus!', COR_DO_NUMERO.amplificar, 22);
          break;
        case 'dot':
          m?.impacto('dot', el, alvoPos, 1);
          flutuar(alvoPos, ELEMENTOS[el].dot, '#fdba74', 20);
          break;
        case 'regenerar':
          m?.impacto('regenerar', el, alvoPos, 1);
          flutuar(alvoPos, 'Regeneração', '#86efac', 20);
          break;
        case 'enfraquecer':
          m?.impacto('enfraquecer', el, alvoPos, 1);
          flutuar(alvoPos, `−${ev.valor} de dano`, COR_DO_NUMERO.enfraquecer, 20);
          break;
        case 'silenciar':
          m?.impacto('silenciar', el, alvoPos, 1);
          flutuar(alvoPos, 'Silêncio', '#cbd5e1', 24);
          break;
        case 'atordoar':
          m?.impacto('atordoar', el, alvoPos, 1);
          flutuar(alvoPos, 'Atordoado', '#fde047', 24);
          break;
        case 'esquiva':
          m?.impacto('esquiva', el, alvoPos, 1);
          flutuar(alvoPos, 'Esquiva', '#5eead4', 20);
          break;
        case 'esquiva-usada':
          m?.impacto('esquiva-usada', el, alvoPos, 1);
          flutuar(alvoPos, 'Esquivou!', '#5eead4', 28);
          break;
        case 'purificar':
          m?.impacto('purificar', el, alvoPos, 1);
          flutuar(alvoPos, 'Purificado', '#fef3c7', 22);
          break;
        case 'dissipar':
          m?.impacto('dissipar', el, alvoPos, 1);
          flutuar(alvoPos, 'Dissipado', '#fda4af', 22);
          break;
        case 'comprar':
          m?.impacto('comprar', el, alvoPos, 1);
          flutuar(alvoPos, `+${ev.valor} carta${ev.valor > 1 ? 's' : ''}`, '#93c5fd', 22);
          break;
        case 'mana':
          m?.impacto('mana', el, alvoPos, 1);
          flutuar(alvoPos, `+${ev.valor} mana`, '#67e8f9', 22);
          break;
        case 'drenarMana':
          m?.impacto('drenarMana', el, alvoPos, 1);
          flutuar(alvoPos, `−${ev.valor} mana`, '#f0abfc', 22);
          break;
        case 'ressuscitar':
          m?.impacto('ressuscitar', el, alvoPos, 1);
          flutuar(alvoPos, 'Renasce!', '#fde68a', 26);
          break;
        case 'falhou':
          flutuar(alvoPos, 'Sem efeito', '#cbd5e1', 18);
          break;
      }
    },
    [posDe, projetar, emExibido, flutuar, sacudir, esperar],
  );

  const animarLote = useCallback(
    async (lote: Lote) => {
      const base = exibidoRef.current ?? lote.estado;
      exibidoRef.current = base;
      let ataqueAtual: string | null = null;
      const evs = lote.eventos;
      for (let i = 0; i < evs.length; i++) {
        if (!vivo.current) return;
        const ev = evs[i];
        switch (ev.k) {
          case 'turno': {
            setDadosCena([]);
            emExibido((e) => {
              e.ativo = ev.lado;
            });
            const minha = lote.estado.eu === ev.lado;
            const nome = lote.estado.jogadores[ev.lado].nome.split(' ')[0];
            setBanner({ key: ++chave.current, texto: lote.estado.eu === null ? `Turno de ${nome}` : minha ? 'Seu turno' : `Turno de ${nome}`, el: lote.estado.jogadores[ev.lado].elemento });
            fx.current?.impacto('turno', lote.estado.jogadores[ev.lado].elemento, centro(refs.current.get(`h${ev.lado}`)), 1);
            await esperar(650);
            break;
          }
          case 'carta': {
            const k = definicao(ev.carta);
            setDadosCena([]);
            setElAtivo(k.el);
            setCartaEmCena({ key: ++chave.current, id: ev.carta, mana: false, lado: ev.lado });
            fx.current?.carregar(k.el, centro(refs.current.get(`h${ev.lado}`)), Math.min(1.8, 0.7 + k.custo * 0.16));
            if (k.custo >= 6) setTremer((t) => t + 1);
            await esperar(900);
            setCartaEmCena(null);
            break;
          }
          case 'mana': {
            const mn = cartaDeMana(ev.carta);
            setElAtivo(mn.el);
            setCartaEmCena({ key: ++chave.current, id: ev.carta, mana: true, lado: ev.lado });
            fx.current?.impacto('mana', mn.el, centro(refs.current.get(`h${ev.lado}`)), 1);
            await esperar(620);
            setCartaEmCena(null);
            break;
          }
          case 'invocar': {
            const k = definicao(ev.p.carta);
            emExibido((e) => {
              const j = e.jogadores[ev.lado];
              if (!j.campo.some((c) => c.id === ev.p.id)) j.campo.push(structuredClone(ev.p));
            });
            setEntrando((s) => new Set(s).add(ev.p.id));
            setTimeout(() => setEntrando((s) => { const n = new Set(s); n.delete(ev.p.id); return n; }), 900);
            await esperar(90);
            fx.current?.impacto(ev.reviveu ? 'ressuscitar' : 'invocar', k.el, posDe({ tipo: 'char', id: ev.p.id }), 1);
            setTremer((t) => t + (k.custo >= 6 ? 1 : 0));
            await esperar(620);
            break;
          }
          case 'ataque': {
            ataqueAtual = ev.atacante;
            setElAtivo(acharChar(lote.estado, ev.atacante) ? definicao(acharChar(lote.estado, ev.atacante)!.carta).el : null);
            await esperar(120);
            break;
          }
          case 'dados': {
            const g: GrupoDeDados = { key: ++chave.current, faces: ev.faces, valores: ev.valores, el: ev.el, porque: ev.porque, total: ev.total };
            setDadosCena((l) => [...l, g]);
            await esperar(1350);
            break;
          }
          case 'efeito': {
            // Efeitos iguais da mesma origem (área) acontecem juntos.
            const grupo: Extract<Evento, { k: 'efeito' }>[] = [ev];
            while (i + 1 < evs.length) {
              const nx = evs[i + 1];
              if (nx.k === 'efeito' && nx.tipo === ev.tipo && nx.el === ev.el && (nx.origem && ev.origem ? mesmoRef(nx.origem, ev.origem) : nx.origem === ev.origem)) {
                grupo.push(nx);
                i++;
              } else break;
            }
            await Promise.all(grupo.map((g) => rodarEfeito(g, lote.estado, ataqueAtual)));
            await esperar(grupo.some((g) => g.tipo === 'dano' && g.valor >= 6) ? 760 : 560);
            break;
          }
          case 'morte': {
            const k = definicao(ev.carta);
            const alvo = refs.current.get(`c:${ev.id}`);
            const p = centro(alvo);
            fx.current?.impacto('morte', k.el, p, 1);
            alvo?.animate([{ opacity: 1, transform: 'scale(1)', filter: 'none' }, { opacity: 0, transform: 'scale(.7) translateY(14px)', filter: 'brightness(2) blur(3px)' }], { duration: 420, fill: 'forwards' });
            await esperar(440);
            emExibido((e) => {
              const j = e.jogadores[ev.lado];
              j.campo = j.campo.filter((c) => c.id !== ev.id);
            });
            break;
          }
          case 'comprou':
          case 'desistiu':
          case 'fim':
            break;
        }
      }
      setDadosCena([]);
      setCartaEmCena(null);
      exibidoRef.current = lote.estado;
      setExibido(lote.estado);
    },
    [centro, emExibido, esperar, posDe, rodarEfeito],
  );

  const processar = useCallback(async () => {
    if (rodando.current) return;
    rodando.current = true;
    setAnimando(true);
    try {
      while (fila.current.length && vivo.current) {
        const lote = fila.current.shift()!;
        await animarLote(lote);
      }
    } finally {
      rodando.current = false;
      pularRef.current = false;
      if (vivo.current) setAnimando(false);
    }
  }, [animarLote]);

  /** Aceita um novo estado: a mesa toca os eventos dele antes de mostrá-lo por inteiro. */
  const definir = useCallback(
    (e: Estado, animar = true) => {
      estadoRef.current = e;
      setEstado(e);
      if (animar && e.eventos.length && exibidoRef.current) {
        fila.current.push({ estado: e, eventos: e.eventos });
        void processar();
      } else if (!rodando.current) {
        exibidoRef.current = e;
        setExibido(e);
      } else {
        fila.current.push({ estado: e, eventos: [] });
      }
    },
    [processar],
  );

  // Começa a partida neste aparelho (jogadores embaralham o próprio baralho).
  const iniciar = useCallback(
    (participantes: [Participante, Participante]) => {
      const meuLado = participantes.findIndex((p) => p.userId === eu.userId);
      if (meuLado < 0) return;
      const l = meuLado as Lado;
      const meu = embaralharBaralho(participantes[l].elemento);
      pendentes.current.clear();
      gravou.current = false;
      fila.current = [];
      exibidoRef.current = null;
      const e = novaPartida(participantes, l, meu);
      definir(e, false);
      setEsperando('');
      setBanner({ key: ++chave.current, texto: 'Que o duelo comece', el: participantes[l].elemento });
      enviar(mesa, 'arc:publico', { estado: publico(e) });
    },
    [definir, eu.userId, enviar, mesa],
  );

  // Aplica uma jogada minha e manda para a mesa (com os dados que acabei de rolar).
  const jogar = useCallback(
    (acao: Acao) => {
      const atual = estadoRef.current;
      if (!atual || rodando.current) return;
      const r = aplicar(atual, acao);
      if (!r.ok) {
        setAviso(r.erro);
        return;
      }
      definir(r.estado);
      enviar(mesa, 'arc:acao', { acao: r.acao, seq: atual.seq });
      enviar(mesa, 'arc:publico', { estado: publico(r.estado) });
      setSel({ t: 'nada' });
      setAviso('');
    },
    [definir, enviar, mesa],
  );

  // Anfitrião: anuncia a mesa aberta.
  useEffect(() => {
    if (papel !== 'host' || !elemento) return;
    void anunciar({ id: mesa, jogo: 'arcanos', host: eu.userId, hostNome: eu.nome, estado: 'aberta', jogadores: [eu.userId], detalhe: `Elemento: ${ELEMENTOS[elemento].nome}` });
    return () => void anunciar(null);
  }, [papel, elemento, anunciar, mesa, eu.userId, eu.nome]);

  // Desafiante: pede para entrar até o anfitrião responder.
  useEffect(() => {
    if (papel !== 'desafiante' || !elemento || estado) return;
    let n = 0;
    const pedir = () => {
      n += 1;
      if (n > 6) {
        setEsperando('O anfitrião não respondeu. A mesa pode ter fechado.');
        return;
      }
      enviar(mesa, 'arc:aceitar', { nome: eu.nome, avatar: eu.avatar, elemento });
    };
    pedir();
    const t = window.setInterval(pedir, 3000);
    return () => window.clearInterval(t);
  }, [papel, elemento, estado, enviar, mesa, eu.nome, eu.avatar]);

  // Espectador: pede o estado público.
  useEffect(() => {
    if (papel !== 'espectador') return;
    enviar(mesa, 'arc:pedir', {});
    const t = window.setInterval(() => !estadoRef.current && enviar(mesa, 'arc:pedir', {}), 4000);
    return () => window.clearInterval(t);
  }, [papel, enviar, mesa]);

  // Mensagens da mesa.
  useEffect(() => {
    return ouvir((m: Mensagem) => {
      if (m.mesa !== mesa) return;
      const atual = estadoRef.current;
      switch (m.tipo) {
        case 'arc:aceitar': {
          if (papel !== 'host' || !elemento) return;
          if (oponenteRef.current && oponenteRef.current.userId !== m.de) {
            enviar(mesa, 'arc:ocupada', { para: m.de });
            return;
          }
          if (!ehElemento(m.elemento)) return;
          if (oponenteRef.current && atual) return; // já começou: o desafiante recebe o início abaixo
          const ele: Participante = { userId: m.de, nome: String(m.nome ?? 'Desafiante').slice(0, 40), elemento: m.elemento };
          oponenteRef.current = ele;
          const meu: Participante = { userId: eu.userId, nome: eu.nome, elemento };
          const participantes: [Participante, Participante] = Math.random() < 0.5 ? [meu, ele] : [ele, meu];
          enviar(mesa, 'arc:inicio', { participantes });
          void anunciar({ id: mesa, jogo: 'arcanos', host: eu.userId, hostNome: eu.nome, estado: 'jogando', jogadores: [eu.userId, m.de], detalhe: `${eu.nome.split(' ')[0]} × ${ele.nome.split(' ')[0]}` });
          iniciar(participantes);
          return;
        }
        case 'arc:inicio': {
          const ps = m.participantes as [Participante, Participante];
          if (!Array.isArray(ps) || ps.length !== 2 || !ps.every((p) => ehElemento(p.elemento))) return;
          if (ps.some((p) => p.userId === eu.userId) && !atual) iniciar(ps);
          return;
        }
        case 'arc:ocupada':
          if (m.para === eu.userId && !atual) setEsperando('Outra pessoa já aceitou este duelo. Volte ao lobby e abra o seu.');
          return;
        case 'arc:acao': {
          if (!atual || atual.eu === null) return;
          const acao = m.acao as Acao;
          const seq = Number(m.seq);
          if (seq < atual.seq) return;
          pendentes.current.set(seq, acao);
          let e = atual;
          const passos: Estado[] = [];
          while (pendentes.current.has(e.seq)) {
            const a = pendentes.current.get(e.seq)!;
            pendentes.current.delete(e.seq);
            const r = aplicar(e, a);
            if (!r.ok) {
              setDesync(true);
              break;
            }
            e = r.estado;
            passos.push(e);
          }
          if (passos.length) {
            passos.forEach((p) => definir(p));
            // Quem assiste recebe o estado dos dois lados (se um se perder, o outro chega).
            enviar(mesa, 'arc:publico', { estado: publico(e) });
          }
          return;
        }
        case 'arc:publico': {
          if (atual && atual.eu !== null) return; // quem joga tem o próprio estado
          const e = m.estado as Estado;
          if (e && (!atual || e.seq > atual.seq)) {
            definir(e, Boolean(atual));
            setEsperando('');
          }
          return;
        }
        case 'arc:pedir':
          if (atual && atual.eu !== null) enviar(mesa, 'arc:publico', { estado: publico(atual) });
          return;
        case 'arc:saiu':
          if (atual && atual.eu !== null && atual.vencedor === null && m.de === atual.jogadores[outro(atual.eu)].userId) {
            const r = aplicar(atual, { t: 'desistir', lado: outro(atual.eu) });
            if (r.ok) definir(r.estado);
          }
          return;
      }
    });
  }, [ouvir, mesa, papel, elemento, eu.userId, eu.nome, enviar, anunciar, iniciar, definir]);

  // Relógio: prazo do turno.
  useEffect(() => {
    if (!estado) return;
    setPrazo(Date.now() + TEMPO_DO_TURNO);
    setAviso('');
    setSel({ t: 'nada' });
  }, [estado?.turno]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  // O tempo acabou: a vez passa sozinha, uma vez só.
  useEffect(() => {
    const e = estadoRef.current;
    if (!e || e.eu === null || e.vencedor !== null || rodando.current) return;
    const chaveTempo = `${e.seq}`;
    if (porTempoEnviado.current === chaveTempo) return;
    if (e.ativo === e.eu && agora > prazo) {
      porTempoEnviado.current = chaveTempo;
      jogar({ t: 'passar', lado: e.eu, porTempo: true });
    }
  }, [agora, prazo, jogar]);

  // Adversário sumiu da sala?
  const oponenteId = estado && estado.eu !== null ? estado.jogadores[outro(estado.eu)].userId : null;
  const oponentePresente = !oponenteId || presentes.some((p) => p.userId === oponenteId);
  useEffect(() => {
    if (oponentePresente || !estado || estado.vencedor !== null) setAusenteDesde(null);
    else setAusenteDesde((a) => a ?? Date.now());
  }, [oponentePresente, estado?.vencedor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fim: grava o resultado (uma vez).
  useEffect(() => {
    if (!estado || estado.eu === null || estado.vencedor === null || gravou.current || !groupId) return;
    gravou.current = true;
    const v = estado.vencedor;
    const [a, b] = estado.jogadores;
    void fetch(`/api/comunidade/grupos/${groupId}/jogos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesa,
        jogo: 'arcanos',
        vencedor: v === 'empate' ? null : estado.jogadores[v].userId,
        jogadores: [a.userId, b.userId],
        resumo: v === 'empate' ? `${a.nome} e ${b.nome} empataram` : `${estado.jogadores[v].nome} venceu em ${Math.ceil(estado.turno / 2)} rodadas`,
      }),
    }).catch(() => undefined);
  }, [estado, groupId, mesa]);

  const fimVisivel = estado?.vencedor !== null && estado?.vencedor !== undefined && !animando;
  useEffect(() => {
    if (!fimVisivel || venceuFx.current || !estado) return;
    venceuFx.current = true;
    const v = estado.vencedor;
    if (v !== 'empate' && v !== null) fx.current?.impacto('vitoria', estado.jogadores[v].elemento, centro(refs.current.get(`h${v}`)), 1);
  }, [fimVisivel, estado, centro]);

  const sair = () => {
    const e = estadoRef.current;
    if (e && e.eu !== null && e.vencedor === null && !window.confirm('Sair agora conta como desistência. Sair mesmo?')) return;
    if (e && e.eu !== null && e.vencedor === null) {
      const r = aplicar(e, { t: 'desistir', lado: e.eu });
      if (r.ok) enviar(mesa, 'arc:acao', { acao: r.acao, seq: e.seq });
    }
    enviar(mesa, 'arc:saiu', {});
    void anunciar(null);
    aoSair();
  };
  if (fecharRef) fecharRef.current = sair;

  // --- Interação -----------------------------------------------------------------
  const minhaVez = Boolean(estado && souJogador && estado.ativo === lado && estado.vencedor === null);
  const livre = minhaVez && !animando;

  const alvos = useMemo(() => {
    const m = new Map<string, 'dano' | 'ajuda'>();
    if (!estado || !livre) return m;
    const chaveDe = (r: Ref) => (r.tipo === 'heroi' ? `h${r.lado}` : `c:${r.id}`);
    if (sel.t === 'alvo') {
      const k = definicao(sel.id);
      const hostil = k.alvo === 'inimigo' || k.alvo === 'char-inimigo' || (k.alvo === 'qualquer' && k.efeitos.some((e) => ehHostil(e.e)));
      alvosDaCarta(estado, lado, sel.id).forEach((r) => m.set(chaveDe(r), hostil ? 'dano' : 'ajuda'));
    } else if (sel.t === 'ataque') {
      const p = acharChar(estado, sel.atacante);
      if (p) alvosDoAtaque(estado, p).forEach((r) => m.set(chaveDe(r), 'dano'));
    }
    return m;
  }, [estado, sel, livre, lado]);

  const prontos = useMemo(() => {
    const s = new Set<string>();
    if (estado && livre) estado.jogadores[lado].campo.forEach((p) => podeAtacar(estado, p) && s.add(p.id));
    return s;
  }, [estado, livre, lado]);

  const executarCarta = (id: string) => {
    if (!estado) return;
    const k = definicao(id);
    if (k.tipo === 'magia' && k.alvo) {
      setSel({ t: 'alvo', id });
      setAviso(`Escolha o alvo de ${k.nome}.`);
      return;
    }
    jogar({ t: 'jogar', lado, carta: id });
  };

  const clicarNaMao = (id: string) => {
    if (!estado || !souJogador) return;
    if (!livre) return setZoomCarta(id);
    const erro = podeJogar(estado, lado, id);
    if (sel.t === 'carta' && sel.id === id && !sel.mana) {
      if (erro) return setAviso(erro);
      return executarCarta(id);
    }
    setSel({ t: 'carta', id, mana: false });
    setAviso(erro ?? '');
  };

  const clicarNaMana = (id: string) => {
    if (!estado || !souJogador) return;
    if (!livre) return setZoomCarta(id);
    const erro = podeJogarMana(estado, lado, id);
    if (erro) {
      setAviso(erro);
      return;
    }
    jogar({ t: 'mana', lado, carta: id });
  };

  const clicarHeroi = (l: Lado) => {
    if (!estado || !livre) return;
    const r: Ref = { tipo: 'heroi', lado: l };
    if (sel.t === 'alvo' && alvos.has(`h${l}`)) return jogar({ t: 'jogar', lado, carta: sel.id, alvo: r });
    if (sel.t === 'ataque' && alvos.has(`h${l}`)) return jogar({ t: 'atacar', lado, atacante: sel.atacante, alvo: r });
  };

  const clicarChar = (id: string) => {
    if (!estado) return;
    const p = acharChar(estado, id);
    if (!p) return;
    const r: Ref = { tipo: 'char', id };
    if (livre && sel.t === 'alvo' && alvos.has(`c:${id}`)) return jogar({ t: 'jogar', lado, carta: sel.id, alvo: r });
    if (livre && sel.t === 'ataque' && alvos.has(`c:${id}`)) return jogar({ t: 'atacar', lado, atacante: sel.atacante, alvo: r });
    if (livre && p.dono === lado && podeAtacar(estado, p)) {
      setSel((s) => (s.t === 'ataque' && s.atacante === id ? { t: 'nada' } : { t: 'ataque', atacante: id }));
      setAviso('');
      return;
    }
    setZoomChar(id);
  };

  // --- Desenho -------------------------------------------------------------------
  const cabecalho = (
    <header className="relative z-20 flex items-center gap-2 border-b px-3 py-1.5 sm:px-5" style={{ borderColor: 'rgba(224,184,74,.3)' }}>
      <div className="flex -space-x-1">
        {(Object.keys(ELEMENTOS) as Elemento[]).map((el) => (
          <Glifo key={el} el={el} className="h-5 w-5" style={{ color: ELEMENTOS[el].brilho, filter: `drop-shadow(0 0 4px ${ELEMENTOS[el].brilho}88)` }} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="fonte-arcana truncate text-base font-black leading-none text-[#fdf6e3] sm:text-lg">{pequeno ? 'Arcanos' : 'Arcanos · Duelo dos Elementos'}</p>
        <p className="truncate text-[11px] text-[#fef3c7]/60">{papel === 'espectador' ? 'Você está assistindo' : local ? 'Contra o computador' : 'Ao vivo no grupo'}</p>
      </div>
      {animando && (
        <button type="button" onClick={() => { pularRef.current = true; fx.current?.limpar(); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#fde68a] hover:bg-white/10">
          Pular ⏭
        </button>
      )}
      <button type="button" onClick={() => setRapido((v) => !v)} aria-pressed={rapido} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10" style={{ color: rapido ? '#fde68a' : 'rgba(254,243,199,.75)' }}>
        {rapido ? 'Rápido ⚡' : 'Normal'}
      </button>
      <button type="button" onClick={() => setLog((v) => !v)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#fef3c7]/80 hover:bg-white/10">Registro</button>
      <button type="button" onClick={() => setRegras(true)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#fef3c7]/80 hover:bg-white/10">Regras</button>
    </header>
  );

  if (!estado || !exibido) {
    return (
      <div className="absolute inset-0 flex flex-col" style={{ background: MESA_BG }}>
        {cabecalho}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex -space-x-6">
            <VersoDaCarta largura={70} el={elemento ?? 'luz'} className="-rotate-12" />
            <VersoDaCarta largura={70} el={elemento ?? 'luz'} />
            <VersoDaCarta largura={70} el={elemento ?? 'luz'} mana className="rotate-12" />
          </div>
          <p className="fonte-arcana max-w-sm text-lg font-bold text-[#fdf6e3]">{esperando}</p>
          {papel === 'host' && elemento && !local && (
            <p className="fonte-pergaminho text-sm text-[#fef3c7]/70">Seu elemento: {ELEMENTOS[elemento].nome}. A mesa aparece para todo mundo que está na sala de jogos do grupo.</p>
          )}
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#fde68a] border-t-transparent" />
        </div>
        {regras && <ModalRegras onFechar={() => setRegras(false)} />}
      </div>
    );
  }

  const baixo: Lado = estado.eu !== null ? estado.eu : 0;
  const cima = outro(baixo);
  const jBaixo = estado.jogadores[baixo];
  const jCima = estado.jogadores[cima];
  const restante = Math.max(0, prazo - agora);
  const tamMao = pequeno ? 92 : 126;
  const tamMana = pequeno ? 56 : 78;
  const mao = jBaixo.mao ?? [];
  const maoMana = jBaixo.maoMana ?? [];
  const cartaSel = sel.t === 'carta' ? definicao(sel.id) : sel.t === 'alvo' ? definicao(sel.id) : null;
  const atacanteSel = sel.t === 'ataque' ? acharChar(estado, sel.atacante) : null;
  const mostrarFim = estado.vencedor !== null && !animando;
  const semAcoes = livre && mao.every((id) => podeJogar(estado, lado, id) !== null) && prontos.size === 0 && (jBaixo.jogouMana || maoMana.length === 0);

  const zc = zoomChar ? acharChar(estado, zoomChar) : null;

  const botaoPassar = souJogador ? (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <button
        type="button"
        disabled={!livre}
        onClick={() => jogar({ t: 'passar', lado })}
        className="fonte-arcana rounded-2xl px-3 py-3 text-xs font-black uppercase leading-tight tracking-wider transition disabled:opacity-40 sm:px-5 sm:text-sm"
        style={{ background: semAcoes ? `linear-gradient(180deg,#fff2b0,${OURO})` : 'linear-gradient(180deg,#3a2c52,#1a1228)', color: semAcoes ? '#1c1208' : '#fde68a', boxShadow: semAcoes ? `0 0 0 2px #fff, 0 0 22px ${OURO}` : `0 0 0 1px ${OURO}` }}
      >
        Passar
        <br />o turno
      </button>
      <span className="flex items-center gap-1 text-[11px] text-[#fef3c7]/60" title="Cartas no grimório e na reserva de mana">
        <Icon name="book" size={12} /> {jBaixo.baralhoQtd} · <GemaDeMana valor="" el={jBaixo.elemento} tamanho="0.8rem" /> {jBaixo.reservaQtd}
      </span>
    </div>
  ) : null;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: MESA_BG }}>
      {cabecalho}

      <div ref={palcoRef} className="relative min-h-0 flex-1 overflow-hidden">
        <TabuleiroArcanos
          exibido={exibido}
          estado={estado}
          baixo={baixo}
          registrar={registrar}
          alvos={alvos}
          procurandoAlvo={alvos.size > 0}
          prontos={prontos}
          selecionado={sel.t === 'ataque' ? sel.atacante : null}
          entrando={entrando}
          elAtivo={elAtivo}
          onHeroi={clicarHeroi}
          onChar={clicarChar}
          largura={largura}
          altura={altura}
          tremer={tremer}
        />

        {/* mão do adversário */}
        <div className="pointer-events-none absolute left-1/2 top-1 z-10 flex -translate-x-1/2 items-start" aria-label={`${jCima.nome} tem ${jCima.maoQtd} cartas e ${jCima.maoManaQtd} de mana na mão`}>
          {Array.from({ length: jCima.maoQtd }, (_, i) => {
            const n = jCima.maoQtd;
            const a = (i - (n - 1) / 2) * 5;
            return <VersoDaCarta key={i} largura={pequeno ? 26 : 34} el={jCima.elemento} className="-ml-[8px] first:ml-0" style={{ transform: `rotate(${a}deg) translateY(${Math.abs(a) * 0.5 - 10}px)` }} />;
          })}
          <span className="ml-3 mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'rgba(8,5,12,.75)', color: ELEMENTOS[jCima.elemento].clara }}>
            <GemaDeMana valor="" el={jCima.elemento} tamanho="0.9rem" /> {jCima.maoManaQtd}
          </span>
        </div>

        {/* relógio do turno */}
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
          <span className="fonte-arcana rounded-full px-3 py-1 text-xs font-black" style={{ background: 'rgba(8,5,12,.8)', color: minhaVez ? '#fde68a' : '#cbd5e1', boxShadow: `0 0 0 1px ${minhaVez ? OURO : 'rgba(255,255,255,.2)'}` }}>
            {estado.vencedor !== null ? 'Fim' : minhaVez ? 'Sua vez' : `Vez de ${estado.jogadores[estado.ativo].nome.split(' ')[0]}`} · rodada {Math.ceil(estado.turno / 2)}
          </span>
          {estado.vencedor === null && (
            <span className="block h-1.5 w-28 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.15)' }}>
              <span className="block h-full" style={{ width: `${(restante / TEMPO_DO_TURNO) * 100}%`, background: restante < 20000 ? '#ef4444' : OURO, transition: 'width .5s linear' }} />
            </span>
          )}
        </div>

        {/* efeitos */}
        <canvas ref={canvas} className="pointer-events-none absolute inset-0 z-30" aria-hidden />

        {/* dados em cena */}
        {dadosCena.length > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-[44%] z-40 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
            {dadosCena.map((g) => (
              <div key={g.key} className="arc-pop flex flex-col items-center gap-1">
                <div className="flex items-end gap-2">
                  {g.valores.map((v, i) => (
                    <Dado3D key={i} faces={g.faces} valor={v} el={g.el} tamanho={pequeno ? 52 : 72} atraso={i * 110} />
                  ))}
                </div>
                <span className="fonte-arcana rounded-full px-3 py-0.5 text-sm font-black" style={{ background: 'rgba(8,5,12,.82)', color: ELEMENTOS[g.el].clara, boxShadow: `0 0 0 1.5px ${ELEMENTOS[g.el].brilho}, 0 0 18px ${ELEMENTOS[g.el].brilho}88` }}>
                  {PORQUE[g.porque] ?? g.porque} · {g.valores.length}d{g.faces} = {g.total}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* carta lançada */}
        {cartaEmCena && (
          <div key={cartaEmCena.key} className="arc-surge pointer-events-none absolute left-1/2 z-40" style={{ top: cartaEmCena.lado === baixo ? '58%' : '34%', filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.7))' }}>
            {cartaEmCena.mana ? <CartaDeManaGrande id={cartaEmCena.id} largura={pequeno ? 110 : 150} destaque /> : <CartaGrande id={cartaEmCena.id} largura={pequeno ? 150 : 210} destaque detalhes={!pequeno} />}
          </div>
        )}

        {/* números flutuantes */}
        {flutuantes.map((f) => (
          <span key={f.key} className="fonte-arcana arc-sobe pointer-events-none absolute z-50 whitespace-nowrap font-black" style={{ left: f.x, top: f.y, fontSize: f.tam, color: f.cor, textShadow: '0 2px 0 #000, 0 0 12px #000, 0 0 22px ' + f.cor }}>
            {f.texto}
          </span>
        ))}

        {/* aviso de turno */}
        {banner && (
          <div key={banner.key} className="arc-banner fonte-arcana pointer-events-none absolute left-1/2 top-[40%] z-[45] whitespace-nowrap text-3xl font-black uppercase sm:text-5xl" style={{ color: ELEMENTOS[banner.el].clara, textShadow: `0 0 24px ${ELEMENTOS[banner.el].brilho}, 0 0 4px #000, 0 3px 0 #000` }}>
            {banner.texto}
          </div>
        )}

        {pequeno && souJogador && <div className="absolute bottom-2 right-2 z-20">{botaoPassar}</div>}

        {mostrarFim && <FimDoDuelo estado={estado} onSair={sair} local={local} onRevanche={aoRevanche} comPlacar={Boolean(groupId)} />}
      </div>

      {/* faixa de informação */}
      <div className="relative z-20 flex min-h-[2.4rem] items-center justify-center gap-2 px-3 py-1 text-center text-xs sm:text-sm" style={{ background: 'rgba(8,5,12,.7)', borderTop: '1px solid rgba(224,184,74,.25)' }}>
        {cartaSel && sel.t === 'carta' ? (
          <>
            <span className="fonte-pergaminho min-w-0 flex-1 truncate text-left text-[#fef3c7]">
              <b className="fonte-arcana" style={{ color: ELEMENTOS[cartaSel.el].clara }}>{cartaSel.nome}</b> · {textoDaCarta(cartaSel).filter((l) => !/^(Guardião|Ímpeto|Alado|Vampírico|Foco Arcano|Couraça):/.test(l)).join(' ') || tipoDaCarta(cartaSel)}
            </span>
            <BotaoMesa onClick={() => setZoomCarta(sel.id)} fraco>Detalhes</BotaoMesa>
            <BotaoMesa onClick={() => executarCarta(sel.id)} disabled={Boolean(podeJogar(estado, lado, sel.id))}>
              {cartaSel.tipo === 'personagem' ? 'Invocar' : 'Lançar'} · {cartaSel.custo}
            </BotaoMesa>
          </>
        ) : sel.t === 'alvo' && cartaSel ? (
          <>
            <span className="fonte-arcana font-bold text-[#fde68a]">Escolha o alvo de {cartaSel.nome} no tabuleiro</span>
            <BotaoMesa onClick={() => { setSel({ t: 'nada' }); setAviso(''); }} fraco>Cancelar</BotaoMesa>
          </>
        ) : atacanteSel ? (
          <>
            <span className="fonte-arcana font-bold text-[#fecaca]">{definicao(atacanteSel.carta).nome} ataca com {dadosTexto(ataqueDoChar(atacanteSel))} — escolha o alvo</span>
            <BotaoMesa onClick={() => setSel({ t: 'nada' })} fraco>Cancelar</BotaoMesa>
          </>
        ) : aviso ? (
          <span className="fonte-pergaminho text-[#fde68a]">{aviso}</span>
        ) : animando ? (
          <span className="fonte-pergaminho text-[#fef3c7]/60">A magia acontece…</span>
        ) : minhaVez ? (
          <span className="fonte-pergaminho text-[#fef3c7]/70">
            Mana {manaDisponivel(jBaixo)}/{manaTotal(jBaixo)} · toque numa carta para lançar{prontos.size ? ' · personagens brilhando podem atacar' : ''}
          </span>
        ) : souJogador && estado.vencedor === null ? (
          <span className="fonte-pergaminho text-[#fef3c7]/60">Aguardando {jCima.nome.split(' ')[0]}…</span>
        ) : null}
      </div>

      {/* mão */}
      {souJogador ? (
        <div className="relative z-20 flex items-end gap-2 px-2 pb-2 pt-3 sm:px-4" style={{ background: 'linear-gradient(180deg, rgba(8,5,12,.5), rgba(8,5,12,.9))' }}>
          <div className="flex min-w-0 flex-1 items-end gap-2 overflow-x-auto overflow-y-visible px-1 pb-1 pt-4 sm:justify-center">
            <div className="flex shrink-0 items-end gap-1" aria-label="Sua mana na mão">
              {maoMana.length === 0 && <span className="fonte-pergaminho w-12 text-[11px] italic text-[#fef3c7]/40">sem mana</span>}
              {maoMana.map((id, i) => (
                <CartaDeManaGrande key={`${id}-${i}`} id={id} largura={tamMana} onClick={() => clicarNaMana(id)} desabilitada={livre && Boolean(podeJogarMana(estado, lado, id))} destaque={livre && !podeJogarMana(estado, lado, id)} className={i ? '-ml-5 sm:-ml-6' : ''} />
              ))}
            </div>
            <span className="mx-1 h-16 w-px shrink-0 self-center" style={{ background: 'rgba(224,184,74,.35)' }} />
            <div className="flex shrink-0 items-end gap-1" aria-label="Sua mão">
              {mao.length === 0 && <span className="fonte-pergaminho py-6 text-sm italic text-[#fef3c7]/40">mão vazia</span>}
              {mao.map((id, i) => {
                const pode = !podeJogar(estado, lado, id);
                const sele = (sel.t === 'carta' || sel.t === 'alvo') && sel.id === id;
                return (
                  <div key={`${id}-${i}`} className="arc-mao-carta relative shrink-0" style={{ marginLeft: i ? (pequeno ? -22 : -14) : 0 }}>
                    <CartaGrande id={id} largura={tamMao} onClick={() => clicarNaMao(id)} desabilitada={livre && !pode} destaque={livre && pode && !sele} selecionada={sele} />
                  </div>
                );
              })}
            </div>
          </div>
          {!pequeno && botaoPassar}
        </div>
      ) : (
        <p className="relative z-20 px-5 py-4 text-center text-xs text-[#fef3c7]/60">Você está assistindo: as mãos ficam escondidas.</p>
      )}

      {log && (
        <aside className="fixed bottom-4 right-4 z-[72] max-h-[45vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-3 text-xs" style={{ background: 'rgba(15,10,22,.96)', boxShadow: `0 0 0 1px ${OURO}` }}>
          <p className="fonte-arcana mb-1 font-bold" style={{ color: OURO }}>Registro</p>
          <ol className="space-y-1 text-[#fef3c7]/85">
            {[...estado.log].reverse().map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </aside>
      )}

      {ausenteDesde && estado.vencedor === null && agora - ausenteDesde > 30_000 && souJogador && (
        <div className="fixed inset-x-4 bottom-4 z-[73] mx-auto max-w-md rounded-2xl p-4 text-center" style={{ background: 'rgba(15,10,22,.97)', boxShadow: `0 0 0 1px ${OURO}` }}>
          <p className="fonte-arcana font-bold">{jCima.nome} saiu da sala de jogos.</p>
          <p className="mt-1 text-xs text-[#fef3c7]/70">Se não voltar, você pode encerrar a partida com a vitória.</p>
          <div className="mt-3 flex justify-center">
            <BotaoMesa onClick={() => jogar({ t: 'desistir', lado: cima })}>Reivindicar vitória</BotaoMesa>
          </div>
        </div>
      )}

      {desync && (
        <div className="fixed inset-x-4 top-20 z-[73] mx-auto max-w-md rounded-2xl p-4 text-center" style={{ background: 'rgba(60,10,10,.96)', boxShadow: '0 0 0 1px #ef4444' }}>
          <p className="fonte-arcana font-bold">As mesas se desencontraram.</p>
          <p className="mt-1 text-xs text-[#fee2e2]/80">A conexão perdeu uma jogada. Encerre esta partida e comece outra.</p>
          <div className="mt-3 flex justify-center">
            <BotaoMesa onClick={sair}>Encerrar</BotaoMesa>
          </div>
        </div>
      )}

      {zoomCarta && (
        <button type="button" onClick={() => setZoomCarta(null)} className="fixed inset-0 z-[74] flex items-center justify-center bg-black/80 p-6" aria-label="Fechar a carta">
          {zoomCarta.startsWith('m1-') || zoomCarta.startsWith('m2-') ? <CartaDeManaGrande id={zoomCarta} largura={Math.min(260, largura - 48)} /> : <CartaGrande id={zoomCarta} largura={Math.min(320, largura - 48)} detalhes />}
        </button>
      )}

      {zc && (
        <button type="button" onClick={() => setZoomChar(null)} className="fixed inset-0 z-[74] flex flex-col items-center justify-center gap-3 bg-black/80 p-6" aria-label="Fechar a ficha">
          <CartaGrande id={zc.carta} largura={Math.min(320, largura - 48)} detalhes />
          <div className="fonte-arcana flex max-w-sm flex-wrap items-center justify-center gap-2 text-sm font-bold text-[#fdf6e3]">
            <span className="rounded-full px-3 py-1" style={{ background: 'rgba(8,5,12,.85)', boxShadow: `0 0 0 1px ${OURO}` }}>
              Vida {vidaDoChar(zc)}/{zc.vida}
              {zc.escudo ? ` · Escudo ${zc.escudo}` : ''}
            </span>
            <span className="rounded-full px-3 py-1" style={{ background: 'rgba(8,5,12,.85)', boxShadow: `0 0 0 1px ${OURO}` }}>
              Ataque {dadosTexto(ataqueDoChar(zc))}
            </span>
            {chavesDeStatus(zc.status).map((k) => (
              <span key={k} className="rounded-full px-3 py-1" style={{ background: 'rgba(8,5,12,.85)', boxShadow: '0 0 0 1px #94a3b8' }}>
                {rotuloDeStatus(k)}
              </span>
            ))}
          </div>
        </button>
      )}

      {regras && <ModalRegras onFechar={() => setRegras(false)} />}
    </div>
  );
}

function BotaoMesa({ children, onClick, disabled, fraco, perigo }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; fraco?: boolean; perigo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fonte-arcana inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider transition disabled:opacity-40 sm:text-sm"
      style={
        fraco
          ? { background: 'rgba(0,0,0,.35)', color: '#fde68a', boxShadow: '0 0 0 1px rgba(224,184,74,.45)' }
          : perigo
            ? { background: 'linear-gradient(180deg,#f87171,#b91c1c)', color: '#fff', boxShadow: `0 0 0 1px ${OURO}, 0 3px 10px rgba(0,0,0,.45)` }
            : { background: `linear-gradient(180deg,#f5d77a,${OURO})`, color: '#1c1208', boxShadow: '0 3px 10px rgba(0,0,0,.45)' }
      }
    >
      {children}
    </button>
  );
}

function FimDoDuelo({ estado, onSair, onRevanche, local, comPlacar }: { estado: Estado; onSair: () => void; onRevanche?: () => void; local: boolean; comPlacar: boolean }) {
  const v = estado.vencedor;
  const venci = estado.eu !== null && v === estado.eu;
  const titulo = v === 'empate' ? 'Empate!' : estado.eu === null ? `${estado.jogadores[v as Lado].nome} venceu!` : venci ? 'Vitória!' : 'Derrota';
  const el = v === 'empate' || v === null ? estado.jogadores[0].elemento : estado.jogadores[v].elemento;
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/65 p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: MESA_BG, boxShadow: `0 0 0 1px ${OURO}, 0 0 50px ${ELEMENTOS[el].brilho}66` }}>
        <Glifo el={el} className="mx-auto h-20 w-20" style={{ color: ELEMENTOS[el].clara, filter: `drop-shadow(0 0 16px ${ELEMENTOS[el].brilho})` }} />
        <h2 className="fonte-arcana mt-3 text-3xl font-black text-[#fdf6e3]">{titulo}</h2>
        {estado.motivo && <p className="fonte-pergaminho mt-2 text-sm text-[#fef3c7]/80">{estado.motivo}</p>}
        <p className="mt-1 text-xs text-[#fef3c7]/60">
          {Math.ceil(estado.turno / 2)} rodadas{comPlacar ? ' · o placar do grupo foi atualizado' : ''}.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {local && onRevanche && <BotaoMesa onClick={onRevanche}>Revanche</BotaoMesa>}
          <BotaoMesa onClick={onSair} fraco={Boolean(local && onRevanche)}>
            Fechar jogo
          </BotaoMesa>
        </div>
      </div>
    </div>
  );
}

function ModalRegras({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-[78] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Regras do Arcanos">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-zinc-900 p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="fonte-arcana text-xl font-black text-zinc-50">Como jogar Arcanos</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-full p-2 text-zinc-400 hover:text-zinc-100">
            <Icon name="close" size={18} />
          </button>
        </div>
        <RegrasDoArcanos />
      </div>
    </div>
  );
}

