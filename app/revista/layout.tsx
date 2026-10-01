import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Revista: as placas e cartazes da marca, a banca de revista. (lib/areas.ts) */
export default function LayoutDeRevista({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="revista">{children}</TemaDaArea>;
}
