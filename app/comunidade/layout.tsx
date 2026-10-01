import React from 'react';

/**
 * Toda a Comunidade (/comunidade/…) é o muro da marca: os murais ao fundo,
 * tinta clara sobre ele e os cartões como cartazes de papel. Cada aba e cada
 * opção veste um quadro dos murais (lib/comunidade-quadros.ts).
 */
export default function LayoutDaComunidade({ children }: { children: React.ReactNode }) {
  return (
    <div className="tema-comunidade">
      <div aria-hidden className="parede-comunidade" />
      {children}
    </div>
  );
}
