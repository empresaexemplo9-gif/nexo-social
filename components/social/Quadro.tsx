import React from 'react';
import { ABAS_DA_COMUNIDADE, capaDoQuadro, miniDoQuadro, type AbaDaComunidade, type Quadro } from '@/lib/comunidade-quadros';

/** O selinho redondo do quadro (recorte do mural) que vai nos botões e etiquetas. */
export function MiniDoQuadro({ quadro, className = '' }: { quadro: Quadro; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={miniDoQuadro(quadro)} alt="" aria-hidden width={22} height={22} loading="lazy" decoding="async" className={`q-mini ${className}`} />;
}

/** A capa de cada aba da Comunidade: o quadro do mural e o título sobre o escuro. */
export function CapaDaAba({ aba, children }: { aba: AbaDaComunidade; children?: React.ReactNode }) {
  const a = ABAS_DA_COMUNIDADE[aba];
  return (
    <header className="q-capa" data-quadro={a.quadro}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={capaDoQuadro(a.quadro)} alt="" aria-hidden className="q-capa__img" decoding="async" />
      <div className="relative flex min-h-[9.5rem] flex-col justify-center gap-1.5 p-5 pb-7 sm:max-w-[58%] sm:p-7 sm:pb-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">Comunidade · {a.rotulo}</p>
        <h2 className="font-display text-3xl font-bold leading-none text-white sm:text-4xl">{a.titulo}</h2>
        <p className="text-sm leading-snug text-white/80">{a.texto}</p>
        {children}
      </div>
    </header>
  );
}
