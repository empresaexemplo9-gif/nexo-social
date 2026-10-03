'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IconeDado } from './CartaArcana';
import { ELEMENTOS, type Elemento, type Faces } from '@/lib/jogos/arcanos/cartas';

// O dado que rola na mesa. O d6 é um cubo de verdade que gira em 3D e pousa
// com a face sorteada para cima; os outros modelos (d3 a d20) são gemas
// facetadas que tombam em três eixos, mudam de número enquanto giram e param
// no valor que o motor sorteou.

const POSICAO_DA_FACE: Record<number, string> = {
  1: 'rotateY(0deg)',
  2: 'rotateY(90deg)',
  3: 'rotateX(90deg)',
  4: 'rotateX(-90deg)',
  5: 'rotateY(-90deg)',
  6: 'rotateY(180deg)',
};
/** Quanto girar o cubo para mostrar cada face de frente. */
const GIRO_FINAL: Record<number, [number, number]> = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

export function Dado3D({
  faces,
  valor,
  el,
  tamanho = 84,
  duracao = 1100,
  atraso = 0,
  aoPousar,
}: {
  faces: Faces;
  valor: number;
  el: Elemento;
  tamanho?: number;
  duracao?: number;
  atraso?: number;
  aoPousar?: () => void;
}) {
  const p = ELEMENTOS[el];
  const corpo = useRef<HTMLDivElement>(null);
  const [mostra, setMostra] = useState<number | null>(null);
  const [pousou, setPousou] = useState(false);
  const aoRef = useRef(aoPousar);
  aoRef.current = aoPousar;

  useEffect(() => {
    const alvo = corpo.current;
    if (!alvo) return;
    setPousou(false);
    let cancelado = false;
    let tick: ReturnType<typeof setInterval> | undefined;
    const t0 = setTimeout(() => {
      if (cancelado) return;
      const giros = () => (Math.floor(Math.random() * 3) + 2) * 360;
      let anim: Animation | undefined;
      if (faces === 6) {
        const [ax, ay] = GIRO_FINAL[valor] ?? [0, 0];
        const ini = `rotateX(${Math.round(Math.random() * 360)}deg) rotateY(${Math.round(Math.random() * 360)}deg) rotateZ(${Math.round(Math.random() * 90)}deg)`;
        anim = alvo.animate([{ transform: ini }, { transform: `rotateX(${ax + giros()}deg) rotateY(${ay + giros()}deg) rotateZ(0deg)` }], { duration: duracao, easing: 'cubic-bezier(.18,.7,.25,1)', fill: 'forwards' });
      } else {
        anim = alvo.animate(
          [
            { transform: `rotateX(${Math.round(Math.random() * 360)}deg) rotateY(${Math.round(Math.random() * 360)}deg) rotateZ(${Math.round(Math.random() * 360)}deg)` },
            { transform: `rotateX(${giros()}deg) rotateY(${giros()}deg) rotateZ(${giros()}deg)` },
          ],
          { duration: duracao, easing: 'cubic-bezier(.18,.7,.25,1)', fill: 'forwards' },
        );
        tick = setInterval(() => setMostra(Math.floor(Math.random() * faces) + 1), 70);
      }
      void anim;
      setTimeout(() => {
        if (cancelado) return;
        if (tick) clearInterval(tick);
        setMostra(valor);
        setPousou(true);
        aoRef.current?.();
      }, duracao);
    }, atraso);
    return () => {
      cancelado = true;
      clearTimeout(t0);
      if (tick) clearInterval(tick);
    };
  }, [faces, valor, duracao, atraso]);

  const s = tamanho;
  const meio = s / 2;
  return (
    <div className="relative" style={{ width: s, height: s, perspective: s * 6 }} aria-label={`dado de ${faces} faces: ${valor}`}>
      <div className="pointer-events-none absolute left-1/2 top-[88%] h-[16%] w-[90%] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,.55), transparent 70%)', filter: 'blur(3px)', opacity: pousou ? 1 : 0.55, transition: 'opacity .3s' }} />
      <div
        ref={corpo}
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d', filter: pousou ? `drop-shadow(0 0 10px ${p.brilho})` : `drop-shadow(0 0 5px ${p.brilho}88)`, transition: 'filter .3s' }}
      >
        {faces === 6 ? (
          [1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="absolute inset-0 rounded-[18%]"
              style={{
                transform: `${POSICAO_DA_FACE[n]} translateZ(${meio}px)`,
                background: `radial-gradient(circle at 30% 24%, #ffffff 0%, ${p.clara} 28%, ${p.cor} 72%, ${p.escura} 100%)`,
                boxShadow: `inset 0 0 ${s * 0.16}px rgba(0,0,0,.55), inset 0 0 0 ${Math.max(1.5, s * 0.03)}px ${p.escura}`,
                backfaceVisibility: 'hidden',
              }}
            >
              <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
                {PIPS[n].map(([x, y], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r="9.5" fill={p.escura} />
                    <circle cx={x - 2} cy={y - 2} r="3" fill="#fff" opacity=".35" />
                  </g>
                ))}
              </svg>
            </div>
          ))
        ) : (
          <>
            {[-0.1, -0.05, 0, 0.05, 0.1].map((z) => (
              <div key={z} className="absolute inset-0" style={{ transform: `translateZ(${z * s}px)`, opacity: z === 0 ? 1 : 0.9, filter: z === 0 ? undefined : 'brightness(.7)' }}>
                <IconeDado faces={faces} tamanho={s} valor={z === 0 ? mostra ?? faces : ''} cor={p.clara} borda={p.escura} texto={p.escura} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
