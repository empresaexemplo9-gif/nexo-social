'use client';

import React, { memo, useId } from 'react';
import { carta, ELEMENTOS, emblemaDe, type Carta, type Elemento, type Emblema } from '@/lib/jogos/arcanos/cartas';

// A arte do Arcanos é desenhada por código: cada carta é uma pintura em
// camadas (cenário do elemento → emblema do efeito ou retrato do personagem →
// brilho, névoa e grão). Nada vem de imagens externas, então escala com nitidez
// em qualquer tamanho e cada elemento mantém a sua luz própria.

type Pal = (typeof ELEMENTOS)[Elemento];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type R = () => number;

/** Onda senoidal fechada embaixo (para o mar). */
function onda(y: number, amp: number, freq: number, fase: number, w = 200, h = 140) {
  let d = `M0 ${h} L0 ${y}`;
  for (let x = 0; x <= w; x += 4) d += ` L${x} ${(y + Math.sin(x * freq + fase) * amp + Math.sin(x * freq * 2.3 + fase * 1.7) * amp * 0.35).toFixed(2)}`;
  return `${d} L${w} ${h} Z`;
}
function linhaOnda(y: number, amp: number, freq: number, fase: number, w = 200) {
  let d = '';
  for (let x = 0; x <= w; x += 4) d += `${x === 0 ? 'M' : 'L'}${x} ${(y + Math.sin(x * freq + fase) * amp + Math.sin(x * freq * 2.3 + fase * 1.7) * amp * 0.35).toFixed(2)} `;
  return d;
}

// ---------------------------------------------------------------------------
// Definições compartilhadas (gradientes e filtros)
// ---------------------------------------------------------------------------

function Defs({ u, p }: { u: string; p: Pal }) {
  return (
    <defs>
      <radialGradient id={`${u}hl`}>
        <stop offset="0" stopColor={p.brilho} stopOpacity=".95" />
        <stop offset=".45" stopColor={p.brilho} stopOpacity=".35" />
        <stop offset="1" stopColor={p.brilho} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}b1`} cx=".36" cy=".3" r=".8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".22" stopColor={p.clara} />
        <stop offset=".55" stopColor={p.brilho} />
        <stop offset=".85" stopColor={p.cor} />
        <stop offset="1" stopColor={p.escura} />
      </radialGradient>
      <linearGradient id={`${u}lin`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={p.escura} />
        <stop offset=".35" stopColor={p.cor} />
        <stop offset=".7" stopColor={p.brilho} />
        <stop offset="1" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id={`${u}linv`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={p.clara} />
        <stop offset=".45" stopColor={p.cor} />
        <stop offset="1" stopColor={p.escura} />
      </linearGradient>
      <linearGradient id={`${u}tr`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor={p.brilho} stopOpacity=".9" />
        <stop offset="1" stopColor={p.brilho} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${u}pet`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".45" stopColor={p.clara} />
        <stop offset="1" stopColor={p.brilho} />
      </linearGradient>
      <linearGradient id={`${u}fig`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={p.cor} />
        <stop offset=".55" stopColor={p.escura} />
        <stop offset="1" stopColor="#050203" />
      </linearGradient>
      <linearGradient id={`${u}met`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f4f4f5" />
        <stop offset=".3" stopColor={p.clara} />
        <stop offset=".6" stopColor={p.cor} />
        <stop offset="1" stopColor={p.escura} />
      </linearGradient>
      <radialGradient id={`${u}vg`} cx=".5" cy=".5" r=".75">
        <stop offset=".55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".72" />
      </radialGradient>
      <filter id={`${u}gl`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`${u}gs`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.1" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`${u}bl`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <filter id={`${u}bl2`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
      <filter id={`${u}gr`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.18" />
      </filter>
      <filter id={`${u}tx`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".035 .09" numOctaves="3" seed="3" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -.35" />
      </filter>
    </defs>
  );
}

const f = (u: string, k: string) => `url(#${u}${k})`;

// ---------------------------------------------------------------------------
// Cenários
// ---------------------------------------------------------------------------

function Estrelas({ seed, n, cor = '#fff', alt = 70 }: { seed: number; n: number; cor?: string; alt?: number }) {
  const r = rng(seed);
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={r() * 200} cy={r() * alt} r={0.4 + r() * 0.9} fill={cor} opacity={0.35 + r() * 0.6} />
      ))}
    </>
  );
}

function Brasas({ seed, n, p, u, y0 = 140 }: { seed: number; n: number; p: Pal; u: string; y0?: number }) {
  const r = rng(seed);
  return (
    <g filter={`url(#${u}gs)`}>
      {Array.from({ length: n }, (_, i) => {
        const x = r() * 200;
        const y = y0 - r() * y0 * 0.9;
        return <circle key={i} cx={x} cy={y} r={0.6 + r() * 1.5} fill={r() > 0.5 ? p.clara : p.brilho} opacity={0.5 + r() * 0.5} />;
      })}
    </g>
  );
}

function Cenario({ el, u, seed }: { el: Elemento; u: string; seed: number }) {
  const r = rng(seed);
  const p = ELEMENTOS[el];
  const sombra = (op: number) => <rect width="200" height="140" fill="#000" opacity={op} />;
  switch (el) {
    case 'fogo':
      return (
        <g>
          <defs>
            <linearGradient id={`${u}cf`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d0201" />
              <stop offset=".4" stopColor="#4d1005" />
              <stop offset=".72" stopColor="#c43a10" />
              <stop offset="1" stopColor="#ff9a3c" />
            </linearGradient>
            <linearGradient id={`${u}vol`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b120a" />
              <stop offset="1" stopColor="#0a0302" />
            </linearGradient>
            <radialGradient id={`${u}cr`}>
              <stop offset="0" stopColor="#fff2b0" />
              <stop offset=".4" stopColor="#ff8a2a" />
              <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="140" fill={f(u, 'cf')} />
          <ellipse cx="100" cy="96" rx="110" ry="60" fill={f(u, 'hl')} opacity=".85" />
          <g filter={f(u, 'bl')} opacity=".7">
            <ellipse cx="40" cy="22" rx="46" ry="12" fill="#1a0504" />
            <ellipse cx="150" cy="30" rx="56" ry="14" fill="#220806" />
            <ellipse cx="100" cy="14" rx="70" ry="9" fill="#120302" />
          </g>
          <path d="M-5 140 L-5 108 L38 96 L66 78 L84 54 L96 46 L104 46 L116 54 L134 78 L162 94 L205 104 L205 140Z" fill={f(u, 'vol')} />
          <ellipse cx="100" cy="47" rx="17" ry="6" fill={f(u, 'cr')} filter={f(u, 'gl')} />
          <g fill="none" strokeLinecap="round" filter={f(u, 'gl')}>
            <path d="M98 50 C92 66 106 76 90 94 S98 118 86 140" stroke="#ffb454" strokeWidth="2.6" />
            <path d="M104 50 C112 64 100 78 118 92 S112 118 124 140" stroke="#ff7a2e" strokeWidth="2.2" />
            <path d="M60 100 C70 108 66 120 76 140" stroke="#ff9a3c" strokeWidth="1.6" opacity=".8" />
          </g>
          <Brasas seed={seed + 1} n={34} p={p} u={u} y0={120} />
          {sombra(0)}
        </g>
      );
    case 'agua':
      return (
        <g>
          <defs>
            <linearGradient id={`${u}ca`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#020d1c" />
              <stop offset=".35" stopColor="#0b3d6b" />
              <stop offset=".52" stopColor="#4cc4f0" />
              <stop offset=".53" stopColor="#0a4a7a" />
              <stop offset="1" stopColor="#031427" />
            </linearGradient>
            <radialGradient id={`${u}lua`}>
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".6" stopColor="#bfeeff" />
              <stop offset="1" stopColor="#7fd6ff" />
            </radialGradient>
          </defs>
          <rect width="200" height="140" fill={f(u, 'ca')} />
          <Estrelas seed={seed + 2} n={26} alt={60} cor="#cfefff" />
          <circle cx="150" cy="34" r="30" fill={f(u, 'hl')} />
          <circle cx="150" cy="34" r="11" fill={f(u, 'lua')} />
          <path d="M143 26 a11 11 0 0 1 14 -4" stroke="#fff" strokeWidth="1" fill="none" opacity=".6" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <path d={onda(76 + i * 11, 2 + i * 0.9, 0.09 - i * 0.008, i * 1.9 + r() * 3)} fill={i % 2 ? p.escura : p.cor} opacity={0.55 + i * 0.07} />
              <path d={linhaOnda(76 + i * 11, 2 + i * 0.9, 0.09 - i * 0.008, i * 1.9 + r() * 3)} stroke={p.clara} strokeWidth=".6" fill="none" opacity={0.55 - i * 0.05} />
            </g>
          ))}
          <path d="M120 68 L180 68 L168 96 L132 96Z" fill={p.clara} opacity=".1" filter={f(u, 'bl')} />
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={r() * 200} cy={80 + r() * 60} r={0.8 + r() * 1.6} fill="none" stroke={p.clara} strokeWidth=".5" opacity={0.4 + r() * 0.4} />
          ))}
        </g>
      );
    case 'terra':
      return (
        <g>
          <defs>
            <linearGradient id={`${u}ct`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#140d05" />
              <stop offset=".45" stopColor="#6e4f27" />
              <stop offset=".75" stopColor="#d9bd82" />
              <stop offset="1" stopColor="#8a6a3b" />
            </linearGradient>
          </defs>
          <rect width="200" height="140" fill={f(u, 'ct')} />
          <circle cx="140" cy="68" r="34" fill={f(u, 'hl')} opacity=".6" />
          <circle cx="140" cy="68" r="12" fill="#fff4d0" opacity=".9" />
          <path d="M-5 100 L22 70 L40 84 L66 52 L90 82 L112 60 L140 88 L170 64 L205 94 L205 140 L-5 140Z" fill="#5a4426" opacity=".85" />
          <path d="M-5 112 L30 86 L56 102 L84 78 L116 104 L150 82 L182 100 L205 90 L205 140 L-5 140Z" fill="#3a2a14" />
          <path d="M-5 128 L24 110 L52 124 L88 104 L120 122 L158 106 L205 124 L205 140 L-5 140Z" fill="#1d1409" />
          <g filter={f(u, 'gl')}>
            <polygon points="26,128 32,106 38,128" fill={p.brilho} opacity=".9" />
            <polygon points="36,130 42,112 48,130" fill={p.clara} opacity=".8" />
            <polygon points="164,130 171,104 178,130" fill={p.brilho} opacity=".9" />
            <polygon points="174,130 180,114 186,130" fill={p.clara} opacity=".8" />
          </g>
          <path d="M-5 134 C30 128 60 136 100 131 S170 128 205 134 L205 140 L-5 140Z" fill="#3c4a1d" opacity=".9" />
          <g filter={f(u, 'bl')} opacity=".4">
            <ellipse cx="100" cy="112" rx="110" ry="9" fill="#f2dcaa" />
          </g>
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={r() * 200} cy={40 + r() * 90} r={0.5 + r() * 1.2} fill="#f3dca3" opacity={0.3 + r() * 0.5} />
          ))}
        </g>
      );
    case 'ar':
      return (
        <g>
          <defs>
            <linearGradient id={`${u}cr2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#04201d" />
              <stop offset=".5" stopColor="#1b8a76" />
              <stop offset="1" stopColor="#8fe8d2" />
            </linearGradient>
            <radialGradient id={`${u}nv`}>
              <stop offset="0" stopColor="#fff" stopOpacity=".95" />
              <stop offset="1" stopColor="#d3fff0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="140" fill={f(u, 'cr2')} />
          <g opacity=".9">
            <path d="M120 70 L152 70 L146 80 L130 80Z" fill="#2c4d3f" />
            <path d="M118 66 C126 60 146 60 154 66 L152 70 L120 70Z" fill="#4b9a54" />
            <path d="M136 80 L136 112" stroke="#d8fff4" strokeWidth="1" opacity=".5" />
          </g>
          {[
            [30, 40, 1.1],
            [150, 30, 1.3],
            [90, 58, 1.5],
            [20, 96, 1.7],
            [130, 100, 1.9],
            [180, 78, 1.2],
            [70, 120, 2.0],
          ].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity={0.75}>
              <ellipse cx="0" cy="0" rx="22" ry="7" fill={f(u, 'nv')} />
              <ellipse cx="-10" cy="-5" rx="14" ry="8" fill={f(u, 'nv')} />
              <ellipse cx="9" cy="-4" rx="12" ry="7" fill={f(u, 'nv')} />
            </g>
          ))}
          <g fill="none" stroke="#fff" strokeLinecap="round" opacity=".6">
            <path d="M-5 50 C40 36 70 62 120 46 S190 48 205 40" strokeWidth=".8" />
            <path d="M-5 84 C30 70 80 96 130 78 S190 84 205 74" strokeWidth="1.1" />
            <path d="M-5 112 C50 100 90 124 150 108 S200 112 205 104" strokeWidth=".7" />
          </g>
        </g>
      );
    case 'luz':
      return (
        <g>
          <defs>
            <radialGradient id={`${u}cl`} cx=".5" cy=".28" r=".95">
              <stop offset="0" stopColor="#fffdf0" />
              <stop offset=".3" stopColor="#ffe27a" />
              <stop offset=".65" stopColor="#f2a91e" />
              <stop offset="1" stopColor="#5b3d04" />
            </radialGradient>
            <linearGradient id={`${u}ray`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".6" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="200" height="140" fill={f(u, 'cl')} />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (-70 + i * 9.4) * (Math.PI / 180);
            const w = 0.04 + r() * 0.06;
            const L = 210;
            const x1 = 100 + Math.sin(a - w) * L;
            const y1 = -30 + Math.cos(a - w) * L;
            const x2 = 100 + Math.sin(a + w) * L;
            const y2 = -30 + Math.cos(a + w) * L;
            return <polygon key={i} points={`100,-30 ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`} fill={f(u, 'ray')} opacity={0.35 + r() * 0.5} />;
          })}
          <circle cx="100" cy="16" r="16" fill="#fff" opacity=".95" filter={f(u, 'gl')} />
          <g opacity=".92">
            {[
              [20, 124, 40],
              [70, 132, 46],
              [128, 126, 50],
              [180, 130, 38],
            ].map(([x, y, w], i) => (
              <ellipse key={i} cx={x} cy={y} rx={w} ry="14" fill="#f9c850" opacity={0.85} />
            ))}
            <ellipse cx="100" cy="140" rx="130" ry="14" fill="#fff0b0" opacity=".75" filter={f(u, 'bl2')} />
          </g>
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={r() * 200} cy={r() * 120} r={0.5 + r() * 1.3} fill="#fff" opacity={0.4 + r() * 0.6} />
          ))}
        </g>
      );
    case 'escuridao':
      return (
        <g>
          <defs>
            <radialGradient id={`${u}ce`} cx=".5" cy=".38" r=".85">
              <stop offset="0" stopColor="#35106a" />
              <stop offset=".5" stopColor="#170638" />
              <stop offset="1" stopColor="#040109" />
            </radialGradient>
            <radialGradient id={`${u}lu2`}>
              <stop offset="0" stopColor="#000" />
              <stop offset=".85" stopColor="#0a0218" />
              <stop offset="1" stopColor="#1c0840" />
            </radialGradient>
          </defs>
          <rect width="200" height="140" fill={f(u, 'ce')} />
          <Estrelas seed={seed + 3} n={46} cor="#d8c2ff" alt={110} />
          <circle cx="100" cy="46" r="40" fill={f(u, 'hl')} opacity=".7" />
          <circle cx="100" cy="46" r="24" fill={f(u, 'lu2')} />
          <circle cx="100" cy="46" r="24" fill="none" stroke={p.clara} strokeWidth="1.2" opacity=".9" filter={f(u, 'gl')} />
          <path d="M80 42 a24 24 0 0 1 36 -16" stroke="#fff" strokeWidth="1.1" fill="none" opacity=".7" />
          <g fill="none" strokeLinecap="round" opacity=".85">
            <path d="M-5 118 C30 100 40 70 24 40 S30 6 20 -5" stroke="#3b1a6e" strokeWidth="4" />
            <path d="M205 112 C170 96 164 68 178 40 S170 10 182 -5" stroke="#3b1a6e" strokeWidth="4" />
            <path d="M-5 118 C30 100 40 70 24 40 S30 6 20 -5" stroke={p.brilho} strokeWidth=".8" filter={f(u, 'gs')} />
            <path d="M205 112 C170 96 164 68 178 40 S170 10 182 -5" stroke={p.brilho} strokeWidth=".8" filter={f(u, 'gs')} />
          </g>
          <g filter={f(u, 'bl')} opacity=".7">
            <ellipse cx="40" cy="132" rx="60" ry="12" fill="#5b21b6" />
            <ellipse cx="160" cy="134" rx="64" ry="12" fill="#4c1d95" />
          </g>
        </g>
      );
  }
}

// ---------------------------------------------------------------------------
// Projéteis e emblemas dos feitiços
// ---------------------------------------------------------------------------

function Projetil({ el, u, x, y, s = 1, ang = 0 }: { el: Elemento; u: string; x: number; y: number; s?: number; ang?: number }) {
  const p = ELEMENTOS[el];
  const corpo = (() => {
    switch (el) {
      case 'fogo':
        return (
          <>
            <circle r="32" fill={f(u, 'hl')} />
            <path d="M-6 -9 C-20 -14 -26 -24 -40 -22 C-34 -15 -40 -11 -54 -11 C-44 -5 -56 -2 -72 2 C-54 6 -46 8 -38 12 C-44 17 -36 24 -50 30 C-32 25 -20 21 -6 10Z" fill={f(u, 'tr')} opacity=".95" />
            <path d="M-4 -4 C-18 -10 -30 -9 -46 -6 C-36 -2 -36 2 -48 6 C-32 6 -18 4 -4 4Z" fill={p.clara} opacity=".8" />
            <path d="M-4 -12 C-14 -26 -8 -34 -14 -42 C-4 -36 4 -28 2 -12Z" fill={p.brilho} opacity=".7" />
            <circle r="14" fill={f(u, 'b1')} />
            <circle r="6.5" fill="#fff8dc" opacity=".95" />
          </>
        );
      case 'agua':
        return (
          <>
            <circle r="30" fill={f(u, 'hl')} opacity=".7" />
            <path d="M-8 -5 C-32 -14 -52 -8 -70 2 C-52 6 -40 8 -30 12 C-42 16 -56 22 -68 30 C-44 28 -24 22 -8 8Z" fill={f(u, 'tr')} opacity=".85" />
            <polygon points="-28,0 -8,-9 22,-3 36,0 22,3 -8,9" fill={f(u, 'lin')} />
            <polygon points="-8,-9 22,-3 36,0 -8,0" fill="#fff" opacity=".55" />
            <path d="M-26 0 L34 0" stroke="#fff" strokeWidth=".8" opacity=".9" />
            <circle cx="-44" cy="-10" r="2.2" fill={p.clara} opacity=".8" />
            <circle cx="-54" cy="12" r="1.8" fill={p.clara} opacity=".7" />
            <circle cx="-38" cy="14" r="1.4" fill="#fff" opacity=".8" />
          </>
        );
      case 'terra':
        return (
          <>
            <ellipse cx="-24" cy="2" rx="34" ry="11" fill={p.clara} opacity=".28" filter={f(u, 'bl2')} />
            <circle cx="-34" cy="-8" r="3" fill={p.cor} />
            <circle cx="-46" cy="6" r="2.2" fill={p.clara} />
            <polygon points="-14,-7 -6,-15 9,-14 18,-4 16,8 4,15 -10,12 -17,3" fill={f(u, 'linv')} />
            <polygon points="-6,-15 9,-14 18,-4 2,-3 -4,-8" fill={p.clara} opacity=".55" />
            <path d="M-8 -4 L2 2 L-3 11 M2 2 L12 4" stroke={p.escura} strokeWidth="1.2" fill="none" />
            <ellipse cx="8" cy="-10" rx="5" ry="2" fill="#7aa332" opacity=".85" />
          </>
        );
      case 'ar':
        return (
          <>
            <circle r="30" fill={f(u, 'hl')} opacity=".8" />
            <g fill="none" stroke={p.clara} strokeLinecap="round" opacity=".75">
              <path d="M-54 -8 C-40 -16 -24 -12 -12 -4" strokeWidth="1.4" />
              <path d="M-60 6 C-44 -2 -28 6 -14 4" strokeWidth="1.2" />
              <path d="M-46 18 C-34 10 -22 14 -10 10" strokeWidth="1" />
            </g>
            <polygon points="-30,-20 4,-5 -8,-1 30,20 -3,5 9,1" fill={p.brilho} filter={f(u, 'gl')} />
            <polygon points="-30,-20 4,-5 -8,-1 30,20 -3,5 9,1" fill="#fff" opacity=".9" transform="scale(.7)" />
          </>
        );
      case 'luz':
        return (
          <>
            <circle r="36" fill={f(u, 'hl')} />
            <polygon points="0,-34 4,-4 34,0 4,4 0,34 -4,4 -34,0 -4,-4" fill="#fff" opacity=".95" filter={f(u, 'gs')} />
            <polygon points="0,-18 3,-3 18,0 3,3 0,18 -3,3 -18,0 -3,-3" fill={p.clara} transform="rotate(45)" />
            <circle r="9" fill={f(u, 'b1')} />
            <circle r="4" fill="#fff" />
          </>
        );
      case 'escuridao':
        return (
          <>
            <circle r="30" fill={f(u, 'hl')} opacity=".55" />
            <g fill="none" stroke="#6d28d9" strokeLinecap="round" opacity=".85">
              <path d="M-12 -4 C-30 -14 -46 -10 -60 2" strokeWidth="3" />
              <path d="M-12 4 C-30 16 -44 14 -58 24" strokeWidth="2.4" />
              <path d="M-10 0 C-30 2 -44 -2 -66 -12" strokeWidth="1.8" />
            </g>
            <circle r="14" fill="#06010f" />
            <circle r="14" fill="none" stroke={p.clara} strokeWidth="1.8" filter={f(u, 'gl')} />
            <path d="M-9 -6 a11 11 0 0 1 12 -6" stroke="#fff" strokeWidth="1.2" fill="none" opacity=".8" />
          </>
        );
    }
  })();
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang}) scale(${s})`} filter={f(u, 'gs')}>
      {corpo}
    </g>
  );
}

const estrela4 = (r: number) => `M0 ${-r} L${r * 0.22} ${-r * 0.22} L${r} 0 L${r * 0.22} ${r * 0.22} L0 ${r} L${-r * 0.22} ${r * 0.22} L${-r} 0 L${-r * 0.22} ${-r * 0.22}Z`;

function EmblemaArte({ tipo, el, u, seed, custo }: { tipo: Emblema; el: Elemento; u: string; seed: number; custo: number }) {
  const r = rng(seed);
  const p = ELEMENTOS[el];
  const sparks = (n: number, cx = 100, cy = 72, rx = 70, ry = 46, size = 1.6) => (
    <g filter={f(u, 'gs')}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={estrela4(size * (0.6 + r() * 1.3))} transform={`translate(${cx + (r() - 0.5) * 2 * rx} ${cy + (r() - 0.5) * 2 * ry})`} fill={r() > 0.5 ? '#fff' : p.clara} opacity={0.5 + r() * 0.5} />
      ))}
    </g>
  );
  switch (tipo) {
    case 'ataque': {
      const ang = -38 + r() * 34;
      const grande = 1.25 + Math.min(custo, 6) * 0.1;
      return (
        <g>
          <circle cx="112" cy="68" r={40 + custo * 3} fill={f(u, 'hl')} opacity=".5" />
          {custo >= 5 && (
            <g fill="none" stroke={p.clara} strokeWidth="1.2" filter={f(u, 'gs')} opacity=".8">
              <circle cx="108" cy="66" r="52" />
              <circle cx="108" cy="66" r="62" opacity=".5" />
            </g>
          )}
          {custo >= 3 && <Projetil el={el} u={u} x={60 + r() * 14} y={96 + r() * 10} s={0.5 + r() * 0.2} ang={ang} />}
          {custo >= 4 && <Projetil el={el} u={u} x={150 + r() * 10} y={40 + r() * 8} s={0.45 + r() * 0.2} ang={ang} />}
          <Projetil el={el} u={u} x={100 + r() * 16} y={62 + r() * 12} s={grande} ang={ang} />
          {sparks(10 + custo * 3)}
        </g>
      );
    }
    case 'drenar':
      return (
        <g>
          <circle cx="104" cy="70" r="46" fill={f(u, 'hl')} opacity=".45" />
          <g fill="none" stroke={p.brilho} strokeLinecap="round" filter={f(u, 'gs')}>
            <path d="M150 112 C120 110 150 86 112 78" strokeWidth="2" opacity=".8" />
            <path d="M156 100 C132 100 152 80 120 70" strokeWidth="1.4" opacity=".7" />
            <path d="M60 44 C84 48 66 70 98 72" strokeWidth="2" opacity=".8" />
          </g>
          <Projetil el={el} u={u} x={92} y={66} s={1.2} ang={-18} />
          <g transform="translate(150 106)" filter={f(u, 'gl')}>
            <path d="M0 8 C-12 -2 -12 -12 -5 -12 C-2 -12 0 -9 0 -8 C0 -9 2 -12 5 -12 C12 -12 12 -2 0 8Z" fill={p.clara} />
          </g>
          {sparks(12)}
        </g>
      );
    case 'area':
      return (
        <g>
          <circle cx="100" cy="72" r="60" fill={f(u, 'hl')} opacity=".4" />
          <Projetil el={el} u={u} x={62} y={48} s={0.82} ang={-36} />
          <Projetil el={el} u={u} x={118} y={72} s={1.15} ang={-36} />
          <Projetil el={el} u={u} x={160} y={50} s={0.7} ang={-36} />
          <Projetil el={el} u={u} x={92} y={104} s={0.72} ang={-36} />
          {sparks(18)}
        </g>
      );
    case 'cura': {
      const petalas = Array.from({ length: 7 }, (_, i) => (i - 3) * 22);
      return (
        <g>
          <circle cx="100" cy="76" r="52" fill={f(u, 'hl')} opacity=".6" />
          <g transform="translate(100 98)" filter={f(u, 'gl')}>
            {petalas.map((a, i) => (
              <path key={i} d="M0 0 C-14 -16 -10 -42 0 -54 C10 -42 14 -16 0 0Z" transform={`rotate(${a})`} fill={f(u, 'pet')} opacity={0.95 - Math.abs(i - 3) * 0.08} stroke={p.cor} strokeOpacity=".6" strokeWidth=".7" />
            ))}
          </g>
          <circle cx="100" cy="70" r="9" fill={f(u, 'b1')} filter={f(u, 'gl')} />
          <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" filter={f(u, 'gs')}>
            {[
              [54, 52],
              [150, 44],
              [140, 96],
              [64, 90],
            ].map(([x, y], i) => (
              <path key={i} d={`M${x - 5} ${y} H${x + 5} M${x} ${y - 5} V${y + 5}`} opacity={0.65 + (i % 2) * 0.3} />
            ))}
          </g>
          {sparks(16)}
        </g>
      );
    }
    case 'escudo':
      return (
        <g>
          <defs>
            <radialGradient id={`${u}dm`} cx=".5" cy=".45" r=".52">
              <stop offset="0" stopColor={p.brilho} stopOpacity=".05" />
              <stop offset=".72" stopColor={p.brilho} stopOpacity=".2" />
              <stop offset=".95" stopColor={p.clara} stopOpacity=".85" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </radialGradient>
            <pattern id={`${u}hx`} width="14" height="12.1" patternUnits="userSpaceOnUse" patternTransform="scale(.9)">
              <path d="M7 0 L14 4 V8.1 L7 12.1 L0 8.1 V4Z" fill="none" stroke={p.clara} strokeWidth=".6" opacity=".7" />
            </pattern>
          </defs>
          <ellipse cx="100" cy="112" rx="58" ry="12" fill={p.brilho} opacity=".35" filter={f(u, 'bl2')} />
          <ellipse cx="100" cy="112" rx="56" ry="11" fill="none" stroke={p.clara} strokeWidth="1.4" filter={f(u, 'gs')} />
          <path d="M44 112 A56 66 0 0 1 156 112Z" fill={f(u, 'dm')} filter={f(u, 'gs')} />
          <path d="M44 112 A56 66 0 0 1 156 112Z" fill={f(u, 'hx')} opacity=".55" />
          <path d="M62 62 A56 66 0 0 1 100 48" stroke="#fff" strokeWidth="2" fill="none" opacity=".75" strokeLinecap="round" />
          <g transform="translate(100 82)" filter={f(u, 'gl')}>
            <path d="M0 -22 L18 -12 V6 C18 18 8 26 0 30 C-8 26 -18 18 -18 6 V-12Z" fill={f(u, 'met')} stroke="#fff" strokeOpacity=".7" strokeWidth="1" />
            <path d="M0 -14 L11 -8 V4 C11 12 5 17 0 20Z" fill="#fff" opacity=".28" />
          </g>
          {sparks(10, 100, 74, 56, 36)}
        </g>
      );
    case 'amplificar':
      return (
        <g>
          <circle cx="100" cy="76" r="52" fill={f(u, 'hl')} opacity=".55" />
          <ellipse cx="100" cy="104" rx="48" ry="10" fill="none" stroke={p.clara} strokeWidth="1.2" filter={f(u, 'gs')} />
          <ellipse cx="100" cy="86" rx="38" ry="8" fill="none" stroke={p.brilho} strokeWidth="1" opacity=".8" filter={f(u, 'gs')} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M62 ${96 - i * 26} L100 ${72 - i * 26} L138 ${96 - i * 26} L138 ${108 - i * 26} L100 ${84 - i * 26} L62 ${108 - i * 26}Z`} fill={f(u, 'linv')} opacity={0.98 - i * 0.2} stroke="#fff" strokeOpacity=".5" strokeWidth=".8" filter={f(u, 'gs')} />
          ))}
          {sparks(20, 100, 70, 52, 52)}
        </g>
      );
    case 'dot': {
      return (
        <g>
          <circle cx="100" cy="72" r="50" fill={f(u, 'hl')} opacity=".5" />
          {el === 'fogo' ? (
            <path d="M100 24 C118 46 134 58 130 84 C127 104 114 114 100 114 C86 114 73 104 70 84 C67 66 82 58 90 42 C94 52 96 56 100 24Z" fill={f(u, 'linv')} filter={f(u, 'gl')} stroke="#fff" strokeOpacity=".4" />
          ) : (
            <path d="M100 22 C112 44 132 62 132 86 C132 106 118 116 100 116 C82 116 68 106 68 86 C68 62 88 44 100 22Z" fill={f(u, 'linv')} filter={f(u, 'gl')} stroke="#fff" strokeOpacity=".5" />
          )}
          <path d="M82 80 C80 92 86 100 94 104" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".75" />
          <circle cx="86" cy="72" r="3" fill="#fff" opacity=".85" />
          <g filter={f(u, 'gs')} fill={p.clara}>
            <path d="M150 54 C154 62 158 66 158 72 A8 8 0 0 1 142 72 C142 66 146 62 150 54Z" opacity=".85" />
            <path d="M44 66 C47 72 50 75 50 79 A6 6 0 0 1 38 79 C38 75 41 72 44 66Z" opacity=".65" />
            <path d="M158 104 C160 108 162 110 162 113 A4 4 0 0 1 154 113 C154 110 156 108 158 104Z" opacity=".5" />
          </g>
          {[16, 32, 48].map((rx, i) => (
            <ellipse key={i} cx="100" cy="120" rx={rx} ry={rx * 0.2} fill="none" stroke={p.clara} strokeWidth=".8" opacity={0.7 - i * 0.2} />
          ))}
        </g>
      );
    }
    case 'silencio':
      return (
        <g>
          <circle cx="100" cy="72" r="52" fill={f(u, 'hl')} opacity=".45" />
          <g fill={f(u, 'linv')} opacity=".95" filter={f(u, 'gs')}>
            {[26, 44, 62, 80, 98, 116, 134, 152, 170].map((x, i) => {
              const h = 8 + Math.abs(Math.sin(i * 1.4)) * 38;
              return <rect key={i} x={x - 4} y={72 - h / 2} width="8" height={h} rx="4" />;
            })}
          </g>
          <circle cx="100" cy="72" r="46" fill="none" stroke={p.clara} strokeWidth="6" filter={f(u, 'gl')} />
          <circle cx="100" cy="72" r="46" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".8" />
          <path d="M66 105 L134 39" stroke={p.clara} strokeWidth="6.5" strokeLinecap="round" filter={f(u, 'gl')} />
          <path d="M66 105 L134 39" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
        </g>
      );
    case 'atordoar': {
      let d = 'M100 72';
      for (let t = 0; t < 22; t += 0.2) d += ` L${(100 + Math.cos(t) * t * 2.1).toFixed(1)} ${(72 + Math.sin(t) * t * 2.1).toFixed(1)}`;
      return (
        <g>
          <circle cx="100" cy="72" r="52" fill={f(u, 'hl')} opacity=".5" />
          <path d={d} fill="none" stroke={p.clara} strokeWidth="3.2" strokeLinecap="round" filter={f(u, 'gl')} />
          <path d={d} fill="none" stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".8" />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 - 1.2;
            return <path key={i} d={estrela4(8 - (i % 2) * 2)} transform={`translate(${100 + Math.cos(a) * 54} ${72 + Math.sin(a) * 34}) rotate(${i * 20})`} fill="#fff" filter={f(u, 'gl')} />;
          })}
          {sparks(10)}
        </g>
      );
    }
    case 'enfraquecer':
      return (
        <g>
          <circle cx="100" cy="72" r="52" fill={f(u, 'hl')} opacity=".45" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M62 ${40 + i * 26} L100 ${64 + i * 26} L138 ${40 + i * 26} L138 ${52 + i * 26} L100 ${76 + i * 26} L62 ${52 + i * 26}Z`} fill={f(u, 'linv')} opacity={0.98 - i * 0.2} stroke="#fff" strokeOpacity=".4" strokeWidth=".8" filter={f(u, 'gs')} />
          ))}
          {sparks(12)}
        </g>
      );
    case 'esquiva':
      return (
        <g>
          <circle cx="104" cy="72" r="52" fill={f(u, 'hl')} opacity=".4" />
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={120 - i * 26} cy={72} rx={20} ry={30} fill={f(u, 'linv')} opacity={0.9 - i * 0.3} filter={i ? f(u, 'bl2') : undefined} />
          ))}
          <g fill="none" stroke={p.clara} strokeLinecap="round" filter={f(u, 'gs')}>
            <path d="M20 54 C54 44 90 56 120 46" strokeWidth="2" opacity=".85" />
            <path d="M12 74 C54 66 100 80 150 68" strokeWidth="2.6" opacity=".95" />
            <path d="M24 96 C60 86 96 100 128 92" strokeWidth="1.8" opacity=".8" />
          </g>
          {sparks(12)}
        </g>
      );
    case 'purificar':
      return (
        <g>
          <circle cx="100" cy="72" r="56" fill={f(u, 'hl')} opacity=".65" />
          <circle cx="100" cy="72" r="38" fill="none" stroke={p.clara} strokeWidth="1.6" opacity=".9" filter={f(u, 'gs')} />
          <circle cx="100" cy="72" r="26" fill="none" stroke="#fff" strokeWidth=".8" opacity=".7" />
          <path d={estrela4(46)} transform="translate(100 72)" fill="#fff" filter={f(u, 'gl')} />
          <path d={estrela4(30)} transform="translate(100 72) rotate(45)" fill={p.clara} filter={f(u, 'gs')} />
          <circle cx="100" cy="72" r="7" fill={f(u, 'b1')} />
          {sparks(24, 100, 72, 74, 50, 1.4)}
        </g>
      );
    case 'dissipar':
      return (
        <g>
          <circle cx="100" cy="72" r="54" fill={f(u, 'hl')} opacity=".45" />
          {Array.from({ length: 8 }, (_, i) => {
            const a0 = (i / 8) * Math.PI * 2;
            const a1 = a0 + 0.62;
            const R0 = 34 + (i % 2) * 7;
            const ox = Math.cos(a0 + 0.3) * (i % 2 ? 11 : 5);
            const oy = Math.sin(a0 + 0.3) * (i % 2 ? 11 : 5);
            return <path key={i} d={`M${100 + ox + Math.cos(a0) * R0} ${72 + oy + Math.sin(a0) * R0} A${R0} ${R0} 0 0 1 ${100 + ox + Math.cos(a1) * R0} ${72 + oy + Math.sin(a1) * R0}`} stroke={i % 2 ? p.clara : p.brilho} strokeWidth="5" strokeLinecap="round" fill="none" filter={f(u, 'gs')} />;
          })}
          {Array.from({ length: 10 }, (_, i) => {
            const a = r() * Math.PI * 2;
            const d = 46 + r() * 30;
            return <polygon key={i} points="0,-5 4,2 -3,4" transform={`translate(${100 + Math.cos(a) * d} ${72 + Math.sin(a) * d * 0.7}) rotate(${r() * 360})`} fill={p.clara} opacity={0.6 + r() * 0.4} />;
          })}
          <circle cx="100" cy="72" r="6" fill="#fff" filter={f(u, 'gl')} />
        </g>
      );
    case 'comprar':
      return (
        <g>
          <circle cx="100" cy="76" r="54" fill={f(u, 'hl')} opacity=".5" />
          {[-24, 0, 24].map((a, i) => (
            <g key={i} transform={`translate(100 118) rotate(${a})`}>
              <rect x="-24" y="-92" width="48" height="68" rx="5" fill={i === 1 ? f(u, 'met') : p.escura} stroke={p.clara} strokeWidth="1.6" />
              <rect x="-19" y="-87" width="38" height="58" rx="3" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".8" />
              {i === 1 && <path d={estrela4(13)} transform="translate(0 -58)" fill="#fff" filter={f(u, 'gl')} />}
              {i !== 1 && <circle cx="0" cy="-58" r="8" fill="none" stroke={p.brilho} strokeWidth="1.2" opacity=".8" />}
            </g>
          ))}
          {sparks(16)}
        </g>
      );
    case 'mana':
      return (
        <g>
          <circle cx="100" cy="74" r="52" fill={f(u, 'hl')} opacity=".6" />
          <g transform="translate(100 74)" filter={f(u, 'gl')}>
            <polygon points="0,-40 26,-18 26,18 0,42 -26,18 -26,-18" fill={f(u, 'linv')} stroke="#fff" strokeOpacity=".7" strokeWidth="1" />
            <polygon points="0,-40 26,-18 0,0 -26,-18" fill="#fff" opacity=".4" />
            <polygon points="0,0 26,-18 26,18 0,42" fill="#000" opacity=".25" />
            <path d="M-26 -18 L0 0 L26 -18 M0 0 L0 42" stroke="#fff" strokeOpacity=".5" strokeWidth=".8" fill="none" />
          </g>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return <circle key={i} cx={100 + Math.cos(a) * 56} cy={74 + Math.sin(a) * 34} r="2.4" fill="#fff" filter={f(u, 'gl')} />;
          })}
          {sparks(10)}
        </g>
      );
    case 'ressuscitar':
      return (
        <g>
          <circle cx="100" cy="82" r="58" fill={f(u, 'hl')} opacity=".7" />
          <polygon points="86,140 100,20 114,140" fill="#fff" opacity=".18" />
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(100 92) scale(${s} 1)`} filter={f(u, 'gl')}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M4 ${-i * 5} C30 ${-26 - i * 6} 54 ${-30 - i * 7} ${74 - i * 4} ${-42 - i * 5} C54 ${-16 - i * 4} 32 ${-6 - i * 3} 4 ${-i * 5 + 8}Z`} fill={f(u, 'linv')} opacity={0.95 - i * 0.1} stroke="#fff" strokeOpacity=".35" strokeWidth=".6" />
              ))}
            </g>
          ))}
          <path d={estrela4(16)} transform="translate(100 88)" fill="#fff" filter={f(u, 'gl')} />
          {sparks(18, 100, 76, 66, 54)}
        </g>
      );
  }
}

// ---------------------------------------------------------------------------
// Retratos dos personagens
// ---------------------------------------------------------------------------

function Olhos({ u, x = 100, y = 58, sep = 9, w = 6, cor }: { u: string; x?: number; y?: number; sep?: number; w?: number; cor?: string }) {
  return (
    <g filter={f(u, 'gl')}>
      <ellipse cx={x - sep} cy={y} rx={w} ry={w * 0.38} fill={cor ?? '#fff'} transform={`rotate(8 ${x - sep} ${y})`} />
      <ellipse cx={x + sep} cy={y} rx={w} ry={w * 0.38} fill={cor ?? '#fff'} transform={`rotate(-8 ${x + sep} ${y})`} />
    </g>
  );
}

function Crista({ el, u, p, cx = 100, topo = 26 }: { el: Elemento; u: string; p: Pal; cx?: number; topo?: number }) {
  switch (el) {
    case 'fogo':
      return (
        <g transform={`translate(${cx} ${topo})`} filter={f(u, 'gl')}>
          <path d="M-14 4 C-16 -14 -6 -20 -8 -34 C0 -26 2 -20 0 -44 C10 -30 14 -20 10 -8 C16 -14 16 -6 14 4Z" fill={f(u, 'linv')} />
          <path d="M-6 4 C-8 -8 -2 -12 0 -22 C6 -12 8 -6 6 4Z" fill={p.clara} opacity=".85" />
        </g>
      );
    case 'agua':
      return (
        <g transform={`translate(${cx} ${topo})`} filter={f(u, 'gs')}>
          <polygon points="-16,6 -10,-26 -3,6" fill={f(u, 'linv')} stroke="#fff" strokeOpacity=".6" strokeWidth=".6" />
          <polygon points="-5,6 0,-38 6,6" fill={f(u, 'linv')} stroke="#fff" strokeOpacity=".6" strokeWidth=".6" />
          <polygon points="4,6 11,-24 17,6" fill={f(u, 'linv')} stroke="#fff" strokeOpacity=".6" strokeWidth=".6" />
        </g>
      );
    case 'terra':
      return (
        <g transform={`translate(${cx} ${topo})`}>
          <polygon points="-18,6 -12,-10 -2,-6 4,-18 12,-6 18,6" fill="#6b5030" stroke={p.clara} strokeOpacity=".5" strokeWidth=".7" />
          <ellipse cx="-6" cy="-7" rx="9" ry="3" fill="#6f9a2c" opacity=".9" />
          <ellipse cx="9" cy="-3" rx="6" ry="2.4" fill="#86b53a" opacity=".9" />
        </g>
      );
    case 'ar':
      return (
        <g transform={`translate(${cx} ${topo + 6})`} filter={f(u, 'gs')}>
          {[-1, 1].map((s) => (
            <g key={s} transform={`scale(${s} 1)`}>
              {[0, 1, 2, 3].map((i) => (
                <path key={i} d={`M8 ${4 - i * 2} C24 ${-6 - i * 7} 38 ${-8 - i * 8} 52 ${-18 - i * 6} C40 ${-2 - i * 5} 26 ${2 - i * 3} 8 ${8 - i * 2}Z`} fill={i % 2 ? '#fff' : p.clara} opacity={0.95 - i * 0.12} stroke={p.cor} strokeWidth=".5" />
              ))}
            </g>
          ))}
        </g>
      );
    case 'luz':
      return (
        <g transform={`translate(${cx} ${topo - 4})`} filter={f(u, 'gl')}>
          <ellipse cx="0" cy="-8" rx="24" ry="6" fill="none" stroke={p.clara} strokeWidth="3" />
          <ellipse cx="0" cy="-8" rx="24" ry="6" fill="none" stroke="#fff" strokeWidth=".8" />
        </g>
      );
    case 'escuridao':
      return (
        <g transform={`translate(${cx} ${topo + 8})`} filter={f(u, 'gs')}>
          {[-1, 1].map((s) => (
            <g key={s} transform={`scale(${s} 1)`}>
              <path d="M10 2 C18 -8 18 -26 32 -40 C30 -24 36 -16 26 -6 C22 -2 18 2 14 6Z" fill="#0a0414" stroke={p.brilho} strokeWidth=".9" />
              <path d="M12 0 C20 -10 20 -24 30 -36" fill="none" stroke={p.clara} strokeWidth=".5" opacity=".7" />
            </g>
          ))}
        </g>
      );
  }
}

function Guerreiro({ c, u, p }: { c: Carta; u: string; p: Pal }) {
  const el = c.el;
  const k = hash(c.id);
  const arma = k % 3;
  const escudo = c.palavras?.includes('guardiao');
  const espinhos = c.palavras?.includes('couraca') || c.palavras?.includes('vampiro');
  const peq = c.custo <= 1 ? 0.8 : 1;
  return (
    <g transform={`translate(100 140) scale(${peq}) translate(-100 -140)`}>
      <ellipse cx="100" cy="118" rx="64" ry="26" fill={f(u, 'hl')} opacity=".45" />
      {/* arma */}
      <g transform="translate(152 30) rotate(12)" filter={f(u, 'gl')}>
        {arma === 0 && (
          <>
            <polygon points="-3,0 3,0 5,86 0,94 -5,86" fill={f(u, 'met')} stroke="#fff" strokeOpacity=".7" strokeWidth=".6" />
            <path d="M0 4 V84" stroke="#fff" strokeWidth=".7" opacity=".8" />
            <rect x="-12" y="86" width="24" height="5" rx="2" fill={p.escura} stroke={p.clara} strokeWidth="1" />
          </>
        )}
        {arma === 1 && (
          <>
            <rect x="-2" y="6" width="4" height="96" rx="2" fill={p.escura} stroke={p.clara} strokeWidth=".8" />
            <path d="M2 10 C20 4 32 18 24 34 C20 40 12 40 2 36Z M-2 10 C-20 4 -32 18 -24 34 C-20 40 -12 40 -2 36Z" fill={f(u, 'met')} stroke="#fff" strokeOpacity=".7" strokeWidth=".7" />
          </>
        )}
        {arma === 2 && (
          <>
            <rect x="-1.6" y="-8" width="3.2" height="112" rx="1.6" fill={p.escura} stroke={p.clara} strokeWidth=".7" />
            <path d="M0 -26 C8 -14 8 -6 0 4 C-8 -6 -8 -14 0 -26Z" fill={f(u, 'met')} stroke="#fff" strokeOpacity=".8" strokeWidth=".7" />
          </>
        )}
      </g>
      {escudo && (
        <g filter={f(u, 'gs')}>
          <path d="M18 84 C34 78 52 80 62 88 C62 112 50 128 40 134 C28 126 16 110 18 84Z" fill={f(u, 'met')} stroke={p.escura} strokeWidth="1.4" />
          <path d="M26 90 C36 86 48 88 54 92 C54 108 46 118 40 124 C32 118 24 106 26 90Z" fill={p.escura} opacity=".55" />
          <path d={estrela4(8)} transform="translate(40 106)" fill={p.clara} filter={f(u, 'gs')} />
        </g>
      )}
      {/* corpo */}
      <path d="M54 140 L58 104 C60 94 74 88 100 88 C126 88 140 94 142 104 L146 140Z" fill={f(u, 'fig')} stroke={p.brilho} strokeOpacity=".7" strokeWidth="1" />
      <path d="M72 104 L100 96 L128 104 L124 140 L76 140Z" fill={f(u, 'met')} opacity=".85" />
      <path d="M100 96 V140 M82 110 C90 114 110 114 118 110" stroke={p.escura} strokeOpacity=".7" strokeWidth="1.2" fill="none" />
      <circle cx="100" cy="116" r="9" fill={p.escura} stroke={p.clara} strokeWidth="1.2" />
      <path d={estrela4(6)} transform="translate(100 116)" fill={p.brilho} filter={f(u, 'gs')} />
      {/* ombreiras */}
      {[58, 142].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="98" rx="19" ry="12" fill={f(u, 'met')} stroke={p.escura} strokeWidth="1" />
          <ellipse cx={x - 3} cy="94" rx="10" ry="4" fill="#fff" opacity=".35" />
          {espinhos && [-8, 0, 8].map((d) => <polygon key={d} points={`${x + d - 3},90 ${x + d},${80 - Math.abs(d) * 0.4} ${x + d + 3},90`} fill={p.clara} stroke={p.escura} strokeWidth=".6" />)}
        </g>
      ))}
      {/* pescoço e elmo */}
      <rect x="88" y="78" width="24" height="14" fill={p.escura} />
      <path d="M72 64 C72 38 86 26 100 26 C114 26 128 38 128 64 L128 78 C120 86 80 86 72 78Z" fill={f(u, 'met')} stroke={p.escura} strokeWidth="1.2" />
      <path d="M76 40 C84 32 92 30 100 30" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".6" strokeLinecap="round" />
      <path d="M100 26 V56" stroke={p.escura} strokeWidth="1" opacity=".6" />
      <rect x="80" y="54" width="40" height="9" rx="3" fill="#050203" />
      <Olhos u={u} y={58.5} cor={p.clara} />
      <path d="M84 70 H116 M86 75 H114" stroke={p.escura} strokeWidth="1" opacity=".7" />
      <Crista el={el} u={u} p={p} topo={28} />
    </g>
  );
}

function Mago({ c, u, p }: { c: Carta; u: string; p: Pal }) {
  const el = c.el;
  const chapeu = hash(c.id) % 3;
  return (
    <g>
      <ellipse cx="100" cy="120" rx="64" ry="24" fill={f(u, 'hl')} opacity=".4" />
      {/* cajado */}
      <g filter={f(u, 'gs')}>
        <path d="M152 24 L156 140" stroke={p.escura} strokeWidth="4.6" strokeLinecap="round" />
        <path d="M151 24 L155 140" stroke={p.clara} strokeWidth="1" opacity=".6" />
        <circle cx="152" cy="20" r="13" fill="none" stroke={p.clara} strokeWidth="2" />
        <circle cx="152" cy="20" r="8" fill={f(u, 'b1')} filter={f(u, 'gl')} />
      </g>
      {/* manto */}
      <path d="M100 18 C74 22 62 50 58 84 L36 140 L164 140 L142 84 C138 50 126 22 100 18Z" fill={f(u, 'fig')} stroke={p.brilho} strokeOpacity=".65" strokeWidth="1" />
      <path d="M100 24 C84 30 76 52 74 82 L100 96 L126 82 C124 52 116 30 100 24Z" fill={p.escura} opacity=".85" />
      <path d="M76 84 L100 98 L124 84 M60 100 C84 112 116 112 140 100" stroke={p.clara} strokeOpacity=".8" strokeWidth="1.4" fill="none" />
      <path d="M100 98 V140" stroke={p.clara} strokeOpacity=".55" strokeWidth="1.1" />
      {/* capuz e rosto na sombra */}
      <path d="M82 66 C82 44 90 34 100 34 C110 34 118 44 118 66 C118 82 108 88 100 88 C92 88 82 82 82 66Z" fill="#06030a" />
      <Olhos u={u} y={62} sep={8} w={5.5} cor={p.brilho} />
      <path d="M92 76 C96 80 104 80 108 76" stroke={p.clara} strokeOpacity=".4" strokeWidth=".8" fill="none" />
      {/* mãos e esfera */}
      <ellipse cx="124" cy="104" rx="6" ry="4" fill="#d9b48f" opacity=".9" />
      <circle cx="132" cy="94" r="10" fill={f(u, 'b1')} filter={f(u, 'gl')} />
      <circle cx="132" cy="94" r="16" fill={f(u, 'hl')} />
      {chapeu === 1 && (
        <g filter={f(u, 'gs')}>
          <path d="M100 -8 C102 6 108 20 118 36 L82 36 C92 20 98 6 100 -8Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1" />
          <ellipse cx="100" cy="37" rx="32" ry="7" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1" />
          <path d="M86 32 C96 36 104 36 114 32" stroke={p.clara} strokeWidth="1.4" fill="none" />
          <path d={estrela4(5)} transform="translate(100 22)" fill={p.clara} filter={f(u, 'gs')} />
        </g>
      )}
      {chapeu === 2 && (
        <g filter={f(u, 'gl')}>
          <path d="M80 36 L84 20 L92 30 L100 14 L108 30 L116 20 L120 36Z" fill={f(u, 'met')} stroke="#fff" strokeOpacity=".7" strokeWidth=".8" />
          <circle cx="100" cy="26" r="3" fill={p.brilho} />
        </g>
      )}
      {chapeu === 0 && <Crista el={el} u={u} p={p} cx={100} topo={34} />}
      <g filter={f(u, 'gs')}>
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} cx={40 + ((i * 37) % 120)} cy={30 + ((i * 53) % 90)} r={0.9 + (i % 3) * 0.6} fill={p.clara} opacity=".8" />
        ))}
      </g>
    </g>
  );
}

function Espirito({ el, u, p }: { el: Elemento; u: string; p: Pal }) {
  const asas = el === 'luz' || el === 'ar';
  return (
    <g>
      <circle cx="100" cy="76" r="60" fill={f(u, 'hl')} opacity=".6" />
      {asas &&
        [-1, 1].map((s) => (
          <g key={s} transform={`translate(100 74) scale(${s} 1)`} filter={f(u, 'gl')}>
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M12 ${i * 3 - 6} C40 ${-34 + i * 5} 62 ${-44 + i * 8} 92 ${-48 + i * 9} C72 ${-20 + i * 7} 46 ${10 + i * 4} 12 ${i * 3 + 8}Z`} fill={i % 2 ? '#fff' : p.clara} opacity={0.95 - i * 0.07} stroke={p.cor} strokeWidth=".4" />
            ))}
          </g>
        ))}
      <g filter={f(u, 'gl')}>
        <path d="M100 62 C74 70 60 98 72 128 C76 140 86 134 92 140 C98 132 102 132 108 140 C114 134 124 140 128 128 C140 98 126 70 100 62Z" fill={f(u, 'b1')} opacity=".92" />
        <path d="M80 80 C60 86 46 106 40 126 M120 80 C140 86 154 106 160 126" stroke={p.clara} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".6" />
        <circle cx="100" cy="52" r="19" fill={f(u, 'b1')} />
      </g>
      <path d="M86 50 C90 44 110 44 114 50 C112 64 88 64 86 50Z" fill={el === 'escuridao' ? '#050109' : p.escura} opacity=".78" />
      <Olhos u={u} y={52} sep={7.5} w={5.4} cor="#fff" />
      {el === 'escuridao' && (
        <g fill="none" stroke={p.brilho} strokeLinecap="round" filter={f(u, 'gs')}>
          <path d="M70 126 C64 108 78 92 70 76" strokeWidth="2" />
          <path d="M132 126 C138 108 124 92 132 76" strokeWidth="2" />
        </g>
      )}
      <Crista el={el === 'luz' ? 'luz' : el === 'escuridao' ? 'escuridao' : 'ar'} u={u} p={p} topo={36} />
      <g filter={f(u, 'gs')}>
        {Array.from({ length: 10 }, (_, i) => (
          <circle key={i} cx={30 + ((i * 41) % 140)} cy={20 + ((i * 59) % 100)} r={0.9 + (i % 3) * 0.6} fill="#fff" opacity=".8" />
        ))}
      </g>
    </g>
  );
}

// Feras (um desenho para cada) ------------------------------------------------

function Fera({ id, u, p }: { id: string; u: string; p: Pal }) {
  switch (id) {
    case 'fo13': // Salamandra Cinzenta
      return (
        <g>
          <ellipse cx="100" cy="124" rx="76" ry="14" fill="#000" opacity=".4" />
          <g filter={f(u, 'gs')}>
            <path d="M18 108 C44 72 90 60 130 72 C152 78 172 90 182 102 C150 112 124 114 100 112 C78 120 48 124 18 116Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.2" />
            <path d="M30 104 C54 82 92 72 128 80" stroke={p.clara} strokeOpacity=".7" strokeWidth="1.4" fill="none" />
            {[40, 56, 72, 88, 104, 120].map((x, i) => (
              <polygon key={i} points={`${x - 6},${84 - Math.sin(i / 1.8) * 6} ${x},${64 - i * 1.4} ${x + 6},${80 - Math.sin(i / 1.8) * 6}`} fill={p.cor} stroke={p.clara} strokeWidth=".7" />
            ))}
            <path d="M126 96 C150 98 170 100 182 102" stroke="#050203" strokeWidth="2" fill="none" />
            <path d="M126 96 C146 94 164 96 176 100" stroke={p.brilho} strokeWidth=".8" fill="none" opacity=".9" />
          </g>
          <ellipse cx="132" cy="82" rx="8" ry="5" fill="#fff6b0" filter={f(u, 'gl')} />
          <ellipse cx="133" cy="82" rx="1.8" ry="4.6" fill="#1a0602" />
          <path d="M22 112 C10 104 8 92 14 84" stroke={p.cor} strokeWidth="5" strokeLinecap="round" fill="none" />
          <g filter={f(u, 'gl')}>
            <path d="M12 86 C6 76 12 70 10 62 C18 68 20 74 16 82Z" fill={f(u, 'linv')} />
          </g>
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={30 + i * 11} cy={60 - (i % 4) * 8} r={0.8 + (i % 3) * 0.6} fill={p.clara} opacity=".8" filter={f(u, 'gs')} />
          ))}
        </g>
      );
    case 'ag14': // Lobo Marinho
      return (
        <g>
          <ellipse cx="100" cy="126" rx="70" ry="12" fill="#000" opacity=".4" />
          <g filter={f(u, 'gs')}>
            <path d="M44 126 C40 92 56 58 88 48 C98 40 106 34 112 22 C118 38 120 46 126 50 C150 56 170 72 188 92 C176 98 164 100 150 100 C142 112 124 120 108 124 C90 130 66 132 44 126Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.2" />
            <path d="M62 56 C70 38 82 28 92 24 C90 36 90 44 94 52Z" fill={f(u, 'linv')} stroke={p.clara} strokeWidth=".8" />
            <path d="M100 48 C112 28 126 20 138 18 C134 30 134 40 138 50Z" fill={f(u, 'linv')} stroke={p.clara} strokeWidth=".8" />
            <path d="M30 70 C36 52 48 44 60 42 M26 90 C32 72 44 62 56 60" stroke={p.clara} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85" />
            <path d="M150 100 C164 102 178 100 188 92 C170 90 158 94 148 96Z" fill="#050810" />
            <path d="M152 100 L156 108 L160 100 L164 107 L168 99" fill="#fff" stroke="#fff" strokeWidth=".4" />
            <ellipse cx="186" cy="91" rx="5" ry="3.6" fill="#030509" />
          </g>
          <ellipse cx="130" cy="68" rx="7" ry="4.6" fill="#e8fbff" filter={f(u, 'gl')} />
          <ellipse cx="131" cy="68" rx="2.4" ry="4" fill="#031428" />
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={20 + i * 17} cy={40 + ((i * 29) % 60)} r={1 + (i % 3)} fill="none" stroke={p.clara} strokeWidth=".7" opacity=".8" />
          ))}
        </g>
      );
    case 'ar13': // Falcão Tempestuoso
      return (
        <g>
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(100 90) scale(${s} 1)`} filter={f(u, 'gs')}>
              {Array.from({ length: 7 }, (_, i) => (
                <path key={i} d={`M16 ${-i * 2} C40 ${-26 - i * 4} 66 ${-30 - i * 7} ${92 - i * 3} ${-40 - i * 6} C74 ${-12 - i * 4} 46 ${6 - i * 2} 16 ${10 - i * 2}Z`} fill={i % 2 ? p.clara : '#fff'} opacity={0.92 - i * 0.07} stroke={p.cor} strokeWidth=".5" />
              ))}
            </g>
          ))}
          <g filter={f(u, 'gs')}>
            <path d="M100 124 C78 120 70 92 76 66 C80 46 92 34 104 34 C118 34 128 48 128 66 C132 92 124 120 100 124Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.2" />
            <path d="M84 70 C88 80 96 84 100 100 M116 70 C112 80 104 84 100 100" stroke={p.clara} strokeWidth="1.2" fill="none" opacity=".8" />
            <path d="M104 60 C122 62 138 68 144 88 C132 82 120 78 106 78Z" fill="#f6c84b" stroke="#a87414" strokeWidth=".8" />
            <path d="M106 74 C120 74 134 78 142 86" stroke="#7a4f08" strokeWidth=".8" fill="none" />
          </g>
          <circle cx="102" cy="56" r="8" fill="#fff8c8" filter={f(u, 'gl')} />
          <circle cx="102" cy="56" r="5" fill="#f2a91e" />
          <circle cx="102" cy="56" r="2.4" fill="#0a0502" />
          <path d="M92 48 L112 42" stroke="#052420" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M96 38 C100 28 106 24 112 22 C110 30 110 34 112 38Z" fill={p.clara} />
        </g>
      );
    case 'lu14': // Unicórnio Luminoso
      return (
        <g>
          <ellipse cx="100" cy="128" rx="70" ry="10" fill="#000" opacity=".3" />
          <g filter={f(u, 'gl')}>
            <path d="M120 -2 L126 52 L112 50Z" transform="translate(6 4) rotate(14 120 40)" fill="#fff" />
            <path d="M118 6 L124 50" stroke={p.clara} strokeWidth="1" opacity=".9" transform="translate(6 4) rotate(14 120 40)" />
          </g>
          <g filter={f(u, 'gs')}>
            <path d="M52 140 C48 96 62 66 92 52 C104 46 114 44 122 46 C132 48 150 62 164 88 C166 98 160 106 150 106 C142 106 140 100 134 98 C126 112 114 122 108 140Z" fill="#fff8e3" stroke={p.cor} strokeWidth="1.2" />
            <path d="M92 52 C60 44 38 62 30 96 C42 80 56 74 70 76 C58 90 54 108 56 124 C72 102 84 90 98 84Z" fill={f(u, 'linv')} stroke={p.clara} strokeWidth=".8" />
            <path d="M100 46 C90 32 92 22 100 14 C104 26 112 32 114 44Z" fill="#fff8e3" stroke={p.cor} strokeWidth="1" />
            <path d="M150 104 C158 108 164 100 160 94" fill="none" stroke="#e7c36a" strokeWidth="1" />
          </g>
          <ellipse cx="128" cy="62" rx="6" ry="4.4" fill="#fffbe0" />
          <ellipse cx="129" cy="62" rx="2.4" ry="3.8" fill="#6b4a06" />
          <circle cx="156" cy="96" r="2" fill="#e7c36a" />
        </g>
      );
    case 'es13': // Rato das Sombras
      return (
        <g>
          <ellipse cx="100" cy="126" rx="70" ry="12" fill="#000" opacity=".5" />
          <g filter={f(u, 'gs')}>
            <path d="M24 126 C26 92 50 68 84 62 C116 56 148 70 190 100 C166 100 150 108 132 112 C112 130 70 134 24 126Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.2" />
            <ellipse cx="82" cy="58" rx="22" ry="26" fill="#150a28" stroke={p.brilho} strokeWidth="1" />
            <ellipse cx="82" cy="58" rx="13" ry="17" fill="#42207a" opacity=".85" />
            <path d="M150 90 C168 96 182 98 192 100 C176 106 162 106 146 102Z" fill="#0e0620" />
            <circle cx="193" cy="100" r="3" fill="#ff7aa8" />
            <g stroke={p.clara} strokeWidth=".8" opacity=".85" fill="none">
              <path d="M170 98 C182 90 192 86 198 84 M172 102 C184 102 194 104 200 108 M168 94 C178 84 186 78 192 74" />
            </g>
            <path d="M24 120 C8 112 6 94 16 84 C10 100 20 108 30 108" stroke="#2a1252" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </g>
          <circle cx="134" cy="86" r="6" fill="#ff4d7e" filter={f(u, 'gl')} />
          <circle cx="135" cy="86" r="2" fill="#12020a" />
          <g fill="none" stroke={p.brilho} strokeLinecap="round" opacity=".8" filter={f(u, 'gs')}>
            <path d="M10 60 C30 70 24 90 44 100" strokeWidth="1.6" />
            <path d="M190 44 C170 60 176 74 156 84" strokeWidth="1.4" />
          </g>
        </g>
      );
  }
  return null;
}

// Colossos (um desenho para cada) -----------------------------------------------

function Colosso({ id, u, p }: { id: string; u: string; p: Pal }) {
  switch (id) {
    case 'fo16': // Elemental de Magma
      return (
        <g>
          <circle cx="100" cy="86" r="62" fill={f(u, 'hl')} opacity=".6" />
          <g stroke={p.brilho} strokeWidth="1" strokeOpacity=".5">
            <path d="M34 140 L40 98 L62 82 L82 92 L100 76 L120 92 L142 80 L162 98 L168 140Z" fill="#1b0b07" />
            <path d="M70 84 L74 52 L100 40 L126 52 L130 84 L116 96 L84 96Z" fill="#26100a" />
            <path d="M44 106 L26 84 L38 66 L62 78Z" fill="#26100a" />
            <path d="M156 106 L174 84 L162 66 L138 78Z" fill="#26100a" />
          </g>
          <g fill="none" stroke={p.brilho} strokeLinecap="round" filter={f(u, 'gl')}>
            <path d="M100 42 L96 62 L104 72 L98 92" strokeWidth="2.4" />
            <path d="M74 54 L84 66 L80 82" strokeWidth="1.8" />
            <path d="M128 56 L118 68 L124 84" strokeWidth="1.8" />
            <path d="M52 116 L66 104 L62 92 M148 116 L134 104 L140 92" strokeWidth="2" />
            <path d="M100 100 L100 140 M70 110 L76 140 M130 110 L124 140" strokeWidth="2.6" />
            <path d="M38 92 L50 98 M162 92 L150 98" strokeWidth="1.6" />
          </g>
          <path d="M84 66 L96 70 L94 76 L84 72Z M116 66 L104 70 L106 76 L116 72Z" fill="#fff6b0" filter={f(u, 'gl')} />
          <path d="M88 86 L112 86" stroke="#ffb454" strokeWidth="2.4" strokeLinecap="round" filter={f(u, 'gl')} />
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={30 + ((i * 47) % 140)} cy={20 + ((i * 29) % 100)} r={1 + (i % 3) * 0.5} fill={p.clara} opacity=".85" filter={f(u, 'gs')} />
          ))}
        </g>
      );
    case 'fo17': // Dragão Ígneo Ancestral
      return (
        <g>
          <circle cx="100" cy="74" r="66" fill={f(u, 'hl')} opacity=".7" />
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(100 70) scale(${s} 1)`}>
              <path d="M24 10 C40 -20 74 -44 108 -52 C100 -36 98 -26 104 -14 C94 -12 88 -4 90 6 C80 6 74 14 74 24 C60 18 44 20 30 30Z" fill="#2a0905" stroke={p.brilho} strokeWidth="1.1" />
              <path d="M30 14 C52 0 80 -16 104 -48 M34 24 C54 12 76 4 92 2 M44 30 C58 22 70 18 76 20" fill="none" stroke={p.brilho} strokeWidth=".8" opacity=".85" />
            </g>
          ))}
          <g filter={f(u, 'gs')}>
            <path d="M78 20 C70 4 76 -4 86 -10 C84 4 92 14 100 18 C108 14 116 4 114 -10 C124 -4 130 4 122 20Z" fill="#1e0704" stroke={p.clara} strokeWidth="1.2" />
            <path d="M84 22 C76 34 78 60 92 84 C96 96 104 96 108 84 C122 60 124 34 116 22 C108 28 92 28 84 22Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.2" />
            <path d="M86 86 C94 102 106 102 114 86 C108 106 92 106 86 86Z" fill="#120302" />
            <path d="M92 52 C96 50 104 50 108 52 M90 60 C96 58 104 58 110 60" stroke={p.clara} strokeWidth="1" fill="none" opacity=".8" />
            <path d="M96 66 a2.4 3 0 1 0 0 .1 M104 66 a2.4 3 0 1 0 0 .1" fill="#050203" />
          </g>
          <g filter={f(u, 'gl')}>
            <path d="M80 34 L94 40 L92 46 L78 42Z M120 34 L106 40 L108 46 L122 42Z" fill="#ffe27a" />
            <path d="M80 36 L92 42 M120 36 L108 42" stroke="#1a0602" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M94 100 C96 112 104 112 106 100 C108 120 100 130 100 138 C100 130 92 120 94 100Z" fill={f(u, 'linv')} />
          </g>
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(100 18) scale(${s} 1)`} filter={f(u, 'gs')}>
              <path d="M12 8 C24 -4 24 -22 14 -38 C32 -26 40 -8 30 8Z" fill="#fff0c0" stroke={p.clara} strokeWidth=".8" />
            </g>
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={20 + ((i * 43) % 160)} cy={30 + ((i * 31) % 100)} r={0.9 + (i % 3) * 0.6} fill={p.clara} opacity=".9" filter={f(u, 'gs')} />
          ))}
        </g>
      );
    case 'ag16': // Kraken Abissal
      return (
        <g>
          <circle cx="100" cy="70" r="62" fill={f(u, 'hl')} opacity=".5" />
          <g fill="none" strokeLinecap="round" filter={f(u, 'gs')}>
            {[
              'M70 96 C40 100 22 80 26 52 C28 40 38 36 42 46',
              'M80 106 C54 124 24 118 12 96 C8 88 16 82 20 90',
              'M92 112 C84 132 62 140 40 134',
              'M130 96 C160 100 178 80 174 52 C172 40 162 36 158 46',
              'M120 106 C146 124 176 118 188 96 C192 88 184 82 180 90',
              'M108 112 C116 132 138 140 160 134',
            ].map((d, i) => (
              <g key={i}>
                <path d={d} stroke={p.escura} strokeWidth="11" />
                <path d={d} stroke={f(u, 'lin')} strokeWidth="8" />
                <path d={d} stroke="#fff" strokeWidth="1.4" opacity=".45" strokeDasharray="1 7" />
              </g>
            ))}
          </g>
          <path d="M52 92 C52 42 76 22 100 22 C124 22 148 42 148 92 C148 112 124 120 100 120 C76 120 52 112 52 92Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.4" filter={f(u, 'gs')} />
          <path d="M62 56 C72 38 88 30 100 30" stroke={p.clara} strokeWidth="1.6" fill="none" opacity=".7" strokeLinecap="round" />
          <ellipse cx="100" cy="72" rx="28" ry="22" fill="#e8fbff" filter={f(u, 'gl')} />
          <ellipse cx="100" cy="72" rx="20" ry="20" fill="#1fa0d8" />
          <circle cx="100" cy="72" r="14" fill="#0a5f90" />
          <ellipse cx="100" cy="72" rx="5.4" ry="15" fill="#020a14" />
          <ellipse cx="92" cy="62" rx="4" ry="3" fill="#fff" opacity=".85" />
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={20 + i * 14} cy={20 + ((i * 37) % 90)} r={1.4 + (i % 3)} fill="none" stroke={p.clara} strokeWidth=".7" opacity=".8" />
          ))}
        </g>
      );
    case 'ag17': // Leviatã das Profundezas
      return (
        <g>
          <circle cx="100" cy="72" r="64" fill={f(u, 'hl')} opacity=".5" />
          <g filter={f(u, 'gs')}>
            <path d="M-6 130 C20 90 40 128 64 100 C80 82 78 56 96 44 C112 32 138 34 154 46 C170 56 188 62 206 58 C190 76 176 80 160 82 C170 92 188 98 206 98 C186 112 164 112 148 104 C132 116 108 112 96 124 C70 142 40 114 22 138 C14 140 4 140 -6 138Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.3" />
            <path d="M150 52 L158 76 L132 82 L142 60Z" fill="#fff" opacity=".9" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path key={i} d={`M${154 + i * 7} ${82 - i * 0.2} L${157 + i * 7} ${92 + (i % 2) * 2} L${160 + i * 7} ${83}`} fill="#fff" />
            ))}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} d={`M${78 + i * 12} ${60 - i * 1.5} L${82 + i * 12} ${38 - i * 2} L${88 + i * 12} ${58 - i * 1.5}`} fill={f(u, 'linv')} stroke={p.clara} strokeWidth=".7" />
            ))}
            <path d="M34 112 C50 96 64 106 80 90 M40 124 C56 112 70 120 88 104" stroke={p.clara} strokeWidth="1" fill="none" opacity=".6" />
          </g>
          <ellipse cx="122" cy="56" rx="7.5" ry="5" fill="#e8fbff" filter={f(u, 'gl')} />
          <ellipse cx="123" cy="56" rx="2.4" ry="4.4" fill="#021224" />
          <path d="M162 60 C176 60 192 58 204 54" stroke="#031428" strokeWidth="2" fill="none" />
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={10 + i * 12} cy={110 + ((i * 17) % 30)} r={1 + (i % 3)} fill="none" stroke={p.clara} strokeWidth=".7" opacity=".7" />
          ))}
        </g>
      );
    case 'te16': // Ent Ancestral
      return (
        <g>
          <circle cx="100" cy="80" r="62" fill={f(u, 'hl')} opacity=".35" />
          <g filter={f(u, 'gs')}>
            <path d="M30 140 C34 112 44 96 60 80 C54 62 52 40 66 24 C76 12 90 10 100 10 C112 10 126 14 134 26 C148 40 146 62 140 80 C156 96 166 112 170 140Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.2" />
            <g stroke="#120a03" strokeWidth="1.4" fill="none" opacity=".85">
              <path d="M60 30 C54 50 62 70 56 96 M76 24 C70 44 78 60 72 82 M124 24 C130 44 122 60 128 82 M140 30 C146 50 138 70 144 96 M44 120 C56 110 62 120 70 112" />
            </g>
            {[
              [20, 56],
              [178, 50],
              [40, 28],
              [160, 22],
              [14, 100],
              [186, 96],
            ].map(([x, y], i) => (
              <g key={i}>
                <path d={`M${x < 100 ? 56 : 144} ${60 + (i % 3) * 8} C${(x + (x < 100 ? 56 : 144)) / 2} ${y - 8} ${x} ${y + 6} ${x} ${y}`} stroke="#3b2a12" strokeWidth="5" fill="none" strokeLinecap="round" />
                <ellipse cx={x} cy={y} rx="12" ry="8" fill="#4f7d1d" stroke="#9ccc4a" strokeWidth=".8" transform={`rotate(${i * 30} ${x} ${y})`} />
                <ellipse cx={x - 3} cy={y - 2} rx="6" ry="3" fill="#a3d44f" opacity=".7" transform={`rotate(${i * 30} ${x} ${y})`} />
              </g>
            ))}
          </g>
          <path d="M72 62 C76 52 90 52 94 62 C90 68 76 68 72 62Z M106 62 C110 52 124 52 128 62 C124 68 110 68 106 62Z" fill="#0a0602" />
          <ellipse cx="83" cy="62" rx="6" ry="4.4" fill="#ffd04a" filter={f(u, 'gl')} />
          <ellipse cx="117" cy="62" rx="6" ry="4.4" fill="#ffd04a" filter={f(u, 'gl')} />
          <path d="M84 96 C96 104 104 104 116 96 C112 108 88 108 84 96Z" fill="#0a0602" />
          <path d="M96 70 C98 80 102 80 104 70" stroke="#120a03" strokeWidth="2.4" fill="none" />
          <ellipse cx="62" cy="116" rx="18" ry="5" fill="#7aa332" opacity=".85" />
          <ellipse cx="140" cy="122" rx="22" ry="5" fill="#6f9a2c" opacity=".85" />
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={20 + ((i * 53) % 160)} cy={30 + ((i * 41) % 100)} r={1 + (i % 3) * 0.5} fill="#d4f28a" opacity=".85" filter={f(u, 'gs')} />
          ))}
        </g>
      );
    case 'te17': // Golem Primordial
      return (
        <g>
          <circle cx="100" cy="80" r="62" fill={f(u, 'hl')} opacity=".4" />
          <g filter={f(u, 'gs')} stroke="#120c05" strokeWidth="1.2">
            <path d="M18 140 L24 100 L52 84 L70 92 L80 80 L120 80 L130 92 L148 84 L176 100 L182 140Z" fill="#47361f" />
            <path d="M20 100 L8 82 L22 62 L52 70 L56 92Z" fill="#5a4426" />
            <path d="M180 100 L192 82 L178 62 L148 70 L144 92Z" fill="#5a4426" />
            <path d="M68 82 L72 40 L92 26 L108 26 L128 40 L132 82 L116 92 L84 92Z" fill="#6b5030" />
            <path d="M72 40 L92 26 L108 26 L128 40 L110 46 L90 46Z" fill="#8a6a3b" />
            <path d="M20 100 L52 84 M148 84 L180 100" stroke={p.clara} strokeOpacity=".5" fill="none" />
          </g>
          <g stroke={p.brilho} strokeWidth="1.6" fill="none" strokeLinecap="round" filter={f(u, 'gl')}>
            <path d="M100 100 V134 M82 108 L90 124 M118 108 L110 124" />
            <path d="M34 112 L44 120 M166 112 L156 120 M30 84 L40 90 M170 84 L160 90" />
            <path d="M98 96 L102 96" />
          </g>
          <path d="M80 56 L94 60 L92 66 L80 62Z M120 56 L106 60 L108 66 L120 62Z" fill="#c8ff6a" filter={f(u, 'gl')} />
          <path d="M88 76 H112" stroke="#120c05" strokeWidth="3" />
          <path d="M92 38 H108 M96 44 H104" stroke={p.brilho} strokeWidth="1.4" opacity=".9" filter={f(u, 'gs')} />
          <path d="M14 86 C20 80 20 70 14 66 M186 86 C180 80 180 70 186 66" stroke="#7aa332" strokeWidth="3" fill="none" />
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={20 + ((i * 47) % 160)} cy={20 + ((i * 37) % 110)} r={0.8 + (i % 3) * 0.5} fill="#e7d39b" opacity=".7" />
          ))}
        </g>
      );
    case 'ar17': // Senhor das Tempestades
      return (
        <g>
          <circle cx="100" cy="64" r="64" fill={f(u, 'hl')} opacity=".6" />
          <g filter={f(u, 'bl2')} opacity=".85">
            <ellipse cx="40" cy="30" rx="44" ry="16" fill="#0d3b36" />
            <ellipse cx="170" cy="24" rx="46" ry="14" fill="#0d3b36" />
            <ellipse cx="100" cy="12" rx="60" ry="10" fill="#0a2f2b" />
          </g>
          <g filter={f(u, 'gs')}>
            <path d="M100 40 C70 40 50 70 40 110 L20 140 L180 140 L160 110 C150 70 130 40 100 40Z" fill={f(u, 'fig')} stroke={p.brilho} strokeWidth="1.1" />
            <path d="M40 110 C20 100 6 84 2 62 C22 74 34 80 48 80Z M160 110 C180 100 194 84 198 62 C178 74 166 80 152 80Z" fill={p.escura} stroke={p.brilho} strokeWidth="1" />
            <path d="M84 56 C86 44 114 44 116 56 C118 72 108 82 100 82 C92 82 82 72 84 56Z" fill="#06231f" />
            <path d="M84 100 L100 110 L116 100" stroke={p.clara} strokeWidth="1.4" fill="none" />
          </g>
          <Olhos u={u} y={62} sep={8.5} w={6} cor="#fff" />
          <g filter={f(u, 'gl')} fill="#fff" stroke={p.brilho} strokeWidth=".8">
            <polygon points="82,46 86,22 92,40 96,12 100,38 104,12 108,40 114,22 118,46" fill={p.clara} />
          </g>
          <g stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" filter={f(u, 'gl')}>
            <path d="M24 50 L34 70 L26 74 L38 98" />
            <path d="M176 44 L166 66 L174 70 L162 94" />
          </g>
          <circle cx="100" cy="100" r="9" fill={f(u, 'b1')} filter={f(u, 'gl')} />
          <g fill="none" stroke={p.clara} strokeLinecap="round" opacity=".8">
            <path d="M-5 128 C40 112 70 134 110 120 S180 126 205 116" strokeWidth="1.2" />
            <path d="M-5 100 C30 90 60 108 90 96" strokeWidth=".9" />
          </g>
        </g>
      );
    case 'es17': // Senhor da Escuridão
      return (
        <g>
          <circle cx="100" cy="60" r="64" fill={f(u, 'hl')} opacity=".55" />
          <circle cx="100" cy="64" r="48" fill="none" stroke={p.brilho} strokeWidth="1.4" opacity=".8" filter={f(u, 'gl')} />
          <g fill="none" strokeLinecap="round" filter={f(u, 'gs')}>
            <path d="M-5 120 C30 110 40 80 24 52 S30 18 16 4" stroke="#3b1a6e" strokeWidth="6" />
            <path d="M205 118 C170 108 160 78 176 50 S170 16 184 2" stroke="#3b1a6e" strokeWidth="6" />
            <path d="M-5 120 C30 110 40 80 24 52 S30 18 16 4" stroke={p.brilho} strokeWidth="1" />
            <path d="M205 118 C170 108 160 78 176 50 S170 16 184 2" stroke={p.brilho} strokeWidth="1" />
          </g>
          <g filter={f(u, 'gs')}>
            <path d="M100 46 C72 46 54 76 46 120 L28 140 L172 140 L154 120 C146 76 128 46 100 46Z" fill="#0b0418" stroke={p.brilho} strokeWidth="1.2" />
            <path d="M44 122 C30 126 20 134 12 140 M156 122 C170 126 180 134 188 140" stroke={p.brilho} strokeWidth="1" fill="none" opacity=".8" />
            <path d="M82 60 C84 46 116 46 118 60 C120 76 110 88 100 88 C90 88 80 76 82 60Z" fill="#000" />
            <path d="M70 52 C62 38 56 22 62 4 C68 22 74 30 82 38Z M130 52 C138 38 144 22 138 4 C132 22 126 30 118 38Z" fill="#0b0418" stroke={p.brilho} strokeWidth="1.1" />
            <path d="M84 40 L88 24 L94 38 L100 18 L106 38 L112 24 L116 40Z" fill="#12062a" stroke={p.clara} strokeWidth="1" />
          </g>
          <path d="M84 62 L96 66 L94 71 L84 67Z M116 62 L104 66 L106 71 L116 67Z" fill={p.clara} filter={f(u, 'gl')} />
          <path d="M92 78 C96 82 104 82 108 78" stroke={p.brilho} strokeWidth="1.2" fill="none" opacity=".8" />
          <circle cx="100" cy="104" r="8" fill="#000" stroke={p.clara} strokeWidth="1.4" filter={f(u, 'gl')} />
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={14 + ((i * 59) % 172)} cy={10 + ((i * 41) % 110)} r={0.8 + (i % 3) * 0.5} fill={p.clara} opacity=".8" filter={f(u, 'gs')} />
          ))}
        </g>
      );
  }
  return null;
}

function Retrato({ c, u, p }: { c: Carta; u: string; p: Pal }) {
  switch (c.arquetipo) {
    case 'guerreiro':
      return <Guerreiro c={c} u={u} p={p} />;
    case 'mago':
      return <Mago c={c} u={u} p={p} />;
    case 'espirito':
      return <Espirito el={c.el} u={u} p={p} />;
    case 'fera':
      return <Fera id={c.id} u={u} p={p} />;
    default:
      return <Colosso id={c.id} u={u} p={p} />;
  }
}

// ---------------------------------------------------------------------------
// A pintura completa de uma carta
// ---------------------------------------------------------------------------

export const ArteDaCarta = memo(function ArteDaCarta({ id, className, style }: { id: string; className?: string; style?: React.CSSProperties }) {
  const c = carta(id);
  const p = ELEMENTOS[c.el];
  const u = useId().replace(/[^a-zA-Z0-9]/g, '') + '_';
  const seed = hash(id);
  const v = rng(seed + 99);
  const flip = v() > 0.5 ? -1 : 1;
  const zoom = 1.08 + v() * 0.34;
  const dx = (v() - 0.5) * 2 * (100 - 100 / zoom) * 0.9;
  const dy = (v() - 0.5) * 2 * (70 - 70 / zoom) * 0.9;
  const hue = Math.round((v() - 0.5) * 22);
  const flipE = v() > 0.5 ? -1 : 1;
  const sc = 0.92 + Math.min(c.custo, 6) * 0.03;
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" className={className} style={style} role="img" aria-label={c.nome}>
      <Defs u={u} p={p} />
      <g transform={`translate(100 70) scale(${(flip * zoom).toFixed(3)} ${zoom.toFixed(3)}) translate(${(-100 + dx).toFixed(2)} ${(-70 + dy).toFixed(2)})`} style={{ filter: `hue-rotate(${hue}deg)` }}>
        <Cenario el={c.el} u={u} seed={seed} />
      </g>
      {c.tipo === 'personagem' && <rect width="200" height="140" fill="#000" opacity=".28" />}
      {c.tipo === 'magia' ? (
        <g transform={`translate(100 72) scale(${(flipE * sc).toFixed(3)} ${sc.toFixed(3)}) translate(-100 -72)`}>
          <EmblemaArte tipo={emblemaDe(c)} el={c.el} u={u} seed={seed + 11} custo={c.custo} />
        </g>
      ) : (
        <Retrato c={c} u={u} p={p} />
      )}
      <rect width="200" height="140" fill={f(u, 'vg')} />
      <rect width="200" height="140" filter={f(u, 'gr')} opacity=".22" style={{ mixBlendMode: 'overlay' }} />
    </svg>
  );
});

/** Arte das cartas de mana: o cristal do elemento, lapidado. */
export const ArteDaMana = memo(function ArteDaMana({ el, valor, className, style }: { el: Elemento; valor: 1 | 2; className?: string; style?: React.CSSProperties }) {
  const p = ELEMENTOS[el];
  const u = useId().replace(/[^a-zA-Z0-9]/g, '') + '_';
  const seed = hash(el + valor);
  const r = rng(seed + 5);
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" className={className} style={style} role="img" aria-label={`Mana de ${p.nome}`}>
      <Defs u={u} p={p} />
      <Cenario el={el} u={u} seed={seed} />
      <rect width="200" height="140" fill="#000" opacity=".25" />
      <ellipse cx="100" cy="74" rx="62" ry="58" fill={f(u, 'hl')} />
      <g transform="translate(100 72)" filter={f(u, 'gl')}>
        {valor === 1 ? (
          <>
            <polygon points="0,-42 28,-16 20,30 0,44 -20,30 -28,-16" fill={f(u, 'linv')} stroke="#fff" strokeOpacity=".8" strokeWidth="1.2" />
            <polygon points="0,-42 28,-16 0,-4 -28,-16" fill="#fff" opacity=".45" />
            <polygon points="0,-4 28,-16 20,30 0,44" fill="#000" opacity=".28" />
            <path d="M-28 -16 L0 -4 L28 -16 M0 -4 V44" stroke="#fff" strokeOpacity=".55" strokeWidth=".9" fill="none" />
          </>
        ) : (
          <>
            <polygon points="-46,-4 -22,-34 22,-34 46,-4 22,40 -22,40" fill={f(u, 'linv')} stroke="#fff" strokeOpacity=".8" strokeWidth="1.3" />
            <polygon points="-22,-34 22,-34 12,-6 -12,-6" fill="#fff" opacity=".5" />
            <polygon points="-46,-4 -22,-34 -12,-6 -22,40" fill="#fff" opacity=".18" />
            <polygon points="12,-6 22,-34 46,-4 22,40" fill="#000" opacity=".3" />
            <path d="M-46 -4 L-12 -6 L12 -6 L46 -4 M-12 -6 L-22 40 M12 -6 L22 40" stroke="#fff" strokeOpacity=".5" strokeWidth=".9" fill="none" />
            <circle cx="0" cy="12" r="10" fill={f(u, 'b1')} />
          </>
        )}
      </g>
      {Array.from({ length: 18 }, (_, i) => (
        <path key={i} d={estrela4(1.4 + r() * 2.2)} transform={`translate(${r() * 200} ${r() * 140})`} fill="#fff" opacity={0.4 + r() * 0.6} filter={f(u, 'gs')} />
      ))}
      <rect width="200" height="140" fill={f(u, 'vg')} />
    </svg>
  );
});

/** O símbolo de cada elemento (chama, gota, montanha, vento, sol, lua) em 24×24. */
export function Glifo({ el, className, style }: { el: Elemento; className?: string; style?: React.CSSProperties }) {
  const paths: Record<Elemento, React.ReactNode> = {
    fogo: <path d="M12 2 C13 7 18 9 18 15 A6 6 0 0 1 6 15 C6 11 9 10 9 6 C10 7 11 7.5 12 2Z M12 21 a3 3 0 0 1 -3 -3 c0 -2 2 -3 3 -5 c1 2 3 3 3 5 a3 3 0 0 1 -3 3Z" fill="currentColor" fillRule="evenodd" />,
    agua: <path d="M12 2 C16 8 19 11 19 15 A7 7 0 0 1 5 15 C5 11 8 8 12 2Z M8.5 15 a3.5 3.5 0 0 0 3 3.4" fill="currentColor" fillRule="evenodd" />,
    terra: <path d="M2 20 L9 7 L13 13 L16 9 L22 20Z M9 7 L11 11 L7 11Z" fill="currentColor" />,
    ar: <path d="M3 8 H14 a3 3 0 1 0 -3 -3 M3 13 H18 a3 3 0 1 1 -3 3 M3 18 H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />,
    luz: (
      <g fill="currentColor">
        <circle cx="12" cy="12" r="4.4" />
        {Array.from({ length: 8 }, (_, i) => (
          <polygon key={i} points="12,1.5 13.4,6 10.6,6" transform={`rotate(${i * 45} 12 12)`} />
        ))}
      </g>
    ),
    escuridao: <path d="M20 14.5 A9 9 0 1 1 9.5 4 A7 7 0 0 0 20 14.5Z" fill="currentColor" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      {paths[el]}
    </svg>
  );
}
