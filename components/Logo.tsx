import React from 'react';
import { SELO_ANEL, SELO_PONTOS, SELO_R_PONTO } from '@/lib/selo';

/**
 * Marca da nexo.social.
 *
 * O "D" é de cantos retos à esquerda e arredondados à direita, cortado por uma
 * fenda diagonal fina. Ele aparece de dois jeitos:
 *
 *   - <Selo />: o selo completo — disco de papel, "D" ao centro e o anel
 *     "NEXO • SOCIAL • CULTURA • NOVIDADE". É o mesmo de public/logo.svg e dos
 *     ícones do app. `girar` faz o anel de palavras rodar devagar.
 *   - <LogoMark />: só o "D" (ou o "D" no disco, com `disco`), para tamanhos em
 *     que o anel de texto não se lê — barra lateral, favicon.
 */
export const MONOGRAMA = {
  esquerda: 'M14.9 16.1H61.6A20.5 20.5 0 0 1 65.1 16.4L35.73 84.6H14.9Z',
  direita: 'M66.69 16.74A20.5 20.5 0 0 1 82.1 36.6V60.3A24.3 24.3 0 0 1 57.8 84.6H37.47Z',
};

/** Posição do "D" (desenhado em 0–100) dentro do selo (0–200). */
const D_NO_SELO = 'translate(50.05 46.94) scale(1.03)';

export function Selo({
  size = 120,
  girar = false,
  textura = false,
  className = '',
}: {
  size?: number;
  girar?: boolean;
  /** Grão de carimbo no "D", como na arte original — só em tamanhos grandes. */
  textura?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`selo ${className}`}
      role="img"
      aria-label="nexo.social — nexo, social, cultura, novidade"
    >
      {textura && (
        <defs>
          <filter id="selo-grao" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="ruido" />
            <feColorMatrix
              in="ruido"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  16 0 0 0 -11.2"
              result="pintas"
            />
            <feComposite in="pintas" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      )}
      <circle cx="100" cy="100" r="96" className="selo__papel" />
      <g className="selo__tinta">
        <g className={girar ? 'selo__anel selo__anel--gira' : 'selo__anel'}>
          <path d={SELO_ANEL} />
          {SELO_PONTOS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={SELO_R_PONTO} />
          ))}
        </g>
        <g transform={D_NO_SELO}>
          <path d={MONOGRAMA.esquerda} />
          <path d={MONOGRAMA.direita} />
          {textura && (
            <g filter="url(#selo-grao)" className="selo__grao">
              <path d={MONOGRAMA.esquerda} />
              <path d={MONOGRAMA.direita} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

export function LogoMark({
  size = 32,
  disco = false,
  className = '',
}: {
  size?: number;
  /** Desenha o "D" dentro do disco de papel do selo. */
  disco?: boolean;
  className?: string;
}) {
  return (
    // Sem o disco, recorta justo no monograma: o "D" ocupa o tamanho pedido
    // em vez de ficar pequeno no meio das margens.
    <svg
      width={size}
      height={size}
      viewBox={disco ? '0 0 100 100' : '12 14 73 73'}
      className={className}
      role="img"
      aria-label="nexo.social"
    >
      {disco && <circle cx="50" cy="50" r="48" className="selo__papel" />}
      <g className={disco ? 'selo__tinta' : undefined} fill={disco ? undefined : 'currentColor'}>
        <g transform={disco ? 'translate(18.96 17.18) scale(0.64)' : undefined}>
          <path d={MONOGRAMA.esquerda} />
          <path d={MONOGRAMA.direita} />
        </g>
      </g>
    </svg>
  );
}

export default LogoMark;
