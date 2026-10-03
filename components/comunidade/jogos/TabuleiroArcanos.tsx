'use client';

import React, { memo } from 'react';
import Avatar from '../../Avatar';
import { ArteDaCarta, Glifo } from './ArteArcanos';
import { IconeDado, METAL, VersoDaCarta } from './CartaArcana';
import { carta, dadosTexto, ELEMENTOS, ELEMENTOS_ORDEM, PALAVRAS, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { ataqueDoChar, manaDisponivel, manaTotal, vidaDoChar, type Estado, type Jogador, type Lado, type Personagem, type Status } from '@/lib/jogos/arcanos/motor';

// O tabuleiro: uma laje de pedra e metal em perspectiva (CSS 3D). Os heróis
// ficam nos altares das pontas, os personagens em pé nos quatro pedestais de
// cada lado, a fonte de mana na borda. O anel rúnico do centro acende na cor
// do último elemento usado. Tudo que está em pé é "billboard": gira de volta
// para encarar a câmera.

export const INCLINACAO = 50;
export const DISTANCIA = 2200;

export interface Layout {
  larga: boolean;
  pw: number;
  ph: number;
  escala: number;
  /** Deslocamento vertical (já em unidades da cena) que centra a projeção na tela. */
  dy: number;
  slotX: number[];
  cima: Lado0;
  baixo: Lado0;
}
type Lado0 = { heroi: { x: number; y: number }; slotY: number; mana: { x: number; y: number }; pilha: { x: number; y: number } };

/** Calcula as medidas da cena e a escala que faz a projeção em perspectiva caber na tela. */
export function layoutDoTabuleiro(w: number, h: number): Layout {
  const larga = w / Math.max(1, h) >= 1.35;
  const pw = larga ? 1000 : 600;
  const ph = larga ? 700 : 1000;
  const rad = (INCLINACAO * Math.PI) / 180;
  const oy = -0.2 * ph; // origem da perspectiva (30% da altura), relativa ao centro
  const proj = (y: number) => {
    const z = y * Math.sin(rad);
    const f = DISTANCIA / (DISTANCIA - z);
    return { y: oy + (y * Math.cos(rad) - oy) * f, f };
  };
  const topo = proj(-ph / 2);
  const fundo = proj(ph / 2);
  const folga = larga ? 70 : 150; // as figuras em pé passam do topo da laje
  const alto = fundo.y - topo.y + folga;
  const largo = pw * fundo.f + 24;
  const escala = Math.max(0.28, Math.min(w / largo, h / alto));
  const dy = -((topo.y - folga + fundo.y) / 2);
  const slotX = larga ? [312, 477, 642, 807] : [93, 231, 369, 507];
  const lado = (c: boolean): Lado0 =>
    larga
      ? { heroi: { x: 112, y: ph * (c ? 0.27 : 0.8) }, slotY: ph * (c ? 0.35 : 0.72), mana: { x: 560, y: ph * (c ? 0.07 : 0.985) }, pilha: { x: 935, y: ph * (c ? 0.27 : 0.8) } }
      : { heroi: { x: pw / 2, y: ph * (c ? 0.13 : 0.94) }, slotY: ph * (c ? 0.4 : 0.66), mana: { x: pw / 2, y: ph * (c ? 0.04 : 0.99) }, pilha: { x: 70, y: ph * (c ? 0.13 : 0.94) } };
  return { larga, pw, ph, escala, dy, slotX, cima: lado(true), baixo: lado(false) };
}

export type Registrar = (chave: string) => (el: HTMLElement | null) => void;

// ---------------------------------------------------------------------------
// Ícones de status
// ---------------------------------------------------------------------------

const ICONES: Record<string, { cor: string; rotulo: string; d: React.ReactNode }> = {
  sil: { cor: '#94a3b8', rotulo: 'Silenciado', d: <><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M6 18 L18 6" stroke="currentColor" strokeWidth="2.4" /></> },
  atd: { cor: '#facc15', rotulo: 'Atordoado', d: <path d="M12 3 l2 6 6 .5 -4.6 4 1.6 6 -5 -3.4 -5 3.4 1.6 -6 -4.6 -4 6 -.5z" fill="currentColor" /> },
  esq: { cor: '#2dd4bf', rotulo: 'Esquiva', d: <path d="M3 8 H14 a3 3 0 1 0 -3 -3 M3 13 H18 a3 3 0 1 1 -3 3 M3 18 H10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" /> },
  dot: { cor: '#f97316', rotulo: 'Dano contínuo', d: <path d="M12 2 C16 8 19 11 19 15 A7 7 0 0 1 5 15 C5 11 8 8 12 2Z" fill="currentColor" /> },
  reg: { cor: '#4ade80', rotulo: 'Regeneração', d: <path d="M10 3 h4 v7 h7 v4 h-7 v7 h-4 v-7 H3 v-4 h7z" fill="currentColor" /> },
  amp: { cor: '#f59e0b', rotulo: 'Amplificado', d: <path d="M4 14 L12 6 L20 14 M4 20 L12 12 L20 20" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /> },
  fra: { cor: '#a78bfa', rotulo: 'Enfraquecido', d: <path d="M4 4 L12 12 L20 4 M4 12 L12 20 L20 12" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /> },
};

export function chavesDeStatus(s: Status): string[] {
  const r: string[] = [];
  if (s.silencio > 0) r.push('sil');
  if (s.atordoado > 0) r.push('atd');
  if (s.esquiva) r.push('esq');
  if (s.dots.length) r.push('dot');
  if (s.regens.length) r.push('reg');
  if (s.ampls.length) r.push('amp');
  if (s.fracos.length) r.push('fra');
  return r;
}

export const rotuloDeStatus = (k: string) => ICONES[k]?.rotulo ?? k;

export function FaixaDeStatus({ s, tam = 16 }: { s: Status; tam?: number }) {
  const ks = chavesDeStatus(s);
  if (!ks.length) return null;
  return (
    <span className="flex items-center justify-center gap-[3px]">
      {ks.map((k) => (
        <span key={k} title={ICONES[k].rotulo} className="flex items-center justify-center rounded-full" style={{ width: tam + 6, height: tam + 6, background: 'rgba(8,5,12,.85)', color: ICONES[k].cor, boxShadow: `0 0 0 1.5px ${ICONES[k].cor}, 0 0 8px ${ICONES[k].cor}88` }}>
          <svg viewBox="0 0 24 24" width={tam} height={tam} aria-hidden>
            {ICONES[k].d}
          </svg>
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Ficha de personagem em campo
// ---------------------------------------------------------------------------

interface PropsFicha {
  p: Personagem;
  registrar: Registrar;
  onClick: () => void;
  alvo: 'nenhum' | 'dano' | 'ajuda';
  dimmed: boolean;
  pronto: boolean;
  selecionada: boolean;
  entrando: boolean;
  dono: 'eu' | 'ele';
}

const Ficha = memo(function Ficha({ p, registrar, onClick, alvo, dimmed, pronto, selecionada, entrando, dono }: PropsFicha) {
  const k = carta(p.carta);
  const el = ELEMENTOS[k.el];
  const m = METAL[k.el];
  const vida = Math.max(0, vidaDoChar(p));
  const pct = Math.max(0, Math.min(1, vida / p.vida));
  const ruim = p.status.atordoado > 0 || p.exausta;
  const anel = alvo === 'dano' ? '#ef4444' : alvo === 'ajuda' ? '#4ade80' : selecionada ? '#fff' : pronto ? el.brilho : 'transparent';
  return (
    <button
      type="button"
      ref={registrar(`c:${p.id}`)}
      onClick={onClick}
      aria-label={`${k.nome}, ataque ${dadosTexto(ataqueDoChar(p))}, vida ${vida} de ${p.vida}${p.escudo ? `, escudo ${p.escudo}` : ''}${dono === 'eu' ? '' : ', inimigo'}`}
      className={`arc-ficha group relative block text-left ${entrando ? 'arc-cair' : ''} ${alvo !== 'nenhum' ? 'arc-alvo' : ''} ${pronto ? 'arc-pronto' : ''}`}
      style={{ width: 118, opacity: dimmed ? 0.45 : 1, ['--anel' as string]: anel, ['--brilho' as string]: el.brilho }}
    >
      <span className="block rounded-[10px] p-[3px]" style={{ background: m.moldura, boxShadow: `0 0 0 2px ${anel === 'transparent' ? 'rgba(0,0,0,.7)' : anel}, 0 0 ${anel === 'transparent' ? 0 : 16}px ${anel}, 0 10px 16px rgba(0,0,0,.65)` }}>
        <span className="relative block overflow-hidden rounded-[8px]" style={{ background: el.escura }}>
          <span className="block" style={{ height: 92, filter: ruim ? 'saturate(.55) brightness(.8)' : undefined }}>
            <ArteDaCarta id={p.carta} className="block h-full w-full" />
          </span>
          {/* nome */}
          <span className="fonte-arcana absolute inset-x-0 top-0 truncate px-[6px] pb-[10px] pt-[3px] text-center text-[10px] font-black leading-none" style={{ color: m.texto, background: 'linear-gradient(180deg, rgba(0,0,0,.85), transparent)', textShadow: '0 1px 2px #000' }}>
            {k.nome}
          </span>
          {/* escudo */}
          {p.escudo > 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-start justify-end" style={{ background: `radial-gradient(circle at 50% 55%, transparent 52%, ${el.brilho}55 78%, #ffffffcc 100%)`, boxShadow: `inset 0 0 14px ${el.clara}` }}>
              <span className="fonte-arcana m-[3px] rounded-full px-[6px] py-[1px] text-[11px] font-black" style={{ background: '#0b5f94', color: '#fff', boxShadow: '0 0 0 1.5px #bfeaff' }}>
                🛡 {p.escudo}
              </span>
            </span>
          )}
          {/* barra de vida */}
          <span className="absolute inset-x-0 bottom-0 block h-[5px]" style={{ background: 'rgba(0,0,0,.7)' }}>
            <span className="block h-full transition-all duration-500" style={{ width: `${pct * 100}%`, background: pct > 0.5 ? 'linear-gradient(90deg,#16a34a,#4ade80)' : pct > 0.25 ? 'linear-gradient(90deg,#ca8a04,#facc15)' : 'linear-gradient(90deg,#b91c1c,#f87171)' }} />
          </span>
        </span>
        <span className="mt-[3px] flex items-center justify-between gap-1 px-[2px]">
          <span className="fonte-arcana inline-flex items-center gap-[3px] rounded-[6px] px-[5px] py-[1px] text-[11px] font-black" style={{ background: m.placa, color: m.texto, boxShadow: `0 0 0 1px ${m.borda}` }}>
            <IconeDado faces={ataqueDoChar(p).f} tamanho={13} cor={el.clara} borda={el.escura} texto={el.escura} />
            {dadosTexto(ataqueDoChar(p))}
          </span>
          <span className="fonte-arcana inline-flex items-center gap-[3px] rounded-[6px] px-[5px] py-[1px] text-[11px] font-black" style={{ background: m.placa, color: m.texto, boxShadow: `0 0 0 1px ${m.borda}` }}>
            <span style={{ color: '#fca5a5' }}>♥</span>
            {vida}
          </span>
        </span>
      </span>
      <span className="absolute -top-[26px] left-0 right-0 flex justify-center">
        <FaixaDeStatus s={p.status} tam={12} />
      </span>
      {k.palavras && k.palavras.length > 0 && (
        <span className="pointer-events-none absolute -bottom-[16px] left-0 right-0 flex justify-center gap-[3px]">
          {k.palavras.map((w) => (
            <span key={w} className="fonte-arcana rounded-full px-[5px] text-[8px] font-black uppercase tracking-wide" style={{ background: 'rgba(0,0,0,.8)', color: el.clara, boxShadow: `0 0 0 1px ${m.borda}88` }}>
              {PALAVRAS[w].nome}
            </span>
          ))}
        </span>
      )}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Herói: altar, orbe de vida
// ---------------------------------------------------------------------------

function OrbeDeVida({ vida, escudo, el }: { vida: number; escudo: number; el: Elemento }) {
  const p = ELEMENTOS[el];
  const pct = Math.max(0, Math.min(1, vida / 20));
  const y = 100 - pct * 100;
  const id = `orb${el}`;
  return (
    <span className="relative inline-block" style={{ width: 96, height: 96 }}>
      <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden style={{ filter: `drop-shadow(0 0 12px ${p.brilho}aa)` }}>
        <defs>
          <clipPath id={`${id}c`}>
            <circle cx="50" cy="50" r="45" />
          </clipPath>
          <radialGradient id={`${id}v`} cx=".4" cy=".3" r=".9">
            <stop offset="0" stopColor="#ffd2d2" />
            <stop offset=".35" stopColor="#ef4444" />
            <stop offset="1" stopColor="#6b0f0f" />
          </radialGradient>
          <radialGradient id={`${id}g`} cx=".35" cy=".25" r=".9">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".7" />
            <stop offset=".4" stopColor="#ffffff" stopOpacity=".05" />
            <stop offset="1" stopColor="#000" stopOpacity=".45" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill="#0b0610" stroke={p.clara} strokeWidth="3" />
        <g clipPath={`url(#${id}c)`}>
          <g style={{ transform: `translateY(${y}px)`, transition: 'transform .9s cubic-bezier(.2,.8,.2,1)' }}>
            <rect x="-20" y="0" width="140" height="120" fill={`url(#${id}v)`} />
            <g className="arc-onda">
              <path d="M-60 2 q15 -7 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V-30 H-60Z" fill="#fca5a5" opacity=".55" />
            </g>
          </g>
          {escudo > 0 && <circle cx="50" cy="50" r="43" fill="none" stroke="#bfeaff" strokeWidth="5" opacity=".9" />}
        </g>
        <circle cx="50" cy="50" r="45" fill={`url(#${id}g)`} />
        <circle cx="50" cy="50" r="47" fill="none" stroke={p.brilho} strokeWidth="1.2" opacity=".9" />
      </svg>
      <span className="fonte-arcana absolute inset-0 flex items-center justify-center text-[34px] font-black text-white" style={{ textShadow: '0 2px 6px #000, 0 0 12px #000' }}>
        {Math.max(0, vida)}
      </span>
      {escudo > 0 && (
        <span className="fonte-arcana absolute -right-2 -top-1 rounded-full px-[7px] py-[1px] text-[13px] font-black" style={{ background: '#0b5f94', color: '#fff', boxShadow: '0 0 0 2px #bfeaff, 0 0 12px #38c8ff' }}>
          🛡 {escudo}
        </span>
      )}
    </span>
  );
}

const Heroi = memo(function Heroi({ j, lado, registrar, onClick, alvo, dimmed, ativo }: { j: Jogador; lado: Lado; registrar: Registrar; onClick: () => void; alvo: 'nenhum' | 'dano' | 'ajuda'; dimmed: boolean; ativo: boolean }) {
  const p = ELEMENTOS[j.elemento];
  const m = METAL[j.elemento];
  const cor = alvo === 'dano' ? '#ef4444' : alvo === 'ajuda' ? '#4ade80' : 'transparent';
  return (
    <button
      type="button"
      ref={registrar(`h${lado}`)}
      onClick={onClick}
      aria-label={`${j.nome}: ${Math.max(0, j.vida)} de vida${j.escudo ? `, escudo ${j.escudo}` : ''}`}
      className={`relative flex flex-col items-center ${alvo !== 'nenhum' ? 'arc-alvo' : ''}`}
      style={{ width: 150, opacity: dimmed ? 0.5 : 1, ['--anel' as string]: cor, ['--brilho' as string]: p.brilho }}
    >
      <span className="absolute -top-[28px] left-0 right-0 flex justify-center">
        <FaixaDeStatus s={j.status} tam={12} />
      </span>
      <span className="relative rounded-full p-[3px]" style={{ background: m.moldura, boxShadow: `0 0 0 2px ${cor === 'transparent' ? 'rgba(0,0,0,.7)' : cor}, 0 0 ${ativo ? 22 : 8}px ${p.brilho}` }}>
        <span className="block overflow-hidden rounded-full" style={{ background: p.escura }}>
          <Avatar nome={j.nome} tamanho={58} />
        </span>
        <span className="absolute -bottom-1 -right-1 flex h-[26px] w-[26px] items-center justify-center rounded-full" style={{ background: p.escura, boxShadow: `0 0 0 2px ${m.borda}` }}>
          <Glifo el={j.elemento} style={{ width: 16, height: 16, color: p.clara }} />
        </span>
      </span>
      <span className="fonte-arcana mt-[2px] max-w-[150px] truncate rounded-full px-[10px] py-[1px] text-[12px] font-black" style={{ background: 'rgba(8,5,12,.82)', color: m.texto, boxShadow: `0 0 0 1px ${m.borda}88` }}>
        {j.nome.split(' ')[0]}
      </span>
      <OrbeDeVida vida={j.vida} escudo={j.escudo} el={j.elemento} />
    </button>
  );
});

// ---------------------------------------------------------------------------
// Fonte de mana e pilhas
// ---------------------------------------------------------------------------

function FonteDeMana({ j, mostrarGasto }: { j: Jogador; mostrarGasto: boolean }) {
  const p = ELEMENTOS[j.elemento];
  const total = manaTotal(j);
  const livre = manaDisponivel(j);
  const bloq = Math.min(j.bloq, j.fonte);
  const n = Math.max(j.fonte, total, 1);
  return (
    <span className="flex items-end justify-center gap-[3px]" aria-label={`Mana ${livre} de ${total}`}>
      {Array.from({ length: Math.min(12, n) }, (_, i) => {
        const cheia = i < livre;
        const vazia = i >= livre && i < total;
        const bloqueada = i >= total && i < j.fonte;
        return (
          <span
            key={i}
            className={`relative block ${cheia ? 'arc-gema' : ''}`}
            style={{
              width: 24,
              height: 32,
              clipPath: 'polygon(50% 0, 100% 30%, 82% 100%, 18% 100%, 0 30%)',
              background: cheia ? `linear-gradient(160deg, #fff 0%, ${p.clara} 25%, ${p.brilho} 55%, ${p.cor} 100%)` : vazia ? `linear-gradient(160deg, ${p.escura}, #05030a)` : bloqueada ? '#3b0d0d' : '#1a1320',
              filter: cheia ? `drop-shadow(0 0 5px ${p.brilho})` : undefined,
              opacity: vazia ? 0.85 : 1,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        );
      })}
      {mostrarGasto && (
        <span className="fonte-arcana ml-2 text-[18px] font-black" style={{ color: p.clara, textShadow: '0 2px 4px #000' }}>
          {livre}/{total}
        </span>
      )}
      {bloq > 0 && <span className="ml-1 text-[10px] font-bold text-[#fca5a5]">−{bloq}</span>}
    </span>
  );
}

function Pilhas({ j, registrar, chave }: { j: Jogador; registrar: Registrar; chave: string }) {
  const p = ELEMENTOS[j.elemento];
  const mini = (qtd: number, mana: boolean) => (
    <span className="relative inline-block" style={{ width: 54, height: 76 }}>
      {Array.from({ length: Math.min(4, Math.ceil(qtd / 6)) }, (_, i) => (
        <span key={i} className="absolute" style={{ left: i * 1.5, top: -i * 2 }}>
          <VersoDaCarta largura={54} el={j.elemento} mana={mana} />
        </span>
      ))}
      <span className="fonte-arcana absolute -bottom-1 -right-2 rounded-full px-[6px] py-[1px] text-[12px] font-black" style={{ background: 'rgba(8,5,12,.92)', color: p.clara, boxShadow: `0 0 0 1.5px ${p.clara}` }}>
        {qtd}
      </span>
    </span>
  );
  return (
    <span ref={registrar(chave)} className="flex items-end gap-[14px]">
      {mini(j.baralhoQtd, false)}
      {mini(j.reservaQtd, true)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// A cena
// ---------------------------------------------------------------------------

export interface PropsTabuleiro {
  /** Estado que a mesa exibe agora (campo, vida, escudo e status seguem a animação). */
  exibido: Estado;
  /** Estado verdadeiro (mana e baralhos). */
  estado: Estado;
  baixo: Lado;
  registrar: Registrar;
  alvos: Map<string, 'dano' | 'ajuda'>;
  procurandoAlvo: boolean;
  prontos: Set<string>;
  selecionado: string | null;
  entrando: Set<string>;
  elAtivo: Elemento | null;
  onHeroi: (l: Lado) => void;
  onChar: (id: string) => void;
  largura: number;
  altura: number;
  tremer: number;
}

export const TabuleiroArcanos = memo(function TabuleiroArcanos(props: PropsTabuleiro) {
  const { exibido, estado, baixo, registrar, alvos, procurandoAlvo, prontos, selecionado, entrando, elAtivo, onHeroi, onChar, largura, altura, tremer } = props;
  const L = layoutDoTabuleiro(largura, altura);
  const cima: Lado = baixo === 0 ? 1 : 0;
  const lados: [Lado, boolean][] = [
    [cima, false],
    [baixo, true],
  ];
  const corRunas = elAtivo ? ELEMENTOS[elAtivo].brilho : '#b8a36a';
  return (
    <div className="arc-cena absolute inset-0 overflow-hidden" aria-label="Tabuleiro">
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: L.pw, height: L.ph, marginLeft: -L.pw / 2, marginTop: -L.ph / 2 + L.dy * L.escala, transform: `scale(${L.escala})`, transformOrigin: '50% 50%', perspective: DISTANCIA, perspectiveOrigin: '50% 30%' }}
      >
        <div key={tremer} className={`arc-camera ${tremer ? 'arc-tremer' : ''}`} style={{ ['--tilt' as string]: `${INCLINACAO}deg` }}>
          <div className="arc-plano" style={{ width: L.pw, height: L.ph }}>
            {/* espessura da laje */}
            <div className="arc-borda" />
            {/* anel rúnico central */}
            <svg className="absolute inset-0" viewBox={`0 0 ${L.pw} ${L.ph}`} width={L.pw} height={L.ph} aria-hidden style={{ pointerEvents: 'none' }}>
              <defs>
                <radialGradient id="arc-rg" cx=".5" cy=".5" r=".5">
                  <stop offset="0" stopColor={corRunas} stopOpacity=".28" />
                  <stop offset="1" stopColor={corRunas} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={L.pw / 2} cy={L.ph / 2} r={L.larga ? 230 : 250} fill="url(#arc-rg)" style={{ transition: 'all .6s' }} />
              <g fill="none" stroke={corRunas} style={{ transition: 'stroke .6s' }}>
                <circle cx={L.pw / 2} cy={L.ph / 2} r={172} strokeWidth="3" opacity=".75" />
                <circle cx={L.pw / 2} cy={L.ph / 2} r="150" strokeWidth="1.4" opacity=".5" strokeDasharray="3 9" />
                <circle cx={L.pw / 2} cy={L.ph / 2} r="108" strokeWidth="2" opacity=".6" />
                <path d={`M${L.pw / 2} ${L.ph / 2 - 172} L${L.pw / 2 + 149} ${L.ph / 2 + 86} L${L.pw / 2 - 149} ${L.ph / 2 + 86}Z M${L.pw / 2} ${L.ph / 2 + 172} L${L.pw / 2 + 149} ${L.ph / 2 - 86} L${L.pw / 2 - 149} ${L.ph / 2 - 86}Z`} strokeWidth="1.6" opacity=".4" />
                <path d={`M20 ${L.ph / 2} H${L.pw - 20}`} strokeWidth="1.2" opacity=".35" strokeDasharray="2 10" />
              </g>
              {ELEMENTOS_ORDEM.map((el, i) => {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = L.pw / 2 + Math.cos(a) * 172;
                const y = L.ph / 2 + Math.sin(a) * 172;
                const ativo = el === elAtivo;
                return (
                  <g key={el} transform={`translate(${x} ${y})`}>
                    <circle r="26" fill="#0b0712" stroke={ELEMENTOS[el].brilho} strokeWidth={ativo ? 4 : 2} opacity={ativo ? 1 : 0.7} style={{ filter: ativo ? `drop-shadow(0 0 16px ${ELEMENTOS[el].brilho})` : undefined, transition: 'all .5s' }} />
                    <g transform="translate(-15 -15) scale(1.25)" style={{ color: ELEMENTOS[el].clara, opacity: ativo ? 1 : 0.55, transition: 'opacity .5s' }}>
                      <GlifoSvg el={el} />
                    </g>
                  </g>
                );
              })}
            </svg>

            {lados.map(([l, ehBaixo]) => {
              const j = exibido.jogadores[l];
              const real = estado.jogadores[l];
              const Y = ehBaixo ? L.baixo : L.cima;
              const alvoHeroi = alvos.get(`h${l}`) ?? 'nenhum';
              const cor = ELEMENTOS[j.elemento].brilho;
              return (
                <React.Fragment key={l}>
                  {/* altar */}
                  <div className="arc-altar" style={{ left: Y.heroi.x, top: Y.heroi.y, ['--c' as string]: cor, ['--a' as string]: exibido.ativo === l ? 1 : 0.35, ['--tam' as string]: L.larga ? '200px' : '250px' }} />
                  {/* pedestais */}
                  {L.slotX.map((x, i) => (
                    <div key={i} className="arc-pedestal" style={{ left: x, top: Y.slotY, ['--c' as string]: cor }} />
                  ))}
                  {/* herói */}
                  <Em x={Y.heroi.x} y={Y.heroi.y + 22} z={3}>
                    <Heroi j={j} lado={l} registrar={registrar} onClick={() => onHeroi(l)} alvo={alvoHeroi} dimmed={procurandoAlvo && alvoHeroi === 'nenhum'} ativo={exibido.ativo === l} />
                  </Em>
                  {/* mana */}
                  <Em x={Y.mana.x} y={Y.mana.y} z={2}>
                    <FonteDeMana j={real} mostrarGasto={ehBaixo} />
                  </Em>
                  {/* pilhas */}
                  <Em x={Y.pilha.x} y={Y.pilha.y + 22} z={2}>
                    <Pilhas j={real} registrar={registrar} chave={`p${l}`} />
                  </Em>
                  {/* personagens */}
                  {j.campo.map((p, i) => {
                    const alvo = alvos.get(`c:${p.id}`) ?? 'nenhum';
                    return (
                      <Em key={p.id} x={L.slotX[i] ?? L.slotX[3]} y={Y.slotY + 40} z={4}>
                        <Ficha
                          p={p}
                          registrar={registrar}
                          onClick={() => onChar(p.id)}
                          alvo={alvo}
                          dimmed={procurandoAlvo && alvo === 'nenhum'}
                          pronto={prontos.has(p.id)}
                          selecionada={selecionado === p.id}
                          entrando={entrando.has(p.id)}
                          dono={ehBaixo ? 'eu' : 'ele'}
                        />
                      </Em>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

/** Um elemento em pé sobre o ponto (x, y) da laje: o pé fica no ponto e a figura encara a câmera. */
function Em({ x, y, z, children }: { x: number; y: number; z: number; children: React.ReactNode }) {
  return (
    <div className="arc-ponto" style={{ left: x, top: y, zIndex: z }}>
      <div className="arc-em-pe">{children}</div>
    </div>
  );
}

function GlifoSvg({ el }: { el: Elemento }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" overflow="visible">
      <GlifoCaminho el={el} />
    </svg>
  );
}

function GlifoCaminho({ el }: { el: Elemento }) {
  switch (el) {
    case 'fogo':
      return <path d="M12 2 C13 7 18 9 18 15 A6 6 0 0 1 6 15 C6 11 9 10 9 6 C10 7 11 7.5 12 2Z" fill="currentColor" />;
    case 'agua':
      return <path d="M12 2 C16 8 19 11 19 15 A7 7 0 0 1 5 15 C5 11 8 8 12 2Z" fill="currentColor" />;
    case 'terra':
      return <path d="M2 20 L9 7 L13 13 L16 9 L22 20Z" fill="currentColor" />;
    case 'ar':
      return <path d="M3 8 H14 a3 3 0 1 0 -3 -3 M3 13 H18 a3 3 0 1 1 -3 3 M3 18 H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />;
    case 'luz':
      return (
        <g fill="currentColor">
          <circle cx="12" cy="12" r="4.4" />
          {Array.from({ length: 8 }, (_, i) => (
            <polygon key={i} points="12,1.5 13.4,6 10.6,6" transform={`rotate(${i * 45} 12 12)`} />
          ))}
        </g>
      );
    case 'escuridao':
      return <path d="M20 14.5 A9 9 0 1 1 9.5 4 A7 7 0 0 0 20 14.5Z" fill="currentColor" />;
  }
}
