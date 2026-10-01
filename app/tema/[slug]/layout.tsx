import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';
import { temaDoAssunto } from '@/lib/areas';

/** Cada tema veste o muro da área mais próxima e o quadro do assunto (lib/areas.ts). */
export default function LayoutDoTema({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const { area, tema } = temaDoAssunto(params.slug);
  return (
    <TemaDaArea area={area} tema={tema}>
      {children}
    </TemaDaArea>
  );
}
