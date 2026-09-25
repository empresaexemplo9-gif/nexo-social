import React from 'react';

/**
 * Logo do nexo.social em SVG — vetorial, nítido em qualquer tamanho.
 *
 * O monograma é um "D" de cantos retos à esquerda e arredondados à direita,
 * cortado por uma fenda diagonal fina, em preto sobre um bloco creme de cantos
 * arredondados. A geometria foi medida na arte de referência e é a mesma de
 * public/logo.svg e dos ícones do app (public/icon-*.png).
 *
 * Com `bloco={false}` sai só o monograma, na cor do texto (currentColor) —
 * útil sobre fundos claros ou em versão monocromática.
 */
export const MONOGRAMA = {
  esquerda: 'M14.9 16.1H61.6A20.5 20.5 0 0 1 65.1 16.4L35.73 84.6H14.9Z',
  direita: 'M66.69 16.74A20.5 20.5 0 0 1 82.1 36.6V60.3A24.3 24.3 0 0 1 57.8 84.6H37.47Z',
};

export function LogoMark({
  size = 32,
  bloco = true,
  className = '',
}: {
  size?: number;
  bloco?: boolean;
  className?: string;
}) {
  const tinta = bloco ? '#000' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="nexo.social">
      {bloco && <rect width="100" height="100" rx="12" fill="#f8f1e9" />}
      <path fill={tinta} d={MONOGRAMA.esquerda} />
      <path fill={tinta} d={MONOGRAMA.direita} />
    </svg>
  );
}

export default LogoMark;
