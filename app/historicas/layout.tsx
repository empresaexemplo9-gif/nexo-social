import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Históricas: samurai, xadrez, Paris e a estátua clássica. (lib/areas.ts) */
export default function LayoutDeHistoricas({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="historicas">{children}</TemaDaArea>;
}
