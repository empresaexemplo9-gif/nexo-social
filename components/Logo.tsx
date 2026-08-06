import React from 'react';

/**
 * Monograma do nexo.social em SVG — vetorial, nítido em qualquer tamanho.
 * `gradient` usa o teal da marca; sem ele, herda a cor do texto (currentColor),
 * útil sobre fundos claros ou em versão monocromática.
 */
export function LogoMark({
  size = 32,
  gradient = true,
  className = '',
}: {
  size?: number;
  gradient?: boolean;
  className?: string;
}) {
  // Id único por instância evita colisão quando o logo aparece mais de uma vez.
  const id = React.useId().replace(/:/g, '');
  const fill = gradient ? `url(#${id})` : 'currentColor';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="nexo.social">
      {gradient && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2bb8b2" />
            <stop offset="1" stopColor="#0f7f7d" />
          </linearGradient>
        </defs>
      )}
      <path fill={fill} d="M12 6 H60 L44 94 H12 a6 6 0 0 1 -6 -6 V12 a6 6 0 0 1 6 -6 Z" />
      <path fill={fill} d="M68 6 H56 a44 44 0 0 1 0 88 H52 Z" />
    </svg>
  );
}

export default LogoMark;
