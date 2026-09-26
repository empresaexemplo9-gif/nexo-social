import React from 'react';
import { urlPublica } from '@/lib/imagens-url';

/**
 * Foto de perfil (ou imagem do grupo) redonda; sem imagem, a inicial do nome.
 * `path` é o caminho no bucket público "perfis".
 */
export default function Avatar({
  nome,
  path,
  tamanho = 32,
  quadrado = false,
  pendente = false,
  className = '',
}: {
  nome: string;
  path?: string | null;
  tamanho?: number;
  /** Cantos arredondados em vez de círculo (imagem de grupo). */
  quadrado?: boolean;
  /** Convite ainda não aceito: contorno tracejado. */
  pendente?: boolean;
  className?: string;
}) {
  const src = urlPublica(path);
  const forma = quadrado ? 'rounded-2xl' : 'rounded-full';
  const estilo = { width: tamanho, height: tamanho };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={tamanho}
        height={tamanho}
        loading="lazy"
        style={estilo}
        className={`shrink-0 object-cover ${forma} ${pendente ? 'opacity-60' : ''} ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...estilo, fontSize: Math.max(10, tamanho * 0.4) }}
      className={`flex shrink-0 items-center justify-center font-bold uppercase ${forma} ${
        pendente ? 'border border-dashed border-zinc-700 text-zinc-500' : 'bg-emerald-500/15 text-emerald-300'
      } ${quadrado ? 'font-display' : ''} ${className}`}
    >
      {(nome || '?').trim().slice(0, 1)}
    </span>
  );
}
