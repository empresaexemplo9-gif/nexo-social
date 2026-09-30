'use client';

import React from 'react';
import { ARTE } from '@/lib/jogos/arte';

/** Um ícone de game-icons.net (CC BY 3.0), na cor do texto. */
export default function Arte({ nome, className = '', style, titulo }: { nome: string; className?: string; style?: React.CSSProperties; titulo?: string }) {
  const corpo = ARTE[nome];
  if (!corpo) return null;
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      style={style}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      // Conteúdo fixo, gerado de um pacote conhecido (lib/jogos/arte.ts).
      dangerouslySetInnerHTML={{ __html: corpo }}
    />
  );
}
