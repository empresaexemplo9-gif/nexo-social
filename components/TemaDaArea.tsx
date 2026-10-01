import React from 'react';
import { AREAS, type Area, type TemaDeArea } from '@/lib/areas';

/**
 * Veste a área com o tema dela (lib/areas.ts): o muro de fundo, a tinta clara
 * sobre ele, os cartões como cartazes de papel, os botões no quadro da área e
 * a moldura dos cartões. O CSS está em app/globals.css (.tema-mural).
 */
export default function TemaDaArea({ area, tema, children }: { area: Area; tema?: TemaDeArea; children: React.ReactNode }) {
  const t = tema ?? AREAS[area];
  return (
    <div className="tema-mural" data-area={area} data-parede={t.parede} data-quadro={t.quadro} data-moldura={t.moldura}>
      <div aria-hidden className="parede-mural" />
      {children}
    </div>
  );
}
