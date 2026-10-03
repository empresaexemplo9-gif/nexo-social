'use client';

import React, { memo, useId } from 'react';
import { ArteDaCarta, ArteDaMana, Glifo } from './ArteArcanos';
import {
  carta as definicao,
  cartaDeMana,
  dadosTexto,
  ELEMENTOS,
  emblemaDe,
  PALAVRAS,
  textoDaCarta,
  type Carta,
  type Dados,
  type Efeito,
  type Elemento,
  type Faces,
} from '@/lib/jogos/arcanos/cartas';
import { vidaDoChar, ataqueDoChar, type Personagem } from '@/lib/jogos/arcanos/motor';

// A moldura das cartas do Arcanos: metal lavrado na cor do elemento, janela de
// arte pintada, gema de custo, placa de dados e uma faixa de raridade. Tudo
// escala a partir da largura (1em = largura/12).

const OURO = '#e0b84a';

export const METAL: Record<Elemento, { moldura: string; borda: string; placa: string; texto: string }> = {
  fogo: { moldura: 'linear-gradient(145deg,#ffd9a0 0%,#c8641c 22%,#5a1a06 48%,#e88a34 74%,#7a2a08 100%)', borda: '#ffb454', placa: 'linear-gradient(180deg,#4a1708,#1c0603)', texto: '#ffe9c9' },
  agua: { moldura: 'linear-gradient(145deg,#f1fbff 0%,#7fc4ea 24%,#0f4d7e 50%,#9fdcf6 76%,#124a74 100%)', borda: '#7fd9ff', placa: 'linear-gradient(180deg,#0a3558,#031526)', texto: '#e3f6ff' },
  terra: { moldura: 'linear-gradient(145deg,#f0e0b8 0%,#a78548 24%,#3c2a12 50%,#c7a964 76%,#4f3a1b 100%)', borda: '#c8dc7a', placa: 'linear-gradient(180deg,#3a2a14,#150e06)', texto: '#f7ecd0' },
  ar: { moldura: 'linear-gradient(145deg,#f4fffb 0%,#9de9d3 24%,#13705f 50%,#baf6e4 76%,#175f52 100%)', borda: '#aaffe4', placa: 'linear-gradient(180deg,#0b4a42,#031a17)', texto: '#e8fff7' },
  luz: { moldura: 'linear-gradient(145deg,#fffbe0 0%,#f3cf5a 24%,#8a5a07 50%,#ffe48a 76%,#9a6a0c 100%)', borda: '#fff1a8', placa: 'linear-gradient(180deg,#6a4706,#2a1a02)', texto: '#fff8dc' },
  escuridao: { moldura: 'linear-gradient(145deg,#d9c3ff 0%,#7a45c8 24%,#1c0b3a 50%,#9d6bf0 76%,#2a1252 100%)', borda: '#b57cff', placa: 'linear-gradient(180deg,#2a1052,#0a0418)', texto: '#efe3ff' },
};

const RARIDADE_COR: Record<Carta['raridade'], string> = { comum: '#cbd5e1', rara: '#60a5fa', epica: '#c084fc', lendaria: '#fbbf24' };
const RARIDADE_N: Record<Carta['raridade'], number> = { comum: 1, rara: 2, epica: 3, lendaria: 4 };

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

const FORMAS: Record<Faces, { poly?: string; rect?: boolean; facetas: string }> = {
  3: { poly: '50,94 6,18 94,18', facetas: 'M50 94 L50 44 M6 18 L50 44 L94 18' },
  4: { poly: '50,5 95,90 5,90', facetas: 'M50 5 L50 62 M5 90 L50 62 L95 90' },
  6: { rect: true, facetas: 'M10 28 L34 10 M90 28 L66 10 M10 72 L34 90 M90 72 L66 90' },
  8: { poly: '50,3 95,50 50,97 5,50', facetas: 'M5 50 H95 M50 3 V97' },
  10: { poly: '50,3 92,38 50,97 8,38', facetas: 'M8 38 H92 M50 3 L50 97 M30 38 L50 97 L70 38' },
  12: { poly: '50,4 96,37 78,92 22,92 4,37', facetas: 'M50 4 L50 28 M96 37 L72 44 M78 92 L64 70 M22 92 L36 70 M4 37 L28 44 M28 44 L50 28 L72 44 L64 70 L36 70Z' },
  20: { poly: '50,3 93,27 93,73 50,97 7,73 7,27', facetas: 'M50 3 L50 30 M93 27 L70 42 M93 73 L70 62 M50 97 L50 72 M7 73 L30 62 M7 27 L30 42 M30 42 L70 42 L50 72Z' },
};

/** O dado desenhado: formato conforme as faces; com `valor`, mostra o número sorteado. */
export const IconeDado = memo(function IconeDado({
  faces,
  tamanho = 28,
  valor,
  cor = '#e8d6a8',
  borda = '#6b4a14',
  texto = '#2a1a05',
  className,
  style,
}: {
  faces: Faces;
  tamanho?: number | string;
  valor?: number | string;
  cor?: string;
  borda?: string;
  texto?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fm = FORMAS[faces];
  const rotulo = valor ?? faces;
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id={`d${id}`} cx=".35" cy=".28" r=".85">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".35" stopColor={cor} />
          <stop offset="1" stopColor={borda} />
        </radialGradient>
      </defs>
      {fm.rect ? (
        <rect x="8" y="8" width="84" height="84" rx="16" fill={`url(#d${id})`} stroke={borda} strokeWidth="5" />
      ) : (
        <polygon points={fm.poly} fill={`url(#d${id})`} stroke={borda} strokeWidth="5" strokeLinejoin="round" />
      )}
      <path d={fm.facetas} stroke={borda} strokeOpacity=".5" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <text x="50" y={faces === 4 ? 70 : faces === 3 ? 46 : 58} textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="900" fontSize={String(rotulo).length > 1 ? 34 : 42} fill={texto} stroke="#fff" strokeOpacity=".4" strokeWidth=".8">
        {rotulo}
      </text>
    </svg>
  );
});

/** "2d6": o dado e a conta, para legendas. */
export function ChipDeDados({ d, tamanho = '1.5em', el }: { d: Dados; tamanho?: string; el?: Elemento }) {
  const m = el ? METAL[el] : null;
  return (
    <span className="inline-flex items-center gap-[0.25em] align-middle">
      <IconeDado faces={d.f} tamanho={tamanho} cor={m ? ELEMENTOS[el!].clara : undefined} borda={m ? ELEMENTOS[el!].escura : undefined} texto={m ? ELEMENTOS[el!].escura : undefined} />
      <span className="fonte-arcana font-black">{dadosTexto(d)}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Resumo (as pílulas de efeito usadas em cartas pequenas)
// ---------------------------------------------------------------------------

type Pilula = { rotulo: string; cor: string; d?: Dados };

export function pilulasDoEfeito(ef: Efeito): Pilula | null {
  switch (ef.e) {
    case 'dano':
      return { rotulo: ef.alvo === 'chars-inimigos' ? 'Dano em área' : 'Dano', cor: '#ef4444', d: ef.d };
    case 'drenar':
      return { rotulo: 'Dreno', cor: '#c026d3', d: ef.d };
    case 'cura':
      return { rotulo: 'Cura', cor: '#22c55e', d: ef.d };
    case 'escudo':
      return { rotulo: 'Escudo', cor: '#38bdf8', d: ef.d };
    case 'amplificar':
      return { rotulo: 'Bônus', cor: '#f59e0b', d: ef.d };
    case 'dot':
      return { rotulo: `Contínuo ${ef.turnos}t`, cor: '#f97316', d: ef.d };
    case 'regenerar':
      return { rotulo: `Regen ${ef.turnos}t`, cor: '#4ade80', d: ef.d };
    case 'enfraquecer':
      return { rotulo: 'Enfraquece', cor: '#a78bfa', d: ef.d };
    case 'silenciar':
      return { rotulo: `Silêncio ${ef.turnos}t`, cor: '#94a3b8' };
    case 'atordoar':
      return { rotulo: `Atordoa ${ef.turnos}t`, cor: '#facc15' };
    case 'esquiva':
      return { rotulo: 'Esquiva', cor: '#2dd4bf' };
    case 'purificar':
      return { rotulo: 'Purifica', cor: '#fde68a' };
    case 'dissipar':
      return { rotulo: 'Dissipa', cor: '#fb7185' };
    case 'comprar':
      return { rotulo: `Compra ${ef.n}`, cor: '#60a5fa' };
    case 'mana':
      return { rotulo: `+${ef.n} mana`, cor: '#22d3ee' };
    case 'drenarMana':
      return { rotulo: `−${ef.n} mana`, cor: '#e879f9' };
    case 'ressuscitar':
      return { rotulo: 'Revive', cor: '#fbbf24' };
  }
}

const NOME_DO_TIPO: Record<string, string> = {
  ataque: 'Ataque',
  area: 'Ataque em área',
  drenar: 'Ataque vampírico',
  cura: 'Cura',
  escudo: 'Escudo',
  amplificar: 'Amplificação',
  dot: 'Dano contínuo',
  silencio: 'Silêncio',
  atordoar: 'Controle',
  enfraquecer: 'Maldição',
  esquiva: 'Proteção',
  purificar: 'Purificação',
  dissipar: 'Dissipação',
  comprar: 'Conhecimento',
  mana: 'Mana',
  ressuscitar: 'Ressurreição',
};
const NOME_DO_ARQUETIPO = { guerreiro: 'Guerreiro', mago: 'Conjurador', fera: 'Fera', espirito: 'Espírito', colosso: 'Colosso' } as const;

export const tipoDaCarta = (c: Carta) => (c.tipo === 'personagem' ? `Personagem · ${NOME_DO_ARQUETIPO[c.arquetipo!]}` : `Feitiço · ${NOME_DO_TIPO[emblemaDe(c)]}`);

// ---------------------------------------------------------------------------
// Gemas e placas
// ---------------------------------------------------------------------------

/** A gema de mana: o número em cima do cristal do elemento. */
export function GemaDeMana({ valor, el, tamanho = '1.9em', apagada = false }: { valor: number | string; el: Elemento; tamanho?: string; apagada?: boolean }) {
  const p = ELEMENTOS[el];
  return (
    <span
      className="fonte-arcana relative inline-flex shrink-0 items-center justify-center rounded-full font-black text-white"
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: `calc(${tamanho} * 0.54)`,
        background: apagada ? 'radial-gradient(circle at 35% 30%, #94a3b8, #334155 70%)' : `radial-gradient(circle at 35% 28%, #ffffff 0%, ${p.clara} 18%, ${p.brilho} 42%, ${p.cor} 68%, ${p.escura} 100%)`,
        boxShadow: `0 0 0 2px ${OURO}, 0 0 0 3px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.55), inset 0 -3px 6px rgba(0,0,0,.35)`,
        textShadow: '0 1px 2px rgba(0,0,0,.9), 0 0 6px rgba(0,0,0,.6)',
      }}
    >
      {valor}
    </span>
  );
}

function Pecas({ n, cor }: { n: number; cor: string }) {
  return (
    <span className="inline-flex gap-[0.2em]" aria-label={`raridade ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ width: '0.55em', height: '0.55em', background: cor, transform: 'rotate(45deg)', boxShadow: `0 0 0.5em ${cor}, inset 0 0 0 1px rgba(255,255,255,.6)` }} />
      ))}
    </span>
  );
}

/** O texto de regras, com as palavras-chave em negrito. */
function Regras({ c, palavras }: { c: Carta; palavras: boolean }) {
  const nomes = Object.values(PALAVRAS).map((p) => p.nome);
  const esc = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(`(${['Ao entrar:', 'Ao morrer:', 'No início do seu turno:', ...nomes].map(esc).join('|')})`, 'g');
  return (
    <>
      {textoDaCarta(c).slice(palavras ? 0 : c.palavras?.length ?? 0).map((l, i) => (
        <p key={i} className="leading-[1.2]">
          {l.split(rx).map((p, k) => (k % 2 ? <b key={k}>{p}</b> : <React.Fragment key={k}>{p}</React.Fragment>))}
        </p>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// A carta inteira
// ---------------------------------------------------------------------------

interface PropsCarta {
  id: string;
  largura?: number;
  onClick?: () => void;
  desabilitada?: boolean;
  destaque?: boolean;
  selecionada?: boolean;
  titulo?: string;
  /** Mostra o texto de regras (por padrão, só em cartas de 150px ou mais). */
  detalhes?: boolean;
  className?: string;
}

export const CartaGrande = memo(function CartaGrande({ id, largura = 176, onClick, desabilitada = false, destaque = false, selecionada = false, titulo, detalhes, className = '' }: PropsCarta) {
  const c = definicao(id);
  const p = ELEMENTOS[c.el];
  const m = METAL[c.el];
  const Tag = onClick ? 'button' : 'div';
  const completo = detalhes ?? largura >= 150;
  const pilulas = c.efeitos.map(pilulasDoEfeito).filter((x): x is Pilula => Boolean(x));
  const lendaria = c.raridade === 'lendaria';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={titulo}
      aria-label={onClick ? `${c.nome}, custo ${c.custo}${c.tipo === 'personagem' ? `, ataque ${dadosTexto(c.ataque!)}, vida ${c.vida}` : ''}` : undefined}
      className={`relative block shrink-0 select-none rounded-[0.95em] text-left transition duration-200 ${lendaria ? 'arc-foil' : ''} ${onClick ? 'hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:outline-none' : ''} ${desabilitada ? 'opacity-60 saturate-50' : ''} ${className}`}
      style={{
        width: largura,
        aspectRatio: '5 / 7',
        fontSize: largura / 12,
        padding: '0.3em',
        background: m.moldura,
        boxShadow: selecionada
          ? `0 0 0 2px #fff, 0 0 26px 6px ${p.brilho}, 0 12px 26px rgba(0,0,0,.6)`
          : destaque
            ? `0 0 0 2px ${OURO}, 0 0 22px 4px ${p.brilho}, 0 10px 24px rgba(0,0,0,.55)`
            : `0 0 0 1px rgba(0,0,0,.6), 0 8px 18px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.35)`,
        transform: selecionada ? 'translateY(-0.6em) scale(1.04)' : undefined,
      }}
    >
      <span
        className="relative flex h-full flex-col overflow-hidden rounded-[0.7em]"
        style={{ background: `linear-gradient(180deg, ${p.escura} 0%, #0a0710 70%, #050308 100%)`, boxShadow: `inset 0 0 0 0.1em ${m.borda}88, inset 0 0 1.2em rgba(0,0,0,.7)` }}
      >
        {/* Nome */}
        <span className="relative z-10 flex items-center gap-[0.3em] px-[0.4em] pb-[0.2em] pt-[0.35em]">
          <GemaDeMana valor={c.custo} el={c.el} tamanho="1.9em" />
          <span className="fonte-arcana min-w-0 flex-1 truncate font-black leading-none" style={{ color: m.texto, fontSize: c.nome.length > 17 ? '0.7em' : c.nome.length > 13 ? '0.8em' : '0.88em', textShadow: '0 1px 2px rgba(0,0,0,.9)' }}>
            {c.nome}
          </span>
          <Glifo el={c.el} className="shrink-0" style={{ width: '1.25em', height: '1.25em', color: p.clara, filter: `drop-shadow(0 0 3px ${p.brilho})` }} />
        </span>

        {/* Arte */}
        <span className="relative mx-[0.35em] block overflow-hidden rounded-[0.35em]" style={{ height: completo ? '40%' : '47%', boxShadow: `0 0 0 0.1em ${m.borda}, 0 0 0 0.16em rgba(0,0,0,.6), inset 0 0 1em rgba(0,0,0,.7)` }}>
          <ArteDaCarta id={id} className="block h-full w-full" />
          {c.tipo === 'personagem' && (
            <span className="absolute inset-x-0 bottom-0 flex justify-center gap-[0.3em] pb-[0.2em]">
              {c.palavras?.slice(0, 3).map((w) => (
                <span key={w} className="fonte-arcana rounded-full px-[0.5em] py-[0.05em] text-[0.55em] font-black uppercase tracking-wider" style={{ background: 'rgba(0,0,0,.65)', color: p.clara, boxShadow: `0 0 0 1px ${m.borda}99` }}>
                  {PALAVRAS[w].nome}
                </span>
              ))}
            </span>
          )}
        </span>

        {/* Linha de tipo */}
        <span className="relative z-10 flex items-center justify-between px-[0.5em] pt-[0.25em]">
          <span className="fonte-arcana truncate text-[0.56em] font-bold uppercase tracking-[0.06em]" style={{ color: p.clara }}>
            {tipoDaCarta(c)}
          </span>
          <Pecas n={RARIDADE_N[c.raridade]} cor={RARIDADE_COR[c.raridade]} />
        </span>

        {/* Texto */}
        <span className="relative z-10 mx-[0.35em] mt-[0.25em] flex min-h-0 flex-1 flex-col justify-center gap-[0.18em] overflow-hidden rounded-[0.4em] px-[0.5em] py-[0.3em] text-[0.58em]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.07), rgba(0,0,0,.35))', color: m.texto, boxShadow: `inset 0 0 0 1px ${m.borda}44` }}>
          {completo ? (
            <>
              <Regras c={c} palavras={largura >= 290} />
              {c.sabor && <p className="mt-[0.2em] italic opacity-70" style={{ fontFamily: "'IM Fell English', Georgia, serif", fontSize: '0.92em' }}>“{c.sabor}”</p>}
            </>
          ) : (
            <span className="flex flex-wrap items-center justify-center gap-[0.35em]">
              {pilulas.slice(0, 3).map((x, i) => (
                <span key={i} className="fonte-arcana inline-flex items-center gap-[0.25em] rounded-full px-[0.5em] py-[0.1em] font-black" style={{ background: `${x.cor}33`, boxShadow: `0 0 0 1px ${x.cor}`, fontSize: '1.02em' }}>
                  {x.d && <IconeDado faces={x.d.f} tamanho="1.3em" />}
                  <span>{x.d ? dadosTexto(x.d) : x.rotulo}</span>
                </span>
              ))}
              {c.tipo === 'personagem' && c.entrada && <span className="fonte-arcana opacity-80">+ entrada</span>}
            </span>
          )}
        </span>

        {/* Rodapé */}
        <span className="relative z-10 flex items-center justify-between px-[0.4em] pb-[0.35em] pt-[0.3em]">
          {c.tipo === 'personagem' ? (
            <>
              <Placa icone="ataque" el={c.el}>
                <IconeDado faces={c.ataque!.f} tamanho="1.35em" cor={p.clara} borda={p.escura} texto={p.escura} />
                {dadosTexto(c.ataque!)}
              </Placa>
              <Placa icone="vida" el={c.el}>
                <span style={{ color: '#fca5a5' }}>♥</span>
                {c.vida}
              </Placa>
            </>
          ) : (
            <span className="fonte-arcana mx-auto text-[0.55em] font-bold uppercase tracking-[0.3em]" style={{ color: `${p.clara}aa` }}>
              {p.nome}
            </span>
          )}
        </span>
      </span>
    </Tag>
  );
});

function Placa({ children, el }: { children: React.ReactNode; icone: 'ataque' | 'vida'; el: Elemento }) {
  const m = METAL[el];
  return (
    <span className="fonte-arcana inline-flex items-center gap-[0.3em] rounded-[0.5em] px-[0.55em] py-[0.12em] text-[0.8em] font-black" style={{ background: m.placa, color: m.texto, boxShadow: `0 0 0 1.5px ${m.borda}, 0 2px 4px rgba(0,0,0,.6)` }}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Carta de mana e verso
// ---------------------------------------------------------------------------

export const CartaDeManaGrande = memo(function CartaDeManaGrande({
  id,
  largura = 96,
  onClick,
  destaque = false,
  desabilitada = false,
  selecionada = false,
  className = '',
}: {
  id: string;
  largura?: number;
  onClick?: () => void;
  destaque?: boolean;
  desabilitada?: boolean;
  selecionada?: boolean;
  className?: string;
}) {
  const mana = cartaDeMana(id);
  const p = ELEMENTOS[mana.el];
  const m = METAL[mana.el];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={`${mana.nome}, mana ${mana.valor}`}
      className={`relative block shrink-0 select-none rounded-[0.95em] text-left transition duration-200 ${onClick ? 'hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:outline-none' : ''} ${desabilitada ? 'opacity-55 saturate-50' : ''} ${className}`}
      style={{
        width: largura,
        aspectRatio: '5 / 7',
        fontSize: largura / 12,
        padding: '0.3em',
        background: m.moldura,
        boxShadow: selecionada ? `0 0 0 2px #fff, 0 0 24px 5px ${p.brilho}` : destaque ? `0 0 0 2px ${OURO}, 0 0 20px 4px ${p.brilho}` : '0 0 0 1px rgba(0,0,0,.6), 0 8px 16px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.35)',
        transform: selecionada ? 'translateY(-0.6em) scale(1.04)' : undefined,
      }}
    >
      <span className="relative flex h-full flex-col overflow-hidden rounded-[0.7em]" style={{ background: `linear-gradient(180deg, ${p.escura}, #050308)`, boxShadow: `inset 0 0 0 0.1em ${m.borda}88` }}>
        <span className="fonte-arcana px-[0.5em] pt-[0.45em] text-center text-[0.78em] font-black leading-tight" style={{ color: m.texto }}>
          {mana.nome}
        </span>
        <span className="relative mx-[0.35em] mt-[0.3em] block flex-1 overflow-hidden rounded-[0.4em]" style={{ boxShadow: `0 0 0 0.1em ${m.borda}, inset 0 0 1em rgba(0,0,0,.7)` }}>
          <ArteDaMana el={mana.el} valor={mana.valor} className="block h-full w-full" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <GemaDeMana valor={`+${mana.valor}`} el={mana.el} tamanho="2.6em" />
          </span>
        </span>
        <span className="fonte-arcana px-[0.4em] pb-[0.4em] pt-[0.3em] text-center text-[0.55em] font-bold uppercase tracking-[0.2em]" style={{ color: p.clara }}>
          Mana de {p.nome}
        </span>
      </span>
    </Tag>
  );
});

/** O verso: a carta de baixo do baralho (cor do elemento) ou da reserva de mana. */
export function VersoDaCarta({ largura = 64, el = 'luz', mana = false, className = '', style }: { largura?: number; el?: Elemento; mana?: boolean; className?: string; style?: React.CSSProperties }) {
  const p = ELEMENTOS[el];
  const m = METAL[el];
  return (
    <span
      aria-hidden
      className={`relative block shrink-0 rounded-[0.95em] ${className}`}
      style={{ width: largura, aspectRatio: '5 / 7', fontSize: largura / 12, padding: '0.3em', background: m.moldura, boxShadow: '0 0 0 1px rgba(0,0,0,.6), 0 6px 14px rgba(0,0,0,.5)', ...style }}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-[0.7em]"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${p.cor} 0%, ${p.escura} 62%, #040207 100%)`,
          boxShadow: `inset 0 0 0 0.12em ${m.borda}88`,
          backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 1px, transparent 1px 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,.05) 0 1px, transparent 1px 8px), radial-gradient(circle at 50% 45%, ${p.cor} 0%, ${p.escura} 62%, #040207 100%)`,
        }}
      >
        {mana ? (
          <svg viewBox="0 0 24 24" style={{ width: '56%', height: '56%', filter: `drop-shadow(0 0 4px ${p.brilho})` }}>
            <polygon points="12,2 19,8 17,19 12,22 7,19 5,8" fill={p.clara} opacity=".9" />
            <polygon points="12,2 19,8 12,11 5,8" fill="#fff" opacity=".6" />
          </svg>
        ) : (
          <Glifo el={el} style={{ width: '58%', height: '58%', color: p.clara, filter: `drop-shadow(0 0 5px ${p.brilho})` }} />
        )}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pílulas de status (usadas no tabuleiro)
// ---------------------------------------------------------------------------

export function statusDoPersonagem(p: Personagem): { chave: string; rotulo: string; cor: string }[] {
  const s = p.status;
  const r: { chave: string; rotulo: string; cor: string }[] = [];
  if (s.silencio > 0) r.push({ chave: 'sil', rotulo: 'Silêncio', cor: '#94a3b8' });
  if (s.atordoado > 0) r.push({ chave: 'atd', rotulo: 'Atordoado', cor: '#facc15' });
  if (s.esquiva) r.push({ chave: 'esq', rotulo: 'Esquiva', cor: '#2dd4bf' });
  if (s.dots.length) r.push({ chave: 'dot', rotulo: 'Dano contínuo', cor: '#f97316' });
  if (s.regens.length) r.push({ chave: 'reg', rotulo: 'Regeneração', cor: '#4ade80' });
  if (s.ampls.length) r.push({ chave: 'amp', rotulo: 'Amplificado', cor: '#f59e0b' });
  if (s.fracos.length) r.push({ chave: 'fra', rotulo: 'Enfraquecido', cor: '#a78bfa' });
  return r;
}

export { vidaDoChar, ataqueDoChar };
